# Connectors

External databases are accessed only through `@autobi/connectors`.

## Supported types (Sprint 1)

| Type | Driver | Notes |
| --- | --- | --- |
| `postgresql` | `pg` | information_schema introspection |
| `mysql` | `mysql2` | Dedicated MySQL adapter |
| `mariadb` | `mysql2` | Separate class + MariaDB detection tests |
| `sqlserver` | `tedious` | sys catalog introspection |

## Interface

Each adapter implements `DatabaseConnector`:

- `testConnection`
- `connect` / `close`
- `getSchemas` / `getTables` / `getColumns` / `getRelationships`
- `introspect`
- `executeQuery` (prepared for later query engine; read-only usage expected)

## Connection test & readonly probe

`testConnection` connects, runs a version query, then a **non-mutating** privilege probe:

| Dialect | Probe |
| --- | --- |
| PostgreSQL | superuser / CREATEDB / CREATE on DB / INSERT\|UPDATE\|DELETE table grants |
| MySQL / MariaDB | `SHOW GRANTS` parsed for write-capable privileges |
| SQL Server | sysadmin / db_owner / `fn_my_permissions` write perms |

Result shape: `{ ok, message, latencyMs?, serverVersion?, readonlyLikely?, warnings? }`.  
`warnings` may include `NOT_READONLY` (prefer a read-only DB user; not safe for AI-driven querying). Non-readonly is **warn-only** — create/test still succeed.

Client-facing failures use categorized messages (`auth`, `unreachable`, `tls`, `host_blocked`) via `sanitizeClientError` — never raw driver text.

## Inferred relationships & dialect timeouts

- PostgreSQL and MySQL/MariaDB introspection infer `source: 'inferred'` relationships from `*_id`, `*_uid`, and `*_uuid` columns matching peer `id` / `uid` / `uuid` columns when explicit FK constraints are absent.
- Query execution sets `max_statement_time` (seconds) on MariaDB and `max_execution_time` (ms) on MySQL.

## API test endpoints

- `POST /api/v1/data-sources/test` — ephemeral body `{ workspaceId, type, config, dataSourceId? }` (Admin+). Blank password + `dataSourceId` merges the stored secret.
- `POST /api/v1/data-sources/:id/test` — tests the saved config and updates `connectionStatus`.

Create UI requires a successful ephemeral test before save. Detail page supports edit (`PATCH`, password optional to keep) and delete.

## Normalization

- `nativeDataType` preserves driver/catalog type
- `dataType` maps to AutoBI normalized types (`string`, `integer`, `number`, `boolean`, `date`, `datetime`, `json`, `binary`, `time`)

## TLS & timeouts

- SSL/TLS verifies certificates by default (`rejectUnauthorized: true` / no trust-all)
- Opt-in only: `sslAllowInsecure: true` on connection config
- `executeQuery` honors `timeoutMs` (default 30s) via dialect controls + client race

## Host safety

API/worker call `assertSafeDbHost` before connect/test/introspect/execute.  
Private/loopback hosts require `DB_HOST_ALLOW_PRIVATE=true` (default outside production).

## Pooling (Phase 3)

`packages/connectors/src/pool.ts` keeps per–data-source pools for PostgreSQL and MySQL/MariaDB. SQL Server still opens short-lived connections. API execute uses `ConnectorPoolService` plus a workspace concurrency gate.

## Limitations

- No sample row profiling in Sprint 1
- Inaccessible schemas are skipped during introspection
- MariaDB uses the MySQL wire protocol; dialect differences are isolated in `MariaDBConnector`

## Integration tests

```bash
docker compose --profile integration up -d
RUN_CONNECTOR_INTEGRATION=1 pnpm --filter @autobi/connectors test
```
