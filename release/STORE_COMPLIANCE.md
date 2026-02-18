# STORE COMPLIANCE

## Apple App Store self-audit

| Check | Status | Evidence |
| --- | --- | --- |
| Privacy policy link and policy alignment | Pass | `public/privacy.html`; `release/PRIVACY_DATA_INVENTORY.md` |
| App tracking / optional analytics | Pass | `src/lib/analytics.ts` (consent gate); `release/evidence/security/secret-surface.txt` |
| Data handling disclosures | Pass | `release/PRIVACY_DATA_INVENTORY.md` |
| Crash and performance stability | Pass (non-blocking) | `release/evidence/release/type-check-final.txt`; `release/evidence/release/build-final.txt`; `release/evidence/release/test-ci-final.txt` |
| Login/account security | Reviewed | `src/lib/supabase.ts`; `supabase/functions` auth checks |
| Background/push setup & user consent | Pass | `src/lib/pushNotifications.ts`, `services/pushService.ts`, `release/THREAT_MODEL.md` |

## Google Play self-audit

| Check | Status | Evidence |
| --- | --- | --- |
| Data Safety declaration readiness | Pass | `release/PRIVACY_DATA_INVENTORY.md`; `public/privacy.html` |
| In-app purchases/entitlements policy | Pass | `services/checkoutService.ts`; `supabase/functions/create-checkout-session/index.ts` |
| Permissions justification | Partial | `mobile/app.json` (mobile permissions/integrations) |
| Store test tools readiness | Pending (external evidence required) | `release/STORE_COMPLIANCE.md` runbook; `release/evidence/store/testflight-smoke-notes.md`; `release/evidence/store/play-prelaunch-report.md` |

## Store runbook

### Apple TestFlight smoke (required external evidence)
1. Build & upload path:
   - Run `scripts/store_prepare_artifacts.sh --platform ios --build` if you already have `EXPO_TOKEN` + EAS CLI configured.
   - If using App Store Connect manually, build/submission flow is in `.github/workflows/mobile-release.yml` (`eas build` + `eas submit`).
   - If `EXPO_TOKEN` is not set, stop here and follow manual upload path with placeholders.
2. In App Store Connect (`https://appstoreconnect.apple.com`):
   - Open **My Apps** → **Your App** → **TestFlight**.
   - Open the latest internal build and ensure processing is complete.
   - Add 1+ internal tester and install the build on at least 2 iOS devices.
3. Smoke matrix:
   - auth/login
   - nearby map render and visibility states
   - chat open/message
   - checkout/payment guardrails
4. Required artifacts:
   - screenshots or short video for map render and login/chat/checkout happy paths
   - crash-free duration + any issues list
   - TestFlight build link and tester/build identifiers
5. Paste/upload results into `release/evidence/store/testflight-smoke-notes.md`.
6. Run `scripts/store_evidence_collect.sh testflight --build-version "<version>" --build-link "<tf-link>" --artifacts "<release/evidence/store/..."` to stamp the placeholder with timestamped evidence metadata.

### Google Play pre-launch (required external evidence)
1. Build/upload path:
   - Run `scripts/store_prepare_artifacts.sh --platform android --build` to prepare a production Android artifact through EAS.
   - In Google Play Console, go to **Testing** → **Internal testing** for `com.vitalis.elitemedicaldating` and upload the AAB from the matching EAS release.
   - If Google Play service account credentials are not present, stop here and complete manual internal-track steps.
2. In Google Play Console:
   - Open the internal track build and run **Pre-launch report**.
   - Review device compatibility notes and crash/anomaly summaries.
3. Validate nearby/map navigation and major P0 paths against the pre-launch matrix output.
4. Record critical findings and resolutions.
5. Paste report URL, screenshots, and any failure list into `release/evidence/store/play-prelaunch-report.md`.
6. Run `scripts/store_evidence_collect.sh play --build-version "<version>" --report-url "<prelaunch-url>" --artifacts "<release/evidence/store/..."` to stamp the placeholder with timestamped evidence metadata.

## Store release pipeline evidence

- CI workflow definitions: `.github/workflows/ci.yml`, `.github/workflows/mobile-release.yml`
- Mobile lint: `release/evidence/qa/mobile-lint-final.txt`
- SBOMs: `release/SBOM/cyclonedx-web.json`, `release/SBOM/cyclonedx-mobile.json`

## Evidence notes
- Add real TestFlight and Play pre-launch URLs plus artifacts when uploaded.
- Both TestFlight and Play artifacts are **Required External Evidence**. RC cannot be marked blocked-free in store tooling until these are attached.
- Keep this file updated with artifacts (play console pre-launch report / App Review notes) and screenshot paths under `release/evidence/store/`.
