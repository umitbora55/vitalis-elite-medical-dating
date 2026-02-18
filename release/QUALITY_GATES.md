# QUALITY GATES

## Functional gates

| Area | Acceptance criteria | Measurement | Status |
| --- | --- | --- | --- |
| Nearby map render correctness (P0) | Nearby users render for users with missing `privacySettings`; hidden state only when user explicitly opts out. | `npm run test:ci` includes `components/NearbyView.test.tsx`; test passes. | Pass |
| Core typing | No TypeScript errors in `src` and `mobile` configs. | `npm run type-check`; `npm run build` both pass. | Pass |
| Core regression coverage | P0 map fix covered by unit test and evidence snapshot available. | `release/evidence/map_fix/nearbyview-test.txt` + assertions in `components/NearbyView.test.tsx`. | Pass |

## Stability and reliability gates

| Area | Acceptance criteria | Measurement | Status |
| --- | --- | --- | --- |
| Build integrity | Production build completes for web and lint for mobile can run cleanly after lock sync. | `npm run build` and `cd mobile && npm run lint` return exit code `0`. | Pass |
| Test execution | Unit tests and Playwright e2e complete in CI-like runs. | `npm run test:ci`, `npm run test:e2e` return exit code `0`; outputs captured. | Pass |
| Critical lint debt | No blocking lint errors in P0 surface. | `release/evidence/qa/mobile-lint-final.txt` contains only acceptable warnings or none. | Pass |

## Security gates

| Area | Acceptance criteria | Measurement | Status |
| --- | --- | --- | --- |
| High-severity dependency risk | No high-severity vulnerabilities remain in `npm audit --omit=dev --audit-level=high` for root and mobile. | `npm audit --omit=dev --audit-level=high`; `cd mobile && npm audit --omit=dev --audit-level=high` | Pass |
| Secrets posture | No obvious hardcoded production keys in tracked source; secret names accessed via runtime env only. | Static secret surface scan in `release/evidence/security/secret-surface.txt` reviewed. | Pass |
| Transport and policy | No insecure client script policy allowances; HTTPS-only assets and secure endpoints retained. | CSP reviewed in `index.html`; build passes with production CSP. | Pass |
| Threat model coverage | Assets, trust boundaries, top threats, and mitigations are documented. | `release/THREAT_MODEL.md`. | Pass |

## Privacy gates

| Area | Acceptance criteria | Measurement | Status |
| --- | --- | --- | --- |
| Data inventory | All major data categories mapped with source, purpose, sharing, retention, controls. | `release/PRIVACY_DATA_INVENTORY.md` table complete + `public/privacy.html` references. | Pass |
| Consent controls | Explicit analytics consent gating remains enforced. | `src/lib/analytics.ts` still requires consent before init/track. | Pass |

## Compliance and release gates

| Area | Acceptance criteria | Measurement | Status |
| --- | --- | --- | --- |
| Store audit artifacts | Apple/Google checklist completed with evidence pointers. | `release/STORE_COMPLIANCE.md`. | Pass |
| Store runtime evidence readiness | External TestFlight + Play pre-launch artifacts are prepared before RC submission. | `release/evidence/store/testflight-smoke-notes.md`; `release/evidence/store/play-prelaunch-report.md` include required checklists. | Pending |
| Supply chain | SBOMs exist for app stacks. | `release/SBOM/cyclonedx-web.json`, `release/SBOM/cyclonedx-mobile.json`. | Pass |
| RC documentation complete | Evidence index, backlog, checklist, report all present and single-source. | `release/EVIDENCE_INDEX.md`, `release/RELEASE_READINESS_BACKLOG.md`, `release/RC_CHECKLIST.md`, `release/REPORT.md`. | Pass |

## Residual risks (known)
- High-severity dependency findings are zero after remediation; root has moderate/low-only transitive vulnerabilities (`ajv`, `qs`).
- Required external store evidence artifacts are pending (TestFlight + Play pre-launch) and are tracked as medium residuals in `release/RELEASE_READINESS_BACKLOG.md`.
