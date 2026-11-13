# Production plan (step-by-step)

Interactive plan: Cursor canvas `production-plan.canvas.tsx`.  
Context: [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

## Phase 1 — Hardening

| ID | Step | Status |
| --- | --- | --- |
| P1-01 … P1-10 | All hardening items | **Done** |

## Phase 2 — Ops & quality

| ID | Step | Status |
| --- | --- | --- |
| P2-01 … P2-08 | CI, deploy, logging, audit, web gates | **Done** |

## Phase 3 — Product depth

| ID | Step | Status |
| --- | --- | --- |
| P3-01 … P3-07 | Joins, RBAC, invites, pools, e2e smoke, NL edit | **Done** |

## Phase 4 — Remaining production gaps

| ID | Step | Status |
| --- | --- | --- |
| P4-01 | DNS SSRF resolve-then-check | **Done** |
| P4-02 | TRUST_PROXY + safe client IP | **Done** |
| P4-03 | AI / query execute rate limits | **Done** |
| P4-04 | Signed cookies only | **Done** |
| P4-05 | Optional COOKIE_DOMAIN | **Done** |
| P4-06 | SMTP mailer + emailVerifiedAt login gate | **Done** |
| P4-07 | Real Sentry SDK | **Done** |
| P4-08 | Wire approved semantic relationships into joins | **Done** |
| P4-09 | Zod bulk-status + sanitize job errors + compose warn | **Done** |
| P4-10 | Redis AUTH in docker-compose.yml | **Done** |
| P4-11 | Redis-backed query concurrency | **Done** |
| P4-12 | Accept invite for existing users | **Done** |
| P4-13 | Playwright in CI | **Done** |
| P4-14 | Refresh readiness docs/canvas scores | **Done** |

## Status

**Phases 1–4 code complete.** Deferred: SQL Server pooling, richer NL edit, backup cron, SSO/SDK, full OTel. See [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).
