# Interface & Architecture Changelog

All interface modifications, schema migrations, and architecture pivots must be documented here with timestamps.

## [2026-10-26] Schema Harmonization & Docker Environment Hardening
- Harmonized `Customer` SQLAlchemy model, Alembic initial migration (`0001_initial_schema`), and `customers.json` fixtures (`full_name`, `total_spend`, `total_orders`, nullable `paypal_payer_id`).
- Fixed bidirectional relationship mapping between `Dispute` and `Customer` (`back_populates="disputes"`).
- Added `sellers.json` seed fixtures and `seed_database()` routine for automated DB initialization.
- Hardened `docker-compose.yml` with optional `backend/.env` parsing and container network environment defaults (`DATABASE_URL`, `ELASTIC_URL`).
- Expanded contract and schema unit tests from 5 to 8 tests covering schema parsing and customer fixture constraints.

## [2026-10-25] Initial System Scaffold & Contract Freeze
- Initialized core architecture contracts (`AGENT_RULES.md`, `MODULES.md`, `DECISIONS.md`, `API_CONTRACT.md`).
- Established single source of truth for project branding via `APP_NAME` in `constants.py` and `constants.ts`.
- Configured PostgreSQL 16 + Elasticsearch 8.15.0 Docker Compose specifications.
- Registered core Pydantic dispute evaluation schemas and PayPal Dispute API schemas.
