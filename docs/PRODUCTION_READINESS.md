# Production readiness review

**Date:** 2026-11-10 (final post–Phase 4 re-check)  
**Verdict:** **Yes for a private / TLS-fronted pilot.** **Conditional yes for public SaaS** if you follow [DEPLOY.md](DEPLOY.md). Not “enterprise complete” (no SSO/OTel/backup automation).

| Audience | Ready? |
| --- | --- |
| Localhost / demo | **Yes** |
| Private pilot (TLS, invite-only, SMTP, secrets) | **Yes** |
| Public internet SaaS | **Conditional** — ops checklist required |
| Enterprise multi-tenant + SSO | **No** (out of scope) |

**Scores:** ~**85%** SaaS bar · ~**92%** private pilot · public success is mostly **ops**, not missing code.

Interactive: canvas `production-readiness.canvas.tsx`.

## Scorecard

| Area | Score | Evidence |
| --- | ---: | --- |
| Product journey | 90 | Connect → semantic → joins → query → dashboard + NL edit |
| Core security model | 88 | DNS SSRF resolve, signed cookies edge+API, TRUST_PROXY, Sentry, mail verify |
| Query safety | 85 | Allowlist + SELECT + FK + approved semantic joins |
| API authorization | 82 | RBAC floors + invite accept |
| Ops / deploy | 82 | CI + Playwright, compose Redis AUTH + SMTP |
| Observability | 75 | pino + requestId + Sentry on API **and** worker |
| Test coverage | 62 | Unit + DNS mocks + CI smoke e2e |
| Web hardening | 80 | Signed-cookie shape gate; invite/verify public routes |
| Feature completeness | 82 | Mail, throttles, shared concurrency, accept-invite |

## Hard gaps from earlier audit — status

| Gap | Status |
| --- | --- |
| DNS SSRF | **Fixed** — resolve-then-check |
| XFF spoof | **Fixed** — TRUST_PROXY + req.ip |
| No email / verify unused | **Fixed** — SMTP + login gate |
| Sentry stub | **Fixed** — @sentry/node API + worker |
| AI/query unbounded | **Fixed** — Redis workspace throttle |
| Cookie Domain | **Fixed** — optional COOKIE_DOMAIN |
| Redis unauth | **Fixed** — compose requirepass |
| In-process concurrency | **Fixed** — Redis semaphore |
| Semantic joins unused | **Fixed** — Approved rels merged |
| Playwright not in CI | **Fixed** | 

## Residual (acceptable / deferred)

- DNS TOCTOU between resolve and TCP connect (industry-common residual)
- Edge middleware cannot validate Redis sessions (API does)
- SQL Server pooling, richer NL edit, backup cron, SSO, full OTel — deferred

## Deploy before public traffic

See [DEPLOY.md](DEPLOY.md): strong secrets, TLS, `TRUST_PROXY`, `SMTP_URL`, `REDIS_PASSWORD`, closed registration, `SENTRY_DSN`, backups.

## Related

- [PRODUCTION_PLAN.md](PRODUCTION_PLAN.md) — Phases 1–4 **Done**
- [SECURITY.md](SECURITY.md) · [DEPLOY.md](DEPLOY.md)
