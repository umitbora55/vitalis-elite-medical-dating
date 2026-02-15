# VITALIS - BACKEND AUDIT REPORT

**Generated:** 2026-02-15
**Auditor:** Backend Security Auditor (Claude Opus 4.5)
**Codebase:** vitalis---elite-medical-dating (commit: 00fee4b)
**Scope:** Database, API (Edge Functions), Auth, Validation, Performance, Integrations, Medical Domain

---

### OZET
- Toplam bulgu: **18** (CRITICAL: 3, HIGH: 5, MEDIUM: 7, LOW: 3)
- En yuksek riskli 3 bulgu: **BE-001**, **BE-002**, **BE-003**
- No finding moduller: Sentry PII leakage (fixed - sendDefaultPii: false), RegExp injection (fixed - escapeRegExp eklenmis)

---

## AUDIT FINDINGS

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-001 | CRITICAL | 5 | 5 | high | 2h | App.tsx:1057-1071 | `onDevBypass={import.meta.env.DEV ? () => {...setAuthStep('APP')}}` | Dev bypass button only checks import.meta.env.DEV which can be spoofed in some build configs | Remove bypass entirely or add server-side validation | Bkz: Detay BE-001 |
| BE-002 | CRITICAL | 5 | 4 | high | 4h | verificationService.ts:138-142 | `updateProfileVerificationStatus(userId, status)` accepts arbitrary userId | IDOR: Any user can call this function with another user's ID; RLS only protects if auth.uid()=id | Validate userId === auth.uid() server-side or use RPC | Bkz: Detay BE-002 |
| BE-003 | CRITICAL | 5 | 4 | high | 8h | 20260209_init.sql:255-256 | Profiles RLS: `USING (auth.uid() = id)` for SELECT | Users cannot view OTHER profiles for discovery/matching | Add policy for viewing non-sensitive profile fields of others | Bkz: Detay BE-003 |
| BE-004 | HIGH | 4 | 4 | high | 4h | 20260209_init.sql:6-14 | `public.users` table created but never used | FK on profiles references auth.users but public.users exists unused; potential schema confusion | Remove public.users table or sync with auth.users via trigger | `DROP TABLE IF EXISTS users;` |
| BE-005 | HIGH | 4 | 3 | high | 6h | generate-icebreaker/index.ts:4-6 | `corsHeaders = {'Access-Control-Allow-Origin': '*'}` | Wildcard CORS allows any origin to call icebreaker with PII data | Restrict to allowed origins like checkout function | Bkz: Detay BE-005 |
| BE-006 | HIGH | 5 | 3 | high | 4h | generate-icebreaker/index.ts:25-28 | `JSON.stringify(myProfile)` sent to Gemini API | Full profile objects (PII: name, hospital, bio) sent to 3rd party AI | Sanitize/anonymize profile before sending | Bkz: Detay BE-006 |
| BE-007 | HIGH | 4 | 3 | medium | 4h | webhooks-stripe/index.ts:6-9 | `corsHeaders = {'Access-Control-Allow-Origin': '*'}` | Stripe webhook endpoint allows any origin; while signature validates payload, CORS should be restricted | Set CORS to Stripe IPs or remove browser-accessible headers | `'Access-Control-Allow-Origin': 'https://stripe.com'` |
| BE-008 | HIGH | 4 | 4 | high | 2h | verificationService.ts:80-92 | `saveVerifiedEmail` accepts userId parameter directly | User can save verified email for another userId if they know it | Add auth check: userId must match auth.uid() | Bkz: Detay BE-008 |
| BE-009 | MEDIUM | 3 | 4 | high | 2h | generate-icebreaker/index.ts:9-27 | No auth check before calling Gemini | Unauthenticated users can invoke the endpoint | Add Bearer token validation like checkout function | Copy auth check from create-checkout-session |
| BE-010 | MEDIUM | 3 | 3 | high | 4h | 20260209_init.sql:171-185 | subscriptions table has no RLS for INSERT | Service role inserts via webhook, but malicious client could attempt insert | Already protected by service_role; verify anon role has no INSERT | Add explicit DENY for anon INSERT |
| BE-011 | MEDIUM | 3 | 3 | medium | 8h | N/A | No rate limiting on Edge Functions | DoS possible on checkout and icebreaker endpoints | Add rate limiting via Supabase or Cloudflare | Use `supabase_functions_rate_limit` or edge middleware |
| BE-012 | MEDIUM | 3 | 2 | medium | 16h | 20260209_init.sql:143-156 | messages table has no soft delete | Hard delete removes messages permanently; compliance issues | Add `deleted_at` column and update RLS | `ALTER TABLE messages ADD deleted_at TIMESTAMPTZ;` |
| BE-013 | MEDIUM | 3 | 3 | medium | 4h | webhooks-stripe/index.ts:81-82 | `plan = session.metadata?.plan || 'GOLD'` | Default to GOLD if metadata missing could grant unintended premium | Reject if plan metadata is missing | `if (!plan) throw new Error('Missing plan metadata');` |
| BE-014 | MEDIUM | 3 | 2 | medium | 8h | 20260209_init.sql | No audit logging table | Medical app needs audit trail for compliance | Add audit_logs table with user_id, action, timestamp | Create audit_logs table with trigger |
| BE-015 | MEDIUM | 3 | 2 | low | 4h | verificationService.ts:114-136 | File upload relies on client-side MIME check | Malicious file with spoofed extension could bypass | Add server-side MIME validation in storage policy | Use file magic bytes validation |
| BE-016 | LOW | 2 | 2 | medium | 2h | 20260209_init.sql:172-184 | subscriptions.store_transaction_id has UNIQUE index but not in CREATE | Index added in security_hardening migration; verify it exists | Confirm index deployed | N/A - verify deployment |
| BE-017 | LOW | 2 | 2 | low | 1h | services/*.ts | Inconsistent error handling patterns | Some services return `{error}`, others throw | Standardize error handling across services | Use Result pattern consistently |
| BE-018 | LOW | 1 | 1 | medium | 1h | AUTOMATION_AUDIT.json | qs dependency has low severity CVE | DoS via arrayLimit bypass (CVSS 3.7) | Run `npm audit fix` | `npm audit fix` |

---

## DETAILED FINDINGS

### Detay BE-001: Dev Bypass in Production

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1057-1071`

```typescript
onDevBypass={import.meta.env.DEV ? () => {
    updateUserProfile({
        ...userProfile,
        name: 'Dev User',
        age: 30,
        role: MedicalRole.DOCTOR,
        specialty: Specialty.CARDIOLOGY,
        hospital: 'Test Hospital',
        bio: 'Development test account',
        verificationStatus: 'VERIFIED',
    });
    localStorage.setItem('vitalis_onboarding_seen', 'true');
    setAuthStep('APP');
    showToast('Logged in as test user');
} : undefined}
```

**Problem:** `import.meta.env.DEV` is a Vite compile-time constant. While normally stripped in production builds, if build process is misconfigured or a development build is deployed, this bypass button becomes visible and functional.

**Duzeltme:**
```typescript
// Remove dev bypass entirely from production code
// OR move to a separate DevTools component that's tree-shaken
onDevBypass={undefined}
```

---

### Detay BE-002: IDOR in updateProfileVerificationStatus

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/verificationService.ts:138-142`

```typescript
export const updateProfileVerificationStatus = async (
  userId: string,
  status: 'PENDING_VERIFICATION' | 'EMAIL_VERIFICATION_SENT' | 'REJECTED' | 'VERIFIED',
) => {
  return supabase.from('profiles').update({ verification_status: status }).eq('id', userId);
};
```

**Problem:** This function accepts any `userId` parameter. While RLS policy `USING (auth.uid() = id)` should block updates to other users' profiles, the function design is dangerous - if RLS is ever misconfigured or bypassed, any user could set any other user's verification status to 'VERIFIED'.

**Duzeltme:**
```typescript
export const updateProfileVerificationStatus = async (
  status: 'PENDING_VERIFICATION' | 'EMAIL_VERIFICATION_SENT' | 'REJECTED' | 'VERIFIED',
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }
  return supabase.from('profiles')
    .update({ verification_status: status })
    .eq('id', authData.user.id);
};
```

---

### Detay BE-003: Profiles RLS Blocks Discovery

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql:255-256`

```sql
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

**Problem:** The only SELECT policy on profiles allows users to view ONLY their own profile. This means:
1. The discovery/swipe feature cannot query other users' profiles from the database
2. The app currently uses MOCK_PROFILES from constants.ts instead of real data
3. When real data is used, all profile queries will return empty

**Impact:** This is a fundamental architecture issue. The dating app cannot function without the ability to view other users' profiles.

**Duzeltme:**
```sql
-- Allow viewing non-sensitive fields of other verified users
CREATE POLICY "Users can discover other profiles" ON profiles
FOR SELECT
USING (
  -- Can always see own profile
  auth.uid() = id
  OR (
    -- Can see other verified, non-frozen profiles
    verification_status = 'VERIFIED'
    AND is_frozen = FALSE
    -- Don't show blocked users (requires join/subquery)
    AND id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id = auth.uid()
    )
  )
);
```

---

### Detay BE-005: Wildcard CORS on Icebreaker

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/functions/generate-icebreaker/index.ts:4-6`

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Problem:** This allows any website to call the icebreaker endpoint. Combined with the lack of auth check (BE-009), a malicious site could abuse the Gemini API quota or harvest profile data.

**Duzeltme:**
```typescript
// Copy the pattern from create-checkout-session
const getAllowedOrigins = (appBaseUrl: string): Set<string> => {
  const allowed = new Set<string>([appBaseUrl]);
  const extraOrigins = Deno.env.get('ALLOWED_ORIGINS');
  // ... same logic
};
```

---

### Detay BE-006: PII Sent to Gemini AI

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/functions/generate-icebreaker/index.ts:25-28`

```typescript
const prompt = `Create a short, professional but playful icebreaker for a medical dating app.\nMy profile: ${JSON.stringify(
  myProfile,
)}\nTheir profile: ${JSON.stringify(matchProfile)}\nReturn one sentence.`;
```

**Problem:** Full profile objects including name, hospital, bio, specialty, and potentially other PII are sent to Google's Gemini API. This violates data minimization principles and may have GDPR/HIPAA implications for medical professionals.

**Duzeltme:**
```typescript
const sanitizeProfile = (profile: any) => ({
  specialty: profile.specialty,
  interests: profile.interests?.slice(0, 3),
  personalityTags: profile.personalityTags?.slice(0, 3),
  // Exclude: name, hospital, bio, location, age, email, phone
});

const prompt = `Create a short, professional but playful icebreaker for a medical dating app.\nPerson A: ${JSON.stringify(
  sanitizeProfile(myProfile),
)}\nPerson B: ${JSON.stringify(sanitizeProfile(matchProfile))}\nReturn one sentence.`;
```

---

### Detay BE-008: IDOR in saveVerifiedEmail

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/verificationService.ts:80-92`

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

**Problem:** Similar to BE-002, this function accepts a `userId` parameter without validating it matches the authenticated user. While RLS policy `WITH CHECK (user_id = auth.uid())` should block mismatched inserts, the function design is insecure.

**Duzeltme:**
```typescript
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

## MODULE SUMMARY

### Database (supabase/migrations/)
- **Issues Found:** 5 (BE-003, BE-004, BE-010, BE-012, BE-014)
- **Key Concern:** Profiles RLS prevents discovery feature from working
- **Positive:** Webhook idempotency table implemented, comprehensive RLS on most tables

### Edge Functions (supabase/functions/)
- **Issues Found:** 5 (BE-005, BE-006, BE-007, BE-009, BE-011)
- **Key Concern:** generate-icebreaker has no auth and leaks PII to 3rd party
- **Positive:** create-checkout-session has proper auth and CORS validation

### Services (services/*.ts)
- **Issues Found:** 3 (BE-002, BE-008, BE-017)
- **Key Concern:** IDOR vulnerabilities from accepting userId parameters
- **Positive:** Consistent use of auth checks before most operations

### Authentication (App.tsx, authStore.ts, authService.ts)
- **Issues Found:** 1 (BE-001)
- **Key Concern:** Dev bypass button could appear in production
- **Positive:** Supabase Auth integration is standard and secure

### Client-side State (stores/*.ts)
- **No Finding** - Stores are in-memory Zustand with no direct security implications

### Sentry Integration (src/lib/sentry.ts)
- **No Finding** - sendDefaultPii is already set to false, authorization headers stripped

### Analytics (src/lib/analytics.ts)
- **No Finding** - Consent-based analytics implementation, no PII sent without consent

### Verification Flow (verificationService.ts, RegistrationFlow.tsx)
- **Issues Found:** 2 (BE-002, BE-015)
- **Positive:** Zod validation on registration, client-side MIME type checking

---

## RECOMMENDATIONS PRIORITY ORDER

1. **P0 - LAUNCH BLOCKER**
   - BE-001: Remove dev bypass button
   - BE-003: Add RLS policy for profile discovery
   - BE-002/BE-008: Fix IDOR vulnerabilities in verification service

2. **P1 - CRITICAL**
   - BE-004: Remove unused public.users table
   - BE-005/BE-009: Add auth and restrict CORS on icebreaker
   - BE-006: Sanitize profile data before sending to Gemini

3. **P2 - HIGH**
   - BE-007: Restrict CORS on webhook endpoint
   - BE-011: Add rate limiting to Edge Functions
   - BE-013: Reject webhook if plan metadata missing

4. **P3 - MEDIUM**
   - BE-010/BE-012/BE-014: Add INSERT deny, soft delete, audit logging
   - BE-015: Server-side MIME validation

5. **P4 - LOW**
   - BE-016/BE-017/BE-018: Verify index, standardize errors, update dependencies

---

## NPM AUDIT SUMMARY

From AUTOMATION_AUDIT.json:
- **Total vulnerabilities:** 1
- **Severity breakdown:** Critical: 0, High: 0, Moderate: 0, Low: 1
- **Package:** qs (indirect dependency)
- **Issue:** arrayLimit bypass in comma parsing (DoS)
- **Fix:** Run `npm audit fix`

---

## TYPESCRIPT CHECK

From AUTOMATION_SUMMARY.txt:
- **Status:** PASSED
- **Errors:** 0
- **Notes:** No TypeScript compilation errors detected

---

## END OF BACKEND AUDIT REPORT

**Next Steps:**
1. Address P0 issues immediately before any production deployment
2. Create tickets for P1/P2 issues with target dates
3. Schedule security review after fixes are implemented
4. Consider penetration testing after P0/P1 fixes

**Contact:** backend-auditor@vitalis.app
