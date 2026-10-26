# Decision Registry

> **How to use this file:**
> - Before implementing anything, search for relevant decisions by module name.
> - If your work contradicts an ACTIVE decision, do NOT proceed — discuss with the Tech Lead.
> - To change a decision: mark the old one `SUPERSEDED`, add a new decision with rationale.

---

## DEC-001: Backend Language

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Python FastAPI
- **Rationale:** Best AI/ML ecosystem (google-genai, elasticsearch-py, numpy). Pydantic for strict schemas. FastAPI for async performance and auto-generated OpenAPI docs.
- **Impacted Modules:** All backend modules
- **Alternatives Considered:** Node.js/Express with TypeScript (rejected: thinner AI ecosystem, separate type system from Pydantic)

---

## DEC-002: AI Model Provider

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Google Gemini 2.0 Flash via `google-genai` SDK
- **Rationale:** Free tier (15 RPM, 1M tokens/min, 1500 requests/day). Native Pydantic structured output via `response_schema`. Fast inference.
- **Impacted Modules:** `agent.py`, `ev_calculator.py`
- **API Key Env Var:** `GEMINI_API_KEY`
- **SDK:** `pip install google-genai`
- **Usage Pattern:**
  ```python
  from google import genai
  client = genai.Client()
  response = client.models.generate_content(
      model="gemini-2.0-flash",
      contents=prompt,
      config={"response_mime_type": "application/json", "response_schema": MyPydanticModel}
  )
  result = response.parsed  # Returns typed Pydantic object
  ```

---

## DEC-003: Search/RAG Engine

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Elasticsearch 8.x with hybrid search (keyword + vector)
- **Rationale:** Hybrid search for policies + PoD records. Elastic sponsor prize eligible. Real product value for dispute context retrieval.
- **Timeline:**
  - Oct 25-27: Local SQLite + in-memory vector fallback (in `rag_store.py`)
  - Oct 28-30: Docker Compose Elasticsearch container
  - Nov 1-12: Full hybrid search integration
- **Impacted Modules:** `rag_store.py`, `docker-compose.yml`

---

## DEC-004: Frontend Framework

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Rationale:** React ecosystem for AG Grid/AG Studio. TypeScript for contract safety with backend. Tailwind for rapid styling.
- **Impacted Modules:** All frontend modules
- **Alternatives Considered:** Vite + React (rejected: Next.js gives SSR, API routes for proxy, better deployment on Vercel/Render)

---

## DEC-005: Grid Component

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** AG Studio embedded inside Next.js dashboard
- **Rationale:** $9K AG Grid sponsor prize track. Real-time dispute filtering, custom cell renderers (status badges, confidence bars), action buttons.
- **Package:** `ag-grid-react` + `ag-grid-community`
- **Impacted Modules:** `DisputeStudio.tsx`, `package.json`

---

## DEC-006: Decision Formula

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Mathematical Expected Value (EV) calculation with configurable risk tolerance
- **Formula:**
  $$\text{EV}(\text{Contest}) = P(\text{win}) \cdot (\text{Amount}) - (1 - P(\text{win})) \cdot (\text{Amount} + \text{DisputeFee}) - \text{LaborCost}$$
  $$\text{EV}(\text{Settle/Refund}) = -\text{Amount}$$
  $$\text{Optimal Action} = \arg\max(\text{EV}(\text{Contest}), \text{EV}(\text{Settle}))$$
- **Rationale:** Gives judges concrete math rather than black-box AI decisions. Explainable, auditable, mathematically optimal.
- **Impacted Modules:** `ev_calculator.py`, `agent.py`

---

## DEC-007: Human-in-the-Loop Thresholds

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Automatic execution ONLY if:
  - `amount <= MAX_AUTO_EXECUTE_AMOUNT` (default $100)
  - `win_probability >= MIN_AUTO_EXECUTE_WIN_PROB` (default 0.70)
  - `customer_risk_score <= MAX_CUSTOMER_RISK_SCORE` (default 0.50)
  - All others route to `status = "UNDER_REVIEW"` for supervisor sign-off via AG Studio
- **Rationale:** Risk mitigation. Prevents AI from auto-contesting high-value claims or auto-refunding fraud rings.
- **Impacted Modules:** `agent.py`, `routes_disputes.py`, `DisputeStudio.tsx`

---

## DEC-008: Multi-Seller Support

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Multi-seller architecture with per-seller PayPal sandbox credentials
- **Rationale:** Multiple sandbox business accounts, per-seller credential routing. Platform-level dashboard + seller drill-down.
- **Impacted Modules:** `paypal_client.py`, `db_models.py`, `schemas.py`, all routes
- **Data Model:** `Seller` table with `paypal_client_id` and `paypal_client_secret` columns

---

## DEC-009: Deployment

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Render for backend + frontend ($50 hackathon sponsor credits)
- **Rationale:** Hackathon sponsor, free credits eliminate cold-start issues, single platform simplicity.
- **Impacted Modules:** `Dockerfile`, `render.yaml`, `next.config.mjs`

---

## DEC-010: Project Name

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Configurable via `APP_NAME` constant. Current value: `"Sentin AI"`
- **Rationale:** Name will change in future. Single source of truth enables 1-second rename.
- **Backend:** `from app.core.constants import APP_NAME`
- **Frontend:** `import { APP_NAME } from '@/lib/constants'`
- **Impacted Modules:** `constants.py`, `constants.ts`, `layout.tsx`, `main.py`, `README.md`

---

## DEC-011: Communication Protocol

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** REST API with OpenAPI auto-docs
- **Rationale:** FastAPI auto-generates interactive docs at `/docs`. Frontend team uses this as the living API contract. AG Studio can consume REST endpoints.
- **Impacted Modules:** All route files, `api.ts`

---

## DEC-012: Policy & PoD Knowledge Base Architecture

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Dual JSON fixtures + SQLite vector fallback transitioning to Elasticsearch 8.x
- **Rationale:** Seed fixtures in `backend/seed/` (`policies.json`, `carriers.json`, `customers.json`) provide immediate reproducibility without external dependencies.
- **Impacted Modules:** `backend/seed/*`, `backend/app/engine/rag_store.py`

---

## DEC-013: Alembic Database Versioning & Migrations

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** Async Alembic database versioning for SQLite and PostgreSQL schemas
- **Rationale:** Enables non-destructive database evolution, repeatable environment teardown, and clean multi-developer migration parity.
- **Impacted Modules:** `backend/alembic.ini`, `backend/alembic/*`, `backend/app/models/db_models.py`

---

## DEC-014: PayPal Sandbox Credential & Multi-Account Topology

- **Status:** `ACTIVE`
- **Date:** 2026-10-26
- **Decision:** Establish a unified team PayPal Developer Sandbox App and explicit Account Topology.
- **Account Topology:**
  - **Merchant / Seller (Business)**: Configured in `backend/.env` via `PAYPAL_BUSINESS_ACCOUNT`
    - Role: Primary commerce store protected by Sentin AI. Associated with the developer REST App credentials (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).
    - API actions: Receives customer dispute events, responds with Proof-of-Fulfillment (`/v1/customer/disputes/{id}/provide-evidence`), accepts claims (`/accept-claim`), or issues refunds (`/v2/payments/captures/{id}/refund`).
  - **Buyer / Customer (Personal)**: Configured in `backend/.env` via `PAYPAL_BUYER_ACCOUNT`
    - Role: Customer account for purchasing sandbox orders and filing INR (Item Not Received) or SNAD (Significantly Not As Described) claims via `sandbox.paypal.com` or the PayPal Webhook Simulator.
- **Credential Distribution Strategy:**
  - **Single Shared `.env`**: Shared privately among all 5 team members via secure internal chat (never committed to GitHub).
  - **Rationale for Shared Credentials**:
    1. **Dispute State Parity**: Disputes in PayPal Sandbox belong to the merchant receiving them. Sharing the merchant credentials guarantees every teammate sees the exact same disputes in their dashboard.
    2. **Webhook Uniformity**: Webhooks are configured per App ID. A shared App ensures uniform webhook payloads for local and simulation testing.
    3. **Zero Friction**: Teammates do not need to register separate developer accounts or generate disjoint credentials.
- **Module Ownership & Team Role Division:**
  - **Tech Lead (`feat/core-scaffold`)**: Owns `.env.example`, sandbox configuration schema (`backend/app/core/config.py`), local `.env` setup, and architecture contracts.
  - **PayPal API Dev (`feat/paypal-integration`)**: Implements and validates active sandbox communication in `paypal_client.py`, webhook ingestion in `routes_webhooks.py`, and test scenarios in `routes_simulate.py`.
- **Impacted Modules:** `backend/app/core/config.py`, `backend/app/core/paypal_client.py`, `backend/.env.example`, `DEVELOPMENT.md`, `.contracts/API_CONTRACT.md`
