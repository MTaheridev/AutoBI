# Internal database

AutoBI stores application state in PostgreSQL via Prisma (`packages/database`).

Local host setups often use `postgresql://postgres:<password>@localhost:5432/autobi_db?schema=public`. Compose uses `autobi`/`autobi` on database `autobi`.

## Sprint 1 models

- `User`
- `Workspace` (includes `timezone` IANA string, default `UTC`, for dashboard datetime display)
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

## Phase 3 models

- `User.emailVerifiedAt`
- `WorkspaceInvite` (email, role, token, expiry, acceptedAt)

## Future models

Embedded analytics SDK, SSO, and marketplace templates remain out of scope.
