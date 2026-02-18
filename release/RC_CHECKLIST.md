# RC CUT CHECKLIST

## Pre-cut verification
1. Checkout release branch `release/hardening-rc` from latest signed-off commit.
2. Ensure dependencies are installed:
   - `npm install` (or `npm install --legacy-peer-deps` if the Expo/React peer resolution in this repo requires it)
   - `cd mobile && npm install`
3. Run hardening and verification commands (capture output files):
   - `npm run type-check | tee release/evidence/release/type-check-final.txt`
   - `npm run test:ci | tee release/evidence/release/test-ci-final.txt`
   - `npm run test:e2e | tee release/evidence/release/test-e2e-final.txt`
   - `npm run build | tee release/evidence/release/build-final.txt`
   - `cd mobile && npm run lint | tee ../release/evidence/qa/mobile-lint-final.txt`
4. Run high-severity dependency audits:
   - `npm audit --omit=dev --audit-level=high | tee release/evidence/security/root-audit-high-final.txt`
   - `cd mobile && npm audit --omit=dev --audit-level=high | tee ../release/evidence/security/mobile-audit-high-final.txt`
5. Confirm map fix evidence exists:
   - `release/evidence/map_fix/seed-guard-proof.txt`
   - `release/evidence/map_fix/nearbyview-test.txt`
   - `release/evidence/map_fix/nearby-page-smoke-preview.txt`
   - `release/evidence/map_fix/nearby-page-smoke.png`
   - `release/evidence/release/test-e2e-final.txt` (includes deterministic nearby smoke)
6. Confirm release/security/privacy docs exist and are complete:
   - `release/REPORT.md`
   - `release/RELEASE_READINESS_BACKLOG.md`
   - `release/QUALITY_GATES.md`
   - `release/PRIVACY_DATA_INVENTORY.md`
   - `release/THREAT_MODEL.md`
   - `release/STORE_COMPLIANCE.md`

## Release packaging
7. Generate/update SBOM artifacts:
   - `npx -y @cyclonedx/cdxgen -t npm -o release/SBOM/cyclonedx-web.json . | tee release/evidence/release/sbom-web.txt`
   - `cd mobile && npx -y @cyclonedx/cdxgen -t npm -o ../release/SBOM/cyclonedx-mobile.json . | tee ../release/evidence/release/sbom-mobile.txt`
8. Confirm map runtime smoke in production-like mode:
   - `E2E_PREVIEW=1 npm run test:e2e -- --grep "nearby map page renders list with seeded deterministic data"`
9. Confirm e2e seed mode guardrail proof:
   - `release/evidence/map_fix/seed-guard-proof.txt` contains localhost-only conditions.
10. Confirm evidence index is exhaustive:
   - `release/EVIDENCE_INDEX.md`
11. Confirm release notes/recovery notes prepared (user-facing changes are unchanged).

## Store submission path
12. Internal/staged build:
   - Trigger `.github/workflows/ci.yml` and ensure it passes.
   - Trigger `.github/workflows/mobile-release.yml` only after mobile lint/build gates are stable.
13. Follow Store runbook in `release/STORE_COMPLIANCE.md`:
   - Use `scripts/store_prepare_artifacts.sh` for pre-upload artifact checks.
   - Use `scripts/store_evidence_collect.sh` after screenshots/upload info are available.
   - Apple TestFlight smoke evidence: `release/evidence/store/testflight-smoke-notes.md` (required external evidence)
   - Google Play pre-launch evidence: `release/evidence/store/play-prelaunch-report.md` (required external evidence)

## Rollback notes
- Roll back package changes if CI regression appears in mobile lint by restoring last stable `mobile/package-lock.json` and reverting scoped lint config edits.
- Revert map fix only: restore prior `components/NearbyView.tsx` and remove test-only seed path changes if P0 checks cannot be reproduced.
- On store release failure, deactivate rollout and reuse previous `main` artifact while reopening related RC backlog items.

## Sign-off prerequisites
- Blockers in `release/QUALITY_GATES.md` are `Pass`.
- `npm audit --omit=dev --audit-level=high` and mobile equivalent return no high-severity findings.
- Required external store evidence placeholders are filled in before final RC submission.
