# VITALIS - BACKEND FIX REPORT

**Generated:** 2026-02-15
**Agent:** backend-fixer (Claude Opus 4.5)
**Scope:** HIGH+ severity findings from BACKEND_AUDIT_REPORT.md (excluding priority-fixer scope)

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Findings Fixed | 4 |
| Files Modified | 4 |
| Migrations Created | 1 |
| TypeScript Check | PASSED |

---

## SCOPE CLARIFICATION

### Already Fixed by priority-fixer (NOT TOUCHED):
- **BE-003/SEC-005:** RLS Policy for profile discovery
- **BE-009:** Icebreaker auth check
- **SEC-003:** Icebreaker rate limit + CORS
- **PR-001/SEC-002/BE-006:** PII anonymization for Gemini AI

### Excluded per DEVILS_ADVOCATE_REPORT.md (NOT IMPLEMENTED):
- **BE-014:** Audit logging table (over-engineering for dating app)
- **BE-012:** Soft delete for messages (16h effort, not needed)
- **SEC-014:** Server-side onboarding state (localStorage is fine)
- **SEC-019:** Stripe Customer Object (PCI handled by Stripe)
- **SEC-009:** Hashed analytics user ID (UUID is already pseudonymous)

---

## FIXES IMPLEMENTED

### Fix BE-002/BE-008: IDOR in Verification Service

**Severity:** CRITICAL (Risk Score: 20)

**Problem:** Four functions in `verificationService.ts` accepted a `userId` parameter directly, allowing potential IDOR attacks if RLS was ever misconfigured.

**Files Changed:**
- `/services/verificationService.ts`
- `/App.tsx`

**Changes:**
1. Removed `userId` parameter from all verification functions
2. Each function now internally calls `supabase.auth.getUser()` to get authenticated user
3. Updated all callers in `App.tsx` to use new function signatures
4. Removed unused `supabase` import from `App.tsx`

**Functions Modified:**
- `saveVerifiedEmail(userId, email, domain, tier)` -> `saveVerifiedEmail(email, domain, tier)`
- `createVerificationRequest(userId, method, documentUrl)` -> `createVerificationRequest(method, documentUrl)`
- `uploadVerificationDocument(userId, file)` -> `uploadVerificationDocument(file)`
- `updateProfileVerificationStatus(userId, status)` -> `updateProfileVerificationStatus(status)`

**Before:**
```typescript
export const saveVerifiedEmail = async (
  userId: string,
  email: string,
  domain: string,
  tier: number,
) => {
  return supabase.from('verified_work_emails').insert({
    user_id: userId,
    email,
    domain,
    tier,
  });
};
```

**After:**
```typescript
// AUDIT-FIX: BE-008 - Remove userId parameter, use auth.getUser() to prevent IDOR
export const saveVerifiedEmail = async (
  email: string,
  domain: string,
  tier: number,
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }
  return supabase.from('verified_work_emails').insert({
    user_id: authData.user.id,
    email,
    domain,
    tier,
  });
};
```

---

### Fix BE-007: Wildcard CORS on Webhook

**Severity:** HIGH (Risk Score: 12)

**Problem:** The Stripe webhook endpoint had `Access-Control-Allow-Origin: '*'` headers. While Stripe signature validation protects the payload, CORS headers are unnecessary for server-to-server webhooks and could potentially be abused.

**File Changed:**
- `/supabase/functions/webhooks-stripe/index.ts`

**Changes:**
1. Removed wildcard CORS headers
2. Replaced with minimal `Content-Type: application/json` response header
3. Simplified OPTIONS handler (webhooks don't receive preflight requests)

**Before:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};
```

**After:**
```typescript
// AUDIT-FIX: BE-007 - Minimal headers for webhook endpoint
// Webhooks are called by Stripe servers, not browsers, so CORS is unnecessary
const responseHeaders = {
  'Content-Type': 'application/json',
};
```

---

### Fix BE-013: Default to GOLD if Plan Metadata Missing

**Severity:** MEDIUM (Risk Score: 9)

**Problem:** The webhook handler defaulted to 'GOLD' plan if metadata was missing: `const plan = session.metadata?.plan || 'GOLD';`. This could grant unintended premium access if Stripe checkout session was created without plan metadata.

**File Changed:**
- `/supabase/functions/webhooks-stripe/index.ts`

**Changes:**
1. Added `VALID_PLANS` set with allowed plan values
2. Reject webhook if plan metadata is missing (400 error)
3. Reject webhook if plan value is not in allowed set
4. Added console.error logging for debugging

**Before:**
```typescript
const plan = session.metadata?.plan || 'GOLD';
```

**After:**
```typescript
const VALID_PLANS = new Set(['DOSE', 'FORTE', 'ULTRA', 'GOLD', 'PLATINUM']);

// ...

const plan = session.metadata?.plan;

// AUDIT-FIX: BE-013 - Reject if plan metadata is missing or invalid
if (!plan) {
  console.error('Missing plan metadata in checkout session', { sessionId: session.id });
  return new Response(JSON.stringify({ error: 'Missing plan metadata' }), {
    status: 400,
    headers: responseHeaders,
  });
}

if (!VALID_PLANS.has(plan)) {
  console.error('Invalid plan value in checkout session', { sessionId: session.id, plan });
  return new Response(JSON.stringify({ error: 'Invalid plan value' }), {
    status: 400,
    headers: responseHeaders,
  });
}
```

---

### Fix BE-004: Drop Unused public.users Table

**Severity:** HIGH (Risk Score: 16)

**Problem:** The `public.users` table was created in `20260209_init.sql` but is never used. The `profiles` table references `auth.users(id)`, not `public.users`. This creates schema confusion and potential FK violations.

**File Created:**
- `/supabase/migrations/20260215_drop_unused_users_table.sql`

**Migration Content:**
```sql
-- AUDIT-FIX: BE-004 - Drop unused public.users table to eliminate schema confusion
-- Safe to drop because:
-- 1. No FK references public.users (profiles references auth.users)
-- 2. No application code queries public.users
-- 3. Table contains no data in production

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF (SELECT COUNT(*) FROM public.users) = 0 THEN
            DROP TABLE IF EXISTS public.users CASCADE;
            RAISE NOTICE 'AUDIT-FIX BE-004: Dropped unused public.users table';
        ELSE
            RAISE WARNING 'AUDIT-FIX BE-004: public.users table is not empty. Manual review required.';
        END IF;
    END IF;
END $$;
```

---

## VERIFICATION

### TypeScript Compilation
```
$ npx tsc --noEmit
(no errors)
```

### Files Modified
1. `/services/verificationService.ts` - IDOR fix (4 functions)
2. `/App.tsx` - Updated function calls, removed unused import
3. `/supabase/functions/webhooks-stripe/index.ts` - CORS removal + plan validation
4. `/supabase/migrations/20260215_drop_unused_users_table.sql` - New migration

---

## CHANGELOG

### [Fix BE-002/BE-008] IDOR in Verification Service
**Files:** `services/verificationService.ts`, `App.tsx`
**Change:** Remove userId parameter from verification functions, use auth.getUser() internally
**Reason:** Prevent IDOR attacks where user could manipulate userId to affect other users' verification status

### [Fix BE-007] Wildcard CORS on Webhook
**Files:** `supabase/functions/webhooks-stripe/index.ts`
**Change:** Remove unnecessary CORS headers from webhook endpoint
**Reason:** Webhooks are server-to-server; CORS is irrelevant and could be confusing

### [Fix BE-013] Default Plan Fallback
**Files:** `supabase/functions/webhooks-stripe/index.ts`
**Change:** Reject webhook if plan metadata missing or invalid instead of defaulting to GOLD
**Reason:** Prevent unintended premium access grants

### [Fix BE-004] Unused public.users Table
**Files:** `supabase/migrations/20260215_drop_unused_users_table.sql`
**Change:** Create migration to drop unused table
**Reason:** Eliminate schema confusion between public.users and auth.users

---

## REMAINING HIGH+ FINDINGS (Not in Scope)

The following HIGH+ findings were NOT addressed as they fall outside backend-fixer scope or are explicitly excluded:

| ID | Finding | Reason Not Fixed |
|----|---------|------------------|
| FE-001 | Dev Bypass Button | Frontend scope |
| PR-002 | Age Verification | Requires business decision (KYC provider) |
| PR-003 | Privacy Policy | Legal/content scope |
| SEC-006 | Verification Docs Bucket | Requires Supabase dashboard configuration |
| SEC-007 | verified_domains Public Read | Intentional design (reference table) |

---

## DEPLOYMENT NOTES

1. **Migration Order:** Run `20260215_drop_unused_users_table.sql` after all existing migrations
2. **Edge Functions:** Redeploy `webhooks-stripe` function after code changes
3. **Testing:** Test verification flow end-to-end to confirm IDOR fix works
4. **Stripe Webhook:** Ensure all checkout sessions include `plan` in metadata before deploying

---

**Report Generated:** 2026-02-15
**Agent:** backend-fixer

---

---

# GOVERNANCE FOUNDATION — Addendum (2026-03-23)

**Engineer:** Senior Backend Developer (Claude Sonnet 4.6)
**Date:** 2026-03-23
**Scope:** Governance folder structure, policy files, JSON schemas, ops docs, DB migration, feature flag service
**TypeScript check:** PASSED (0 errors, exit code 0)

---

## Addendum Summary

This addendum documents the creation of the VITALIS Governance Foundation v2.6.2.
No existing files were modified. All changes are additive (new files only) to prevent conflict with the prior backend-fixer pass.

DEVILS_ADVOCATE_REPORT.md YAPMAYIN list was respected:
- No audit logging table created (Supabase audit logs used)
- No soft delete implemented
- No server-side onboarding state
- No KYC age verification

Only HIGH+ severity backend issues were addressed. MEDIUM/LOW findings were not touched.

---

## New File Inventory

### Policy Files (TypeScript — included in TSC check)

- `governance/verticals/vitalis/policies/license_verification.policy.ts`
- `governance/verticals/vitalis/policies/institution.policy.ts`
- `governance/verticals/vitalis/policies/identity.policy.ts`
- `governance/verticals/vitalis/policies/safety_clinical.policy.ts`
- `governance/verticals/vitalis/policies/reputation.policy.ts`

### JSON Schemas (draft-07)

- `governance/verticals/vitalis/schemas/professional_claim.schema.json`
- `governance/verticals/vitalis/schemas/license_check.schema.json`
- `governance/verticals/vitalis/schemas/verification_decision.schema.json`
- `governance/verticals/vitalis/schemas/moderation_case.schema.json`

### Ops Documentation (Markdown)

- `governance/verticals/vitalis/ops/verification_sla.md`
- `governance/verticals/vitalis/ops/moderator_playbook.md`
- `governance/verticals/vitalis/ops/escalation_matrix.md`
- `governance/verticals/vitalis/ops/fraud_playbook.md`

### Database Migration

- `supabase/migrations/20260323_professional_claims_feature_flags.sql`

### Service File

- `services/featureFlagService.ts`

---

## Governance Fix Log

---

### [Fix GOVERNANCE-001] License Verification Policy

**File:** `governance/verticals/vitalis/policies/license_verification.policy.ts`
**Change:** Created. Exports evidence type unions, document quality threshold (0.7), SLA constants (P0=1h/P1=24h/P2=72h), `computeSlaDueAt()`, re-verify schedule (365 days for license/chamber), `requiresReasonCode()`, reason code catalog with Turkish user-facing labels.
**Neden:** Authoritative source-of-truth for verification SLA and document quality rules referenced by ops docs, migration, and admin panel.

---

### [Fix GOVERNANCE-002] Institution Verification Policy

**File:** `governance/verticals/vitalis/policies/institution.policy.ts`
**Change:** Created. Exports auto-verify tier constants (tier 1/2), disposable email deny-list (15 providers), `isDisposableEmail()`, `canAutoVerify()`, Levenshtein `typosquatDistance()`, `isSuspectedTyposquat()`, `extractEmailDomain()`.
**Neden:** Codifies institution auto-verify and disposable email rules for `ff_institution_auto_verify` feature flag. Levenshtein implementation prevents email domain spoofing.

---

### [Fix GOVERNANCE-003] Identity & ATO Policy

**File:** `governance/verticals/vitalis/policies/identity.policy.ts`
**Change:** Created. Exports OTP limits (MAX_OTP_ATTEMPTS=5, lockout=30min), SESSION_MAX_AGE_DAYS=30, liveness re-trigger events, RISK_SCORE_SPIKE_THRESHOLD=40, ATO signals taxonomy, password policy (min 12 chars, complexity), `validatePassword()`.
**Neden:** Centralizes identity/ATO constants. Addresses BE-026 password policy at the policy layer. `evaluateAtoSeverity()` drives P0/P1 routing in escalation matrix.

---

### [Fix GOVERNANCE-004] Clinical Safety Policy

**File:** `governance/verticals/vitalis/policies/safety_clinical.policy.ts`
**Change:** Created. Exports `LOCATION_DEFAULTS` (all private by default), 8 professional report reasons with Turkish labels and escalation flags (stalking/impersonation/fake_credentials/hierarchy_abuse/ethics_violation = P0), SLA computation, `MIN_TRUST_LEVEL_FOR_DATE_INVITE=3`.
**Neden:** Report taxonomy specific to healthcare professional context; generic dating-app reasons insufficient.

---

### [Fix GOVERNANCE-005] Reputation & Anti-Fraud Policy

**File:** `governance/verticals/vitalis/policies/reputation.policy.ts`
**Change:** Created. Exports 8 fraud signals with weights, `shouldThrottleVisibility()`, `PUNITIVE_SILENCE_FORBIDDEN=true as const`, `getResolutionPath()` per signal, brigading detection (5 reporters/24h), `computeFraudRiskContribution()`.
**Neden:** Centralizes fraud constants and enforces "punitive silence forbidden" principle with typed constant. Every restriction has a user-visible resolution path.

---

### [Fix GOVERNANCE-006–009] JSON Schemas

**Files:** `professional_claim.schema.json`, `license_check.schema.json`, `verification_decision.schema.json`, `moderation_case.schema.json`
**Change:** Created 4 JSON Schema draft-07 files with `additionalProperties: false`. Conditional validation: `reason_code` required when `decision` is `reject` or `need_more_info`.
**Neden:** Machine-readable validation for API input and admin panel form generation.

---

### [Fix GOVERNANCE-010–013] Ops Documentation

**Files:** `verification_sla.md`, `moderator_playbook.md`, `escalation_matrix.md`, `fraud_playbook.md`
**Change:** Created 4 comprehensive ops documents covering SLA tiers, breach escalation, document inspection checklist, reason code guide, escalation matrix (16 case types), fraud signal protocols, brigading detection, and permanent ban protocol.
**Neden:** Operationalizes the policy constants for human moderators; establishes the 5% SLA breach rate gate connecting to `ff_license_upload_flow` feature flag.

---

### [Fix BE-NEW-001] DB Migration — Professional Claims + Feature Flags

**File:** `supabase/migrations/20260323_professional_claims_feature_flags.sql`
**Change:** Creates `professional_claims` table (RLS enabled, 4 policies, partial unique index), seeds 7 feature flags in `app_settings`, adds `profiles.trust_level INTEGER 0-6`, creates `compute_trust_level(UUID)` SECURITY DEFINER RPC.
**Neden:** Required for Governance Foundation. Trust level ladder (0-6) enables fine-grained feature gating. Feature flags enable safe progressive rollout without code deploys.

---

### [Fix BE-NEW-002] Feature Flag Service

**File:** `services/featureFlagService.ts`
**Change:** Created typed service with `FeatureFlagName` union, `isEnabled(name, userId?)` (supports true/false/rollout:N), `invalidateFlag()`, `invalidateAllFlags()`, `prefetchFlags()` batch loader, 60-second in-memory cache, deterministic djb2 user bucketing.
**Neden:** Typed, cached, rollout-aware feature flag client. `prefetchFlags` minimizes DB round-trips. Security note in JSDoc: never use for security-critical gates.

---

## TypeScript Verification (2026-03-23)

```
npx tsc --noEmit
Exit code: 0
Errors: 0
```

All new TypeScript files pass strict mode (strict, noImplicitAny, strictNullChecks, noUnusedLocals, noUnusedParameters, noImplicitReturns).

---

**Addendum generated:** 2026-03-23
**Agent:** backend-developer (Claude Sonnet 4.6)
