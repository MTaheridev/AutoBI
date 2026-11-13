# Query Engine

Sprint 3 delivers validated analytical query plans, dialect SQL compilation, safe execution, and run history.

## Package

`@autobi/query-engine`:

- `queryPlanSchema` — structured plans (not raw SQL from clients/AI)
- Schema allow-list resolution
- Semantic `metricId` resolution (Approved only when `preferApprovedSemantics`; no Proposed fallback)
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

## Joins (Phase 3)

Multi-table plans compile `INNER JOIN` clauses from schema-snapshot FKs plus **Approved** semantic relationships (entity `tableRef` + from/to fields), via `packages/query-engine/src/joins.ts`. Unconnected tables fail closed.

## Limits

- No arbitrary SQL execution endpoint for AI
- Result previews capped in API responses
- Workspace execute concurrency capped; pooled connectors reuse connections per data source

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
