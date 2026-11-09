# Development

## Prerequisites

- Node.js 20+
- pnpm 9.15+
- Docker (Postgres, Redis, optional integration DBs)

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm -r --filter './packages/*' build
pnpm --filter @autobi/database generate
docker compose up -d postgres redis
pnpm db:migrate:deploy
pnpm dev
```

## Environment

See `.env.example`. Required:

- `DATABASE_URL`
- `REDIS_URL`
- `ENCRYPTION_KEY` (64 hex chars)
- `SESSION_SECRET`

Generate an encryption key:

```bash
openssl rand -hex 32
```

## Docker Compose

Core stack: `postgres`, `redis`, `api`, `worker`, `web`.

Integration profile:

```bash
docker compose --profile integration up -d
```

Starts extra MySQL, MariaDB, SQL Server, and Postgres test instances.

## Migrations

```bash
pnpm db:migrate          # prisma migrate dev
pnpm db:migrate:deploy   # prisma migrate deploy
./infrastructure/scripts/migrate.sh
```

## Testing

```bash
pnpm test
RUN_CONNECTOR_INTEGRATION=1 pnpm --filter @autobi/connectors test
```

## GitHub presentation

Root [README.md](../README.md) is the public landing page. Assets live in [docs/assets](assets/). Docs index: [README.md](README.md).

## Notes

- Do not use Prisma against customer databases
- Build shared packages before starting apps if TypeScript sources changed
- Frontend talks to API via `NEXT_PUBLIC_API_URL` with credentialed cookies
- Semantic Propose needs a prior schema snapshot; without AI keys it uses the heuristic proposer
- AI semantic proposals are always stored as `Proposed` until a human approves them
- Query create/execute needs a schema snapshot; multi-table plans are rejected in Sprint 3
- Dashboard generate needs introspection; AI output is JSON-only and compiled into validated queries
- Frontend widgets are a fixed registry — never eval AI-provided code
