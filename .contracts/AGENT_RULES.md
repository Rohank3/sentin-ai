# AI Agent Rules — READ BEFORE MODIFYING ANY CODE

> **Every AI agent (Cursor, Copilot, Antigravity, Claude, ChatGPT, etc.) working on
> this project MUST read and follow these rules. No exceptions.**

---

## Rule 1: Read Contracts First

Before modifying ANY file, read these documents:

1. **`.contracts/MODULES.md`** — Check the module's status (`STUB` / `WIP` / `STABLE`)
2. **`.contracts/DECISIONS.md`** — Check active design decisions that affect your work
3. **`.contracts/API_CONTRACT.md`** — Check API endpoint schemas if touching routes or fetch wrappers

If you skip this step and break an interface, the fault is yours.

---

## Rule 2: Never "Fix" Stubs

If a module is marked **`STUB`** in `MODULES.md`:

- ❌ **DO NOT** replace stub/hardcoded return values with a real implementation unless you are the module **owner**
- ❌ **DO NOT** treat hardcoded return values, mock data, or placeholder responses as bugs
- ❌ **DO NOT** add dependencies (pip packages, npm packages) to stub modules
- ✅ **DO** consume the stub's return value as-is in your own module
- ✅ **DO** add a comment `# Consumes STUB: <module_name>` where you call a stub

**Why:** Stubs exist because the real implementation is in progress on another branch by another team member. "Fixing" a stub will break the other person's work.

---

## Rule 3: Update Contracts Before Changing Interfaces

If you change any of the following:

- A function signature (parameters, return type)
- An API endpoint (path, method, request body, response schema)
- A Pydantic schema (add/remove/rename fields)
- A database model (add/remove columns)
- An environment variable name

You MUST:

1. **Update `API_CONTRACT.md`** with the new interface specification FIRST
2. **Add an entry to `CHANGELOG.md`** with a timestamp and description
3. **If the change contradicts a decision in `DECISIONS.md`**, mark the old decision `SUPERSEDED` and add a new decision entry with rationale

Do NOT merge a PR that changes an interface without updating contracts.

---

## Rule 4: Respect Module Ownership

- Check `MODULES.md` for the module **owner** and **branch**
- ❌ **DO NOT** modify files outside your assigned modules without explicit coordination
- ✅ **DO** modify your own modules freely
- ✅ **DO** file an issue or leave a `# REQUEST: <description>` comment if you need a change in another module

Cross-module changes require:
1. Updating `CHANGELOG.md`
2. Notifying the module owner (via PR comment or team chat)

---

## Rule 5: Use Constants, Never Hardcode

| Value | Where to find it | How to use it |
|---|---|---|
| Project name | `backend/app/core/constants.py` → `APP_NAME` | `from app.core.constants import APP_NAME` |
| Project name (frontend) | `frontend/src/lib/constants.ts` → `APP_NAME` | `import { APP_NAME } from '@/lib/constants'` |
| API base URL | `frontend/src/lib/constants.ts` → `API_BASE_URL` | `import { API_BASE_URL } from '@/lib/constants'` |
| PayPal sandbox URL | `backend/app/core/config.py` → `settings.paypal_base_url` | `from app.core.config import settings` |
| Database URL | `backend/app/core/config.py` → `settings.database_url` | `from app.core.config import settings` |
| Elastic URL | `backend/app/core/config.py` → `settings.elastic_url` | `from app.core.config import settings` |

❌ Never hardcode `"Sentin AI"`, `"http://localhost:8000"`, API keys, or service URLs anywhere in the codebase.

---

## Rule 6: Branching Discipline

- Work ONLY on your assigned feature branch (see `MODULES.md`)
- Merge to `dev` via Pull Request only
- `main` branch is protected — only merge from `dev` after integration testing
- If you encounter a merge conflict in `.contracts/` files, the **Tech Lead** resolves it

---

## Rule 7: Stub-Safe Development Pattern

When your code depends on a module that is currently `STUB`:

```python
# ✅ CORRECT: Import and call the stub — it returns safe placeholder data
from app.engine.rag_store import rag_store
results = await rag_store.search_policies("refund policy", seller_id="seller_1")
# results will be hardcoded placeholder data until rag_store is STABLE

# ❌ WRONG: Bypassing the stub with your own implementation
# This creates a parallel code path that will conflict when the real module lands
import elasticsearch
es = elasticsearch.Elasticsearch(...)  # DON'T DO THIS in routes_disputes.py
```

---

## Rule 8: Environment Variables

- All new env vars MUST be added to both:
  - `backend/.env.example` (with a placeholder value)
  - `backend/app/core/config.py` (with a Pydantic field and default)
- Frontend env vars go in `frontend/.env.example` with `NEXT_PUBLIC_` prefix
- Never commit `.env` files — only `.env.example`
