# Development

## Prerequisites

- Node.js 20+
- pnpm 9.15+
- Docker (Postgres, Redis, Mailpit, optional integration DBs)

## Single-command stack

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
| --- | --- |
| Web | http://localhost:3100 |
| API | http://localhost:3101/api/v1/health |
| Mailpit | http://localhost:8025 |

## Local pnpm setup

```bash
cp .env.example .env
pnpm install
pnpm -r --filter './packages/*' build
pnpm --filter @autobi/database generate
docker compose --profile publish-data up -d postgres redis mailpit postgres-host redis-host
pnpm db:migrate:deploy
pnpm dev
```

Web listens on **3100**; API on **3101**.

## First login (no seed users)

There is **no superadmin** and `pnpm db:seed` creates no accounts. Self-register:

1. Ensure `ALLOW_PUBLIC_REGISTRATION` is unset or `true` in `.env` (dev defaults to open signup; Compose production defaults off).
2. Open http://localhost:3100/register — password ≥10 chars with upper, lower, digit.
3. Without reachable SMTP, the register UI may show a **dev verify token** — or use Mailpit at http://localhost:8025.
4. Sign in at `/login` — lands on **Agent Mode** (`/workspace/agent`). Create a workspace there if needed.
5. Day-to-day: ask the agent. Use the **Workshop** button for manual tools (data sources, semantics, queries, dashboards, settings).

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

One file: `docker-compose.yml` + multi-target `infrastructure/docker/Dockerfile`.

| Mode | Command |
| --- | --- |
| Production images (default) | `docker compose up --build` |
| Bind-mount apps | `docker compose stop api worker web && docker compose --profile dev up` |
| Host DB/Redis ports | `docker compose --profile publish-data up -d` → `127.0.0.1:5434` / `6380` |
| Integration DBs | `docker compose --profile integration up -d` |

CI: `.github/workflows/ci.yml` runs lint, typecheck, test, and build on PRs.

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
pnpm --filter @autobi/web test:e2e   # needs web running; skips if unreachable
```

## GitHub presentation

Root [README.md](../README.md) is the GitHub landing page. The web app marketing landing is `/` in `apps/web`. Assets live in [docs/assets](assets/). Docs index: [README.md](README.md).

## Production readiness

See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for the gap analysis. Ops checklist: [DEPLOY.md](DEPLOY.md).

## Frontend UI / React Bits

- Design tokens: Syne / Source Sans 3 / IBM Plex Mono; teal signal — `apps/web/src/app/globals.css`
- Marketing `/` is a story-driven dark-tech scrollytelling landing page
- Landing motion: `apps/web/src/lib/gsap.ts` (ScrollTrigger + SplitText + `useGSAP`) + Lenis via `components/landing/smooth-scroll.tsx` + `motion/react` `layoutId` tabs
- 60fps compositor rules: animate only `transform` + `opacity` (and SVG `stroke-dashoffset`)
- Hero + auth (`AuthFrame`) use **React Bits** `GradientASCII`
- Authenticated app: `AppShell` + `Sidebar` (Agent Mode → `/workspace/agent`) + Workshop tools. Agent Mode adds `DotGrid` + `BlurText` + `GradientText` and a live ECharts canvas
- Install bits: `cd apps/web && pnpm exec shadcn add @react-bits/GradientASCII-TS-TW`
- Registry: [`apps/web/components.json`](../apps/web/components.json) → `@react-bits`
- Source lives in `apps/web/src/components/bits/` (`GradientASCII`, `DotGrid`, `BlurText`, `GradientText`)
- WebGL backgrounds need a parent with **explicit width + height** (e.g. `100vh`)
- Local patch in `bits/GradientASCII.tsx`: canvas is created per effect run. Upstream may call `loseContext()` on cleanup; StrictMode remount then got a dead context. Re-apply if you reinstall from the registry.
- Landing honors `prefers-reduced-motion` via `gsap.matchMedia()`
- Creator credit: Mohammad Taheri (`@MTaheridev`); footer dedication to Morteza; repo: https://github.com/MTaheridev/AutoBI

## Notes

- API/worker `dev` compiles with `tsc` then `node --env-file=../../.env --watch` (Nest needs `emitDecoratorMetadata`; `tsx` skips it)
- Do not use Prisma against customer databases
- Build shared packages before starting apps if TypeScript sources changed
- Frontend talks to API via `NEXT_PUBLIC_API_URL` with credentialed cookies
- Semantic Propose needs a prior schema snapshot; without AI keys it uses the heuristic proposer
- AI semantic proposals are always stored as `Proposed` until a human approves them
- Query create/execute needs a schema snapshot; multi-table plans join via FK/relationships
- Dashboard generate/edit needs introspection; AI output is JSON-only and compiled into validated queries
- Frontend widgets are a fixed registry — never eval AI-provided code
- Invites: Settings → create invite (SMTP or console); `/invite` or `/register?invite=TOKEN`
- Email verify: `/verify-email`; login requires verified email
- Prod env extras: `SMTP_URL`, `TRUST_PROXY`, `COOKIE_DOMAIN`, `REDIS_PASSWORD`, `SENTRY_DSN`
