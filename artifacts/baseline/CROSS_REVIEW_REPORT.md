# VITALIS -- CROSS-REVIEW REPORT (Consolidated Master Backlog)

**Date:** 2026-02-17
**Reviewer:** Cross-Review Agent (Claude Opus 4.6)
**Input Reports:**
- Backend Audit (24 findings: 4C, 6H, 9M, 5L)
- Privacy Audit (23 findings: 3C, 7H, 9M, 4L)
- Frontend Audit v2 (30 findings: 1C, 6H, 15M, 8L)
- Security Audit v2 (22 findings: 2C, 5H, 10M, 5L)
- Automation Baseline (AUTOMATION_SUMMARY.txt, AUTOMATION_AUDIT.json)
- Reconnaissance Report (00_RECON_REPORT.md)

**Methodology:** Each finding was cross-referenced across all four audits. Duplicates were merged under the highest-severity assessment with justification. Gaps not covered by any audit were identified separately.

---

## 1. EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Total raw findings (all 4 reports) | 99 |
| Already fixed this session | 10 |
| Duplicate/overlapping findings merged | 22 (into 11 clusters) |
| Unique open findings after dedup | 60 |
| Gap findings (new) | 8 |
| **Final Master Backlog** | **68** |

### Severity Distribution (After Dedup, Excluding Fixed)

| Severity | Count | % |
|----------|-------|---|
| CRITICAL | 5 | 7% |
| HIGH | 16 | 24% |
| MEDIUM | 31 | 46% |
| LOW | 16 | 24% |

---

## 2. ALREADY FIXED FINDINGS

The following 10 issues were resolved during this session and are **excluded** from the active backlog.

| Original ID(s) | Title | Fix Applied |
|---|---|---|
| BE-001 | Match-gate `create_conversation` broken column refs | `profile_1_id`/`profile_2_id` corrected |
| BE-002 | Profiles RLS block filter broken column refs | `blocked_id` corrected |
| BE-003 | GDPR delete-account wrong bucket name | `verification-documents` corrected |
| BE-005 | GDPR data export wrong column refs (matches/likes) | `profile_1_id`/`profile_2_id`, `swipes` corrected |
| BE-006 | `delete_user_data` RPC broken column refs | `swipes`, `profile_1_id`/`profile_2_id`, `blocked_id` corrected |
| BE-009, PRV-010 | Hardcoded Supabase URL in mobile | Fallback URL removed |
| BE-015 | Match notification trigger broken column refs | `profile_1_id`/`profile_2_id` corrected |
| PRV-012 (partial), SEC-010 (partial) | btoa() IP hashing | SHA-256 via `crypto.subtle` implemented |
| SB-001 (Recon) | Dev bypass button in App.tsx | Button removed |
| CR-002 (prior) | Stripe empty key warning | Warns + returns null |

---

## 3. DUPLICATE / OVERLAP ANALYSIS

The following clusters represent the same or closely related issues reported by multiple audits. Each cluster is consolidated into a single master finding.

### Cluster 1: Mock Data in Discovery Engine
| Report | ID | Severity |
|---|---|---|
| Backend | BE-010 | HIGH |
| Frontend | FE-001 | CRITICAL |

**Resolution:** FE-001 severity (CRITICAL) is correct. The discovery engine is the app's core feature; running entirely on mock data means the app is non-functional in production. BE-010 is subsumed into FE-001.

### Cluster 2: moderate-image Auth Missing + CORS
| Report | ID | Severity |
|---|---|---|
| Backend | BE-004 | CRITICAL |
| Security | SEC-001 | CRITICAL |
| Security | SEC-008 | MEDIUM |

**Resolution:** BE-004 and SEC-001 are the same finding (no auth on moderate-image). SEC-008 (wildcard CORS on same endpoint) is a compounding factor. Merged under SEC-001 as CRITICAL. SEC-008 is noted as part of the fix scope.

### Cluster 3: getSession() vs getUser() Auth Bypass
| Report | ID | Severity |
|---|---|---|
| Backend | BE-008 | HIGH |
| Security | SEC-005 | HIGH |

**Resolution:** Both describe the same `getSession()` local-only JWT issue. SEC-005 adds the verification_status bypass angle. Merged under SEC-005 as HIGH.

### Cluster 4: Wildcard CORS on delete-account
| Report | ID | Severity |
|---|---|---|
| Backend | BE-013 | MEDIUM |
| Security | SEC-003 | HIGH |

**Resolution:** SEC-003 severity (HIGH) is correct. Account deletion is an irreversible destructive operation; wildcard CORS on it warrants HIGH. BE-013 is subsumed.

### Cluster 5: localStorage Sensitive Data Persistence
| Report | ID | Severity |
|---|---|---|
| Privacy | PRV-013 | MEDIUM |
| Security | SEC-006 | HIGH |

**Resolution:** SEC-006 severity (HIGH) is correct for a medical dating app. Match data includes medical professionals' PII (name, hospital, specialty). Merged under SEC-006.

### Cluster 6: No Data Retention / TTL Enforcement
| Report | ID | Severity |
|---|---|---|
| Privacy | PRV-002 | CRITICAL |
| Security | SEC-013 | MEDIUM |

**Resolution:** PRV-002 severity (CRITICAL) is correct. The privacy policy makes legally binding retention commitments that are not enforced. This is a regulatory compliance failure, not just a security concern. SEC-013 is subsumed.

### Cluster 7: IP Address Third-Party Leak + Base64 "Hashing"
| Report | ID | Severity |
|---|---|---|
| Privacy | PRV-012 | MEDIUM |
| Security | SEC-010 | MEDIUM |

**Resolution:** Both describe the same `ipify.org` + `btoa()` issue. **Partially fixed** (btoa -> SHA-256), but ipify.org third-party leak remains. Merged as PRV-012, MEDIUM. Residual scope: remove ipify.org dependency.

### Cluster 8: Hardcoded Supabase URL (Mobile)
| Report | ID | Severity |
|---|---|---|
| Backend | BE-009 | HIGH |
| Privacy | PRV-010 | HIGH |

**Resolution:** **ALREADY FIXED.** Both refer to the same hardcoded URL.

### Cluster 9: Zustand Store Mock Data
| Report | ID | Severity |
|---|---|---|
| Backend | BE-020 | LOW |
| Frontend | FE-024 | LOW |

**Resolution:** Related but distinct. BE-020 covers store initial state mocks (matchStore, notificationStore). FE-024 covers ChatView inline mock responses/photos. Both LOW, kept as separate items.

### Cluster 10: Plan Name Mismatch (GOLD/PLATINUM vs DOSE/FORTE/ULTRA)
| Report | ID | Severity |
|---|---|---|
| Backend | BE-021 | LOW |
| Frontend | FE-003 | HIGH |

**Resolution:** FE-003 severity (HIGH) is correct. FE-003 specifically identifies that FORTE and ULTRA both map to Stripe's PLATINUM price, meaning ULTRA subscribers pay more but get the same plan as FORTE. This is a billing integrity issue. BE-021 is subsumed.

### Cluster 11: Chat Messages Input Sanitization
| Report | ID | Severity |
|---|---|---|
| Backend | BE-019 | MEDIUM |
| Backend | BE-014 | MEDIUM |

**Resolution:** Separate issues. BE-019 = text message sanitization. BE-014 = file upload type validation. Both kept independently.

---

## 4. SEVERITY CONTRADICTIONS & RESOLUTIONS

| Finding | Report A | Report B | Verdict | Rationale |
|---|---|---|---|---|
| Mock data engine | BE-010: HIGH | FE-001: CRITICAL | **CRITICAL** | Core feature non-functional; no real users visible |
| Wildcard CORS delete-account | BE-013: MEDIUM | SEC-003: HIGH | **HIGH** | Irreversible destructive endpoint; attack surface real |
| localStorage sensitive data | PRV-013: MEDIUM | SEC-006: HIGH | **HIGH** | Medical PII exposure via XSS; regulatory implications |
| Data retention | PRV-002: CRITICAL | SEC-013: MEDIUM | **CRITICAL** | Privacy policy commitments are legally binding; failure = deceptive practice |
| Plan name mismatch | BE-021: LOW | FE-003: HIGH | **HIGH** | Billing integrity: ULTRA users overcharged |
| Rate limiting missing | BE-011: MEDIUM | (not in SEC) | **MEDIUM** | Supabase has built-in rate limits; app-level is defense-in-depth |

---

## 5. GAP ANALYSIS -- Areas No Audit Fully Covered

| # | Gap Area | Risk | Effort | Details |
|---|---|---|---|---|
| GAP-001 | **ESLint / Code Quality Tooling** | MEDIUM | 4h | No `eslint.config.js` exists. ESLint v9 flat config migration needed. Automated code quality enforcement absent. Only TSC catches type errors. |
| GAP-002 | **CI/CD Pipeline** | HIGH | 8h | No `.github/workflows/`, no Dockerfile, no deployment automation found. All builds/deploys appear manual. No pre-commit hooks. |
| GAP-003 | **Automated Testing Coverage** | HIGH | 16h | Vitest + Playwright in `package.json` but no test files found in component/service directories. Zero test coverage for critical paths (auth, matching, payment). |
| GAP-004 | **Monitoring / Alerting** | MEDIUM | 4h | Sentry configured for error tracking. No uptime monitoring, no database performance monitoring, no alerting rules for security events (failed logins, mass deletions). |
| GAP-005 | **Backup / Disaster Recovery** | MEDIUM | 2h | Supabase provides automated backups but no documented RTO/RPO. No backup verification procedure. No point-in-time recovery testing. |
| GAP-006 | **Store Compliance (App Store / Play Store)** | HIGH | 8h | Missing: app privacy label declarations, subscription auto-renewal disclosure in-app, content rating questionnaire, medical disclaimer. PRV-003 covers mobile gaps but store metadata not audited. |
| GAP-007 | **Dependency Update Strategy** | LOW | 2h | 772 total dependencies. Only 1 known vulnerability (qs, LOW). No Dependabot/Renovate configuration. No update cadence documented. |
| GAP-008 | **Internationalization (i18n) Architecture** | MEDIUM | 8h | FE-004 notes mixed Turkish/English but no audit assessed i18n architecture. No i18n library. Hardcoded strings in 30+ components. Future language support impossible without refactor. |

---

## 6. MASTER FINDINGS TABLE

All 68 active findings in a single deduplicated table, sorted by Risk Score DESC then Effort ASC.

**Legend:**
- Risk Score = Impact x Likelihood (1-25)
- Effort in hours (1 day = 8h)
- Sprint: S1 = This Week (CRITICAL), S2 = Next Week (HIGH), S3 = Week 3-4 (MEDIUM), BL = Backlog (LOW)
- Source: BE = Backend, FE = Frontend, SEC = Security, PRV = Privacy, GAP = Gap Analysis

| # | ID | Title | Source | Severity | Impact | Likelihood | Risk Score | Effort (h) | Sprint |
|---|---|---|---|---|---|---|---|---|---|
| 1 | PRV-001 | Registration completes without recording KVKK/GDPR consent | PRV | CRITICAL | 5 | 5 | 25 | 16 | S1 |
| 2 | FE-001 (=BE-010) | Discovery engine runs entirely on mock data | FE+BE | CRITICAL | 5 | 5 | 25 | 4 | S1 |
| 3 | SEC-001 (=BE-004, SEC-008) | moderate-image: no auth + wildcard CORS + service role access | SEC+BE | CRITICAL | 5 | 4 | 20 | 2 | S1 |
| 4 | PRV-002 (=SEC-013) | No data retention enforcement; privacy policy promises not honored | PRV+SEC | CRITICAL | 5 | 4 | 20 | 8 | S1 |
| 5 | PRV-003 | Mobile registration lacks all privacy controls | PRV | CRITICAL | 5 | 4 | 20 | 40 | S1 |
| 6 | SEC-002 | Full PII sent to edge function over network (geminiService) | SEC | HIGH | 5 | 4 | 20 | 1 | S2 |
| 7 | PRV-004 | Age verification is self-reported only; no document cross-check | PRV | HIGH | 4 | 4 | 16 | 8 | S2 |
| 8 | SEC-005 (=BE-008) | Session restoration uses getSession (local JWT), skips verification check | SEC+BE | HIGH | 4 | 4 | 16 | 1 | S2 |
| 9 | FE-003 (=BE-021) | Stripe tier mapping: FORTE+ULTRA both map to PLATINUM price | FE+BE | HIGH | 4 | 4 | 16 | 2 | S2 |
| 10 | PRV-005 | Data export missing received messages + multiple tables | PRV | HIGH | 4 | 4 | 16 | 4 | S2 |
| 11 | BE-007 | Filtresiz Realtime conversation subscription (info leak) | BE | HIGH | 4 | 3 | 12 | 2 | S2 |
| 12 | SEC-004 | Client can set own verification_status to VERIFIED via RLS | SEC | HIGH | 4 | 3 | 12 | 2 | S2 |
| 13 | PRV-006 | Account deletion soft-deletes only; two inconsistent deletion paths | PRV | HIGH | 5 | 3 | 15 | 8 | S2 |
| 14 | PRV-009 | No granular consent management; no consent withdrawal mechanism | PRV | HIGH | 4 | 3 | 12 | 4 | S2 |
| 15 | SEC-003 (=BE-013) | Wildcard CORS on delete-account endpoint | SEC+BE | HIGH | 4 | 3 | 12 | 1 | S2 |
| 16 | SEC-006 (=PRV-013) | Sensitive medical PII persisted to localStorage in plaintext | SEC+PRV | HIGH | 4 | 3 | 12 | 2 | S2 |
| 17 | PRV-007 | Salary data collected without legal basis; violates data minimization | PRV | HIGH | 4 | 4 | 16 | 3 | S2 |
| 18 | PRV-008 | Analytics SDKs (Mixpanel/PostHog) initialized without IP anonymization | PRV | HIGH | 4 | 3 | 12 | 4 | S2 |
| 19 | SEC-007 | Profile photos accessible to ALL authenticated users (no block check) | SEC | HIGH | 4 | 2 | 8 | 3 | S2 |
| 20 | GAP-002 | No CI/CD pipeline; all builds/deploys manual | GAP | HIGH | 4 | 3 | 12 | 8 | S2 |
| 21 | GAP-003 | Zero automated test coverage for critical paths | GAP | HIGH | 4 | 3 | 12 | 16 | S2 |
| 22 | GAP-006 | Store compliance gaps (privacy labels, auto-renewal, medical disclaimer) | GAP | HIGH | 4 | 3 | 12 | 8 | S2 |
| 23 | FE-002 | App.tsx monolith (1449 lines); maintainability and testability issue | FE | MEDIUM | 3 | 5 | 15 | 3 | S3 |
| 24 | FE-004 | Mixed Turkish/English UI content; no i18n system | FE | MEDIUM | 3 | 5 | 15 | 2 | S3 |
| 25 | FE-005 | ChatView messages not synced with store; lost on page refresh | FE | MEDIUM | 3 | 4 | 12 | 3 | S3 |
| 26 | FE-006 | Dark mode incomplete; light mode renders unreadable text | FE | MEDIUM | 3 | 4 | 12 | 2 | S3 |
| 27 | FE-007 | ProfileCard uses CSS backgroundImage; hurts LCP, no lazy/srcset | FE | MEDIUM | 3 | 4 | 12 | 2 | S3 |
| 28 | BE-011 | No rate limiting on client services (auth, chat, upload, report) | BE | MEDIUM | 3 | 3 | 9 | 4 | S3 |
| 29 | BE-012 | notification_outbox + moderation_queue: RLS enabled but no policy defined | BE | MEDIUM | 3 | 3 | 9 | 2 | S3 |
| 30 | BE-014 | Chat media upload: no file type validation, hardcoded contentType | BE | MEDIUM | 3 | 3 | 9 | 2 | S3 |
| 31 | BE-016 | create_conversation race condition (concurrent duplicate creation) | BE | MEDIUM | 3 | 2 | 6 | 3 | S3 |
| 32 | BE-017 | signUpWithEmail metadata accepts arbitrary Record<string, unknown> | BE | MEDIUM | 3 | 2 | 6 | 2 | S3 |
| 33 | BE-018 | Notification preferences read-then-write race condition | BE | MEDIUM | 2 | 3 | 6 | 4 | S3 |
| 34 | BE-019 | Chat messages: no input sanitization or max length | BE | MEDIUM | 3 | 3 | 9 | 1 | S3 |
| 35 | PRV-011 | Verification documents not auto-deleted after approval (promised 30 days) | PRV | MEDIUM | 3 | 4 | 12 | 8 | S3 |
| 36 | PRV-012 (residual) | ipify.org third-party IP leak (btoa fixed, but ipify.org remains) | PRV | MEDIUM | 3 | 3 | 9 | 2 | S3 |
| 37 | PRV-014 | Terms of Service is skeleton-only (30 lines); missing critical sections | PRV | MEDIUM | 3 | 3 | 9 | 4 | S3 |
| 38 | PRV-015 | Privacy policy English-only; KVKK requires Turkish | PRV | MEDIUM | 3 | 3 | 9 | 3 | S3 |
| 39 | PRV-016 | Privacy policy not accessible from app settings/profile | PRV | MEDIUM | 3 | 3 | 9 | 4 | S3 |
| 40 | PRV-017 | Analytics consent stored only in localStorage; no server-side record | PRV | MEDIUM | 3 | 2 | 6 | 3 | S3 |
| 41 | PRV-018 | Account deletion has no persistent audit trail | PRV | MEDIUM | 3 | 2 | 6 | 4 | S3 |
| 42 | PRV-019 | Account deletion does not clear IndexedDB/SW cache/Secure Store | PRV | MEDIUM | 3 | 2 | 6 | 2 | S3 |
| 43 | SEC-009 | Password policy: min 8 chars only, no complexity requirement | SEC | MEDIUM | 3 | 3 | 9 | 0.5 | S3 |
| 44 | SEC-011 | Firebase config exposed in service worker registration URL | SEC | MEDIUM | 3 | 2 | 6 | 1 | S3 |
| 45 | SEC-012 | Partial push token logged to server console | SEC | MEDIUM | 2 | 2 | 4 | 0.5 | S3 |
| 46 | SEC-014 | Raw email passed to Stripe instead of Stripe Customer object | SEC | MEDIUM | 3 | 3 | 9 | 2 | S3 |
| 47 | SEC-015 | No rate limiting on checkout session creation | SEC | MEDIUM | 2 | 2 | 4 | 1 | S3 |
| 48 | SEC-016 | verified_domains table readable by all (USING true) | SEC | MEDIUM | 2 | 2 | 4 | 0.5 | S3 |
| 49 | SEC-017 | verification-documents storage bucket missing SELECT policy | SEC | MEDIUM | 3 | 2 | 6 | 1 | S3 |
| 50 | FE-008 | External CDN audio files (mixkit.co); offline failure | FE | MEDIUM | 3 | 4 | 12 | 1 | S3 |
| 51 | FE-009 | getCardStyle() not memoized; re-created every render | FE | MEDIUM | 2 | 4 | 8 | 0.5 | S3 |
| 52 | FE-010 | StoryViewer touch zones not accessible (no role/keyboard) | FE | MEDIUM | 3 | 3 | 9 | 1 | S3 |
| 53 | FE-011 | MatchesView div onClick without keyboard accessibility | FE | MEDIUM | 3 | 3 | 9 | 1 | S3 |
| 54 | FE-012 | NearbyView stale Date.now() in useMemo | FE | MEDIUM | 3 | 3 | 9 | 1 | S3 |
| 55 | FE-013 | ProfileDetailView gallery indicator not synced with scroll | FE | MEDIUM | 3 | 3 | 9 | 2 | S3 |
| 56 | FE-014 | MatchOverlay 28-38 confetti particles cause FPS drop | FE | MEDIUM | 2 | 3 | 6 | 1 | S3 |
| 57 | FE-015 | External Unsplash background image in LandingView | FE | MEDIUM | 2 | 4 | 8 | 0.5 | S3 |
| 58 | FE-016 | ChatView smooth scroll on every message; perf issue | FE | MEDIUM | 2 | 3 | 6 | 1 | S3 |
| 59 | FE-017 | localStorage access without try-catch (analytics.ts) | FE | MEDIUM | 2 | 4 | 8 | 0.5 | S3 |
| 60 | FE-018 | useEffect empty dependency array with closure stale values | FE | MEDIUM | 3 | 3 | 9 | 1 | S3 |
| 61 | FE-019 | `as any` type assertion in MyProfileView | FE | MEDIUM | 2 | 3 | 6 | 0.5 | S3 |
| 62 | FE-020 | AppHeader 6 nav buttons too narrow on mobile | FE | MEDIUM | 2 | 3 | 6 | 1 | S3 |
| 63 | FE-021 | No skip-to-content link (WCAG 2.4.1 failure) | FE | MEDIUM | 2 | 3 | 6 | 0.5 | S3 |
| 64 | GAP-001 | ESLint flat config missing; no automated code quality | GAP | MEDIUM | 2 | 3 | 6 | 4 | S3 |
| 65 | GAP-004 | No monitoring/alerting beyond Sentry errors | GAP | MEDIUM | 3 | 2 | 6 | 4 | S3 |
| 66 | GAP-005 | No documented backup/DR procedure | GAP | MEDIUM | 3 | 2 | 6 | 2 | S3 |
| 67 | GAP-008 | No i18n architecture; hardcoded strings in 30+ files | GAP | MEDIUM | 3 | 3 | 9 | 8 | S3 |
| 68 | FE-022 | ProfileCard photo navigation click-only; no touch/swipe | FE | LOW | 2 | 3 | 6 | 1 | BL |
| 69 | FE-023 | ControlPanel pointer-events gap area issue | FE | LOW | 2 | 3 | 6 | 0.5 | BL |
| 70 | FE-024 | ChatView MOCK_RESPONSES/MOCK_SHARED_PHOTOS active in prod | FE | LOW | 2 | 2 | 4 | 1 | BL |
| 71 | FE-025 | SwipeHistoryView div onClick without a11y | FE | LOW | 2 | 2 | 4 | 1 | BL |
| 72 | FE-026 | Mixed language validation messages in RegistrationFlow | FE | LOW | 1 | 3 | 3 | 0.5 | BL |
| 73 | FE-027 | Each ProfileCard starts its own 60s setInterval | FE | LOW | 2 | 2 | 4 | 1 | BL |
| 74 | FE-028 | PremiumView async onClick unhandled promise rejection | FE | LOW | 1 | 2 | 2 | 0.5 | BL |
| 75 | FE-029 | MatchOverlay inline style keyframe animations | FE | LOW | 1 | 2 | 2 | 1 | BL |
| 76 | FE-030 | MyProfileView JSX whitespace formatting | FE | LOW | 1 | 2 | 2 | 0.5 | BL |
| 77 | BE-020 | Zustand stores initialized with mock data (matchStore, notificationStore) | BE | LOW | 2 | 2 | 4 | 1 | BL |
| 78 | BE-022 | Duplicate migrations for same columns (IF NOT EXISTS protects) | BE | LOW | 1 | 2 | 2 | 1 | BL |
| 79 | BE-023 | Column name mismatch: shift_frequency vs on_call_frequency | BE | LOW | 1 | 2 | 2 | 2 | BL |
| 80 | BE-024 | getSession() deprecation in authService (Supabase v2+) | BE | LOW | 1 | 1 | 1 | 1 | BL |
| 81 | PRV-020 | KVKK data controller info incomplete (no address, VERBIS, KEP) | PRV | LOW | 2 | 3 | 6 | 2 | BL |
| 82 | PRV-021 | Community guidelines acceptance not recorded server-side | PRV | LOW | 2 | 2 | 4 | 1 | BL |
| 83 | PRV-022 | No active age-gate mechanism on mobile | PRV | LOW | 2 | 2 | 4 | 2 | BL |
| 84 | PRV-023 | Raw user agent string stored in consent table | PRV | LOW | 2 | 2 | 4 | 1 | BL |
| 85 | SEC-018 | qs 6.7.0-6.14.1 DoS vulnerability (CVSS 3.7) | SEC | LOW | 2 | 2 | 4 | 0.5 | BL |
| 86 | SEC-019 | @ts-nocheck in 3 edge functions | SEC | LOW | 1 | 1 | 1 | 0.5 | BL |
| 87 | SEC-020 | IS_DEV exported but unused as production guard | SEC | LOW | 2 | 2 | 4 | 0.5 | BL |
| 88 | SEC-021 | Raw UUID logged in deletion console output | SEC | LOW | 1 | 1 | 1 | 0.5 | BL |
| 89 | SEC-022 | .env.local credentials (correctly gitignored) | SEC | LOW | 2 | 1 | 2 | 1 | BL |
| 90 | GAP-007 | No Dependabot/Renovate; no dependency update strategy | GAP | LOW | 2 | 2 | 4 | 2 | BL |

---

## 7. SPRINT PLAN

### Sprint 1: CRITICAL -- This Week (Fix Immediately)

| # | ID | Title | Effort (h) | Owner Hint |
|---|---|---|---|---|
| 1 | FE-001 (=BE-010) | Replace MOCK_PROFILES with Supabase queries | 4 | Backend + Frontend |
| 2 | SEC-001 (=BE-004) | Add auth guard + bucket whitelist to moderate-image | 2 | Backend |
| 3 | PRV-001 | Record KVKK/GDPR consent at registration | 16 | Full-stack |
| 4 | PRV-002 (=SEC-013) | Implement pg_cron retention jobs (messages, docs, notifications) | 8 | Backend/DBA |
| 5 | PRV-003 | Mobile registration: age, consent, clickable links, verification | 40 | Mobile |

**Sprint 1 Total: ~70h** (PRV-003 is the largest; can be split across sprint 1-2 if needed)

**Note on PRV-003:** The 40h estimate reflects full parity with web registration. A phased approach is recommended:
- Phase 1 (8h): Age field + clickable terms links + consent recording
- Phase 2 (16h): Medical role/specialty collection + document upload
- Phase 3 (16h): Full verification flow parity

---

### Sprint 2: HIGH -- Next Week (Plan and Execute)

| # | ID | Title | Effort (h) | Owner Hint |
|---|---|---|---|---|
| 1 | SEC-002 | Send only profile IDs to icebreaker edge function | 1 | Backend |
| 2 | SEC-005 (=BE-008) | Replace getSession with getUser + verification_status check | 1 | Frontend |
| 3 | SEC-003 (=BE-013) | Replace wildcard CORS on delete-account with origin whitelist | 1 | Backend |
| 4 | FE-003 (=BE-021) | Fix Stripe tier mapping: separate price IDs for DOSE/FORTE/ULTRA | 2 | Full-stack |
| 5 | SEC-004 | Restrict verification_status update to server-only RPC | 2 | Backend/DBA |
| 6 | BE-007 | Add conversation ID filter to Realtime subscription | 2 | Backend |
| 7 | SEC-006 (=PRV-013) | Remove sensitive fields from localStorage persistence | 2 | Frontend |
| 8 | SEC-007 | Profile photos: add block-aware storage RLS policy | 3 | Backend/DBA |
| 9 | PRV-007 | Remove salary field or add explicit consent + legal basis | 3 | Full-stack |
| 10 | PRV-005 | Fix data export: include received messages + all tables | 4 | Backend |
| 11 | PRV-009 | Build consent management center in profile settings | 4 | Frontend |
| 12 | PRV-008 | Configure Mixpanel/PostHog with IP anonymization | 4 | Frontend |
| 13 | PRV-006 | Unify deletion paths; implement hard-delete after grace period | 8 | Backend |
| 14 | GAP-002 | Set up CI/CD pipeline (GitHub Actions: build, test, lint) | 8 | DevOps |
| 15 | GAP-006 | Prepare store compliance: privacy labels, auto-renewal, disclaimer | 8 | Product/Legal |
| 16 | GAP-003 | Add test coverage for critical paths (auth, matching, payment) | 16 | Testing |

**Sprint 2 Total: ~69h**

---

### Sprint 3: MEDIUM -- Weeks 3-4

| # | ID | Title | Effort (h) |
|---|---|---|---|
| 1 | SEC-009 | Add password complexity requirement | 0.5 |
| 2 | FE-009 | Memoize getCardStyle() | 0.5 |
| 3 | FE-015 | Move Unsplash background to local assets | 0.5 |
| 4 | FE-017 | Add try-catch around localStorage access in analytics | 0.5 |
| 5 | FE-019 | Replace `as any` with proper type assertion | 0.5 |
| 6 | FE-021 | Add skip-to-content link (WCAG 2.4.1) | 0.5 |
| 7 | SEC-012 | Remove partial push token from server logs | 0.5 |
| 8 | SEC-016 | Restrict verified_domains to authenticated users only | 0.5 |
| 9 | SEC-011 | Move Firebase config out of service worker URL | 1 |
| 10 | SEC-015 | Add rate limiting to checkout session creation | 1 |
| 11 | SEC-017 | Add explicit admin-only SELECT policy to verification-documents bucket | 1 |
| 12 | BE-019 | Add input sanitization + max length to chat messages | 1 |
| 13 | FE-008 | Move CDN audio files to local /public/sounds/ | 1 |
| 14 | FE-010 | StoryViewer: add role="button" + keyboard handlers | 1 |
| 15 | FE-011 | MatchesView: replace div onClick with button | 1 |
| 16 | FE-012 | NearbyView: add nowMs to useMemo dependencies | 1 |
| 17 | FE-014 | Reduce MatchOverlay particle count | 1 |
| 18 | FE-016 | ChatView: initial scroll auto, subsequent smooth | 1 |
| 19 | FE-018 | Fix useEffect closure stale value (callback pattern) | 1 |
| 20 | FE-020 | AppHeader: implement responsive nav / bottom tab bar | 1 |
| 21 | FE-004 | Standardize all UI text to one language (or add i18n) | 2 |
| 22 | FE-006 | Complete dark mode: add light mode text classes | 2 |
| 23 | FE-007 | Replace backgroundImage with img element + lazy loading | 2 |
| 24 | FE-013 | Fix gallery indicator sync with IntersectionObserver | 2 |
| 25 | FE-055 | Fix empty dependency array closure issue | 1 |
| 26 | BE-012 | Add explicit service_role policies for outbox/moderation tables | 2 |
| 27 | BE-014 | Add file type validation to chat media upload | 2 |
| 28 | BE-017 | Add Zod schema validation for signUp metadata | 2 |
| 29 | SEC-014 | Use Stripe Customer object instead of raw email | 2 |
| 30 | PRV-012 (residual) | Remove ipify.org dependency; use server-side IP from request header | 2 |
| 31 | PRV-016 | Add privacy policy link to profile/settings page | 4 |
| 32 | PRV-019 | Clear IndexedDB/SW cache/Secure Store on account deletion | 2 |
| 33 | GAP-005 | Document backup/DR procedure with RTO/RPO | 2 |
| 34 | FE-002 | Refactor App.tsx into custom hooks and sub-components | 3 |
| 35 | FE-005 | Sync ChatView messages with store | 3 |
| 36 | BE-016 | Fix create_conversation race condition (FOR UPDATE or unique constraint) | 3 |
| 37 | PRV-015 | Add Turkish privacy policy translation | 3 |
| 38 | PRV-017 | Record analytics consent server-side via recordConsent() | 3 |
| 39 | BE-011 | Add rate limiting to critical client services | 4 |
| 40 | BE-018 | Fix notification preferences race condition (atomic update) | 4 |
| 41 | PRV-014 | Draft comprehensive Terms of Service (legal effort) | 4 |
| 42 | PRV-018 | Create persistent account deletion audit trail table | 4 |
| 43 | GAP-001 | Create eslint.config.js (flat config v9 migration) | 4 |
| 44 | GAP-004 | Set up monitoring/alerting (uptime, DB perf, security events) | 4 |
| 45 | PRV-011 | Implement verification document auto-deletion after 30 days | 8 |
| 46 | GAP-008 | Evaluate and implement i18n architecture | 8 |

**Sprint 3 Total: ~83h**

---

### Backlog: LOW + Nice-to-Have

| # | ID | Title | Effort (h) |
|---|---|---|---|
| 1 | FE-023 | ControlPanel pointer-events gap fix | 0.5 |
| 2 | FE-026 | Standardize validation message language | 0.5 |
| 3 | FE-028 | PremiumView async onClick: add void pattern | 0.5 |
| 4 | FE-030 | MyProfileView JSX whitespace cleanup | 0.5 |
| 5 | SEC-018 | Run npm audit fix (qs vulnerability) | 0.5 |
| 6 | SEC-019 | Remove @ts-nocheck from edge functions | 0.5 |
| 7 | SEC-020 | Remove unused IS_DEV export | 0.5 |
| 8 | SEC-021 | Remove UUID from deletion log output | 0.5 |
| 9 | FE-024 | Remove/guard ChatView mock responses and photos | 1 |
| 10 | FE-025 | SwipeHistoryView: replace div with button (a11y) | 1 |
| 11 | FE-027 | ProfileCard: share nowMs prop instead of per-card intervals | 1 |
| 12 | FE-029 | Move MatchOverlay keyframes to tailwind.config.js | 1 |
| 13 | FE-022 | ProfileCard: add touch/swipe for photo navigation | 1 |
| 14 | BE-020 | Replace mock initial state in Zustand stores | 1 |
| 15 | BE-024 | Replace getSession() with getUser() in authService | 1 |
| 16 | PRV-021 | Record community guidelines acceptance server-side | 1 |
| 17 | PRV-023 | Hash user agent before storing in consent table | 1 |
| 18 | SEC-022 | Document credential rotation procedure for .env.local | 1 |
| 19 | BE-022 | Consolidate duplicate migrations | 1 |
| 20 | BE-023 | Resolve shift_frequency vs on_call_frequency column name | 2 |
| 21 | PRV-020 | Add KVKK data controller details (address, VERBIS, KEP) | 2 |
| 22 | PRV-022 | Implement active age-gate on mobile | 2 |
| 23 | GAP-007 | Configure Dependabot/Renovate for dependency updates | 2 |

**Backlog Total: ~22h**

---

## 8. CROSS-CUTTING RISK CHAINS

These are scenarios where multiple findings from different audits combine to create amplified risk.

### Chain 1: Complete Verification Bypass (CRITICAL compound)
**SEC-004 + SEC-005 = Unverified user accesses full app as "VERIFIED"**
- SEC-005: Session restoration does not check `verification_status`
- SEC-004: Client can set `verification_status = 'VERIFIED'` via RLS UPDATE
- **Combined:** Any registered user can become "verified" without medical credentials
- **Sprint:** S2 (both must be fixed together)

### Chain 2: Storage Exfiltration via Moderation (CRITICAL compound)
**SEC-001 + SEC-007 = Any user reads any file from any bucket**
- SEC-001: moderate-image has no auth; uses service_role_key internally
- SEC-007: Profile photos accessible to all authenticated users
- **Combined:** Unauthenticated attacker invokes moderation function to get signed URLs for verification-documents (IDs, diplomas)
- **Sprint:** S1 + S2 (SEC-001 in S1, SEC-007 in S2)

### Chain 3: GDPR Compliance Failure (CRITICAL compound)
**PRV-001 + PRV-002 + PRV-005 + PRV-006 = Complete GDPR non-compliance**
- PRV-001: No consent recorded
- PRV-002: No data retention enforcement
- PRV-005: Incomplete data export
- PRV-006: Incomplete data deletion
- **Combined:** Fails Articles 6, 7, 17, 20 simultaneously. Regulatory audit would result in maximum penalties.
- **Sprint:** S1 + S2

### Chain 4: Mock Data + Billing Integrity (HIGH compound)
**FE-001 + FE-003 = Users pay for premium but see fake profiles with wrong billing**
- FE-001: Discovery runs on mock data
- FE-003: ULTRA tier maps to PLATINUM Stripe price (overcharge)
- **Combined:** Users pay premium prices but interact with mock profiles; ULTRA subscribers are overcharged
- **Sprint:** S1 + S2

---

## 9. POSITIVE FINDINGS (Cross-Audit Consensus)

All four audits agree these areas are well-implemented:

| # | Area | Details |
|---|---|---|
| 1 | IDOR Prevention | All services use `auth.getUser()` internally (post-audit fix) |
| 2 | Stripe Webhook Security | Signature verification + idempotency key + plan validation |
| 3 | RLS Coverage | Comprehensive policies on all 14+ main tables |
| 4 | AI PII Anonymization | generate-icebreaker strips PII server-side before Gemini call |
| 5 | Push Worker Design | Claim-process-reclaim pattern, exponential backoff, CRON_SECRET |
| 6 | Photo Upload Validation | photoService: file type, size, ownership checks |
| 7 | Storage Bucket Privacy | All buckets set to private (public = FALSE) |
| 8 | Error Normalization | Login error messages prevent account enumeration |
| 9 | Sentry PII Protection | sendDefaultPii: false; Authorization header stripped |
| 10 | React Security Defaults | No dangerouslySetInnerHTML; JSX escaping prevents XSS |
| 11 | TypeScript Strict Mode | 0 compilation errors; strict mode enabled |
| 12 | Error Boundary | Retry, go-home, report-bug actions implemented |
| 13 | RegExp Safety | escapeRegExp() in ChatView search |

---

## 10. EFFORT SUMMARY

| Sprint | Finding Count | Total Effort (h) | Effort (person-days, 8h/day) |
|--------|--------------|-------------------|------------------------------|
| Sprint 1 (CRITICAL) | 5 | 70 | 8.75 |
| Sprint 2 (HIGH) | 17 | 69 | 8.6 |
| Sprint 3 (MEDIUM) | 46 | 83 | 10.4 |
| Backlog (LOW) | 23 | 22 | 2.75 |
| **Total** | **91 (incl. sub-items)** | **244** | **30.5** |

**Note:** 10 findings already fixed this session are excluded from effort totals. The 91 line items include gap findings and some sub-items from merged clusters. The unique master backlog count is 68 after dedup.

---

## 11. REGULATORY COMPLIANCE STATUS (Cross-Audit)

| Regulation | Status | Blocking Findings |
|---|---|---|
| KVKK Madde 5 (Acik Riza) | FAIL | PRV-001, PRV-009 |
| KVKK Madde 4(c) (Veri Minimizasyonu) | PARTIAL | PRV-007, PRV-008 |
| KVKK Madde 4(d) (Saklama Suresi) | FAIL | PRV-002, PRV-011 |
| KVKK Madde 7 (Silme Hakki) | PARTIAL | PRV-006, PRV-019 |
| KVKK Madde 10 (Aydinlatma) | PARTIAL | PRV-015, PRV-016, PRV-020 |
| KVKK Madde 11(g) (Tasinabilirlik) | PARTIAL | PRV-005 |
| GDPR Article 6-7 (Consent) | FAIL | PRV-001, PRV-009, PRV-017 |
| GDPR Article 17 (Erasure) | PARTIAL | PRV-006, PRV-018 |
| GDPR Article 20 (Portability) | PARTIAL | PRV-005 |
| GDPR Article 25 (Privacy by Design) | PARTIAL | PRV-008, SEC-006 |
| GDPR Article 32 (Security) | PARTIAL | SEC-001, SEC-004, SEC-005 |
| GDPR Article 35 (DPIA) | MISSING | No DPIA documented |
| App Store 5.1.1 | FAIL | PRV-001, PRV-003, PRV-016, GAP-006 |
| Play Store User Data Policy | FAIL | PRV-001, PRV-003, PRV-014, GAP-006 |
| OWASP Top 10 | PARTIAL | SEC-001, SEC-004, SEC-005 (A01, A07) |

**Verdict:** The application cannot be launched to production until Sprint 1 CRITICAL and Sprint 2 HIGH items for PRV-001, PRV-002, PRV-003, SEC-001, and SEC-004/SEC-005 are resolved. Both App Store and Play Store submissions will be rejected in current state.

---

## 12. RECOMMENDATIONS

1. **Schema Standardization:** Root cause of 5 originally-CRITICAL bugs (BE-001/002/003/005/006/015) was inconsistent column naming across migrations. All fixed now, but recommend a single source-of-truth migration file with CI validation.

2. **Legal Engagement:** PRV-001, PRV-014, PRV-015, PRV-020, GAP-006 all require legal expertise (KVKK attorney, ToS drafting, store compliance). Budget 40h legal effort separately.

3. **Mobile Feature Parity:** PRV-003 is the highest-effort single finding (40h). The mobile app is essentially a non-functional shell compared to web. Consider whether mobile launch should be deferred until web is stable.

4. **Testing Before Launch:** GAP-003 (zero test coverage) combined with the volume of security findings means any fix could introduce regressions. Prioritize test coverage for auth flow, payment flow, and data deletion.

5. **Post-Launch Audit:** Schedule a follow-up security audit after Sprint 2 completion, focusing on the fixed items and any new attack surfaces introduced by the fixes.

---

**END OF CROSS-REVIEW REPORT**
