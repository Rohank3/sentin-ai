# GitHub Copilot Instructions for Sentin AI

Read `AGENTS.md` and `.contracts/AGENT_RULES.md` before generating suggestions.

## Mandatory Guardrails:
1. Always import `APP_NAME` from `app.core.constants` or `@/lib/constants`. Never hardcode the brand name.
2. Respect `.contracts/MODULES.md` status. Do not rewrite files marked `STUB` if you do not own them.
3. Keep offline fallback mocks intact in `paypal_client.py`, `agent.py`, and `rag_store.py`.
4. Follow strict TypeScript with explicit interfaces in the frontend.
5. In UI components, provide complete interactive Tailwind states (hover, active, focus-visible, disabled) and loading skeletons.
6. Make atomic commits and open PRs targeting the `dev` branch with structured descriptions.
