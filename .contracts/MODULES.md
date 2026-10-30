# Module Registry

> **Last Updated:** 2026-10-31 (PayPal scope)
>
> Check this file BEFORE modifying any module. Respect the `Status` column.
> - **STUB**: Returns placeholder/hardcoded data. Do NOT replace with real logic unless you are the Owner.
> - **WIP**: Partially implemented. Core logic exists but may have gaps.
> - **STABLE**: Fully implemented and tested. Changes require contract updates.

---

## Backend Modules

| Module | File Path | Owner | Status | Branch | Stub Returns | Notes |
|---|---|---|---|---|---|---|
| Constants | `backend/app/core/constants.py` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | `APP_NAME`, version, description |
| Config | `backend/app/core/config.py` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | Pydantic Settings from `.env` |
| Database | `backend/app/core/database.py` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | SQLAlchemy async engine + session |
| DB Models | `backend/app/models/db_models.py` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | Seller, Customer, Dispute, AuditLog |
| Schemas | `backend/app/models/schemas.py` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | Pydantic request/response models |
| Main App | `backend/app/main.py` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | FastAPI entrypoint with CORS + routers |
| Disputes API | `backend/app/api/routes_disputes.py` | Tech Lead | **STUB** | `feat/core-scaffold` | `[]` empty list | CRUD + triage trigger endpoints |
| Webhooks API | `backend/app/api/routes_webhooks.py` | PayPal Dev | **WIP** | `feat/paypal-integration` | None | Verified ingestion; process-local persistence; real triage handoff pending |
| Simulate API | `backend/app/api/routes_simulate.py` | PayPal Dev | **STABLE** | `feat/paypal-integration` | Explicit SIM- demo records | Local scenarios; preserves other owners' triage interface |
| PayPal Client | `backend/app/core/paypal_client.py` | PayPal Dev | **WIP** | `feat/paypal-integration` | Marked simulated responses | Real Sandbox OAuth verified; evidence/claim/refund request paths tested with mocks; end-to-end acceptance pending |
| AI Agent | `backend/app/engine/agent.py` | AI Dev | **STUB** | `feat/ai-engine` | Hardcoded `AIDecision` | Gemini 2.0 Flash evaluator |
| EV Calculator | `backend/app/engine/ev_calculator.py` | AI Dev | **WIP** | `feat/ai-engine` | Correct EV formula | Pure math, no external deps |
| RAG Store | `backend/app/engine/rag_store.py` | AI Dev | **STUB** | `feat/ai-engine` | Hardcoded policy text | Elastic hybrid search |

## PayPal Delivery and Acceptance Status (2026-10-30)

Implementation is available on `feat/paypal-integration` in [PR #5](https://github.com/Rohank3/sentin-ai/pull/5)
targeting `dev`. WIP for the client and webhook modules means implementation is
present but real end-to-end acceptance and shared integration are incomplete.
The simulator's STABLE status applies to local scenario injection only.

| Capability | Evidence / status |
|---|---|
| OAuth authentication | Real Sandbox access token obtained; credentials/token not logged or committed |
| Sandbox API access | Read-only webhook-list and dispute-list calls returned HTTP 200; both returned zero records at the check |
| Client requests and failures | 32 automated tests passed using httpx MockTransport and ASGI; includes completed/concurrent refund rejection, PayPal reconciliation before retry, timeout/outage handling, DEC-014 credential precedence, capture resolution, token cache/refresh, evidence encoding, signatures, deduplication, and offline scenarios |
| Existing baseline checks | 5 contract tests, backend compilation, and frontend production build passed on this branch |
| Local execution | Dashboard and API/docs responded HTTP 200; local simulation returned HTTP 201 with a SIM- ID |
| Signed webhook delivery | Not tested against a real PayPal case; no registration or webhook ID configured at the check |
| Evidence, claim acceptance, capture refunds | Implemented and mock-tested; actual Sandbox mutations not yet verified |
| Real automatic dispute processing | Refund triage resolves and verifies capture IDs; transaction-specific evidence and remaining shared execution-state handling are still pending |

### Remaining ownership and acceptance gates

1. **Tech Lead:** resolve shared configuration and contract conflicts against
   `dev` (`.contracts/CHANGELOG.md`, `backend/.env.example`, `backend/app/core/config.py`).
   Credential precedence now conforms to DEC-014; no supersession is needed.
2. **Tech Lead with AI owner:** connect transaction-specific evidence; handle
   SETTLE and simulated outcomes throughout the dashboard. Refund triage now verifies
   capture IDs and marks REFUNDED only on COMPLETED; other action branches still
   need execution-state review. Then enable real webhook triage.
3. **Tech Lead:** replace process-local dispute/event storage with durable
   persistence before claiming restart-safe or multi-worker webhook ingestion.
   Refund attempt metadata and triage guards are also process-local and require
   durable storage/cross-worker locking before production use.
4. **Deployment owner + PayPal Dev:** after team deployment, register the HTTPS
   `/api/webhooks/paypal` URL on the shared Sandbox app for CREATED, UPDATED, and
   RESOLVED dispute events; set `PAYPAL_WEBHOOK_ID` in the private environment.
5. **PayPal Dev:** use a real Sandbox transaction/dispute to verify signed delivery,
   duplicate handling, supported evidence submission, and claim acceptance/refund
   outcomes. Confirm final PayPal state, not merely HTTP success.

The user selected local-only operation until team deployment; no public tunnel
or webhook registration was created. `backend/.env` contains privately supplied
team configuration and is Git-ignored. Do not copy secrets into contracts, tests,
PR descriptions, or examples. [Setup and acceptance runbook](../backend/docs/paypal-integration.md).

## Frontend Modules

| Module | File Path | Owner | Status | Branch | Stub Returns | Notes |
|---|---|---|---|---|---|---|
| Constants | `frontend/src/lib/constants.ts` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | `APP_NAME`, `API_BASE_URL` |
| API Client | `frontend/src/lib/api.ts` | Tech Lead | **STABLE** | `feat/core-scaffold` | N/A | Typed fetch wrappers |
| Layout | `frontend/src/app/layout.tsx` | Frontend UX | **STUB** | `feat/frontend-ux` | Basic shell | Root layout with Tailwind |
| Page | `frontend/src/app/page.tsx` | Frontend UX | **STUB** | `feat/frontend-ux` | Static layout | Main Command Center |
| Dispute Studio | `frontend/src/components/DisputeStudio.tsx` | Frontend Grid | **STUB** | `feat/frontend-grid` | Static table | AG Studio integration |
| Detail Drawer | `frontend/src/components/DisputeDetailDrawer.tsx` | Frontend Grid | **STUB** | `feat/frontend-grid` | Placeholder drawer | Evidence + AI reasoning |
| Stats Overview | `frontend/src/components/StatsOverview.tsx` | Frontend UX | **STUB** | `feat/frontend-ux` | Hardcoded numbers | Dashboard metrics |
| Demo Control Bar | `frontend/src/components/DemoControlBar.tsx` | Frontend UX | **STUB** | `feat/frontend-ux` | Console.log | Scenario injection buttons |

## Infrastructure

| Module | File Path | Owner | Status | Notes |
|---|---|---|---|---|
| Docker Compose | `docker-compose.yml` | Tech Lead | **STABLE** | Postgres + Elastic + Backend |
| Backend Dockerfile | `backend/Dockerfile` | Tech Lead | **STABLE** | Python 3.11-slim |
| Git Config | `.gitignore` | Tech Lead | **STABLE** | Python + Node + Docker |
| License | `LICENSE` | Tech Lead | **STABLE** | MIT |
| Contracts | `.contracts/*` | Tech Lead | **STABLE** | This file and others |
