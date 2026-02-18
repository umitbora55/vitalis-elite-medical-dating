# TestFlight Smoke Evidence Placeholder

- Status: Required External Evidence
- Last run (UTC): 
- TestFlight build link:
- Build version:
- Build/Test ID:
- CI artifact:
- Test matrix:
  - [ ] auth/login
  - [ ] nearby map render (seeded or real data)
  - [ ] nearby visibility toggle
  - [ ] chat open/post message
  - [ ] checkout/payment guardrails
- Acceptance checklist:
  - [ ] Smoke run executed on at least 2 iOS devices
  - [ ] No critical crashes
  - [ ] map/nearby controls are responsive
  - [ ] login/chat/checkout flows pass
  - [ ] Artifacts attached under `release/evidence/store/`

## Evidence evidence log

- Screenshot/video paths:
  - [ ] `release/evidence/store/` (fill with relative file names)
- Tester email(s):
  - [ ] (enter tester emails used)
- Notes:
  - [ ] (paste crash/log summary and smoke observations)

## Scripted collection
- Command used:
  - `./scripts/store_evidence_collect.sh testflight --build-version "<version>" --build-link "<TestFlight URL>" --artifacts "<paths>" --status "<PASS|PARTIAL|FAIL>"`

## TestFlight evidence run
- Timestamp (UTC): 2026-02-18T12:57:38Z
- Branch: release/hardening-rc
- Commit: bc9a54d097322e34d61184e435cd6d1e49cee614
- Build version: 1.0.0
- TestFlight build link: https://testflight.apple.com/example
- Evidence status: PENDING
- Artifact paths: release/evidence/map_fix/nearby-page-smoke.png
- Notes: Initial local smoke run not executed
- Screenshot/video requirement: save screenshots under release/evidence/store/ and link them here

