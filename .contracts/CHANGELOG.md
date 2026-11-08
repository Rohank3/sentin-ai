# Interface & Architecture Changelog

All interface modifications, schema migrations, and architecture pivots must be documented here with timestamps.

## [2026-11-08] Merge AI Engine, AG Studio, and Sandbox Integration into Dev Baseline
- Reconcile accidental PR #7 merge to `main` with `dev` integration baseline.
- `agent.py`: Integrated Google Gemini 2.0 Flash structured outputs using `google-genai` SDK and `AIDecision` Pydantic response schema; hardened with platform autonomy guardrails and comprehensive deterministic risk heuristics.
- `ev_calculator.py`: Enforced mathematically exact EV formulation, added `break_even_probability` analytical helper, input clamping, and partial settlement concession support.
- `rag_store.py`: Built dual-mode hybrid search engine combining Elasticsearch 8.x (BM25 keyword + dense vector kNN) with a zero-dependency in-memory NumPy dense vector cosine similarity fallback; synced with seed fixtures (`policies.json`, `carriers.json`, `customers.json`).
- `DisputeStudio.tsx`, `DisputeDetailDrawer.tsx`, and `DisputeAnalyticsStudio.tsx`: Retained full AG Studio and AG Grid matrix integration with custom cell renderers and comprehensive slide-over inspection drawer.
- Unit test suite: 54/54 backend unit tests passing (`test_ai_engine.py`, `test_paypal_integration.py`, `test_contracts_and_schemas.py`).

## [2026-11-07] Reconcile contracts, synchronize AG Studio grid, and prepare Milestone releases
- Reconcile `MODULES.md` with PR #6 (`feat/ag-studio-integration`) merge: elevate `DisputeStudio.tsx`, `DisputeDetailDrawer.tsx`, and `DisputeAnalyticsStudio.tsx` to STABLE.
- Reconcile frontend dashboard components (`StatsOverview.tsx`, `DemoControlBar.tsx`, `page.tsx`, `layout.tsx`) from STUB to STABLE.
- Update backend module statuses (`routes_disputes.py`, `agent.py`, `rag_store.py`) to reflect operational in-memory and heuristic implementations.
- Prepare milestone release progression: Checkpoint 1 (`v0.1.0-scaffold`), Checkpoint 2 (`v0.2.0-engine`), and Checkpoint 3 (`v0.3.0-matrix`).

## [2026-11-07] AI Engine, EV Calculator, and Hybrid RAG Store Implementation
- Completed implementation of Role 3: AI Engine & RAG Specialist on branch `feat/ai-engine`.
- `ev_calculator.py`: Enforced mathematically exact EV formulation, added `break_even_probability` analytical helper, input clamping, and partial settlement concession support.
- `rag_store.py`: Built dual-mode hybrid search engine combining Elasticsearch 8.x (BM25 keyword + dense vector kNN) with a zero-dependency in-memory NumPy dense vector cosine similarity fallback; synced with seed fixtures (`policies.json`, `carriers.json`, `customers.json`).
- `agent.py`: Integrated Google Gemini 2.0 Flash structured outputs using `google-genai` SDK and `AIDecision` Pydantic response schema; hardened with platform autonomy guardrails and comprehensive deterministic risk heuristics.
- Added comprehensive unit test suite in `backend/tests/test_ai_engine.py` (21 tests covering math, vector retrieval, and claims agent scenarios; 54 total backend tests passing).
- Promoted `agent.py`, `ev_calculator.py`, and `rag_store.py` to `STABLE` in `MODULES.md`.

## [2026-10-31] Integrate dev sandbox setup into PayPal feature branch
- User relayed the Tech Lead request to pull dev and resolve integration conflicts.
- Combine upstream account fields, schema/seed updates, and DEC-012 through DEC-014 with existing PayPal implementation and refund safeguards.
- Preserve PAYPAL_SELLER_ID and an unset webhook default alongside PAYPAL_BUSINESS_ACCOUNT and PAYPAL_BUYER_ACCOUNT; no environment variables renamed.
- Reconcile both contract histories and retain outstanding real Sandbox acceptance gates.

## [2026-10-31] Separate payer messaging from internal refund reasoning
- Replace the truncated AI reasoning in the triage refund note with a fixed,
  neutral payer message containing no dynamic input or risk analysis.
- Retain full reasoning in existing decision/audit records; document that the
  demo API/storage lacks access control and needs deployment protection.
- Regression coverage checks the actual refund payload with long and sensitive
  reasoning. Narrow shared-route change is recorded for Tech Lead review in PR #5.

## [2026-10-31] Refund note length review fix
- Bound the triage refund note to 255 characters before recording an UNKNOWN
  attempt. Preserve full reasoning in the AI decision and audit details.
- Add boundary regression coverage through the real client validation path;
  timeout/reconciliation protections remain unchanged.
- User-authorized narrow shared triage change documented for Tech Lead review in PR #5.

## [2026-10-31] Refund retry review fix
- Reject completed refunds before triage/capture lookup and reject concurrent
  triage of the same process-local dispute record.
- Track refund attempts before dispatch; add get_refund for read-only reconciliation.
  Only verified FAILED/CANCELLED outcomes allow a new attempt; missing refund IDs,
  pending/unknown outcomes and unavailable reconciliation block retries.
- Update the shared triage route narrowly under the user's review-fix request;
  no database schema changes. Persistence and cross-worker locking remain a handoff.

## [2026-10-30] PayPal Sandbox Integration Delivery
- Implemented real Sandbox OAuth2 client credentials flow with token caching and concurrency locking in `backend/app/core/paypal_client.py`.
- Implemented evidence submission (`provide_evidence`) for disputes via PayPal v1 Dispute API with multipart form-data and JSON schemas.
- Implemented dispute claim acceptance (`accept_claim`) via PayPal v1 Dispute API.
- Implemented payments v2 capture refunds (`issue_refund`) with idempotency headers and note limits.
- Added 33 unit tests verifying timeouts, idempotency, rate limits, and fallback scenarios.

## [2026-10-26] Checkpoint 1: Scaffold, Contracts & Database Foundation
- Configured PostgreSQL with async SQLAlchemy engine and Alembic migrations.
- Created DB models: `Seller`, `Customer`, `Dispute`, and `AuditLog`.
- Configured Docker Compose for local development (PostgreSQL, Elasticsearch, Backend).
- Established strict API contracts in `API_CONTRACT.md` and Pydantic schemas in `schemas.py`.
