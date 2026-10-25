# Autonomous Agent & AI Pairing Instructions (AGENTS.md)

> **MANDATORY INSTRUCTION FOR ALL AI CODING ASSISTANTS:**
> If you are an AI assistant (Cursor, Antigravity, Claude, Copilot, Windsurf, ChatGPT, etc.) working on this repository, you **MUST** read and strictly adhere to this document and `.contracts/` before executing commands or generating code.

---

## 1. Project Mission & Hackathon Context

This project is an entry for the **PayPal AI Global Hackathon 2026** ("Build What's Next with PayPal and AI").
- **Product Name**: Dynamic (Defined in `backend/app/core/constants.py` and `frontend/src/lib/constants.ts` via `APP_NAME`). Current value: `"Sentin AI"`. **NEVER hardcode this name anywhere in code.**
- **The Core Value Proposition**: Autonomously ingest PayPal dispute events, search carrier Proof-of-Delivery (PoD) and store policies via **Elasticsearch Hybrid RAG**, compute optimal resolution strategies (Contest vs. Settle vs. Refund) using mathematical **Expected Value (EV)**, and execute the actions via **PayPal Disputes v1 & Payments v2 APIs** while rendering an executive risk operations matrix using **AG Studio**.

---

## 2. Scope Guardrails: Preventing Under-Engineering & Over-Engineering

To prevent AI agents from getting lost in unnecessary rabbit holes (over-engineering) or writing trivial mockups that fail judging (under-engineering), adhere to these exact boundaries:

### 🚫 STRICTLY OUT OF SCOPE (DO NOT OVER-ENGINEER):
1. **NO User Authentication / SSO**: Do NOT build complex JWT logins, OAuth user authentication, multi-factor auth, or password reset flows for merchants. The dashboard is an internal risk command center for hackathon demonstration. PayPal OAuth2 is handled server-side via `paypal_client.py`.
2. **NO Multi-Cloud Infrastructure**: Do NOT write complex Kubernetes manifests, Terraform scripts, or AWS CDK stacks. We use standard `docker-compose.yml` for local dev and Render for cloud deployment.
3. **NO Custom Vector DB Microservices**: Do NOT spin up Milvus, Weaviate, or Chroma microservice clusters. We use **Elasticsearch 8.x** (with the built-in SQLite/NumPy fallback already in `rag_store.py`).
4. **NO Rewriting the Grid**: Do NOT replace AG Studio / AG Grid with raw HTML tables or other grid libraries.
5. **NO Arbitrary Architecture Shifts**: Do NOT switch the backend from FastAPI to Node.js or switch the frontend from Next.js 14 to Vite.

### 🎯 STRICTLY IN SCOPE (DO NOT UNDER-ENGINEER):
1. **Strict TypeScript & Pydantic Validation**: Every API request and response must strictly match the types in `.contracts/API_CONTRACT.md`, `backend/app/models/schemas.py`, and `frontend/src/lib/api.ts`.
2. **Always Keep Mock Fallbacks Operational**: If external credentials (`GEMINI_API_KEY`, `PAYPAL_CLIENT_ID`, `ELASTIC_URL`) are missing or offline, the system **MUST NOT CRASH**. Always preserve the graceful fallback heuristics already built into `agent.py`, `paypal_client.py`, and `rag_store.py`.
3. **Real PayPal API Structure**: When writing PayPal calls, use real PayPal Sandbox schemas (e.g., `POST /v1/customer/disputes/{id}/provide-evidence` with `PROOF_OF_FULFILLMENT`, tracking numbers, and carrier names).
4. **Interactive UI States**: Every button, input, and modal in the frontend must have hover, active, focus-visible, and disabled states. Never display blank unstyled HTML or `// TODO` comments.
5. **Always Run Verification**: Before finishing your turn:
   - Backend changes: `python -m py_compile <modified_file>`
   - Frontend changes: `npm run build` in `frontend/`

---

## 3. Team Roles, Branches & Module Ownership

The project is built by 5 team members working in parallel across specialized feature branches:

```
main (Deployable production baseline — updated ONLY at release checkpoints)
└── dev (Active team integration branch — all feature PRs target dev)
    ├── feat/core-scaffold       [Owner: Tech Lead]
    ├── feat/paypal-integration  [Owner: PayPal Dev]
    ├── feat/ai-engine           [Owner: AI Dev]
    ├── feat/frontend-grid       [Owner: Frontend Grid Dev]
    └── feat/frontend-ux         [Owner: Frontend UX Dev]
```

### Developer Starting Workflow:
Every teammate starts by pulling the latest integration baseline from `dev`:
```bash
git checkout feat/<your-role>
git pull origin dev
```

### Role 1: Tech Lead / Scaffold Engineer (`feat/core-scaffold`)
- **Owns**: `.contracts/*`, `backend/app/core/constants.py`, `backend/app/core/config.py`, `backend/app/core/database.py`, `backend/app/models/*`, `docker-compose.yml`, `Dockerfile`, `backend/alembic/*`.
- **Target**: Maintain clean contracts, shared Pydantic/SQLAlchemy schemas, and Docker configs.

### Role 2: PayPal API Integration Engineer (`feat/paypal-integration`)
- **Owns**: `backend/app/core/paypal_client.py`, `backend/app/api/routes_webhooks.py`, `backend/app/api/routes_simulate.py`.
- **Target**:
  - Implement token cache for PayPal Sandbox OAuth2 (`/v1/oauth2/token`).
  - Wire `/v1/customer/disputes/{id}/provide-evidence` and `/v2/payments/captures/{id}/refund`.
  - Maintain the 1-click test scenario simulator in `routes_simulate.py`.

### Role 3: AI Engine & RAG Specialist (`feat/ai-engine`)
- **Owns**: `backend/app/engine/agent.py`, `backend/app/engine/ev_calculator.py`, `backend/app/engine/rag_store.py`.
- **Target**:
  - Google Gemini 2.0 Flash structured outputs via `google-genai` SDK and `AIDecision` Pydantic model.
  - Elasticsearch hybrid query (BM25 text match + dense vector kNN) over store policies and carrier tracking.
  - EV Calculator mathematical precision: `EV(Contest) = WinProb * (Amount) - (1 - WinProb) * (Amount + Fee) - Labor`.

### Role 4: Frontend Grid & AG Studio Specialist (`feat/frontend-grid`)
- **Owns**: `frontend/src/components/DisputeStudio.tsx`, `frontend/src/components/DisputeDetailDrawer.tsx`.
- **Target**:
  - Embedded AG Studio / AG Grid matrix with custom renderers for dispute statuses and AI confidence pills.
  - Detail drawer displaying retrieved policy clauses, carrier tracking logs, and EV cost comparisons.

### Role 5: Frontend UX & Demo Delivery (`feat/frontend-ux`)
- **Owns**: `frontend/src/components/StatsOverview.tsx`, `frontend/src/components/DemoControlBar.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/layout.tsx`.
- **Target**:
  - Executive KPI metrics ($ protected, exposure at risk, win rate, autonomy count).
  - 1-Click scenario injector bar for live demo pitches.
  - Polish layout, mobile responsiveness, and 3-minute pitch video preparation.

---

## 4. Stub Safety & Workaround Protocol

You may encounter modules that return hardcoded mock data or placeholder values (marked `STUB` in `.contracts/MODULES.md`).
- **NEVER assume a stub is a bug.**
- **NEVER overwrite another teammate's stub with an incompatible custom implementation.**
- If you depend on a module that is currently a `STUB`, consume its documented interface as specified in `.contracts/API_CONTRACT.md`.
- If an interface must change, update `.contracts/API_CONTRACT.md` and log the rationale in `.contracts/CHANGELOG.md` before writing code.

---

## 5. Pre-Delivery Verification Checklist

Before you declare your coding task complete, execute these exact verification commands:

```bash
# 1. Backend Syntax & Type Verification
python -m py_compile backend/app/main.py backend/app/api/*.py backend/app/core/*.py backend/app/engine/*.py backend/app/models/*.py

# 2. Frontend Next.js Production Build
cd frontend
npm run build
```

Both commands must exit with code 0.

---

## 6. Professional Git Workflow: Atomic Commits & Pull Requests

To maintain a professional git history for hackathon judging and seamless collaboration:

1. **Atomic Conventional Commits**:
   - Break your work into logical, bite-sized commits.
   - Use standard conventional prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
   - Never create massive catch-all commits like `"fixed everything"` or `"changes"`.
2. **Pull Request Protocol**:
   - Work strictly on your designated `feat/<role>` branch.
   - When completing a milestone, push your branch and open a formal Pull Request targeting `dev` (`gh pr create`).
   - Every PR must include:
     - Clear title and summary of changes.
     - Affected modules and contract checklist.
     - Verification proof (command outputs from verification gate).
3. **No Direct Pushes to `main`**:
   - Only merged code from `dev` enters `main` at milestone checkpoints.

---

## 7. Milestone Release Checkpoints (`dev` -> `main`)

We do not merge into `main` after every small commit. Instead, `dev` is promoted to `main` at 5 defined milestones with git release tags:

| Checkpoint | Target Date | Milestone Release | Merge Criteria & Artifacts |
|---|---|---|---|
| **Checkpoint 1** | Oct 28, 2026 | `v0.1.0-scaffold` | Core contracts frozen, Alembic migrations configured, Docker environment operational, seed data in place. |
| **Checkpoint 2** | Nov 02, 2026 | `v0.2.0-engine` | `feat/paypal-integration` + `feat/ai-engine` merged into `dev`. Real sandbox OAuth2 + Gemini 2.0 Flash EV arbitration tested. |
| **Checkpoint 3** | Nov 07, 2026 | `v0.3.0-matrix` | `feat/frontend-grid` merged into `dev`. AG Studio interactive matrix and dispute evidence drawer fully operational. |
| **Checkpoint 4** | Nov 10, 2026 | `v0.9.0-rc` | `feat/frontend-ux` merged into `dev`. 1-Click scenario injector bar verified, pitch rehearsal complete, live cloud deployment on Render tested. |
| **Checkpoint 5** | Nov 12, 2026 | `v1.0.0-final` | **Final Hackathon Submission**. Final merge `dev` -> `main`, YouTube 3-minute demo video linked, Devpost project submitted. |

### How to Execute a Milestone Release to `main`:
Only the Tech Lead executes the milestone merge:
```bash
git checkout main
git merge dev --no-ff -m "release: milestone vX.X.X [Checkpoint N]"
git tag -a "vX.X.X" -m "Milestone release vX.X.X"
git push origin main --tags
```
