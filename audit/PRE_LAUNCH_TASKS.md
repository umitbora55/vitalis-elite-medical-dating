# PRE-LAUNCH TASKS (UPDATED 2026-02-11)

## P0 - LAUNCH BLOCKER
- [x] Checkout auth + spoofing + insecure redirect hardening
- [x] Stripe webhook idempotency
- [x] RLS baseline hardening for core tables
- [x] Consent + Privacy/Terms + Sentry PII hardening
- [x] DEV bypass controls removed from production path
- [x] Verification document upload flow (v1) wired to storage + request
- [x] Mobile identifiers + EAS baseline
- [x] Account deletion execution pipeline (service-role SQL executor added)
- [ ] Moderation reviewer workflow (report persistence exists, operations tooling missing)
- [ ] Mobile CI signed build + store submit automation (workflow exists, secrets setup pending)

## P1 - CRITICAL
- [x] `.env.example` created
- [x] Runtime env fail-fast for Supabase client
- [x] Regex injection hardening in chat search highlight
- [ ] Main web bundle size reduction (`index` chunk still > 500kB)
- [ ] End-to-end release runbook + rollback drills
- [ ] Mobile crash reporting integration

## P2 - IMPORTANT
- [ ] Structured logger (reduce production console noise)
- [ ] Broader analytics event taxonomy + user property strategy
- [ ] Performance dashboards + alerting thresholds
- [ ] Moderation SLA reporting

## Release Gate
- Public launch requires all P0 items checked.
