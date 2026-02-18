# EVIDENCE INDEX

## Baseline
- `release/evidence/baseline/type-check.txt` — web TypeScript check before fix.
- `release/evidence/baseline/unit-tests.txt` — unit/e2e baseline test status.
- `release/evidence/baseline/build.txt` — web build baseline.
- `release/evidence/baseline/e2e-tests.txt` — baseline Playwright run.
- `release/evidence/baseline/mobile-lint.txt` — baseline mobile lint output before lock remediation.

## Map fix
- `release/evidence/map_fix/type-check.txt` — post-fix type-check.
- `release/evidence/map_fix/build.txt` — post-fix build.
- `release/evidence/map_fix/nearbyview-test.txt` — unit/e2e map-fix test output.
- `release/evidence/map_fix/nearby-page-smoke-preview.txt` — Playwright preview smoke output.
- `release/evidence/map_fix/nearby-page-smoke.png` — nearby render screenshot proof.
- `release/evidence/map_fix/seed-guard-proof.txt` — proof that e2e seed mode is localhost-only.
- `components/NearbyView.test.tsx` — regression test for map/nearby edge case.
- `e2e/basic.spec.ts` — added deterministic nearby smoke flow.
- `scripts/store_prepare_artifacts.sh` — store artifact prep helper (manual or with EAS).
- `scripts/store_evidence_collect.sh` — store evidence stamping helper.

## QA / Release checks
- `release/evidence/release/type-check.txt` — refreshed type-check.
- `release/evidence/release/type-check-final.txt` — final type-check after all release changes.
- `release/evidence/release/build.txt` — refreshed build output.
- `release/evidence/release/build-final.txt` — final web build output.
- `release/evidence/release/tests.txt` — refreshed unit test output.
- `release/evidence/release/test-ci-final.txt` — final CI unit test output.
- `release/evidence/release/test-e2e-final.txt` — full Playwright e2e output.
- `release/evidence/release/sbom-web.txt` — SBOM generation command result (web).
- `release/evidence/release/sbom-mobile.txt` — SBOM generation command result (mobile).
- `release/evidence/qa/mobile-lint.txt` — post-merge quality proof step (intermediate).
- `release/evidence/qa/mobile-lint-final.txt` — final clean mobile lint output.

## Security
- `release/evidence/security/secret-surface.txt` — secret exposure and auth/token scan.
- `release/evidence/security/mobile-audit-high.txt` — baseline mobile `npm audit` report.
- `release/evidence/security/mobile-audit-high-final.txt` — post-remediation mobile `npm audit` report.
- `release/evidence/security/root-audit-high.txt` — baseline root `npm audit` report.
- `release/evidence/security/root-audit-high-after.txt` — intermediate root audit output.
- `release/evidence/security/root-audit-high-final.txt` — post-remediation root `npm audit` report.

## Privacy
- `release/evidence/privacy/data-inventory-scan.txt` — privacy flow/static data reference scan.

## UX/A11y
- `release/evidence/ux_a11y/accessibility-scan.txt` — accessibility marker scan.

## Performance/Reliability
- `release/evidence/perf_reliability/reliability-scan.txt` — reliability/async/error-pattern scan and bundle artifacts.

## Store
- `release/evidence/store/pipeline-ci.txt` — CI workflow snapshot.
- `release/evidence/store/pipeline-mobile-release.txt` — mobile CI workflow snapshot.
- `release/evidence/store/mobile-app-config.txt` — Expo app config snapshot.
- `release/evidence/store/privacy-policy.txt` — privacy policy source used for compliance mapping.
- `release/evidence/store/testflight-smoke-notes.md` — required external evidence placeholder for TestFlight smoke (required).
- `release/evidence/store/play-prelaunch-report.md` — required external evidence placeholder for Play pre-launch (required).

## SBOM
- `release/SBOM/cyclonedx-web.json`
- `release/SBOM/cyclonedx-mobile.json`
