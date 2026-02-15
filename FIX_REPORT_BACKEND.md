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
