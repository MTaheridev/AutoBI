# Architecture

AutoBI is a modular monolith in a pnpm monorepo.

## Runtime services

- **web** — Next.js App Router UI (cookie session to API)
- **api** — NestJS REST API under `/api/v1`
- **worker** — BullMQ consumer for schema introspection
- **postgres** — AutoBI internal database (Prisma)
- **redis** — sessions + job queues

## Package boundaries

| Package | Responsibility |
| --- | --- |
| `shared` | Errors, crypto, roles |
| `contracts` | Zod API/domain schemas |
| `config` | Env validation |
| `database` | Prisma schema + client |
| `connectors` | External DB adapters |
| `ai` / `ai-providers` | Provider-agnostic AI layer |
| `query-engine` | Query plans, compile, safety, execution helpers |
| `semantic-engine` | Entities, metrics, dimensions, proposals, approval |
| `dashboard-engine` | Dashboard specs, proposals, widget contracts |

Rules:

- No circular package dependencies
- Prisma never connects to customer databases
- Connectors never import Nest or Prisma
- AI providers never receive database credentials

## Auth model

Argon2id password hashes. Redis-backed sessions in **signed-only** httpOnly cookies (`autobi_session`, optional `COOKIE_DOMAIN`). Workspace access uses `Membership` + `assertWorkspaceRole`. SMTP sends verify/invite mail; login requires `emailVerifiedAt`. Auth + workspace action rate limits (Redis). Helmet + CSRF Origin/Referer. Optional `TRUST_PROXY` for `req.ip`.

## Data source flow

```text
Test connection (ephemeral + readonly probe) → Create/Update DataSource → encrypt config
                 → enqueue introspection job
                 → worker introspects → SchemaSnapshot JSONB
                 → UI reads latest snapshot
```

## Semantic flow

```text
Create SemanticModel → Propose (AI or heuristic)
                    → store Proposed definitions
                    → human Approve / Reject
                    → Approved preferred for later query planning
```

## Query flow

```text
Create QueryDefinition (structured plan)
  → resolve metricIds / allow-list fields
  → compile dialect SQL + INNER JOINs from snapshot FKs
  → safety validate
  → execute via pooled connector (concurrency-capped)
  → store QueryRun + result preview
```

## Dashboard flow

```text
NL prompt → AI/heuristic proposal
  → QueryDefinitions per widget
  → DashboardVersion JSON spec
  → frontend widget registry + grid layout
  → optional NL edit appends widgets as a new version
```

## App surfaces (two separate products)

- **Agent Mode** (default) — `/workspace/agent` + `/workspace/dashboards*` share one immersive shell (no workshop sidebar). Header: Agent · Dashboards.
- **Workshop** — manual tools only after Agent header **Workshop**; full sidebar. Agent-mode users hitting workshop-only URLs are redirected to Agent.
- Preference key: `localStorage.autobi_app_mode` (`agent` | `workshop`)

## Agent Mode flow (`/workspace/agent`)

```text
User chat prompt → POST /api/v1/agent/chat/stream (SSE)
  → AgentService multi-turn loop (Gemini / OpenAI / OpenRouter chatWithTools, temp 0)
  → BI skills from apps/api/src/agent/skills/ (anti-hallucination, anti-rogue, clarify,
    datasource onboarding, bi-semantics)
  → Governed tools: overview, test/create/update DS, introspect, inspect_schema,
    ask_user, sample_table_rows, get_to_know_datasource, manage_semantic_model,
    create_and_run_query, save_dashboard
  → Vague / unclear → ask_user SSE (ask + awaiting_input) → selectable UI answers
    → POST /api/v1/agent/conversations/:id/answer resumes the loop
  → First analytics on a DS requires get_to_know_datasource (structure + ≤5 sample rows)
  → secret redaction on persisted Conversation / Message + tool traces
  → live split-screen dashboard canvas preview
```

Dashboard widgets format ISO/SQL datetimes via the workspace `timezone` (Settings) and keep the grid width inside the content column (`ResizeObserver`, not viewport math).
