# Security

## Credentials

- Data source passwords and AI API keys are encrypted with AES-256-GCM (`ENCRYPTION_KEY`)
- Encrypted payloads are stored as base64(`iv | tag | ciphertext`)
- API responses never include decrypted secrets or raw API keys
- Saved AI configs return `hasKey: true` only

## Authentication

- Passwords hashed with Argon2id
- Sessions stored in Redis; cookie is httpOnly, SameSite=Lax, **signed** with `SESSION_SECRET`
- `secure` cookie flag in production
- Logout clears cookie with the same path/sameSite/secure/signed options
- Tokens are not stored in `localStorage`
- Auth rate limit: 20 req/min/IP on register/login; lockout after 5 failed logins (15m)
- Password policy: min 10 chars with upper, lower, and digit
- `ALLOW_PUBLIC_REGISTRATION=false` disables open signup (default off in production)
- Sensitive actions write to `AuditLog` (auth, data sources, AI configs, semantic status)

## Authorization

- Every workspace resource is membership-checked server-side via `assertWorkspaceRole`
- Client-supplied `workspaceId` values are never trusted without a membership row
- Role floor: Viewer can execute/read; Member+ mutates queries/dashboards/semantic propose; Admin+ manages data sources and AI keys; Owner-only for Admin invites
- Workspace invites (`WorkspaceInvite`) allow join when public registration is closed (token returned to admin; **no outbound email** yet)
- Email verification tokens stored in Redis; SMTP sends verify/invite mail (`SMTP_URL` required in production). Login **requires** `emailVerifiedAt`. Invite accept for existing users: `POST /workspaces/invites/accept`. Dev may log mail to console when SMTP unset.
- Introspection job status requires membership + matching `job.data.workspaceId` (cross-workspace job IDs return 404)
- Introspection jobs use opaque UUID ids (not sequential BullMQ defaults)

## CSRF / headers

- Helmet security headers on the API
- Mutating requests: Origin/Referer must match `API_CORS_ORIGIN` (required in production)

## Logging

- Do not log passwords, API keys, session IDs, or decrypted connection configs
- Agent Mode (`apps/api/src/agent/redact.ts`) scrubs `password` / `apiKey` / key prefixes (`AQ.`, `AIza`, `sk-`) to `[REDACTED]` before persisting `Conversation` / `Message` rows or streaming tool trace arguments
- Connector/query errors return **categorized sanitized** client messages (`auth` / `unreachable` / `tls` / `host_blocked` / fallback); internals use `summarizeInternalError` for storage only
- Web `formatApiError` surfaces Zod `fieldErrors`, known code hints, and `requestId` on `INTERNAL_ERROR`

## Database access

- Prefer read-only customer DB accounts — connection test warns with `NOT_READONLY` when the DB user looks writable (does not block save)
- Warn operators that writable accounts are not safe for AI-driven querying
- Introspection reads catalog metadata only (no business table sampling)
- AI cannot choose workspace/data-source IDs without server authorization
- Query plans are compiled server-side; clients cannot submit arbitrary SQL
- Compiled SQL must pass SELECT-only safety checks before execution
- Filter values are parameterized; identifiers are allow-listed against schema snapshots
- DB host SSRF guard: blocks loopback/private/link-local/metadata; **resolves DNS** and re-checks every address unless `DB_HOST_ALLOW_PRIVATE=true`
- Auth rate limit uses Express `req.ip`; set `TRUST_PROXY=true` behind a reverse proxy (never trust raw XFF without it)
- Session cookies are **signed-only**; optional `COOKIE_DOMAIN` for split-subdomain
- Workspace throttle on query execute / AI dashboard / semantic propose (Redis)
- Sentry: `@sentry/node` when `SENTRY_DSN` is set
- TLS: certificate verification on by default; `sslAllowInsecure` is explicit opt-in only
- Query timeouts applied on Postgres / MySQL / SQL Server execute paths
- `preferApprovedSemantics` never falls back to Proposed metrics
