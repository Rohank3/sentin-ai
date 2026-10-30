"""Offline regression tests: real HTTP encoding through httpx.MockTransport."""
import asyncio
import copy
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
# Keep tests independent of host DEBUG values (some shells set DEBUG=release).
os.environ["DEBUG"] = "false"
import httpx
from fastapi import FastAPI, HTTPException
from app.core.config import settings
from app.core.paypal_client import PayPalClient, MOCK_TOKEN
from app.api import routes_webhooks as webhooks, routes_simulate as simulator
from app.api import routes_disputes as disputes

RealAsyncClient = httpx.AsyncClient


class ClientTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.config = patch.multiple(settings, paypal_client_id="client", paypal_client_secret="secret",
                                     paypal_webhook_id="WH-1", paypal_seller_id="seller_acme")
        self.config.start()
        self.addCleanup(self.config.stop)
        self.client = PayPalClient()
        self.requests = []

    def transport(self, handler):
        def record(request):
            self.requests.append(request)
            if request.url.path == "/v1/oauth2/token":
                return httpx.Response(200, json={"access_token": "token", "expires_in": 3600})
            return handler(request)
        transport = httpx.MockTransport(record)
        return patch("app.core.paypal_client.httpx.AsyncClient", side_effect=lambda **kw: RealAsyncClient(transport=transport, **kw))

    async def test_token_cache_concurrency_rotation_and_expiry(self):
        with self.transport(lambda r: httpx.Response(200, json={})):
            tokens = await asyncio.gather(*(self.client.get_access_token() for _ in range(8)))
            self.assertEqual(tokens, ["token"] * 8)
            self.assertEqual(len(self.requests), 1)
            settings.paypal_client_secret = "rotated"
            await self.client.get_access_token()
            self.assertEqual(len(self.requests), 2)
            for entry in self.client._token_cache.values():
                entry["expires_at"] = 0
            await self.client.get_access_token()
            self.assertEqual(len(self.requests), 3)
            self.assertIn(b"grant_type=client_credentials", self.requests[0].content)
            self.assertTrue(self.requests[0].headers["authorization"].startswith("Basic "))

    async def test_evidence_multipart_and_accept_claim(self):
        with self.transport(lambda r: httpx.Response(204)):
            response = await self.client.provide_evidence("PP-D-1", "UPS", "TRACK123", "Signed delivery")
            self.assertEqual(response["status"], "SUCCESS")
            request = self.requests[-1]
            self.assertIn("multipart/form-data", request.headers["content-type"])
            self.assertIn(b'"evidence_type": "PROOF_OF_FULFILLMENT"', request.content)
            self.assertIn(b'"tracking_number": "TRACK123"', request.content)
            await self.client.accept_claim("PP-D-1", "Refund agreed")
            self.assertEqual(json.loads(self.requests[-1].content), {"note": "Refund agreed"})

    async def test_refund_decimal_and_idempotency(self):
        with self.transport(lambda r: httpx.Response(201, json={"id": "R-1", "status": "COMPLETED"})):
            await self.client.create_refund("CAPTURE123", 19.5)
            first = self.requests[-1]
            await self.client.create_refund("CAPTURE123", 19.5)
            self.assertEqual(first.headers["paypal-request-id"], self.requests[-1].headers["paypal-request-id"])
            self.assertEqual(json.loads(first.content)["amount"]["value"], "19.50")
            await self.client.create_refund("CAPTURE123", 19.5, request_id="different-refund")
            self.assertEqual(self.requests[-1].headers["paypal-request-id"], "different-refund")
            await self.client.create_refund("CAPTURE123", 20, currency="JPY")
            self.assertEqual(json.loads(self.requests[-1].content)["amount"]["value"], "20")

    async def test_invalid_refunds_never_send(self):
        with self.transport(lambda r: self.fail("Unexpected request")):
            for amount in (0, -1, float("nan"), float("inf"), 1.234):
                with self.assertRaises(HTTPException):
                    await self.client.create_refund("CAPTURE123", amount)
            with self.assertRaises(HTTPException):
                await self.client.create_refund("PP-D-1", 1)
            with self.assertRaises(HTTPException):
                await self.client.create_refund("../capture", 1)
            with self.assertRaises(HTTPException):
                await self.client.create_refund("CAPTURE123", 1, request_id="bad\nheader")
            self.assertEqual(self.requests, [])

    async def test_401_refresh_once(self):
        count = 0
        def handler(request):
            nonlocal count
            count += 1
            return httpx.Response(401 if count == 1 else 200, json={"dispute_id": "PP-D-1"})
        with self.transport(handler):
            self.assertEqual((await self.client.get_dispute("PP-D-1"))["dispute_id"], "PP-D-1")
        self.assertEqual(len(self.requests), 4)

    async def test_errors_never_masquerade_as_success(self):
        for status in (401, 403, 422, 429, 500):
            with self.transport(lambda r: httpx.Response(status, json={"secret": "must not leak"})):
                with self.assertRaises(HTTPException) as caught:
                    await self.client.accept_claim("PP-D-1", "Refund")
                self.assertNotIn("secret", caught.exception.detail)
        def timeout(request):
            raise httpx.ReadTimeout("private data", request=request)
        self.requests.clear()
        with self.transport(timeout):
            with self.assertRaises(HTTPException) as caught:
                await self.client.create_refund("CAPTURE123", 10)
            self.assertEqual(caught.exception.status_code, 503)
            self.assertEqual(sum(r.url.path.endswith("/refund") for r in self.requests), 1)

    async def test_missing_credentials_and_simulations(self):
        settings.paypal_client_id = settings.paypal_client_secret = None
        with self.transport(lambda r: self.fail("Unexpected request")):
            self.assertEqual(await self.client.get_access_token(), MOCK_TOKEN)
            self.assertTrue((await self.client.accept_claim("PP-D-1", "demo"))["simulated"])
            with self.assertRaises(HTTPException):
                await self.client.verify_webhook_signature({}, {})
            settings.paypal_client_id = "client"
            with self.assertRaises(HTTPException):
                await self.client.get_access_token()
            settings.paypal_client_secret = "secret"
            self.assertTrue((await self.client.create_refund("SIM-123", 10, seller_id="another"))["simulated"])
            self.assertEqual(self.requests, [])

    async def test_unknown_seller_fails_and_own_credentials_take_precedence(self):
        with patch("app.core.database.async_session_maker") as factory:
            session = factory.return_value.__aenter__.return_value
            session.get = AsyncMock(return_value=None)
            with self.assertRaises(HTTPException) as caught:
                await self.client.get_access_token("unknown")
            self.assertEqual(caught.exception.status_code, 404)
            seller = type("Seller", (), {"paypal_client_id": "other-client", "paypal_client_secret": "other-secret"})()
            session.get.return_value = seller
            with self.transport(lambda r: httpx.Response(200, json={})):
                await self.client.get_dispute("PP-D-1", seller_id="other")
            import base64
            credentials = base64.b64decode(self.requests[0].headers["authorization"].split()[1]).decode()
            self.assertEqual(credentials, "other-client:other-secret")

    async def test_named_seller_falls_back_only_for_absent_pair(self):
        with patch("app.core.database.async_session_maker") as factory:
            session = factory.return_value.__aenter__.return_value
            seller = type("Seller", (), {"paypal_client_id": None, "paypal_client_secret": None})()
            session.get = AsyncMock(return_value=seller)
            self.assertEqual(await self.client._seller_credentials("other"), ("client", "secret"))
            seller.paypal_client_id, seller.paypal_client_secret = "own-client", "own-secret"
            self.assertEqual(await self.client._seller_credentials(settings.paypal_seller_id), ("own-client", "own-secret"))
            for pair in (("own-client", None), (None, "own-secret")):
                seller.paypal_client_id, seller.paypal_client_secret = pair
                with self.assertRaises(HTTPException) as caught:
                    await self.client._seller_credentials("other")
                self.assertEqual(caught.exception.status_code, 503)
            session.get.side_effect = RuntimeError("database unavailable")
            with self.assertRaises(HTTPException) as caught:
                await self.client._seller_credentials("other")
            self.assertEqual(caught.exception.status_code, 503)

    async def test_resolve_capture_verifies_payments_resource(self):
        def handler(request):
            if request.url.path == "/v1/customer/disputes/PP-D-1":
                return httpx.Response(200, json={"disputed_transactions": [{"seller_transaction_id": "CAPTURE123"}]})
            self.assertEqual(request.url.path, "/v2/payments/captures/CAPTURE123")
            return httpx.Response(200, json={"id": "CAPTURE123", "status": "COMPLETED"})
        with self.transport(handler):
            self.assertEqual(await self.client.resolve_capture_id("PP-D-1"), "CAPTURE123")
        self.assertTrue(all(r.method == "GET" for r in self.requests[1:]))

    async def test_resolve_capture_rejects_missing_ambiguous_and_dispute_ids(self):
        for rows in (None, [], [{}, {}], [{}], [{"seller_transaction_id": "PP-D-1"}],
                     [{"seller_transaction_id": "SIM-1"}]):
            with patch.object(self.client, "get_dispute", AsyncMock(return_value={"disputed_transactions": rows})):
                with patch.object(self.client, "_request", AsyncMock()) as request:
                    with self.assertRaises(HTTPException) as caught:
                        await self.client.resolve_capture_id("PP-D-1")
                    self.assertEqual(caught.exception.status_code, 409)
                    request.assert_not_awaited()

    async def test_resolve_capture_rejects_wrong_or_unavailable_resource(self):
        with patch.object(self.client, "get_dispute", AsyncMock(return_value={"disputed_transactions": [{"seller_transaction_id": "CAPTURE123"}]})):
            for result in ({"id": "WRONG"}, {"id": "CAPTURE123", "simulated": True}):
                with patch.object(self.client, "_request", AsyncMock(return_value=result)):
                    with self.assertRaises(HTTPException):
                        await self.client.resolve_capture_id("PP-D-1")
            with patch.object(self.client, "_request", AsyncMock(side_effect=HTTPException(502, "not a capture"))):
                with self.assertRaises(HTTPException):
                    await self.client.resolve_capture_id("PP-D-1")

    async def test_simulated_capture_resolution_never_calls_paypal(self):
        with self.transport(lambda r: self.fail("Unexpected network call")):
            self.assertEqual(await self.client.resolve_capture_id("SIM-123", "other"), "SIM-CAPTURE-123")
        self.assertEqual(self.requests, [])

    async def test_signature_verification_payload(self):
        headers = {"PayPal-Auth-Algo": "SHA256withRSA", "PayPal-Cert-Url": "https://api.paypal.com/cert",
                   "PayPal-Transmission-Id": "TX-1", "PayPal-Transmission-Sig": "signature",
                   "PayPal-Transmission-Time": "2026-10-26T10:00:00Z"}
        event = {"id": "EV-1"}
        with self.transport(lambda r: httpx.Response(200, json={"verification_status": "SUCCESS"})):
            self.assertFalse(await self.client.verify_webhook_signature({}, event))
            self.assertTrue(await self.client.verify_webhook_signature(headers, event))
            body = json.loads(self.requests[-1].content)
            self.assertEqual(body["webhook_id"], "WH-1")
            self.assertEqual(body["webhook_event"], event)
        with self.transport(lambda r: httpx.Response(200, json={"verification_status": "FAILURE"})):
            self.assertFalse(await self.client.verify_webhook_signature(headers, event))

    async def test_malformed_token_response(self):
        for data in ({}, {"access_token": "", "expires_in": 60}, {"access_token": "t", "expires_in": "NaN"}):
            transport = httpx.MockTransport(lambda r: httpx.Response(200, json=data))
            with patch("app.core.paypal_client.httpx.AsyncClient", side_effect=lambda **kw: RealAsyncClient(transport=transport, **kw)):
                with self.assertRaises(HTTPException) as caught:
                    await self.client.get_access_token()
                self.assertEqual(caught.exception.status_code, 502)
                self.assertEqual(self.client._token_cache, {})

    async def test_invalid_api_response(self):
        with self.transport(lambda r: httpx.Response(200, text="not json")):
            with self.assertRaises(HTTPException) as caught:
                await self.client.get_dispute("PP-D-1")
            self.assertEqual(caught.exception.status_code, 502)


class RouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original = copy.deepcopy(webhooks.SEED_DISPUTES)
        webhooks.SEED_DISPUTES.clear()
        webhooks._received_events.clear()
        app = FastAPI()
        app.include_router(webhooks.router)
        app.include_router(simulator.router)
        app.include_router(disputes.router)
        self.http = RealAsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
        self.event = {"id": "EV-1", "event_type": "CUSTOMER.DISPUTE.CREATED", "create_time": "2026-10-26T10:00:00Z",
                      "resource": {"dispute_id": "PP-D-1", "status": "OPEN",
                                   "dispute_amount": {"value": "42.50", "currency_code": "USD"},
                                   "reason": "MERCHANDISE_OR_SERVICE_NOT_RECEIVED"}}

    async def asyncTearDown(self):
        await self.http.aclose()
        webhooks.SEED_DISPUTES.clear()
        webhooks.SEED_DISPUTES.update(self.original)
        webhooks._received_events.clear()

    async def test_unverified_and_malformed_events_do_not_mutate(self):
        with patch.object(webhooks.paypal_client, "verify_webhook_signature", AsyncMock(return_value=False)):
            response = await self.http.post("/api/webhooks/paypal", json=self.event)
            self.assertEqual(response.status_code, 401)
        for body in ([], {}, {"event_type": "CUSTOMER.DISPUTE.CREATED"}):
            self.assertEqual((await self.http.post("/api/webhooks/paypal", json=body)).status_code, 400)
        self.assertEqual(webhooks.SEED_DISPUTES, {})

    async def test_upsert_duplicate_resolved_and_stale(self):
        with patch.object(webhooks.paypal_client, "verify_webhook_signature", AsyncMock(return_value=True)):
            response = await self.http.post("/api/webhooks/paypal", json=self.event)
            self.assertEqual(response.status_code, 200)
            duplicate = await self.http.post("/api/webhooks/paypal", json=self.event)
            self.assertEqual(duplicate.json()["status"], "duplicate")
            self.assertEqual(len(webhooks.SEED_DISPUTES), 1)
            self.event.update(id="EV-2", event_type="CUSTOMER.DISPUTE.UPDATED", create_time="2026-10-26T11:00:00Z")
            self.event["resource"]["status"] = "UNDER_REVIEW"
            await self.http.post("/api/webhooks/paypal", json=self.event)
            record = next(iter(webhooks.SEED_DISPUTES.values()))
            self.assertEqual(record["status"], "UNDER_REVIEW")
            self.event.update(id="EV-3", event_type="CUSTOMER.DISPUTE.RESOLVED", create_time="2026-10-26T12:00:00Z")
            await self.http.post("/api/webhooks/paypal", json=self.event)
            self.assertEqual(record["status"], "RESOLVED")
            self.event.update(id="EV-4", event_type="CUSTOMER.DISPUTE.UPDATED", create_time="2026-10-26T11:00:00Z")
            self.assertEqual((await self.http.post("/api/webhooks/paypal", json=self.event)).json()["status"], "ignored")
            self.assertEqual(record["status"], "RESOLVED")
            self.assertFalse(record["auto_executed"])

    async def test_unsupported_and_invalid_resource(self):
        with patch.object(webhooks.paypal_client, "verify_webhook_signature", AsyncMock(return_value=True)):
            self.event["event_type"] = "PAYMENT.CAPTURE.COMPLETED"
            self.assertEqual((await self.http.post("/api/webhooks/paypal", json=self.event)).json()["status"], "ignored")
            self.event["event_type"] = "CUSTOMER.DISPUTE.CREATED"
            self.event["resource"]["dispute_amount"]["value"] = "NaN"
            self.assertEqual((await self.http.post("/api/webhooks/paypal", json=self.event)).status_code, 400)
            self.assertEqual(webhooks.SEED_DISPUTES, {})

    async def test_verification_outage_is_retryable(self):
        with patch.object(webhooks.paypal_client, "verify_webhook_signature", AsyncMock(side_effect=HTTPException(503, "offline"))):
            self.assertEqual((await self.http.post("/api/webhooks/paypal", json=self.event)).status_code, 503)
        self.assertEqual(webhooks.SEED_DISPUTES, {})
        self.assertEqual(webhooks._received_events, {})

    async def test_concurrent_retries_create_one_record(self):
        with patch.object(webhooks.paypal_client, "verify_webhook_signature", AsyncMock(return_value=True)):
            responses = await asyncio.gather(*(self.http.post("/api/webhooks/paypal", json=self.event) for _ in range(5)))
        self.assertEqual(sum(r.json()["status"] == "received" for r in responses), 1)
        self.assertEqual(len(webhooks.SEED_DISPUTES), 1)

    async def test_all_scenarios_remain_offline_with_credentials(self):
        with (patch.multiple(settings, paypal_client_id="client", paypal_client_secret="secret", gemini_api_key="configured-test-key"),
              patch.object(disputes.claims_agent, "client", None),
              patch.object(disputes.rag_store, "elastic_client", None)):
            with patch("app.core.paypal_client.httpx.AsyncClient", side_effect=AssertionError("PayPal network call in simulation")):
                for scenario in simulator.SCENARIO_CONFIGS:
                    response = await self.http.post("/api/simulate", json={"scenario_type": scenario})
                    self.assertEqual(response.status_code, 201, response.text)
                    self.assertTrue(response.json()["paypal_dispute_id"].startswith("SIM-"))
                    self.assertIn("Triage completed", response.json()["message"])

    async def test_explicit_defaults_and_triage_failure(self):
        response = await self.http.post("/api/simulate", json={"scenario_type": "HIGH_VALUE", "amount": 149.99,
                                                             "reason": "ITEM_NOT_RECEIVED", "auto_triage": False})
        record = webhooks.SEED_DISPUTES[response.json()["dispute_id"]]
        self.assertEqual(record["amount"], 149.99)
        self.assertEqual(record["reason"], "ITEM_NOT_RECEIVED")
        self.assertIn("not requested", response.json()["message"])
        with patch.object(simulator, "triage_dispute", AsyncMock(side_effect=RuntimeError("offline"))):
            response = await self.http.post("/api/simulate", json={"scenario_type": "SNAD_MINOR"})
            self.assertEqual(response.status_code, 201)
            self.assertIn("unavailable", response.json()["message"])

    async def test_triage_refund_passes_verified_capture_and_handles_outcomes(self):
        from app.models.schemas import AIDecision
        decision = AIDecision(recommended_action="REFUND", win_probability=0.1,
                              expected_value=-10, reasoning="Refund justified", auto_execute=True)
        for outcome in ("COMPLETED", "PENDING", "FAILED"):
            response = await self.http.post("/api/simulate", json={"scenario_type": "INR_NO_TRACKING", "auto_triage": False})
            local_id = response.json()["dispute_id"]
            record = webhooks.SEED_DISPUTES[local_id]
            record["paypal_dispute_id"] = "PP-D-1"
            with (patch.object(disputes.claims_agent, "evaluate_dispute", AsyncMock(return_value=decision)),
                  patch.object(disputes.rag_store, "elastic_client", None),
                  patch.object(disputes.paypal_client, "resolve_capture_id", AsyncMock(return_value="CAPTURE123")) as resolve,
                  patch.object(disputes.paypal_client, "create_refund", AsyncMock(return_value={"status": outcome})) as refund):
                result = await self.http.post(f"/api/disputes/{local_id}/triage")
                self.assertEqual(result.status_code, 200, result.text)
                resolve.assert_awaited_once_with("PP-D-1", seller_id=record["seller_id"])
                self.assertEqual(refund.await_args.kwargs["capture_id"], "CAPTURE123")
                self.assertEqual(record["auto_executed"], outcome == "COMPLETED")
                self.assertEqual(record["status"], "RESOLVED" if outcome == "COMPLETED" else "OPEN")

    async def test_triage_does_not_refund_when_capture_resolution_fails(self):
        from app.models.schemas import AIDecision
        response = await self.http.post("/api/simulate", json={"scenario_type": "INR_NO_TRACKING", "auto_triage": False})
        local_id = response.json()["dispute_id"]
        record = webhooks.SEED_DISPUTES[local_id]
        record["paypal_dispute_id"] = "PP-D-1"
        decision = AIDecision(recommended_action="REFUND", win_probability=0.1,
                              expected_value=-10, reasoning="Refund justified", auto_execute=True)
        with (patch.object(disputes.claims_agent, "evaluate_dispute", AsyncMock(return_value=decision)),
              patch.object(disputes.rag_store, "elastic_client", None),
              patch.object(disputes.paypal_client, "resolve_capture_id", AsyncMock(side_effect=HTTPException(409, "missing capture"))),
              patch.object(disputes.paypal_client, "create_refund", AsyncMock()) as refund):
            result = await self.http.post(f"/api/disputes/{local_id}/triage")
            self.assertEqual(result.status_code, 409)
            refund.assert_not_awaited()
            self.assertFalse(record["auto_executed"])
            self.assertIsNone(record["action_taken"])


if __name__ == "__main__":
    unittest.main()
