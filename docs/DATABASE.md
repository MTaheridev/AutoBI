# Internal database

AutoBI stores application state in PostgreSQL via Prisma (`packages/database`).

## Sprint 1 models

- `User`
- `Workspace`
- `Membership` (`Owner`, `Admin`, `Member`, `Viewer`)
- `AIProviderConfig`
- `DataSource`
- `SchemaSnapshot` (JSONB metadata)
- `AuditLog`

## Sprint 2 models

- `SemanticModel` (workspace + data source)
- `SemanticEntity` (status Proposed/Approved/Rejected)
- `Metric`
- `Dimension`
- `SemanticRelationship`

All primary keys are UUIDs. Workspace-scoped foreign keys are indexed.

## Schema snapshots

`SchemaSnapshot.metadata` stores:

```json
{
  "schemas": ["public"],
  "tables": [{ "schema": "public", "name": "orders", "type": "table", "columns": [] }],
  "relationships": []
}
```

Versions increment per data source. The API returns the latest version.

## Sprint 3 models

- `QueryDefinition` (workspace + data source + JSON plan + compiled SQL)
- `QueryRun` (status, duration, rowCount, resultPreview, error)

## Sprint 4 models

- `Dashboard` / `DashboardVersion` (immutable versioned JSON specs)
- `Conversation` / `Message` (generation transcript)
- `QueryDefinition.dashboardId` optional link

## Future models

Embedded analytics SDK, SSO, and marketplace templates remain out of scope.
