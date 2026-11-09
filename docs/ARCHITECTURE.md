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

Argon2id password hashes. Redis-backed sessions in httpOnly cookies (`autobi_session`). Workspace access is always checked via `Membership`.

## Data source flow

```text
Create DataSource → encrypt config → test via connector
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
  → compile dialect SQL (parameterized)
  → safety validate
  → execute via connector
  → store QueryRun + result preview
```

## Dashboard flow

```text
NL prompt → AI/heuristic proposal
  → QueryDefinitions per widget
  → DashboardVersion JSON spec
  → frontend widget registry + grid layout
```
