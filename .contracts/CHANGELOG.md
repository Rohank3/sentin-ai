# Interface & Architecture Changelog

All interface modifications, schema migrations, and architecture pivots must be documented here with timestamps.

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

## [2026-10-25] Initial System Scaffold & Contract Freeze
- Initialized core architecture contracts (`AGENT_RULES.md`, `MODULES.md`, `DECISIONS.md`, `API_CONTRACT.md`).
- Established single source of truth for project branding via `APP_NAME` in `constants.py` and `constants.ts`.
- Configured PostgreSQL 16 + Elasticsearch 8.15.0 Docker Compose specifications.
- Registered core Pydantic dispute evaluation schemas and PayPal Dispute API schemas.
