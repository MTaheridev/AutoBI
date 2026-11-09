# AI Engine

Sprint 1 delivers provider abstraction only — no dashboard generation yet.

## Packages

- `@autobi/ai` — `AIProvider` interface, registry, structured/text contracts, errors
- `@autobi/ai-providers` — OpenAI and OpenRouter adapters

## Capabilities

- Save encrypted workspace provider configs
- Test provider connectivity
- Structured JSON output validation (Zod) for future workflows
- Token usage capture when the provider returns it
- Rate-limit and provider error mapping

## API

```text
GET    /api/v1/ai/providers?workspaceId=
POST   /api/v1/ai/providers/config
POST   /api/v1/ai/providers/test
DELETE /api/v1/ai/providers/config/:id?workspaceId=
```

API keys are never returned after save.

## Sprint 2 usage

`POST /api/v1/semantic-models/:id/propose` may call the workspace AI provider for structured semantic proposals. Failures fall back to the deterministic heuristic in `@autobi/semantic-engine`. All AI outputs are stored as `Proposed` until a human approves them.

`POST /api/v1/ai/generate-dashboard` returns a structured dashboard proposal only (no executable code). The API compiles widget query plans through the query engine before saving a versioned dashboard spec.
