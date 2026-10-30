# Interface & Architecture Changelog

All interface modifications, schema migrations, and architecture pivots must be documented here with timestamps.

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

## [2026-10-30] Verified CodeRabbit findings
- Restore DEC-014 credential precedence: named seller pair first, platform fallback
  only when both fields are absent; unknown sellers/incomplete pairs fail explicitly.
- Add resolve_capture_id and use it in the triage REFUND branch; verify a single
  seller transaction using Payments v2 before refunding. Keep the PP- guard unchanged.
- Refund triage leaves auto_executed false on resolution/request failure or a
  non-COMPLETED response; audit details report the returned status.
- User-authorized narrow shared-module fix in routes_disputes.py; record the
  handoff in PR #5. No AI behavior or database schemas changed.
- Isolate the offline scenario test from configured Gemini and Elasticsearch clients.

## [2026-10-30] PayPal implementation and acceptance contract update
- User explicitly requested contract updates to match delivered PayPal work.
- Corrected the simulator response example to use SIM- IDs and documented explicit
  overrides, local creation semantics, and triage failure responses.
- Specified webhook validation, status mapping, deduplication limits, ordering,
  pending real triage, and current error envelopes, including 409/422 responses.
- Documented client method interfaces, multipart evidence, refund acknowledgement
  semantics, token refresh, and retry limitations without changing runtime code.
- Recorded verified real Sandbox OAuth and read-only API access separately from
  mock-tested mutations; registered-webhook and end-to-end acceptance remain pending.
- Recorded the user's local-only operation choice until team deployment and the
  Tech Lead/PayPal Dev acceptance handoff in MODULES.md.
- Flagged upstream DEC-014 credential-policy differences for Tech Lead review in
  PR #5; no active decision superseded and no shared merge conflicts resolved.

## [2026-10-26T21:00:00+05:30] PayPal integration
- Preserve existing client calls and API response schemas; add optional refund request IDs.
- Specify verified webhooks, process-local deduplication, safe seller routing and explicit local simulations.
- Necessary shared configuration additions: PAYPAL_WEBHOOK_ID and PAYPAL_SELLER_ID
  in config.py and .env.example. Tech Lead review requested with the feature PR.
- Handoff to Tech Lead: persist webhook receipts/disputes; connect real capture IDs;
  mark execution successful only after API acknowledgement; replace hardcoded
  evidence in routes_disputes.py before enabling automatic webhook triage.
- No changes to other owners' dispute/AI/frontend implementations.

## [2026-10-26] PayPal Sandbox Credential & Account Topology Specification
- Logged DEC-014 in `DECISIONS.md`: Documented shared team Sandbox credential strategy and multi-account topology.
- Added Sandbox Merchant Business account (`PAYPAL_BUSINESS_ACCOUNT`) and Buyer Personal account (`PAYPAL_BUYER_ACCOUNT`).
- Updated `backend/.env.example` and `backend/app/core/config.py` with PayPal Sandbox account fields and reference IDs.
- Documented PayPal Disputes v1 and Payments v2 Sandbox API endpoints in `API_CONTRACT.md`.

## [2026-10-26] Schema Harmonization & Docker Environment Hardening
- Harmonized `Customer` SQLAlchemy model, Alembic initial migration (`0001_initial_schema`), and `customers.json` fixtures (`full_name`, `total_spend`, `total_orders`, nullable `paypal_payer_id`).
- Documented persisted database entity schemas and field nullability in `API_CONTRACT.md` (`Customer`, `Seller`, `Dispute`, `AuditLog`).
- Fixed bidirectional relationship mapping between `Dispute` and `Customer` (`back_populates="disputes"`).
- Registered models prior to `Base.metadata.create_all` in `init_db()` and decoupled seller/customer seeding with idempotent key checks.
- Added `sellers.json` seed fixtures and `seed_database()` routine for automated DB initialization.
- Hardened `docker-compose.yml` with tiered `env_file` layering (`backend/.env.docker` container defaults overridden by optional `backend/.env`), preserving custom URLs while preventing localhost fallback when `.env` is absent.
- Expanded contract and schema unit tests from 5 to 8 tests covering schema parsing and customer fixture constraints.

## [2026-10-25] Initial System Scaffold & Contract Freeze
- Initialized core architecture contracts (`AGENT_RULES.md`, `MODULES.md`, `DECISIONS.md`, `API_CONTRACT.md`).
- Established single source of truth for project branding via `APP_NAME` in `constants.py` and `constants.ts`.
- Configured PostgreSQL 16 + Elasticsearch 8.15.0 Docker Compose specifications.
- Registered core Pydantic dispute evaluation schemas and PayPal Dispute API schemas.
