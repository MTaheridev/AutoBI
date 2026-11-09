# Query Engine

Sprint 3 delivers validated analytical query plans, dialect SQL compilation, safe execution, and run history.

## Package

`@autobi/query-engine`:

- `queryPlanSchema` — structured plans (not raw SQL from clients/AI)
- Schema allow-list resolution
- Semantic `metricId` resolution (prefers Approved)
- Dialect compilers: PostgreSQL, MySQL, MariaDB, SQL Server
- Safety checks: SELECT-only, no multi-statements, forbidden keyword block, parameterized filters, max limit

## Plan shape

```json
{
  "dataSourceId": "uuid",
  "metrics": [{ "metricId": "uuid", "aggregation": "sum", "alias": "revenue" }],
  "dimensions": [{ "field": "public.orders.status", "alias": "status" }],
  "filters": [{ "field": "public.orders.status", "operator": "eq", "value": "paid" }],
  "sort": [{ "field": "revenue", "direction": "DESC" }],
  "limit": 100
}
```

## Limits (Sprint 3)

- Single-table plans only (joins deferred)
- No arbitrary SQL execution endpoint for AI
- Result previews capped in API responses

## API

```text
GET    /api/v1/queries?workspaceId=
POST   /api/v1/queries
GET    /api/v1/queries/:id
PATCH  /api/v1/queries/:id
DELETE /api/v1/queries/:id
POST   /api/v1/queries/:id/compile
POST   /api/v1/queries/:id/execute
```

## UI

- `/workspace/queries`
- `/workspace/queries/new`
- `/workspace/queries/[id]` — compile, execute, preview, run history
