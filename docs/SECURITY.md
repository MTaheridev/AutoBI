# Security

## Credentials

- Data source passwords and AI API keys are encrypted with AES-256-GCM (`ENCRYPTION_KEY`)
- Encrypted payloads are stored as base64(`iv | tag | ciphertext`)
- API responses never include decrypted secrets or raw API keys
- Saved AI configs return `hasKey: true` only

## Authentication

- Passwords hashed with Argon2id
- Sessions stored in Redis; cookie is httpOnly, SameSite=Lax
- Tokens are not stored in `localStorage`

## Authorization

- Every workspace resource is membership-checked server-side
- Client-supplied `workspaceId` values are never trusted without a membership row
- Viewer role cannot mutate data sources or AI configs

## Logging

- Do not log passwords, API keys, session IDs, or decrypted connection configs
- Connector errors return sanitized messages to clients

## Database access

- Prefer read-only customer DB accounts
- Introspection reads catalog metadata only (no business table sampling)
- AI cannot choose workspace/data-source IDs without server authorization
- Query plans are compiled server-side; clients cannot submit arbitrary SQL
- Compiled SQL must pass SELECT-only safety checks before execution
- Filter values are parameterized; identifiers are allow-listed against schema snapshots
