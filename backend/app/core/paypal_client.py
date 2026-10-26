"""Seller-scoped PayPal calls with explicit demo responses and controlled errors."""
import asyncio
import hashlib
import json
import re
import time
import uuid
from collections.abc import Mapping
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException
from app.core.config import settings

MOCK_TOKEN = "mock_sandbox_access_token"
_CURRENCIES = set("AUD BRL CAD CHF CNY CZK DKK EUR GBP HKD HUF ILS JPY MYR MXN NOK NZD PHP PLN SEK SGD THB TWD USD".split())


def _configured(value):
    return bool(value and value.strip() and not value.startswith("your_"))


def _identifier(value):
    if not re.fullmatch(r"[A-Za-z0-9-]{1,255}", value):
        raise HTTPException(400, "Invalid PayPal resource identifier.")
    return value


class PayPalClient:
    def __init__(self):
        self.base_url = settings.paypal_base_url.rstrip("/")
        self._token_cache: Dict[tuple, Dict[str, Any]] = {}
        self._token_lock = asyncio.Lock()

    def _get_credentials(self, seller_client_id: Optional[str] = None,
                         seller_client_secret: Optional[str] = None) -> tuple[Optional[str], Optional[str]]:
        if seller_client_id is not None or seller_client_secret is not None:
            pair = seller_client_id, seller_client_secret
        else:
            pair = settings.paypal_client_id, settings.paypal_client_secret
        present = tuple(_configured(value) for value in pair)
        if any(present) and not all(present):
            raise HTTPException(503, "Both PayPal client ID and secret must be configured.")
        return pair if all(present) else (None, None)

    async def _seller_credentials(self, seller_id):
        if seller_id in ("default", settings.paypal_seller_id):
            return self._get_credentials()
        from app.core.database import async_session_maker
        from app.models.db_models import Seller
        try:
            async with async_session_maker() as session:
                seller = await session.get(Seller, seller_id)
                if seller is None:
                    raise HTTPException(404, "PayPal seller not found.")
                pair = self._get_credentials(seller.paypal_client_id or "", seller.paypal_client_secret or "")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(503, "Seller credentials are temporarily unavailable.") from None
        if not all(pair):
            raise HTTPException(503, "PayPal credentials are missing for this seller.")
        return pair

    async def get_access_token(self, seller_id: str = "default", seller_client_id: Optional[str] = None,
                               seller_client_secret: Optional[str] = None) -> str:
        if seller_client_id is not None or seller_client_secret is not None:
            pair = self._get_credentials(seller_client_id, seller_client_secret)
        else:
            pair = await self._seller_credentials(seller_id)
        if not all(pair):
            return MOCK_TOKEN
        fingerprint = hashlib.sha256(json.dumps(pair).encode()).hexdigest()
        key = (seller_id, fingerprint)
        async with self._token_lock:
            cached = self._token_cache.get(key)
            if cached and cached["expires_at"] > time.monotonic():
                return cached["token"]
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        f"{self.base_url}/v1/oauth2/token", auth=pair,
                        data={"grant_type": "client_credentials"}, headers={"Accept": "application/json"})
                response.raise_for_status()
                data = response.json()
                token, lifetime = data["access_token"], float(data["expires_in"])
                if not isinstance(token, str) or not token or not 0 < lifetime < float("inf"):
                    raise ValueError("Invalid token response")
            except (httpx.HTTPError, ValueError, KeyError, TypeError):
                raise HTTPException(502, "PayPal authentication failed; check sandbox credentials and connectivity.") from None
            self._token_cache[key] = {"token": token, "expires_at": time.monotonic() + max(0, lifetime - min(60, lifetime / 10))}
            return token

    async def _request(self, method, path, seller_id, *, payload=None, multipart=False, request_id=None):
        token = await self.get_access_token(seller_id=seller_id)
        if token == MOCK_TOKEN:
            return {"status": "SUCCESS", "simulated": True}
        for attempt in range(2):
            headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
            if request_id:
                headers["PayPal-Request-Id"] = request_id
            kwargs = {}
            if multipart:
                kwargs["files"] = {"input": (None, json.dumps(payload), "application/json")}
            elif payload is not None:
                kwargs["json"] = payload
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.request(method, f"{self.base_url}{path}", headers=headers, **kwargs)
            except httpx.RequestError:
                # A timed-out mutation may already have been applied. Never replay it blindly.
                raise HTTPException(503, "PayPal is unavailable; reconcile the operation before retrying.") from None
            if response.status_code == 401 and attempt == 0:
                self._token_cache = {k: v for k, v in self._token_cache.items() if k[0] != seller_id}
                token = await self.get_access_token(seller_id=seller_id)
                continue
            if response.is_error:
                raise HTTPException(502, f"PayPal rejected the operation (HTTP {response.status_code}).")
            if not response.content:
                return {"status": "SUCCESS"}
            try:
                result = response.json()
                if not isinstance(result, dict):
                    raise ValueError("Expected an object")
                return result
            except ValueError:
                raise HTTPException(502, "PayPal returned an invalid response; reconcile before retrying.") from None

    async def get_dispute(self, dispute_id: str, seller_id: str = "default") -> Dict[str, Any]:
        _identifier(dispute_id)
        if dispute_id.startswith("SIM-"):
            return {"dispute_id": dispute_id, "status": "OPEN", "simulated": True}
        result = await self._request("GET", f"/v1/customer/disputes/{dispute_id}", seller_id)
        if result.get("simulated"):
            result.update(dispute_id=dispute_id, status="UNDER_REVIEW",
                          dispute_amount={"value": "149.99", "currency_code": "USD"},
                          reason="MERCHANDISE_OR_SERVICE_NOT_RECEIVED", dispute_life_cycle_stage="CHARGEBACK")
        return result

    async def provide_evidence(self, dispute_id: str, carrier: str, tracking_number: str, notes: str,
                               evidence_type: str = "PROOF_OF_FULFILLMENT", seller_id: str = "default") -> Dict[str, Any]:
        _identifier(dispute_id)
        if evidence_type != "PROOF_OF_FULFILLMENT" or not carrier.strip() or not tracking_number.strip():
            raise HTTPException(400, "Fulfillment evidence requires a carrier and tracking number.")
        if len(notes) > 2000 or len(tracking_number) > 100:
            raise HTTPException(400, "Evidence exceeds PayPal field limits.")
        if dispute_id.startswith("SIM-"):
            return {"status": "SUCCESS", "dispute_id": dispute_id, "simulated": True}
        payload = {"evidences": [{"evidence_type": evidence_type, "evidence_info": {
            "tracking_info": [{"carrier_name": carrier.strip(), "tracking_number": tracking_number.strip()}]
        }, "notes": notes}]}
        return await self._request("POST", f"/v1/customer/disputes/{dispute_id}/provide-evidence", seller_id,
                                   payload=payload, multipart=True)

    async def accept_claim(self, dispute_id: str, notes: str, seller_id: str = "default") -> Dict[str, Any]:
        _identifier(dispute_id)
        if len(notes) > 2000:
            raise HTTPException(400, "Claim note exceeds PayPal field limits.")
        if dispute_id.startswith("SIM-"):
            return {"status": "ACCEPTED", "dispute_id": dispute_id, "simulated": True}
        result = await self._request("POST", f"/v1/customer/disputes/{dispute_id}/accept-claim", seller_id,
                                     payload={"note": notes})
        if result.get("simulated"):
            result.update(status="ACCEPTED", dispute_id=dispute_id, notes=notes)
        return result

    async def create_refund(self, capture_id: str, amount: float, currency: str = "USD",
                            note: str = "Resolved via AI Dispute Management", seller_id: str = "default",
                            request_id: Optional[str] = None) -> Dict[str, Any]:
        _identifier(capture_id)
        if capture_id.startswith("PP-"):
            raise HTTPException(400, "A capture ID is required for a refund; dispute IDs are not capture IDs.")
        if currency not in _CURRENCIES or len(note) > 255:
            raise HTTPException(400, "Invalid refund currency or note length.")
        precision = Decimal("1") if currency in {"JPY", "HUF", "TWD"} else Decimal("0.01")
        try:
            value = Decimal(str(amount))
            if not value.is_finite() or value <= 0 or value != value.quantize(precision):
                raise ValueError("Invalid money")
            value_string = format(value.quantize(precision), "f")
        except (InvalidOperation, ValueError):
            raise HTTPException(400, "Refund amount must be positive, finite and match currency precision.") from None
        payload = {"amount": {"value": value_string, "currency_code": currency}, "note_to_payer": note}
        if request_id is not None and not re.fullmatch(r"[A-Za-z0-9_-]{1,38}", request_id):
            raise HTTPException(400, "Refund request ID must be 1-38 letters, digits, underscores or hyphens.")
        request_id = request_id or str(uuid.uuid5(uuid.NAMESPACE_URL, json.dumps([seller_id, capture_id, value_string, currency])))
        if capture_id.startswith("SIM-"):
            return {"id": f"REFUND-{capture_id}", "status": "COMPLETED", "amount": payload["amount"], "simulated": True}
        result = await self._request("POST", f"/v2/payments/captures/{capture_id}/refund", seller_id,
                                     payload=payload, request_id=request_id)
        if result.get("simulated"):
            result.update(id=f"REFUND-{capture_id}", status="COMPLETED", amount=payload["amount"])
        return result

    async def verify_webhook_signature(self, headers: Mapping[str, str], event: dict) -> bool:
        if not _configured(settings.paypal_webhook_id) or not all(self._get_credentials()):
            raise HTTPException(503, "Configure PayPal credentials and PAYPAL_WEBHOOK_ID; use /api/simulate for offline demos.")
        headers = {key.lower(): value for key, value in headers.items()}
        fields = {"auth_algo": "paypal-auth-algo", "cert_url": "paypal-cert-url",
                  "transmission_id": "paypal-transmission-id", "transmission_sig": "paypal-transmission-sig",
                  "transmission_time": "paypal-transmission-time"}
        if any(not headers.get(name) for name in fields.values()):
            return False
        payload = {key: headers[name] for key, name in fields.items()}
        payload.update(webhook_id=settings.paypal_webhook_id, webhook_event=event)
        result = await self._request("POST", "/v1/notifications/verify-webhook-signature", "default", payload=payload)
        return result.get("verification_status") == "SUCCESS" and not result.get("simulated")


paypal_client = PayPalClient()
