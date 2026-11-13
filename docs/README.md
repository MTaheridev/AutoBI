# AutoBI documentation

Presentation assets and deep-dive guides for the monorepo.

## Presentation assets

| Asset | Use |
| --- | --- |
| [autobi-hero.jpg](assets/autobi-hero.jpg) | GitHub README + web marketing hero (`apps/web/public`) |
| [logo.svg](assets/logo.svg) | Product mark |
| [architecture.svg](assets/architecture.svg) | Runtime overview diagram |

The root [README](../README.md) is the GitHub landing page.

## Guides

| Doc | Topic |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Services, packages, auth, data flows |
| [CONNECTORS.md](CONNECTORS.md) | Customer database adapters |
| [SEMANTIC_ENGINE.md](SEMANTIC_ENGINE.md) | Entities, metrics, approval |
| [QUERY_ENGINE.md](QUERY_ENGINE.md) | Plans, compile, safety, execute |
| [DASHBOARD_ENGINE.md](DASHBOARD_ENGINE.md) | Specs, widgets, versions |
| [AI_ENGINE.md](AI_ENGINE.md) | Provider-agnostic AI layer, Agent Mode skills & clarify SSE |
| [SECURITY.md](SECURITY.md) | Trust boundaries and crypto |
| [ERROR_HANDLING.md](ERROR_HANDLING.md) | API error envelope and web UX |
| [DATABASE.md](DATABASE.md) | Prisma / internal Postgres |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup and commands |
| [PRD.md](PRD.md) | Product requirements summary |
| [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) | Code review · gap to production |
| [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md) | Step IDs (P1–P4) |
| [DEPLOY.md](DEPLOY.md) | Production compose / secrets / backups |

## Status

**AutoBI 1.0.0** — Agent Mode, connectors, semantic layer, query engine, and dashboards shipped.

Private pilot ready; public SaaS conditional on the [DEPLOY.md](DEPLOY.md) checklist. See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).
