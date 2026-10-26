# Module Registry

> **Last Updated:** 2026-10-26T13:45:00+05:30
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
| Webhooks API | `backend/app/api/routes_webhooks.py` | PayPal Dev | **STUB** | `feat/paypal-integration` | `200 OK` | PayPal webhook receiver |
| Simulate API | `backend/app/api/routes_simulate.py` | PayPal Dev | **STUB** | `feat/paypal-integration` | Sample dispute JSON | Sandbox dispute creation |
| PayPal Client | `backend/app/core/paypal_client.py` | PayPal Dev | **STUB** | `feat/paypal-integration` | Mock dispute data | Per-seller OAuth2 + Disputes API |
| AI Agent | `backend/app/engine/agent.py` | AI Dev | **STUB** | `feat/ai-engine` | Hardcoded `AIDecision` | Gemini 2.0 Flash evaluator |
| EV Calculator | `backend/app/engine/ev_calculator.py` | AI Dev | **WIP** | `feat/ai-engine` | Correct EV formula | Pure math, no external deps |
| RAG Store | `backend/app/engine/rag_store.py` | AI Dev | **STUB** | `feat/ai-engine` | Hardcoded policy text | Elastic hybrid search |

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
