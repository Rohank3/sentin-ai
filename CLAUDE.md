# Claude Code / Anthropic Instructions for Sentin AI

Refer to `AGENTS.md` and `.contracts/` for project guidelines, architectural decisions, and module ownership.

## Key Principles:
- **Project Context**: PayPal AI Global Hackathon 2026.
- **Architecture**: Next.js 14 App Router + Tailwind + AG Studio (frontend) & FastAPI + SQLAlchemy + Gemini 2.0 Flash + Elasticsearch (backend).
- **Naming Rule**: Project name is dynamic. Import `APP_NAME` from constants. Never hardcode.
- **Stub Safety**: Do NOT "fix" or dismantle stubs in modules you don't own. Check `.contracts/MODULES.md`.
- **Scope Limits**: No custom user auth/login. No multi-cloud Kubernetes. Preserve offline fallbacks.
- **Verification Gate**:
  - Run `python -m py_compile <path>` on backend edits.
  - Run `npm run build` in `frontend/` on frontend edits before declaring done.
- **Git & PR Protocol**:
  - Make atomic conventional commits (`feat:`, `fix:`, `docs:`, `test:`).
  - Open a formal Pull Request targeting `dev` (`gh pr create`) upon completing feature milestones.
