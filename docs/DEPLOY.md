# Deploy

Production path for AutoBI 1.0 using a single Compose file.

## Topology

| Service | Role | Host port |
| --- | --- | --- |
| `web` | Next.js standalone UI | **3100** → 3000 |
| `api` | NestJS REST (`/api/v1`) | **3101** → 3001 |
| `worker` | BullMQ introspection consumer | — |
| `postgres` | AutoBI app database (Prisma) | internal (optional **5434** via `publish-data`) |
| `redis` | Sessions + job queues | internal (optional **6380** via `publish-data`) |
| `mailpit` | Dev/pilot SMTP + UI | **8025** UI, **1025** SMTP |

Do **not** expose Postgres/Redis on the public internet. Put TLS termination on a reverse proxy in front of `web` (and optionally `api`). For hardened cloud deploys, remove Mailpit and set a real `SMTP_URL`.

## Quick start

1. Copy `.env.example` → `.env` and set strong secrets:
   - `ENCRYPTION_KEY` (`openssl rand -hex 32`)
   - `SESSION_SECRET` (long random)
   - `POSTGRES_PASSWORD` / `REDIS_PASSWORD` (change defaults)
   - `API_CORS_ORIGIN` / `NEXT_PUBLIC_API_URL` to your public URLs
   - `DB_HOST_ALLOW_PRIVATE=false` unless customer DBs are on a private network you intentionally allow
   - `ALLOW_PUBLIC_REGISTRATION=false` for invite-only / closed beta
   - `SMTP_URL` (Compose defaults to Mailpit; use a real SMTP provider in public deploys)
   - `TRUST_PROXY=true` when behind TLS reverse proxy
   - Optional: `COOKIE_DOMAIN=.example.com`, `APP_PUBLIC_URL`, `SENTRY_DSN`
2. Build and start:

```bash
docker compose up -d --build
```

3. Health:
   - Web: http://localhost:3100
   - API liveness: `GET http://localhost:3101/api/v1/health`
   - API readiness: `GET http://localhost:3101/api/v1/health/ready`
   - Mailpit: http://localhost:8025

Images build from one multi-target file: `infrastructure/docker/Dockerfile` (`api` | `worker` | `web`).

### Profiles

| Profile | Purpose |
| --- | --- |
| (default) | Production images + Mailpit |
| `dev` | Bind-mount `api-dev` / `worker-dev` / `web-dev` (stop `api`/`worker`/`web` first) |
| `publish-data` | Loopback host ports **5434** (Postgres) and **6380** (Redis) via socat |
| `integration` | Extra MySQL / MariaDB / SQL Server / Postgres test DBs |

## Migrations

API container runs `migrate:deploy` before `start`. Manual:

```bash
pnpm db:migrate:deploy
```

## Secrets & keys

- Rotate `ENCRYPTION_KEY` only with a re-encrypt migration plan (existing ciphertext becomes unreadable).
- Rotate `SESSION_SECRET` invalidates all signed session cookies (users re-login).
- Never commit `.env`. Prefer a secret manager in real cloud deploys.

## Backups

- **Postgres:** daily `pg_dump` (or managed snapshots). Test restore.
- **Redis:** AOF enabled; sessions are expendable if lost (users re-login). Do not treat Redis as durable app state.

## Rollback

1. Redeploy previous image tags / git SHA.
2. Prefer forward-only Prisma migrations; if you must roll back schema, restore DB from backup first.

## Observability

- API emits JSON logs via pino (`requestId` on each request).
- Set `LOG_LEVEL` (`info` default; `debug` locally).
- Optional: `SENTRY_DSN` — initializes `@sentry/node` and reports via `LoggerService.captureException`.

## Checklist before public traffic

- [ ] Strong secrets; no default passwords; Redis AUTH set
- [ ] TLS on the edge; `TRUST_PROXY=true` if proxy sets XFF
- [ ] Real `SMTP_URL` (not Mailpit); invite/verify mail works
- [ ] `ALLOW_PUBLIC_REGISTRATION=false` unless intentional
- [ ] `DB_HOST_ALLOW_PRIVATE` reviewed
- [ ] Same-origin or `COOKIE_DOMAIN` for split hosts
- [ ] Backups scheduled
- [ ] CI green on the release commit (includes Playwright smoke)
