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

## Normalization

- `nativeDataType` preserves driver/catalog type
- `dataType` maps to AutoBI normalized types (`string`, `integer`, `number`, `boolean`, `date`, `datetime`, `json`, `binary`, `time`)

## Limitations

- No sample row profiling in Sprint 1
- Inaccessible schemas are skipped during introspection
- MariaDB uses the MySQL wire protocol; dialect differences are isolated in `MariaDBConnector`
- SQL Server encryption defaults to `trustServerCertificate: true` for local/dev convenience
- Query execution exists on the interface but is not exposed to AI in Sprint 1

## Integration tests

```bash
docker compose --profile integration up -d
RUN_CONNECTOR_INTEGRATION=1 pnpm --filter @autobi/connectors test
```
