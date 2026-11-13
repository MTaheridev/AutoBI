# Error handling

How the API shapes errors and how the web app surfaces them today.

## API envelope

All HTTP errors from NestJS go through `AppExceptionFilter` (`apps/api/src/common/exception.filter.ts`).

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": {},
    "requestId": "..."
  }
}
```

| Field | Notes |
| --- | --- |
| `code` | Stable machine id (`UNAUTHORIZED`, `SCHEMA_REQUIRED`, `RATE_LIMITED`, …) |
| `message` | Primary user-facing string from `AppError` / subclasses |
| `details` | Optional; Zod `flatten()` for body validation; may include Nest `HttpException` body |
| `requestId` | Correlates with server logs (`RequestWithId`) |

`INTERNAL_ERROR` responses omit `details` and use a fixed message.

Domain errors live in `packages/shared/src/errors.ts` (`AppError`, `ValidationError`, `ConnectorError`, …).

Body/query validation uses `ZodValidationPipe` → `ValidationError('Validation failed', result.error.flatten())`.

Contracts: `packages/contracts/src/common.ts` (`apiErrorSchema`) documents `error.{code,message,details}` but not `requestId` yet.

## Security: sanitized connector errors

`packages/shared/src/sanitize.ts` — `sanitizeClientError` always returns a **fallback string** (never raw driver text). Used for connection tests, query execution, and failed introspection jobs. Internal detail is stored via `summarizeInternalError` (e.g. `DataSource.lastError`).

## Web client

Single module: `apps/web/src/lib/api.ts`.

- Parses `data.error.message` and `data.error.code` into `ApiError`.
- Does **not** expose `details` or `requestId` on the class.
- Non-JSON or network failures → `message: 'Request failed'`, `code: 'HTTP_ERROR'`.

Pages use a repeated pattern: `setError(err instanceof ApiError ? err.message : '<action> failed')`. Almost nothing branches on `err.code` (exception: invite accept redirects on `401`).

No shared `formatApiError` / error banner component; inline red text in forms and pages.

## Improvement direction (minimal API change)

1. **Web only:** add `details` + `requestId` to `ApiError`; helper to render Zod `fieldErrors` / `formErrors` and map `code` to short titles.
2. **Optional API:** extend `sanitizeClientError` with safe **categories** (timeout vs auth vs host blocked) without leaking driver strings; or return `details: { category: '...' }` alongside fallback `message`.
3. **Contracts:** add optional `requestId` to `apiErrorSchema` for typed clients.
