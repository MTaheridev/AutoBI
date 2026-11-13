# AI Engine

Provider-agnostic AI layer with native multi-turn tool calling for Agent Mode.

## Packages

- `@autobi/ai` — `AIProvider` interface (`generateText`, `generateStructured`, `chatWithTools`, `testConnection`), registry, errors
- `@autobi/ai-providers` — **Google Gemini**, **OpenAI**, and **OpenRouter** adapters

## Gemini adapter (`gemini`)

- Native `:generateContent` over `x-goog-api-key`
- Supports both Google AI Studio (`generativelanguage.googleapis.com`) and Vertex AI Express Mode (`aiplatform.googleapis.com`) with automatic surface fallback for `AQ.` and `AIza` keys
- Preserves Gemini 3 `thoughtSignature` across `functionCall` / `functionResponse` turns
- Automatically falls back across available Flash models on `404` / `429` / `503`
- Honors `HTTPS_PROXY` / `HTTP_PROXY` via HTTP CONNECT tunneling when configured

## Workspace keys (create / edit / remove)

UI: `/workspace/ai-settings` or inline inside `/workspace/agent`

- **Create** — pick provider (`gemini`, `openai`, `openrouter`) + model, paste API key, Save
- **Edit** — change model; leave key blank to keep current, or paste a new key to rotate
- **Remove** — delete config (encrypted key wiped)
- **Test** — connectivity check with pasted key or stored key

API keys are AES-256-GCM encrypted at rest and **never** returned after save (`hasKey: true` only).

## API

```text
GET    /api/v1/ai/providers?workspaceId=
POST   /api/v1/ai/providers/config   # create or update (optional configId / apiKey)
POST   /api/v1/ai/providers/test
DELETE /api/v1/ai/providers/config/:id?workspaceId=
```

Requires Admin+ to manage; Member+ can list.

## Product usage

- **Agent Mode** (`/workspace/agent`, `POST /api/v1/agent/chat/stream`) runs up to 20 governed tool-calling turns via `chatWithTools` at `temperature: 0`
- **Clarify answers** — `POST /api/v1/agent/conversations/:id/answer` resumes after an `ask` / `awaiting_input` SSE pause
- **Semantic propose** calls `generateStructured` (falls back to heuristic)
- **Dashboard generate / edit** call `generateStructured` (falls back to heuristic)

## Agent Mode skills & guardrails

Runtime skills are inlined in `apps/api/src/agent/skills/load-skills.ts` and injected into the system prompt:

| Skill | Purpose |
| --- | --- |
| `anti-hallucination` | Cite tool facts only; never invent schema/metrics |
| `anti-rogue` | Do only what was asked; no opportunistic writes |
| `clarify` | Vague asks → `ask_user` with selectable options |
| `datasource-onboarding` | `get_to_know_datasource` before first analytics |
| `bi-semantics` | Prefer approved semantics over column-name guesses |

Extra tools: `ask_user`, `sample_table_rows` (SELECT-only, ≤5 rows), `get_to_know_datasource`.

Server gates: `DATASOURCE_NOT_GROUNDED` before query/dashboard analytics; `CONFIRMATION_REQUIRED` for semantic bulk approve without `userConfirmed=true`.

SSE extras: `ask`, `awaiting_input` (stream ends until the user answers).
