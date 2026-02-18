# RELEASE REPORT

## Executive summary
- P0 map/nearby runtime breakage is fixed with no behavior changes:
  - missing `privacySettings` no longer hides nearby entries by default.
  - distance/availability handling is robust to malformed data.
  - deterministic seeded nearby e2e path validates that nearby render is recoverable with sufficient data.
- Release hardening evidence pack is complete for web and mobile; CSP was validated against a production-like preview path.
- Release artifacts include one SBOM set (web + mobile), security scans, lint/type-check/test/build evidence, and map runtime smoke evidence.

## RC readiness outcome
- Blockers (open): **No**
- High-severity remaining: **No**
- External store evidence: **Pending (Required external evidence only)** for TestFlight + Google Play pre-launch.

### Accepted residual risks
- `npm audit --omit=dev --audit-level=high` is currently clean for root and mobile (`0` high).
- App Store/Play proof is still required as external evidence; placeholders and runbooks are ready and marked **Required External Evidence**.

## How to run locally/CI
- `npm install`
- `npm audit --omit=dev --audit-level=high`
- `cd mobile && npm audit --omit=dev --audit-level=high`
- `npm run type-check`
- `npm run test:ci`
- `npm run test:e2e`
- `npm run build`
- `cd mobile && npm install`
- `cd mobile && npm run lint`
- `npx -y @cyclonedx/cdxgen -t npm -o release/SBOM/cyclonedx-web.json .`
- `cd mobile && npx -y @cyclonedx/cdxgen -t npm -o ../release/SBOM/cyclonedx-mobile.json .`
- `E2E_PREVIEW=1 npm run test:e2e -- --grep "nearby map page renders list with seeded deterministic data"`

## What was fixed
- `components/NearbyView.tsx` no longer blocks nearby items by default when privacy data is incomplete.
- New/relevant regression coverage:
  - unit: `components/NearbyView.test.tsx`
  - e2e: `e2e/basic.spec.ts` (deterministic nearby smoke)
- CSP path validation:
  - run Vite `preview`
  - run Playwright nearby smoke in preview mode
- Added and refreshed release artifact set under `release/` and evidence folders.

## Evidence locations
- Evidence index: `release/EVIDENCE_INDEX.md`
- Map/runtime evidence: `release/evidence/map_fix/`
- Verification evidence: `release/evidence/release/`
- QA pipeline evidence: `release/evidence/qa/`
- Security evidence: `release/evidence/security/`
