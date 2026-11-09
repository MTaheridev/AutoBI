# Semantic Engine

Sprint 2 delivers business semantic modeling on top of introspected schemas.

## Package

`@autobi/semantic-engine` provides:

- Proposal Zod contracts (`semanticProposalSchema`)
- Compact schema context for AI prompts (metadata only)
- Deterministic heuristic proposals (offline / fallback)
- Approval helpers (`preferApproved`, `canTransition`)

## Status model

Definitions are never trusted by default:

- **Proposed** — AI, heuristic, or user draft
- **Approved** — human-reviewed; preferred for future query generation
- **Rejected** — discarded; can reopen to Proposed

Re-running Propose replaces only **Proposed** rows. Approved and Rejected items are kept.

## Sources

- `ai` — structured AI output
- `inferred` — rule-based heuristic from schema
- `user` — manually created definitions

## API

```text
GET    /api/v1/semantic-models?workspaceId=
POST   /api/v1/semantic-models
GET    /api/v1/semantic-models/:id
DELETE /api/v1/semantic-models/:id
POST   /api/v1/semantic-models/:id/propose
POST   /api/v1/semantic-models/:id/entities|metrics|dimensions|relationships
PATCH  /api/v1/semantic-models/:id/{entities|metrics|dimensions|relationships}/:itemId/status
POST   /api/v1/semantic-models/:id/bulk-status
```

Propose requires a schema snapshot on the linked data source. If AI is unavailable or fails, the heuristic proposer is used.

## UI

- `/workspace/semantic-models` — list / create
- `/workspace/semantic-models/[id]` — review, approve, reject, bulk approve
