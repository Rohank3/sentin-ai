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
  - Oct 25 – Nov 5: Docker locally (`docker.elastic.co/elasticsearch/elasticsearch:8.15.0`)
  - Nov 5: Start Elastic Cloud 14-day free trial
  - Nov 19: Request 30-day extension → expires Dec 19
  - Dec 1–15: Judging period fully covered
- **Fallback:** SQLite + NumPy cosine similarity (always present in `rag_store.py`)
- **Impacted Modules:** `rag_store.py`, `config.py`
- **Env Var:** `ELASTIC_URL` (default: `http://localhost:9200`)

---

## DEC-004: Primary Database

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** PostgreSQL 16 via Docker locally, Render free Postgres for production
- **Rationale:** Same engine in dev and prod = zero compatibility bugs. Docker Compose provides identical environments.
- **Impacted Modules:** `database.py`, `db_models.py`, `config.py`
- **Env Var:** `DATABASE_URL` (default: `postgresql+asyncpg://dev:dev@localhost:5432/sentin_ai`)

---

## DEC-005: ORM

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** SQLAlchemy 2.0 with async support via `asyncpg`
- **Rationale:** Mature, well-documented, FastAPI-native async, excellent Postgres support.
- **Impacted Modules:** `database.py`, `db_models.py`, all route files
- **Packages:** `sqlalchemy[asyncio]`, `asyncpg`, `alembic`

---

## DEC-006: Frontend Grid

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** AG Studio React (`ag-studio-react`) with Studio Agent Framework
- **Rationale:** AG Grid sponsor prize ($9K) requires AG Studio. Studio Agent Framework lets merchants ask natural-language questions about disputes.
- **Package:** `npm install ag-studio-react`
- **Impacted Modules:** `DisputeStudio.tsx`

---

## DEC-007: AI Autonomy Model

- **Status:** `ACTIVE`
- **Date:** 2026-10-25
- **Decision:** AI decides `auto_execute: boolean` based on full context
- **Rationale:** More agentic approach. AI receives amount, win probability, customer history, dispute reason, and outputs whether to auto-execute or require human approval.
- **Impacted Modules:** `agent.py`, `ev_calculator.py`, `routes_disputes.py`
- **AI Output Schema:**
  ```python
  class AIDecision(BaseModel):
      recommended_action: Literal["CONTEST", "SETTLE", "REFUND"]
      win_probability: float  # 0.0 to 1.0
      expected_value: float
      reasoning: str
      auto_execute: bool
      confidence_factors: list[str]
  ```

---

## DEC-008: Multi-Seller Marketplace

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
