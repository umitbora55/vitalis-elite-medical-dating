# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Security

#### [Fix #1] FE-001 / BE-001 / SEC-001 — Dev Bypass Removal
- **Date:** 2026-02-15
- **Severity:** CRITICAL (downgraded from original assessment; hygiene fix)
- **Files:**
  - `App.tsx` (lines 1051-1074)
  - `components/LandingView.tsx` (interface, component, render)
  - `components/RegistrationFlow.tsx` (isDev variable, pending view button)
- **Change:** Removed all development bypass code including:
  - `onDevBypass` prop from LandingView
  - "Skip to App" button in landing page
  - `isDev` variable and "Re-run submission" button in RegistrationFlow
- **Reason:** While Vite's `import.meta.env.DEV` is compile-time and tree-shaken in production, removing the code entirely eliminates any theoretical risk from build configuration errors.
- **Test:** Verify landing page no longer shows "Skip to App" button in dev or production.

#### [Fix #2] BE-003 / SEC-005 — RLS Policy for Profile Discovery
- **Date:** 2026-02-15
- **Severity:** CRITICAL (functional blocker)
- **Files:**
  - `supabase/migrations/20260215_profile_discovery_rls.sql` (NEW)
- **Change:** Added new RLS policy "Users can discover verified profiles" that allows authenticated users to view other verified, non-frozen profiles while respecting block relationships.
- **Reason:** Original RLS policy only allowed users to view their own profile, making the discovery/matching feature non-functional with real data.
- **Test:** Run `supabase db push` and verify authenticated users can query profiles other than their own.

#### [Fix #3] SEC-003 / BE-009 — Icebreaker CORS + Rate Limiting
- **Date:** 2026-02-15
- **Severity:** HIGH
- **Files:**
  - `supabase/functions/generate-icebreaker/index.ts`
- **Change:**
  - Replaced wildcard CORS (`*`) with origin whitelist (matching create-checkout-session pattern)
  - Added authentication requirement (Bearer token validation)
  - Added rate limiting (10 requests per minute per user)
- **Reason:** Wildcard CORS + no auth allowed any website to call the endpoint on behalf of logged-in users, risking API quota abuse.
- **Test:** Deploy function and verify: 1) Unauthenticated requests return 401, 2) Requests from non-whitelisted origins use default origin, 3) >10 requests/minute return 429.

#### [Fix #4] PR-001 / SEC-002 — PII Anonymization for Gemini AI
- **Date:** 2026-02-15
- **Severity:** CRITICAL (GDPR compliance)
- **Files:**
  - `supabase/functions/generate-icebreaker/index.ts`
- **Change:** Added `anonymizeProfile()` function that strips PII before sending to Gemini AI. Only sends: role, specialty, sub-specialty, first 3 interests, first 3 personality tags.
- **Reason:** Full profile objects (including name, age, hospital, bio, photos, location) were being sent to Google Gemini, violating GDPR data minimization principles.
- **Test:** Test icebreaker generation and verify prompt only contains professional info, not personal details.

### Compliance

#### [Fix #5] PR-003 — Privacy Policy Update
- **Date:** 2026-02-15
- **Severity:** HIGH (App Store requirement)
- **Files:**
  - `public/privacy.html` (complete rewrite)
- **Change:** Comprehensive GDPR/KVKK compliant privacy policy including:
  - Data controller identification
  - Detailed data categories with retention periods
  - Legal basis for processing
  - Third-party recipients table (Stripe, Supabase, Gemini, Mixpanel, PostHog, Sentry)
  - AI data processing disclosure
  - User rights explanation
  - International transfer safeguards
  - Cookie policy
  - Version history
- **Reason:** Original policy was minimalist and did not meet App Store/Play Store requirements or GDPR/KVKK disclosure obligations.
- **Test:** Verify privacy.html renders correctly and contains all required sections.

---

## [1.0.0] - 2026-02-11

### Added
- Initial release with matchmaking, verification, messaging, and premium subscription features.
