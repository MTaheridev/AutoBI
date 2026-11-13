# AutoBI — Agent Guide

## Product

AutoBI connects to existing databases and generates interactive, editable dashboards from natural-language instructions.

## Architecture

Modular monolith monorepo:

- `apps/web` — Next.js frontend
- `apps/api` — NestJS REST API
- `apps/worker` — BullMQ background jobs
- `packages/*` — shared libraries (no circular deps)

Prisma is **only** for AutoBI's internal PostgreSQL. External customer DBs use `packages/connectors`.

## Sprint scope

**Sprint 1:** Auth, workspaces, AI provider config, four connectors, schema introspection, data-source UI.

**Sprint 2:** Semantic models — propose entities/metrics/dimensions/relationships (AI or heuristic), human approve/reject UI.

**Sprint 3:** Query engine — structured plans, dialect SQL compile, safety validation, execute + run history UI.

**Sprint 4:** Dashboard engine — JSON specs, widget registry (ECharts), NL generate, versioned layout edits.

**MVP status:** Sprints 1–4 complete the original primary journey. No required Sprint 5.

**Out of scope still:** Embedded SDK, SSO, streaming dashboards, marketplace templates, ETL, MongoDB connector.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

## Security rules

- Never return decrypted credentials or AI API keys in responses
- Never log secrets
- Always authorize workspace access server-side
- AI must not execute arbitrary SQL in MVP
- No AI-generated executable frontend code

## Agent Mode skills

Runtime BI skills for `/workspace/agent` live in `apps/api/src/agent/skills/` (loaded into the system prompt). Keep them aligned with anti-hallucination, anti-rogue, clarify-before-act, datasource onboarding, and semantic-first BI.

## App UX

- Default logged-in landing is **Agent Mode** (`/workspace/agent`)
- Agent surface also includes dashboards (same layout, no sidebar)
- **Workshop** is a separate manual/dev shell — only after the Agent **Workshop** control

## Docs

See `docs/` for architecture, connectors, security, and development setup.
