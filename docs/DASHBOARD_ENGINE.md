# Dashboard Engine

Sprint 4 delivers versioned JSON dashboard specs, widget registry rendering, and NL generation.

## Package

`@autobi/dashboard-engine`:

- `dashboardSpecSchema` / `dashboardWidgetSchema`
- `dashboardProposalSchema` for AI/heuristic proposals
- Heuristic proposer from schema metadata
- Prompt helpers for structured AI output

## Widgets

Supported types: `kpi`, `line`, `bar`, `area`, `pie`, `donut`, `table`.

AI cannot inject components, HTML, or JavaScript. Unknown widget types are rejected by Zod and ignored by the UI registry.

## Generation flow

```text
User prompt + dataSource
  → AI or heuristic proposal (widgets with metric/dimension fields)
  → create QueryDefinition per widget (compile + safety)
  → create Dashboard + DashboardVersion(spec with queryIds)
  → UI renders via widget registry + react-grid-layout
```

## API

```text
GET    /api/v1/dashboards?workspaceId=
POST   /api/v1/dashboards
GET    /api/v1/dashboards/:id
PATCH  /api/v1/dashboards/:id
DELETE /api/v1/dashboards/:id
GET    /api/v1/dashboards/:id/versions
GET    /api/v1/dashboards/:id/versions/:version
POST   /api/v1/ai/generate-dashboard
```

Saving a new `spec` increments `currentVersion` and stores an immutable `DashboardVersion` row.

## UI

- `/workspace/dashboards`
- `/workspace/dashboards/generate`
- `/workspace/dashboards/[id]` — grid layout, drag/resize saves a new version, widgets execute linked queries
