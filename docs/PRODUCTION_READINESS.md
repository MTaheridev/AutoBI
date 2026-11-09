# Production readiness review

**Date:** 2026-11-09  
**Verdict:** MVP is demo-ready locally. **Not production-ready** as a public multi-tenant SaaS.  
**Overall estimate:** ~35–40% of a production bar. **~6–10 engineer-weeks** to a credible first production cut (hardening + ops), more for full BI feature parity.

Interactive summary: open the Cursor canvas `production-readiness.canvas.tsx` beside chat.

## Scorecard

| Area | Score | Notes |
| --- | ---: | --- |
| Product MVP journey | 85 | Connect → semantic → query → dashboard works |
| Core security model | 70 | Argon2id, Redis sessions, AES-GCM, workspace checks |
| Query safety | 72 | Plan → allowlist → params; recompile on execute |
| API authorization | 55 | Job IDOR; RBAC shallow |
| Ops / deploy | 20 | Dev Dockerfiles; no CI; no deploy docs |
| Observability | 15 | Default logs only |
| Test coverage | 25 | 9 test files; web/worker/ai untested |
| Web hardening | 35 | Client-only auth gate; weak error/a11y |
| Feature completeness | 55 | No joins, pooling, invites, SSO |

## Blockers

1. **Job status IDOR** — `GET /data-sources/jobs/:jobId` lacks workspace membership check (`apps/api` data-sources controller/service).
2. **No auth rate limiting** — register/login open to brute force / Argon2 DoS.
3. **Docker still runs `dev`** — `infrastructure/docker/Dockerfile.*` and compose are local-dev, not `node dist` / Next standalone.
4. **No graceful shutdown hooks** — Nest/worker SIGTERM drain incomplete.
5. **Query timeouts ignored** on MySQL / SQL Server (`timeoutMs` not applied in connectors).
6. **TLS verification disabled** on connectors (MITM risk).
7. **Arbitrary DB hosts** — SSRF / internal network probing via data sources.
8. **No CI/CD** — `.github/` absent.

## High-priority gaps

- Helmet / security headers / CSRF strategy for cookie sessions
- `preferApprovedSemantics` falls back to Proposed metrics
- `AuditLog` Prisma model unused
- Weak password policy; open self-registration
- Missing `.dockerignore`; compose publishes Postgres/Redis ports with default secrets
- No structured logging, metrics, or error tracking
- Thin tests; zero web/worker/AI tests
- Web: no `middleware.ts`, `error.tsx` / `not-found.tsx`, mobile nav
- Raw DB error messages returned to clients
- No connection pooling; connect-per-query

## What’s solid

- Argon2id passwords; Redis httpOnly sessions (`secure` in production)
- AES-256-GCM for data-source and AI secrets; APIs never return decrypted keys
- Workspace membership on most routes (missing → NotFound)
- Query plans compile with identifier allowlists and parameterized filters
- Execute path recompiles plans (does not blindly trust stored SQL)
- Boot-time env Zod validation; `/health` and `/health/ready`
- AI outputs Zod-validated; no AI-generated executable frontend code
- Four connectors + semantic / query / dashboard engines as packages

## Product gaps (not blockers for a private pilot)

- Joins / multi-table plans rejected
- Real RBAC (Owner/Admin/Member/Viewer mostly unused)
- Invites, email verification, SSO
- Pooling and per-workspace concurrency caps
- NL dashboard edit polish, richer widgets
- Deploy runbooks, backups, key rotation

## Phased plan

### Phase 1 — Hardening (1–1.5 weeks)

Fix blockers B1–B7; add rate limits + helmet; Approved-only metrics; sanitize DB errors; prod Docker start path + `.dockerignore`.

### Phase 2 — Ops bar (2–3 weeks)

CI (lint/typecheck/test/build); `docker-compose.prod` + `DEPLOY.md`; structured logs + error tracking; wire `AuditLog`; API/web smoke tests.

### Phase 3 — Product depth (3–5 weeks)

Joins; RBAC + invites; pools/concurrency; Playwright e2e; dashboard edit polish.

## Test inventory (first-party)

| Location | Files |
| --- | --- |
| `apps/api` | 2 |
| `apps/web` | 0 |
| `apps/worker` | 0 |
| `packages/connectors` | 2 |
| `packages/contracts` | 1 |
| `packages/dashboard-engine` | 1 |
| `packages/query-engine` | 1 |
| `packages/semantic-engine` | 1 |
| `packages/shared` | 1 |
| `packages/ai*` / `config` / `database` | 0 |

## Related docs

- [SECURITY.md](SECURITY.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DEVELOPMENT.md](DEVELOPMENT.md)
- [PRD.md](PRD.md)
