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
1. Build upload: use the normal App Store Connect / CI flow from latest release branch artifact.
2. Add at least 1 tester in internal group and install the build.
3. Execute smoke matrix on at least 2 iOS devices:
   - auth/login
   - nearby map render and visibility states
   - chat open/message
   - checkout/payment guardrails
4. Capture required artifacts:
   - screenshots or short video for map render and login/chat/checkout happy paths
   - crash-free duration + any issues list
   - TestFlight build link
5. Paste/upload results into `release/evidence/store/testflight-smoke-notes.md`.

### Google Play pre-launch (required external evidence)
1. Upload staging build to a Google Play internal testing track.
2. Open pre-launch report and run compatibility checks.
3. Validate nearby/map navigation and major P0 paths on default target Android devices from report.
4. Record any critical findings and resolutions.
5. Paste report URL, device failures, and screenshots into `release/evidence/store/play-prelaunch-report.md`.

## Store release pipeline evidence

- CI workflow definitions: `.github/workflows/ci.yml`, `.github/workflows/mobile-release.yml`
- Mobile lint: `release/evidence/qa/mobile-lint-final.txt`
- SBOMs: `release/SBOM/cyclonedx-web.json`, `release/SBOM/cyclonedx-mobile.json`

## Evidence notes
- Add real TestFlight and Play pre-launch URLs plus artifacts when uploaded.
- RC remains Medium until required external evidence files are completed in `release/evidence/store/`.
- Keep this file updated with acceptance artifacts (play console pre-launch report / App Review notes).
