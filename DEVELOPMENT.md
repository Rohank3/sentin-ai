# Development & Engineering Guide

This document outlines team roles, branching conventions, release milestones, and development practices for the Sentin AI project.

---

## 1. Branching & Team Workflow

All teammates work on role-scoped feature branches and merge into `dev` via Pull Requests.

```
main (Deployable production baseline — updated ONLY at milestone releases)
└── dev (Active team integration trunk — all feature PRs target dev)
    ├── feat/core-scaffold       [Owner: Tech Lead]
    ├── feat/paypal-integration  [Owner: PayPal Dev]
    ├── feat/ai-engine           [Owner: AI Dev]
    ├── feat/frontend-grid       [Owner: Frontend Grid Dev]
    └── feat/frontend-ux         [Owner: Frontend UX Dev]
```

### Starting Work on a Feature Branch
```bash
git checkout feat/<your-role>
git pull origin dev
```

---

## 2. Milestone Release Checkpoints (`dev` ➔ `main`)

Releases are promoted from `dev` to `main` at 5 defined milestones with git release tags:

| Checkpoint | Target Date | Milestone | Scope & Deliverables |
|---|---|---|---|
| **Checkpoint 1** | Oct 28, 2026 | `v0.1.0-scaffold` | Core contracts frozen, Alembic migrations configured, Docker environment operational, seed data in place. |
| **Checkpoint 2** | Nov 02, 2026 | `v0.2.0-engine` | PayPal sandbox OAuth2 + Gemini 2.0 Flash EV decision agent (`feat/paypal-integration` + `feat/ai-engine`). |
| **Checkpoint 3** | Nov 07, 2026 | `v0.3.0-matrix` | AG Studio interactive matrix and dispute evidence drawer fully operational (`feat/frontend-grid`). |
| **Checkpoint 4** | Nov 10, 2026 | `v0.9.0-rc` | 1-Click scenario injector bar verified, pitch rehearsal complete, live cloud deployment on Render tested (`feat/frontend-ux`). |
| **Checkpoint 5** | Nov 12, 2026 | `v1.0.0-final` | **Final Release**. Final merge `dev` ➔ `main`, demo video linked, release tag created. |

---

## 3. Pull Request Guidelines

To keep collaboration clean and professional:

1. **Title**: Use conventional commits (e.g., `feat(paypal): integrate capture refund API`).
2. **Description**: Include:
   - **Summary**: Concise bullet points explaining what was built or changed.
   - **Verification**: Exact commands run and test outputs proving zero regressions.
3. **Keep PRs Focused**: Avoid huge catch-all PRs. Focus on completing your module's milestone deliverables.

---

## 4. Verification Gate

Before submitting any Pull Request:

```bash
# Backend syntax & type verification
python -m py_compile backend/app/main.py backend/app/api/*.py backend/app/core/*.py backend/app/engine/*.py backend/app/models/*.py

# Run unit tests
cd backend && python tests/test_contracts_and_schemas.py

# Frontend production build
cd frontend && npm run build
```
All commands must pass with exit code 0.
