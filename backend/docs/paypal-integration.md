# PayPal integration runbook

## Local setup

From the repository root, create a Python 3.11 environment and install
`backend/requirements.txt`. Start PostgreSQL with `docker compose up -d db` if
using database-backed seller credentials. The current dashboard dispute repository
is still in memory and does not require PostgreSQL for local simulations.

From `backend`, copy `.env.example` to `.env`. Keep this file untracked.
If your shell defines `DEBUG=release`, unset it or set `DEBUG=false` before
starting; shell variables override the dotenv file.

Run `python -m uvicorn app.main:app --reload --port 8000` from `backend`.
Use `/docs` to call `POST /api/simulate`, for example:

```json
{"scenario_type":"INR_WITH_TRACKING","auto_triage":true}
```

All six documented scenarios work without PayPal credentials. Generated IDs start
with `SIM-`; PayPal client operations on these IDs always return `simulated: true`,
even after you configure real sandbox credentials. Explicit request values override
scenario defaults. This does not create a case in PayPal. AI/RAG behavior still
comes from the other developers' existing modules, so scenario labels alone do not
prove distinct AI outcomes or real evidence retrieval.

## Configure a real sandbox app

1. In PayPal Developer Dashboard, create/select a Sandbox REST app belonging to
   your sandbox business account; enable Disputes in the app's feature options.
2. Put its `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `backend/.env`.
   Keep `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`.
3. Expose the backend through your deployment or an HTTPS tunnel. Register
   `https://<your-host>/api/webhooks/paypal` on the same sandbox REST app for
   `CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.UPDATED`, and
   `CUSTOMER.DISPUTE.RESOLVED`.
4. Copy the registration's webhook ID to `PAYPAL_WEBHOOK_ID` (this is not an event
   ID). Set `PAYPAL_SELLER_ID` to the corresponding local seller, default
   `seller_acme`. Restart the backend after configuration changes.
5. Use a sandbox personal buyer account to pay the sandbox business account, then
   open a dispute for that transaction in the buyer's sandbox Resolution Center.
   PayPal's general Disputes reference does not expose unrestricted case creation;
   limited-release creation APIs should not be assumed available to this app.
6. Confirm the delivered webhook returns 200, the dashboard contains the case,
   and its audit log contains `WEBHOOK_VERIFIED`. Replaying the same event must
   return `duplicate`; resolving it must update the same record to RESOLVED.

Unsigned requests are rejected. Missing verification configuration returns 503.
The PayPal webhook simulator's mock events are not proof of a real signed dispute
workflow; use an actual sandbox transaction/dispute for the acceptance check.

## Exercise the client against sandbox

Run Python from `backend` with your environment loaded. These calls perform real
sandbox mutations when credentials are configured; replace example identifiers
with the appropriate case/capture from your own sandbox account.

```python
import asyncio
from app.core.paypal_client import paypal_client

async def check():
    dispute = await paypal_client.get_dispute("PP-D-YOUR-CASE")
    print(dispute["dispute_id"], dispute["status"])
    # Check the case's HATEOAS links to ensure provide-evidence is available.
    # Use actual carrier evidence for this transaction, never demo tracking.
    # await paypal_client.provide_evidence(
    #     "PP-D-YOUR-CASE", "UPS", "ACTUAL-TRACKING", "Delivery confirmation")
    # Accepting liability refunds the buyer through the dispute workflow:
    # await paypal_client.accept_claim("PP-D-YOUR-CASE", "Full refund agreed")
    # A separate Payments v2 refund requires the ORIGINAL CAPTURE ID:
    # await paypal_client.create_refund(
    #     "ACTUALCAPTUREID", 19.50, request_id="refund-operation-001")

asyncio.run(check())
```

Refund request IDs must be reused for retries of the same operation. The default
key is stable for seller/capture/amount/currency; use a new explicit key for a
separate intentional partial refund of the same amount. PayPal controls the
idempotency retention window. After a timeout, reconcile against PayPal before
retrying. Configured API errors never become mock success responses.

Default credentials apply only to `default` and `PAYPAL_SELLER_ID`. Other sellers
are resolved through `Seller.paypal_client_id` / `paypal_client_secret` in the
existing database. A missing seller or credentials returns an error and never
uses the default merchant's credentials. The current webhook URL supports one
configured app/seller per deployment; multi-app webhook registration routing is
future shared-schema work.

## Team integration handoff

The PayPal methods and verified ingestion are implemented. The Tech Lead's
`routes_disputes.py` is still a stub and needs these changes before end-to-end
real automatic execution is ready:

- Resolve actual capture IDs; the triage route currently passes a dispute ID to
  `create_refund`. The client rejects this instead of issuing an invalid refund.
- Supply transaction-specific evidence; manual execution currently uses hardcoded
  tracking, and automatic triage consumes stub RAG results.
- Set `auto_executed` only after successful acknowledgement, handle SETTLE, and
  distinguish simulated actions and pending refunds in dashboard statistics.
- Persist disputes, event IDs and ordering metadata in PostgreSQL. Current
  ingestion/deduplication is process-local (up to 10,000 recent event IDs), so run
  one backend worker. State disappears on restart; this is not durable ingestion.
- Re-enable automatic real webhook triage after the above integration. For now,
  real events record `TRIAGE_PENDING_INTEGRATION`; local simulations still triage.

The only shared runtime edits in this branch are the two configuration fields and
`.env.example`; their interfaces are recorded in `.contracts/API_CONTRACT.md` and
`.contracts/CHANGELOG.md` for Tech Lead review. Other owners' stubs are untouched.

## Verification

From the repository root (with the environment active):

```powershell
python backend/tests/test_paypal_integration.py
python backend/tests/test_contracts_and_schemas.py
$sources = Get-ChildItem backend/app -Recurse -Filter *.py | ForEach-Object { $_.FullName }
python -m py_compile $sources
cd frontend
npm ci --legacy-peer-deps
npm run build
```

The integration suite uses httpx MockTransport and ASGI requests, with no PayPal
credentials or network needed. Passing it verifies request serialization and
failure handling, not successful access to a particular sandbox account. Record
real sandbox case/refund IDs privately after the acceptance flow above; never
commit credentials, buyer data, or OAuth tokens.

## Hackathon delivery

The official rules require central PayPal Sandbox integration plus AI, a working
build with setup instructions or a hosted demo, public open-source code, and a
public YouTube demo under three minutes. Submission closes November 12, 2026 at
12:00 PM PST (November 13 at 1:30 AM IST). Keep judging access available through
December 15. Local simulations are useful for rehearsals; show the verified
sandbox flow as evidence of the actual PayPal integration.

Sources:
- [Official rules](https://paypalaihackathon.devpost.com/rules)
- [Sandbox accounts and dispute setup](https://developer.paypal.com/disputes/set-up/)
- [Dispute operations and evidence payloads](https://developer.paypal.com/platforms/disputes/handle-disputes/use-disputes-api/)
- [Webhook signature verification](https://developer.paypal.com/api/webhooks/v1/verify-webhook-signature-post)
- [Capture refunds](https://developer.paypal.com/api/payments/v2/captures-refund)
