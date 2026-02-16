# 📱 VITALIS MOBILE PERFECTION ORCHESTRATOR v2.1 COMPLETE

## Elite Quality Operating System for Production-Grade Dating App

> **Version:** 2.1 Complete (Final)
> **Classification:** Release Engineering Directive
> **Scope:** iOS + Android dual-platform deployment
> **Governance:** SLO-driven, automated gates, evidence-backed
> **Risk Model:** Staged rollout + feature flags + kill switches
> **Compliance:** Apple 1.2, Google Play UGC, GDPR, KVKK

---

## TABLE OF CONTENTS

1. [Mission & Success Criteria](#1-mission--success-criteria)
2. [SLIs / SLOs / Error Budget](#2-slis--slos--error-budget)
3. [Quality Gates (Automated CI/CD)](#3-quality-gates-automated-cicd)
4. [Release Strategy & Risk Management](#4-release-strategy--risk-management)
5. [Evidence Dossier Standard](#5-evidence-dossier-standard)
6. [22 Expert Agent System](#6-22-expert-agent-system)
7. [Trust & Safety Domain](#7-trust--safety-domain)
8. [Store Compliance & Payment Strategy](#8-store-compliance--payment-strategy)
9. [Data Governance & Privacy](#9-data-governance--privacy)
10. [Execution Protocol](#10-execution-protocol)
11. [Output Artifacts](#11-output-artifacts)
12. [Startup Command](#12-startup-command)

---

## 1. MISSION & SUCCESS CRITERIA

### 1.1 Mission Statement

Deliver Vitalis as a **production-grade, store-compliant, premium dating application** for medical professionals. The app must achieve release-candidate quality across both iOS and Android platforms with **zero critical defects, measurable performance guarantees, and automated quality verification**.

### 1.2 Definition of Done (Global)

Release is approved **only when ALL** conditions are met:

| # | Criterion | Verification Method |
|---|-----------|---------------------|
| 1 | All SLOs green for 72 hours | Monitoring dashboard |
| 2 | All 6 Quality Gates passed | CI/CD pipeline artifacts |
| 3 | All 22 agents signed off | Evidence dossier review |
| 4 | Zero P0/P1 open issues | Issue tracker audit |
| 5 | Store compliance checklist 100% | Manual + automated |
| 6 | Security audit passed | Third-party or internal pen test |
| 7 | Legal/Privacy review approved | Counsel sign-off |
| 8 | Beta user feedback incorporated | TestFlight/Internal track |

### 1.3 Non-Goals (Out of Scope)

- Backend infrastructure changes (consume existing Supabase)
- New feature development (polish existing features only)
- Marketing assets (screenshots/videos by design team)
- Localization beyond Turkish/English

---

## 2. SLIs / SLOs / ERROR BUDGET

### 2.1 Service Level Indicators (What We Measure)

| SLI ID | Metric | Measurement Method | Frequency |
|--------|--------|-------------------|-----------|
| SLI-01 | Crash-free sessions | Sentry/Crashlytics | Real-time |
| SLI-02 | ANR-free sessions (Android) | Play Console | Daily |
| SLI-03 | Cold start time (p50, p95) | Custom timing + Sentry | Per release |
| SLI-04 | Swipe animation FPS (p95) | Perf monitor sampling | Per release |
| SLI-05 | Chat scroll FPS (p95) | Perf monitor sampling | Per release |
| SLI-06 | Push delivery success | FCM/APNs delivery reports | Hourly |
| SLI-07 | Message send success | Supabase logs | Real-time |
| SLI-08 | API latency p95 (core endpoints) | Supabase logs / custom | Real-time |
| SLI-09 | Match event latency | Custom timing | Per release |
| SLI-10 | Image load time p95 | Custom timing | Per release |

### 2.2 Service Level Objectives (Our Commitments)

| SLO ID | Target | Window | Measurement |
|--------|--------|--------|-------------|
| SLO-01 | Crash-free ≥ 99.9% | 7-day rolling | Sessions without crash / Total sessions |
| SLO-02 | ANR-free ≥ 99.95% | 7-day rolling | Sessions without ANR / Total sessions |
| SLO-03 | Cold start p95 < 2.0s | Per release | 95th percentile on mid-tier devices |
| SLO-04 | Swipe FPS p95 ≥ 58 | Per release | 95th percentile during swipe |
| SLO-05 | Chat FPS p95 ≥ 58 | Per release | 95th percentile during scroll |
| SLO-06 | Push delivery ≥ 99% | 24-hour rolling | Delivered within 15 min / Total sent |
| SLO-07 | Message success ≥ 99.9% | 24-hour rolling | Successful sends / Total attempts |
| SLO-08 | API p95 < 400ms | 24-hour rolling | Core endpoints (auth, match, chat) |
| SLO-09 | Match event < 500ms | Per release | Time from swipe to match popup |
| SLO-10 | Image load p95 < 1.5s | Per release | Profile images on 4G network |

### 2.3 Error Budget Policy

**NORMAL OPERATION (All SLOs green):**
- Feature work proceeds normally
- Staged rollout continues as planned

**YELLOW ALERT (Any SLO at 95% of target for > 1 hour):**
- Alert on-call engineer
- Pause new feature rollouts
- Investigate root cause

**RED ALERT (Any SLO breached for > 2 hours):**
- Freeze all rollouts
- All hands on reliability fix
- Consider rollback to last stable

**CRITICAL (Crash-free < 99.5% OR Message success < 99%):**
- Immediate rollback
- Hotfix required before any forward progress
- Post-incident review mandatory

### 2.4 SLO Dashboard Requirements
```typescript
interface SLODashboard {
  realtime: {
    crashFreeRate: number;
    messageSuccessRate: number;
    apiLatencyP95: number;
    activeConnections: number;
  };
  rolling: {
    crashFree7d: number;
    anrFree7d: number;
    pushDelivery24h: number;
  };
  perRelease: {
    coldStartP50: number;
    coldStartP95: number;
    swipeFpsP95: number;
    chatFpsP95: number;
    imageLoadP95: number;
  };
  errorBudget: {
    crashBudgetRemaining: number;
    messageBudgetRemaining: number;
    status: 'green' | 'yellow' | 'red' | 'critical';
  };
}
```

---

## 3. QUALITY GATES (Automated CI/CD)

### 3.1 Gate Overview
```
G0 ──► G1 ──► G2 ──► G3 ──► G4 ──► G5 ──► G6 ──► RELEASE
 │      │      │      │      │      │      │
 ▼      ▼      ▼      ▼      ▼      ▼      ▼
Static  Unit  Integ  E2E   Perf  SecPriv Store

Each gate produces artifacts stored in CI
Any gate failure blocks progression
Manual override requires VP-level approval + documented rationale
```

### 3.2 Gate Definitions

#### G0: Static Analysis (< 5 min)

| Check | Tool | Threshold | Blocking |
|-------|------|-----------|----------|
| TypeScript | tsc --noEmit --strict | 0 errors | Yes |
| ESLint | eslint . --max-warnings=0 | 0 errors, 0 warnings | Yes |
| Prettier | prettier --check . | All formatted | Yes |
| Dependency Audit | npm audit --production | 0 critical, 0 high | Yes |
| Secret Scan | gitleaks detect | 0 secrets | Yes |
| Dead Code | Custom script | 0 unused exports | Yes |
| Bundle Analysis | expo export --dump-sourcemap | Budget check | Warning |

**Artifacts:** g0-static-report.json, bundle-analysis.html

#### G1: Unit & Snapshot Tests (< 10 min)

| Check | Tool | Threshold | Blocking |
|-------|------|-----------|----------|
| Unit Tests | Jest | 100% passing | Yes |
| Coverage | Jest --coverage | ≥ 70% statements | Warning |
| Snapshot Tests | Jest | All snapshots match | Yes |
| Type Coverage | type-coverage | ≥ 95% | Warning |

**Artifacts:** g1-test-report.xml, coverage/lcov-report/

#### G2: Integration Tests (< 20 min)

| Check | Tool | Threshold | Blocking |
|-------|------|-----------|----------|
| Supabase Auth | Test suite | All passing | Yes |
| Supabase Realtime | Test suite | Connection + subscription | Yes |
| Supabase Storage | Test suite | Upload + download + signed URL | Yes |
| Stripe/RevenueCat Sandbox | Test suite | Checkout + webhook | Yes |
| Push Notification | Test suite | Token registration | Yes |
| RLS Policy Tests | Supabase test | All policies verified | Yes |

**Artifacts:** g2-integration-report.json, rls-policy-audit.json

#### G3: End-to-End Tests (< 45 min)

| Flow | Tool | Coverage | Blocking |
|------|------|----------|----------|
| Onboarding | Detox/Maestro | Sign up → Profile → Preferences | Yes |
| Swipe & Match | Detox/Maestro | View → Like → Match → Chat | Yes |
| Chat | Detox/Maestro | Send → Receive → Media | Yes |
| Push | Detox/Maestro | Notification → Tap → Navigate | Yes |
| Premium | Detox/Maestro | Paywall → Subscribe → Unlock | Yes |
| Profile | Detox/Maestro | Edit → Save → Verify | Yes |
| Settings | Detox/Maestro | Block → Report → Delete | Yes |

**Platforms:** iOS Simulator (iPhone 14) + Android Emulator (Pixel 7)
**Artifacts:** g3-e2e-report.html, g3-screenshots/, g3-videos/

#### G4: Performance Tests (< 30 min)

| Metric | Tool | Budget | Blocking |
|--------|------|--------|----------|
| Cold Start | Custom profiler | p95 < 2.0s | Yes |
| TTI | Custom profiler | p95 < 3.0s | Yes |
| Swipe FPS | Perf monitor | p95 ≥ 58 | Yes |
| Chat Scroll FPS | Perf monitor | p95 ≥ 58 | Yes |
| Memory (idle) | Profiler | < 150MB | Yes |
| Memory (peak) | Profiler | < 250MB | Warning |
| JS Bundle | Metro | < 5MB | Yes |
| Total Bundle | EAS | < 30MB | Yes |
| Image Load | Network profiler | p95 < 1.5s (4G) | Warning |

**Test Devices:**
- iOS: iPhone SE (low), iPhone 14 (mid), iPhone 15 Pro (high)
- Android: Pixel 4a (low), Pixel 7 (mid), Samsung S23 (high)

**Artifacts:** g4-perf-report.json, g4-flamegraphs/, g4-memory-traces/

#### G5: Security & Privacy (< 15 min)

| Check | Tool/Method | Threshold | Blocking |
|-------|-------------|-----------|----------|
| RLS Policies | Automated test | All tables protected | Yes |
| Signed URLs | Automated test | TTL ≤ 1 hour, no public URLs | Yes |
| Log Redaction | Grep audit | 0 PII in logs | Yes |
| Token Storage | Code audit | SecureStore only | Yes |
| API Security | OWASP checklist | No critical findings | Yes |
| Privacy Policy | URL check | Accessible, current | Yes |
| Data Retention | Config audit | Matches policy | Yes |
| Encryption | Config audit | At-rest + in-transit | Yes |

**Artifacts:** g5-security-report.json, g5-privacy-audit.json

#### G6: Store Readiness (Manual + Automated)

| Check | Method | Requirement | Blocking |
|-------|--------|-------------|----------|
| App Metadata | Manual | All fields complete | Yes |
| Screenshots | Manual | All sizes provided | Yes |
| Privacy Policy | URL check | Valid, accessible | Yes |
| Age Rating | Manual | 17+ configured | Yes |
| Review Notes | Manual | Demo account provided | Yes |
| Data Safety (Android) | Manual | Form complete | Yes |
| IAP/Subscription | Manual | Products configured | Yes |
| Content Guidelines | Manual | Compliant | Yes |

**Artifacts:** g6-store-checklist.md, g6-screenshots/

---

## 4. RELEASE STRATEGY & RISK MANAGEMENT

### 4.1 Feature Flags (Mandatory)

| Feature | Flag Name | Default | Kill Switch |
|---------|-----------|---------|-------------|
| New Swipe Engine | swipe_v2_enabled | false | Yes |
| Video Messages | video_messages_enabled | false | Yes |
| Super Like | super_like_enabled | true | Yes |
| Premium Gate | premium_gate_v2 | false | Yes |
| Realtime Chat | realtime_chat_enabled | true | Yes |
| Push Notifications | push_enabled | true | Yes |
| Media Upload | media_upload_enabled | true | Yes |
| Payment Processing | payments_enabled | true | Yes |
| Verification Flow | verification_v2 | false | Yes |
| Advanced Filters | advanced_filters_enabled | false | Yes |

**Flag Service:** Supabase Remote Config or LaunchDarkly

### 4.2 Kill Switches
```typescript
interface KillSwitches {
  payments: boolean;
  mediaUpload: boolean;
  realtime: boolean;
  matching: boolean;
  pushNotifications: boolean;
  videoMessages: boolean;
  stories: boolean;
  verification: boolean;
}
```

### 4.3 Staged Rollout

**Stage 0: Internal (0.1%)** - 24h, team only
**Stage 1: Canary (1%)** - 48h, random users
**Stage 2: Early Adopters (5%)** - 48h
**Stage 3: Broader (25%)** - 72h
**Stage 4: Majority (50%)** - 72h
**Stage 5: GA (100%)** - Monitor 7 days

**ROLLBACK TRIGGERS:**
- Crash-free < 99.5%
- Any P0 issue
- Error budget exhausted

### 4.4 Rollback Procedure

1. DETECT → SLO breach or P0 issue
2. DECIDE → On-call decision (< 15 min)
3. EXECUTE → Revert to stable
4. VERIFY → SLOs recovering
5. NOTIFY → Stakeholders
6. ANALYZE → Post-incident within 24h

---

## 5. EVIDENCE DOSSIER STANDARD

### 5.1 Report Template
```markdown
# [Agent Name] Audit Report

## Metadata
- **Build:** [version-buildNumber]
- **Date:** [ISO 8601]
- **Auditor:** [Agent ID]
- **Devices Tested:** [List]
- **Duration:** [minutes]

## Executive Summary
[2-3 sentences]

## SLO Impact Assessment
| SLO | Current | Target | Status |

## Findings

### Finding 1: [Title]
- **Severity:** P0 / P1 / P2 / P3
- **Category:** [Performance / Security / UX / Functionality / Compliance]
- **Impact:** [Description]
- **Evidence:** [Screenshot, logs, repro steps]
- **Root Cause:** [Technical explanation]
- **Fix:** [PR/Commit link]
- **Verification:** [Before/after metrics]

## Sign-Off
**Agent Sign-Off:** ✅ APPROVED / ❌ BLOCKED
```

### 5.2 Severity Definitions

| Severity | Definition | SLA |
|----------|------------|-----|
| P0 | Feature broken, data loss, security | 4 hours |
| P1 | Major degradation, significant UX | 24 hours |
| P2 | Minor issue, workaround exists | 1 week |
| P3 | Polish, enhancement | Next release |

---

## 6. 22 EXPERT AGENT SYSTEM

### Agent Categories
```
PLATFORM (4)          CORE FEATURES (6)       QUALITY (6)
├─ iOS Specialist     ├─ Swipe Engine         ├─ Performance
├─ Android Specialist ├─ Photo/Media          ├─ Security
├─ Build Master       ├─ Real-time Chat       ├─ Accessibility
└─ UI Consistency     ├─ Push Notifications   ├─ Testing
                      ├─ Verification         ├─ Code Quality
                      └─ Premium/Payments     └─ Animation

TRUST & SAFETY (3)    DATA & SYNC (2)         RELEASE (1)
├─ Content Moderation ├─ Offline/Sync         └─ Deployment
├─ User Safety        └─ State Management         Commander
└─ Compliance
```

### AGENT 1: 🏗️ BUILD & CONFIGURATION MASTER
**Mission:** Build system produces correct, optimized, reproducible builds.
**Scope:** Config files, dependencies, build verification, environment parity
**Output:** audit/01_BUILD_MASTER_REPORT.md

### AGENT 2: 📱 iOS PLATFORM SPECIALIST
**Mission:** Flawless iOS experience across devices.
**Scope:** Device compatibility, safe area, keyboard, haptics, permissions, push
**Output:** audit/02_IOS_PLATFORM_REPORT.md

### AGENT 3: 🤖 ANDROID PLATFORM SPECIALIST
**Mission:** Flawless Android experience across fragmented ecosystem.
**Scope:** Device compatibility, navigation, keyboard, notifications, permissions
**Output:** audit/03_ANDROID_PLATFORM_REPORT.md

### AGENT 4: 🎨 UI CONSISTENCY AUDITOR
**Mission:** Pixel-perfect consistency across platforms.
**Scope:** Design system, cross-platform parity, responsive, dark mode
**Output:** audit/04_UI_CONSISTENCY_REPORT.md

### AGENT 5: 💕 SWIPE & MATCHING ENGINE SPECIALIST
**Mission:** Tinder-level smooth swipe with <500ms match.
**SLO:** SLO-04, SLO-09
**Scope:** Gestures, card stack, actions, match flow, edge cases
**Output:** audit/05_SWIPE_ENGINE_REPORT.md

### AGENT 6: 📸 PHOTO & MEDIA SPECIALIST
**Mission:** Fast, reliable photo upload/display.
**SLO:** SLO-10
**Scope:** Upload, display, management, caching, storage
**Output:** audit/06_PHOTO_MEDIA_REPORT.md

### AGENT 7: 💬 REAL-TIME CHAT SPECIALIST
**Mission:** WhatsApp-level chat reliability.
**SLO:** SLO-06, SLO-07
**Scope:** Sending, receiving, UI, media, realtime, edge cases
**Output:** audit/07_CHAT_SYSTEM_REPORT.md

### AGENT 8: 🔔 PUSH NOTIFICATION SPECIALIST
**Mission:** 99%+ notification delivery.
**SLO:** SLO-06
**Scope:** Types, iOS/Android push, deep linking, preferences
**Output:** audit/08_PUSH_NOTIFICATION_REPORT.md

### AGENT 9: ✅ VERIFICATION FLOW SPECIALIST
**Mission:** Trustworthy professional verification.
**Scope:** Types, document upload, status, badges, admin, governance
**Output:** audit/09_VERIFICATION_FLOW_REPORT.md

### AGENT 10: 💎 PREMIUM & PAYMENT SPECIALIST
**Mission:** Frictionless, compliant subscription.
**Scope:** Tiers, payment methods, flow, features, management, validation
**Output:** audit/10_PREMIUM_PAYMENT_REPORT.md

### AGENT 11: ⚡ PERFORMANCE OPTIMIZER
**Mission:** Meet all performance SLOs.
**SLO:** SLO-03, SLO-04, SLO-05, SLO-08, SLO-10
**Scope:** Startup, runtime, memory, network, bundle, optimization
**Output:** audit/11_PERFORMANCE_REPORT.md

### AGENT 12: 🔒 SECURITY SPECIALIST
**Mission:** Protect user data.
**Scope:** Auth, network, data protection, input validation, code security
**Output:** audit/12_SECURITY_REPORT.md

### AGENT 13: 🔐 PRIVACY SPECIALIST
**Mission:** KVKK/GDPR compliance.
**Scope:** Collection, consent, rights, minimization, third parties
**Output:** audit/13_PRIVACY_REPORT.md

### AGENT 14: ♿ ACCESSIBILITY SPECIALIST
**Mission:** WCAG 2.1 AA compliance.
**Scope:** Screen reader, touch targets, visual, motion, text, forms
**Output:** audit/14_ACCESSIBILITY_REPORT.md

### AGENT 15: 🧪 COMPREHENSIVE TESTER
**Mission:** 100% critical flow coverage.
**Scope:** Onboarding, dating, profile, premium, safety, settings, edge cases
**Output:** audit/15_TEST_RESULTS_REPORT.md

### AGENT 16: 📝 CODE QUALITY ENFORCER
**Mission:** Production-grade code.
**Scope:** TypeScript, ESLint, style, architecture, documentation
**Output:** audit/16_CODE_QUALITY_REPORT.md

### AGENT 17: 🎬 ANIMATION PERFECTIONIST
**Mission:** 60fps animations.
**Scope:** Reanimated, swipe, match, chat, navigation, micro-interactions
**Output:** audit/17_ANIMATION_REPORT.md

### AGENT 18: 🛡️ CONTENT MODERATION SPECIALIST
**Mission:** Prevent harmful content.
**Scope:** Photo/text moderation, reporting, queue, guidelines
**Output:** audit/18_CONTENT_MODERATION_REPORT.md

### AGENT 19: 👤 USER SAFETY SPECIALIST
**Mission:** Protect from scams and harassment.
**Scope:** Block, unmatch, safety prompts, spam prevention, age, safety center
**Output:** audit/19_USER_SAFETY_REPORT.md

### AGENT 20: ⚖️ COMPLIANCE SPECIALIST
**Mission:** Legal/regulatory compliance.
**Scope:** Age, terms, KVKK, GDPR, store requirements, payment regulations
**Output:** audit/20_COMPLIANCE_REPORT.md

### AGENT 21: 🌐 OFFLINE & SYNC SPECIALIST
**Mission:** Reliable offline with conflict-free sync.
**Scope:** Detection, capabilities, persistence, sync, reconnection, recovery
**Output:** audit/21_OFFLINE_SYNC_REPORT.md

### AGENT 22: 🗂️ STATE MANAGEMENT AUDITOR
**Mission:** Correct, performant state.
**Scope:** Architecture, Zustand, persistence, performance, data flow
**Output:** audit/22_STATE_MANAGEMENT_REPORT.md

---

## 7. TRUST & SAFETY DOMAIN

### 7.1 Content Policy Framework

**PROHIBITED:** Nudity, violence, hate speech, harassment, illegal activity, spam, fake profiles, minors, scams

**ENFORCEMENT:** Warning → Content removal → Suspension → Ban → Law enforcement

**APPEAL:** 30 days, senior moderator, 72h decision

### 7.2 Report Handling SLA

| Report Type | Initial | Resolution |
|-------------|---------|------------|
| Underage/Illegal | < 1h | < 4h |
| Harassment | < 4h | < 24h |
| Fake/Spam | < 24h | < 48h |
| Other | < 48h | < 72h |

### 7.3 Safety Features

**Pre-emptive:** Photo moderation, text filtering, rate limiting, restrictions, fingerprinting
**User-Controlled:** Block, report, unmatch, hide profile, incognito
**Platform:** Verified badges, safety center, support, emergency resources
**Communication:** No external links first message, detection warnings, safety prompts

### 7.4 UGC Safeguards Core (Apple 1.2 + Google Play)

**REPORT CONTENT:** < 2 taps, reasons, description, confirmation
**REPORT USER:** Profile + chat, reasons, block option
**BLOCK USER:** Immediate, invisible, unblock option
**CONTENT FILTERING:** Pre-upload, pre-publish, post-publish, takedown
**MATCH-GATED MESSAGING:** No messaging without match, no random/anonymous chat

**MONETIZATION SAFEGUARDS:**
- No paid unban
- No paid message to non-match
- Boost doesn't bypass safety
- Premium doesn't weaken reports
- No spam/fake rewards

### 7.5 Terms of Use Consent Gate

**Triggers:** First photo, first message, first edit, Terms update
**UI:** Summary, links, checkbox, disabled button until checked
**Behavior:** Cannot dismiss/proceed without accept

### 7.6 Published Contact Information

**Location:** Settings > Help & Support (< 2 taps)
**Contents:** Email (support@vitalis.app), response time, FAQ, report, safety, guidelines
**SLA:** 48h general, 24h safety, 4h urgent

---

## 8. STORE COMPLIANCE & PAYMENT STRATEGY

### 8.1 App Store (iOS)

**Metadata:** Name, subtitle, category (Dating), age (17+), screenshots
**Privacy:** Policy URL, nutrition labels, ATT if tracking, Sign in with Apple
**Payments:** IAP only, no external links, restore button, terms displayed
**Review Notes:** Demo account, feature explanations, contact

### 8.2 Play Store (Android)

**Metadata:** Title (30 chars), descriptions, category, rating (17+), screenshots
**Data Safety:** Collection, sharing, security, deletion disclosed
**Payments:** Play Billing, subscription details, grace period
**Technical:** SDK 34, 64-bit, AAB

### 8.3 Payment Architecture
```
iOS App (StoreKit 2) ──► RevenueCat ──► Supabase (Entitlements)
Android App (Play Billing) ──┘              ▲
                                      Webhooks
```

### 8.4 Products

| ID | Name | TRY | USD | Duration |
|----|------|-----|-----|----------|
| vitalis_premium_monthly | Premium | ₺299 | $9.99 | 1 month |
| vitalis_premium_quarterly | Premium | ₺599 | $19.99 | 3 months |
| vitalis_premium_yearly | Premium | ₺1499 | $49.99 | 12 months |

### 8.5 External Purchase Policy

**Default:** StoreKit / Play Billing only
**No:** External links, CTA steering, verbal suggestions in app

---

## 9. DATA GOVERNANCE & PRIVACY

### 9.1 Data Classification

| Data | Retention | Legal Basis |
|------|-----------|-------------|
| Email/Phone | Account + 30d | Contract |
| Profile Photos (required) | Account + 30d | Contract |
| Additional Photos | Account + 30d | Consent |
| Verification Docs | See 9.2 | Legitimate Interest |
| Chat Messages | Account OR unmatch + 30d | Contract |
| Location | 7 days rolling | Consent |
| Device Hash | 90 days | Legitimate Interest |
| Audit Logs | 2 years max | Legal Obligation |

### 9.2 Verification Documents

**Pending:** Max 30 days, then auto-reject/delete
**Approved:** Document deleted 90d, hash retained
**Rejected:** Document deleted 30d
**Account Deletion:** Immediate delete, hash 90d then delete

### 9.3 Device Fingerprinting

**Purpose:** Fraud prevention ONLY
**Collected:** Model, OS, app version, timezone → hash
**NOT:** IDFA/GAID, hardware IDs, cross-app data
**ATT:** NOT required (no tracking)

**Platform APIs (Recommended):**
- iOS: DeviceCheck, App Attest
- Android: Play Integrity API

### 9.4 SDK Gate

If ANY SDK tracks per Apple definition → ATT MANDATORY

**Current Status:**
- RevenueCat: No tracking ✅
- Supabase: No tracking ✅
- Sentry: No tracking ✅
- Expo: No tracking ✅

**ATT Status: NOT REQUIRED**

---

## 10. EXECUTION PROTOCOL

### 10.1 Phases

1. **AUDIT (Days 1-3):** 22 agents parallel → 22 reports
2. **TRIAGE (Day 4):** P0/P1 review → Fix plan
3. **FIX (Days 5-10):** P0 24h, P1 3d → Resolved
4. **VERIFY (Days 11-12):** Re-audit → Updated reports
5. **GATES (Day 13):** G0-G6 → Artifacts
6. **RC (Day 14):** Build, test → RC ready
7. **ROLLOUT (Days 15-30):** Staged → GA

### 10.2 Sign-Off Requirements

- [ ] All 22 agents signed off
- [ ] All P0/P1 resolved
- [ ] All Quality Gates passed
- [ ] SLOs green 72h
- [ ] Beta feedback incorporated
- [ ] Legal/Privacy approved
- [ ] Store metadata complete
- [ ] Demo accounts ready

---

## 11. OUTPUT ARTIFACTS
```
audit/
├── 01_BUILD_MASTER_REPORT.md
├── 02_IOS_PLATFORM_REPORT.md
├── ... (22 reports)
├── MASTER_ISSUES_LIST.md
├── PRIORITIZED_FIX_PLAN.md
└── FINAL_SIGN_OFF.md
ci/
├── g0-artifacts/
├── ... (g1-g6)
```

---

## 12. STARTUP COMMAND
```
MOBILE_PERFECTION_ORCHESTRATOR_v2.1_COMPLETE.md dosyasını oku.

22 ajan ile Vitalis mobile perfection audit başlat.

1. DISCOVERY - src/ tara, mimari anla
2. PARALLEL AUDIT - 22 ajan denetle, Evidence Dossier
3. TRIAGE - P0/P1 listele, öncelik
4. FIX - P0 → P1 → P2 düzelt
5. VERIFY - Tekrar denetle, sign-off
6. QUALITY GATES - G0-G6
7. FINAL SIGN-OFF

SLO: Crash-free ≥ 99.9%, Cold start < 2s, Swipe/Chat FPS ≥ 58
GATES: TS 0 error, ESLint 0, tests pass, perf met, security pass, store ready

🚀 BAŞLA
```
