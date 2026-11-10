# Module Registry

> **Last Updated:** 2026-11-08 (Dev baseline with Checkpoint 4 UX integration)
>
> Check this file BEFORE modifying any module. Respect the `Status` column.
> - **STUB**: Returns placeholder/hardcoded data. Do NOT replace with real logic unless you are the Owner.
> - **WIP**: Partially implemented. Core logic exists but may have gaps.
> - **STABLE**: Fully implemented and tested. Changes require contract updates.

---

## Backend Modules

| Module | File Path | Owner | Status | Branch | Stub Returns | Notes |
|---|---|---|---|---|---|---|
| Constants | `backend/app/core/constants.py` | Tech Lead | **STABLE** | `dev` | N/A | `APP_NAME`, version, description |
| Config | `backend/app/core/config.py` | Tech Lead | **STABLE** | `dev` | N/A | Pydantic Settings from `.env` |
| Database | `backend/app/core/database.py` | Tech Lead | **STABLE** | `dev` | N/A | SQLAlchemy async engine + session |
| DB Models | `backend/app/models/db_models.py` | Tech Lead | **STABLE** | `dev` | N/A | Seller, Customer, Dispute, AuditLog |
| Schemas | `backend/app/models/schemas.py` | Tech Lead | **STABLE** | `dev` | N/A | Pydantic request/response models |
| Main App | `backend/app/main.py` | Tech Lead | **STABLE** | `dev` | N/A | FastAPI entrypoint with CORS + routers |
| Disputes API | `backend/app/api/routes_disputes.py` | Tech Lead | **WIP** | `dev` | In-memory `SEED_DISPUTES` | In-memory CRUD, stats, and triage endpoints operational; PostgreSQL AsyncSession persistence pending |
| Webhooks API | `backend/app/api/routes_webhooks.py` | PayPal Dev | **STABLE** | `dev` | None | Verified ingestion; 10,000-event deduplication; PostgreSQL persistence; automated background AI triage & extended refund/reversal handlers; 36 unit tests passing |
| Simulate API | `backend/app/api/routes_simulate.py` | PayPal Dev | **STABLE** | `dev` | Explicit SIM- demo records | Local scenarios; preserves other owners' triage interface |
| PayPal Client | `backend/app/core/paypal_client.py` | PayPal Dev | **STABLE** | `dev` | Marked simulated responses | Real Sandbox OAuth verified; capture resolution, refund idempotency, note bounding, and 33 unit tests passing |
| AI Agent | `backend/app/engine/agent.py` | AI Dev | **STABLE** | `dev` | N/A | Gemini 2.0 Flash structured outputs + deterministic heuristic fallback engine |
| EV Calculator | `backend/app/engine/ev_calculator.py` | AI Dev | **STABLE** | `dev` | N/A | Pure math EV formula, break-even probability, and boundary validation |
| RAG Store | `backend/app/engine/rag_store.py` | AI Dev | **STABLE** | `dev` | N/A | Elasticsearch hybrid (BM25 + kNN) with NumPy dense vector cosine similarity fallback |

## PayPal Delivery and Acceptance Status (2026-10-31)

Implementation is available on `feat/paypal-integration` in [PR #5](https://github.com/Rohank3/sentin-ai/pull/5)
merged into `dev`. WIP for webhook modules means signature verification and deduplication
are operational, but real automated triage execution and durable persistence are pending.
The client is verified with 33 unit tests covering timeouts, idempotency, and reconciliation.
The simulator's STABLE status applies to local scenario injection only.

| Capability | Evidence / status |
|---|---|
| OAuth authentication | Real Sandbox access token obtained; credentials/token not logged or committed |
| Sandbox API access | Read-only webhook-list and dispute-list calls returned HTTP 200; both returned zero records at the check |
| Client requests and failures | 33 automated tests passed using httpx MockTransport and ASGI; includes refund note length boundaries, completed/concurrent refund rejection, PayPal reconciliation before retry, timeout/outage handling, DEC-014 credential precedence, capture resolution, token cache/refresh, evidence encoding, signatures, deduplication, and offline scenarios |
| Existing baseline checks | 5 contract tests, backend compilation, and frontend production build passed on this branch |
| Local execution | Dashboard and API/docs responded HTTP 200; local simulation returned HTTP 201 with a SIM- ID |
| Signed webhook delivery | Not tested against a real PayPal case; no registration or webhook ID configured at the check |
| Evidence, claim acceptance, capture refunds | Implemented and mock-tested; actual Sandbox mutations not yet verified |
| Real automatic dispute processing | Refund triage resolves and verifies capture IDs; transaction-specific evidence and remaining shared execution-state handling are still pending |

### Remaining ownership and acceptance gates

1. **Integration completed (2026-10-31):** shared configuration and contract
   conflicts against `dev` resolved at the user-relayed Tech Lead request.
   Both sandbox account fields and webhook seller routing are retained.
   Credential precedence conforms to DEC-014; no supersession is needed.
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

## Frontend Grid & AG Studio Delivery Status (2026-11-06)

Implemented on `feat/ag-studio-integration` in [PR #6](https://github.com/Rohank3/sentin-ai/pull/6)
merged into `dev`. All components compile cleanly with zero type errors in production build.

| Component | Status | Features Delivered |
|---|---|---|
| `DisputeStudio.tsx` | **STABLE** | AG Studio React and AG Grid integration, custom status/confidence badges, multi-attribute filtering, concurrency-guarded actions |
| `DisputeDetailDrawer.tsx` | **STABLE** | 1,169-line slide-over inspection drawer: PoD delivery logs, merchant return policies, EV arbitration breakdown, audit trail, manual action dispatchers |
| `DisputeAnalyticsStudio.tsx` | **STABLE** | 323-line visual risk matrix, portfolio exposure charts, and arbitration win rate telemetry |

## Frontend Modules

| Module | File Path | Owner | Status | Branch | Stub Returns | Notes |
|---|---|---|---|---|---|---|
| Constants | `frontend/src/lib/constants.ts` | Tech Lead | **STABLE** | `dev` | N/A | `APP_NAME`, `API_BASE_URL` |
| API Client | `frontend/src/lib/api.ts` | Tech Lead | **STABLE** | `dev` | N/A | Typed fetch wrappers with error handling |
| Layout | `frontend/src/app/layout.tsx` | Frontend UX | **STABLE** | `dev` | N/A | Modern root shell with Tailwind, brand header & navigation |
| Page | `frontend/src/app/page.tsx` | Frontend UX | **STABLE** | `dev` | N/A | Main Command Center integrating stats, injector, studio, and drawer |
| Dispute Studio | `frontend/src/components/DisputeStudio.tsx` | Frontend Grid | **STABLE** | `dev` | N/A | AG Studio React grid, custom cell renderers, filter chips, concurrency guards |
| Detail Drawer | `frontend/src/components/DisputeDetailDrawer.tsx` | Frontend Grid | **STABLE** | `dev` | N/A | 1,169-line inspection drawer with EV comparison, policy citations, timeline audit log |
| Analytics Studio | `frontend/src/components/DisputeAnalyticsStudio.tsx` | Frontend Grid | **STABLE** | `dev` | N/A | Visual risk matrix and portfolio exposure distribution |
| Stats Overview | `frontend/src/components/StatsOverview.tsx` | Frontend UX | **STABLE** | `dev` | N/A | Protected capital, exposure, win rate, autonomy ratio cards with loading skeletons |
| Demo Control Bar | `frontend/src/components/DemoControlBar.tsx` | Frontend UX | **STABLE** | `dev` | N/A | 1-Click live scenario injector connected to `/api/simulate` |

## Infrastructure

| Module | File Path | Owner | Status | Notes |
|---|---|---|---|---|
| Docker Compose | `docker-compose.yml` | Tech Lead | **STABLE** | Postgres + Elastic + Backend |
| Backend Dockerfile | `backend/Dockerfile` | Tech Lead | **STABLE** | Python 3.11-slim |
| Git Config | `.gitignore` | Tech Lead | **STABLE** | Python + Node + Docker |
| License | `LICENSE` | Tech Lead | **STABLE** | MIT |
| Contracts | `.contracts/*` | Tech Lead | **STABLE** | This file and others |
