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
POST   /api/v1/ai/edit-dashboard
```

Saving a new `spec` increments `currentVersion` and stores an immutable `DashboardVersion` row.

`edit-dashboard` appends widgets from an NL prompt onto the current version (invalid widgets skipped).

## UI

- `/workspace/dashboards` — card grid in the **same Agent shell** as chat (no workshop sidebar); Workshop is a separate mode
- `/workspace/dashboards/generate`
- `/workspace/dashboards/[id]` — responsive grid (container `ResizeObserver` width), drag/resize, NL edit, widgets execute linked queries
- Widget values use `formatCellValue`: ISO/SQL datetimes → locale strings in the **workspace timezone**; numbers → localized grouping
- Workspace timezone: Settings → Timezone (`PATCH /api/v1/workspaces/:id`), default `UTC`

## Responsiveness

Grid width is measured from the content host, not `window.innerWidth`. Main shell uses `min-w-0` / `overflow-x-hidden` so the 12-column layout stays inside the page.
