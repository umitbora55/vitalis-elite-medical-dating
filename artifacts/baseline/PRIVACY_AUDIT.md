# VITALIS PRIVACY & COMPLIANCE AUDIT REPORT

**Auditor:** Privacy & Compliance Agent (Claude Opus 4.6)
**Date:** 2026-02-17
**Scope:** KVKK/GDPR compliance, medical data handling, consent management, age verification, data retention, cross-border transfer, data minimization, third-party data sharing, store compliance
**App:** Vitalis -- Elite Medical Dating Platform (Web + Mobile)
**Regulation:** KVKK (6698 sayili Kanun), GDPR (EU 2016/679), COPPA, App Store Guidelines 5.1, Google Play User Data Policy

---

### SUMMARY

- **Total findings:** 23 (CRITICAL: 3, HIGH: 7, MEDIUM: 9, LOW: 4)
- **Top 3 highest-risk findings:** PRV-001, PRV-002, PRV-003
- **No-finding modules:** Sentry (well-configured with PII stripping), Storage bucket RLS (properly private), Photo ownership validation (properly checked)

---

## FINDINGS TABLE

| ID | Severity | Impact | Likelihood | Confidence | Effort | File:Line | Evidence | Risk | Remediation | Fix Example |
|---|---|---|---|---|---|---|---|---|---|---|
| PRV-001 | CRITICAL | 5 | 5 | high | 16h | Multiple | No `recordConsent()` call during registration | Registration completes without recording KVKK/GDPR consent; `user_consents` table never populated | Record terms, privacy, and data processing consent at registration | Bkz: Detay PRV-001 |
| PRV-002 | CRITICAL | 5 | 4 | high | 8h | supabase/migrations/*.sql | No TTL/retention policy on any table | Messages, swipes, matches stored indefinitely; privacy policy promises specific retention periods but no enforcement | Implement pg_cron based auto-deletion | Bkz: Detay PRV-002 |
| PRV-003 | CRITICAL | 5 | 4 | high | 4h | mobile/app/(auth)/register.tsx:182-186 | `<Text style={styles.termsLink}>Gizlilik Politikasi</Text>` -- not clickable | Mobile registration has no age verification, no consent recording, no clickable privacy/terms links, no medical verification flow | Implement full mobile registration parity with web | Bkz: Detay PRV-003 |
| PRV-004 | HIGH | 4 | 4 | high | 8h | components/RegistrationFlow.tsx:33-41 | `parsed >= 18 && parsed <= 100` -- self-reported only | Age is self-declared via dropdown; no document-based or ID-based verification; dating apps require robust 18+ checks | Add ID verification or date-of-birth with document cross-check | Bkz: Detay PRV-004 |
| PRV-005 | HIGH | 4 | 4 | high | 4h | services/accountService.ts:88 | `supabase.from('messages').select('*').eq('sender_id', user.id)` | Data export only fetches messages SENT by user, not messages RECEIVED; incomplete portability | Query messages via conversation_participants for complete export | Bkz: Detay PRV-005 |
| PRV-006 | HIGH | 5 | 3 | high | 8h | supabase/functions/delete-account/index.ts:153 | `delete_user_data` RPC soft-deletes messages with `[silindi]` | Account deletion does not fully erase message content from DB; soft-deleted messages retain `conversation_id`, `sender_id`, timestamps | Hard-delete or cryptographic erasure after 30-day grace period | Bkz: Detay PRV-006 |
| PRV-007 | HIGH | 4 | 4 | high | 3h | types.ts:282, components/ProfileCompletionView.tsx:57 | `salaryRange?: SalaryRange` -- RANGE_1 through RANGE_4 | Salary data collected without clear purpose or legal basis; excessive for dating; violates data minimization | Remove salary collection or add explicit consent with clear purpose | Bkz: Detay PRV-007 |
| PRV-008 | HIGH | 4 | 3 | high | 4h | src/lib/analytics.ts:56-66 | `mixpanelClient.init(MIXPANEL_TOKEN, { debug: false })` -- no IP anonymization | Mixpanel and PostHog initialized without IP anonymization, without session recording opt-out; user ID sent directly | Enable `ip: false` in Mixpanel, add anonymization config for PostHog | Bkz: Detay PRV-008 |
| PRV-009 | HIGH | 4 | 3 | high | 4h | App.tsx:1213-1239 | Analytics consent banner only covers analytics; no terms/privacy acceptance recorded | Consent banner limited to analytics; no granular consent for push notifications, location, AI features; no withdrawal mechanism in-app | Implement full consent management center | Bkz: Detay PRV-009 |
| PRV-010 | HIGH | 4 | 3 | high | 2h | mobile/src/services/supabase.ts:11 | `'https://cxhwwgnogpsupnbbxvae.supabase.co'` hardcoded | Production Supabase project URL hardcoded as fallback; reveals infrastructure endpoint; enables targeted attacks | Remove hardcoded URL; fail if env var missing | Bkz: Detay PRV-010 |
| PRV-011 | MEDIUM | 3 | 4 | high | 8h | supabase/migrations/001_complete_schema.sql:160-172 | `verification_documents` table; no auto-deletion trigger | Privacy policy claims verification docs deleted within 30 days of approval; no automated mechanism exists to enforce this | Add pg_cron job or trigger to delete approved docs after 30 days | Bkz: Detay PRV-011 |
| PRV-012 | MEDIUM | 3 | 3 | high | 2h | services/accountService.ts:153-161 | `fetch('https://api.ipify.org?format=json')` then `btoa(ip)` | IP address fetched from third-party service and "hashed" with base64 (trivially reversible); leaks real IP to ipify.org | Use server-side IP hashing with SHA-256; avoid third-party IP lookup | Bkz: Detay PRV-012 |
| PRV-013 | MEDIUM | 3 | 3 | high | 2h | stores/matchStore.ts:117-118 | `storage: createJSONStorage(() => localStorage)` | Match data including full profile objects, messages, swipe history persisted to localStorage in plaintext; accessible via XSS | Use session-only storage or encrypt sensitive fields | Bkz: Detay PRV-013 |
| PRV-014 | MEDIUM | 3 | 3 | high | 4h | public/terms.html:1-31 | Entire file is 30 lines | Terms of Service is skeleton-only; missing: dispute resolution, liability, content licensing, medical disclaimer, data processing terms, cancellation policy | Engage legal to draft comprehensive ToS | Bkz: Detay PRV-014 |
| PRV-015 | MEDIUM | 3 | 3 | medium | 3h | public/privacy.html:24-25 | `lang="en"` -- entire policy in English | Privacy policy written in English only; KVKK requires Turkish; Turkish users cannot understand their rights | Add Turkish translation of privacy policy | Bkz: Detay PRV-015 |
| PRV-016 | MEDIUM | 3 | 3 | high | 4h | components/MyProfileView.tsx | No privacy policy link in profile/settings | Privacy policy accessible only via analytics consent banner and direct URL; not accessible from app settings/profile after consent decision | Add "Gizlilik Politikasi" link to profile/settings section | Bkz: Detay PRV-016 |
| PRV-017 | MEDIUM | 3 | 2 | high | 3h | App.tsx:331-334 | `setAnalyticsConsent(consent)` stored in localStorage only | Analytics consent stored only in localStorage with no server-side record; consent withdrawal not tracked in `user_consents` table | Call `recordConsent('analytics', 'v1')` on grant AND record withdrawal on deny | Bkz: Detay PRV-017 |
| PRV-018 | MEDIUM | 3 | 2 | medium | 4h | supabase/functions/delete-account/index.ts:69 | `const deletionLog: string[] = [];` | Account deletion has no audit trail stored in database; deletion log only in function console output; no record of what was deleted | Store deletion audit record in separate admin table | Bkz: Detay PRV-018 |
| PRV-019 | MEDIUM | 3 | 2 | medium | 2h | services/accountService.ts:38-66 | `deleteAccount()` calls edge function then `localStorage.clear()` | Account deletion does not clear IndexedDB, service worker cache, or mobile Secure Store; residual data may persist | Add comprehensive client-side data clearing | Bkz: Detay PRV-019 |
| PRV-020 | LOW | 2 | 3 | high | 2h | public/privacy.html:29-32 | `Vitalis Technologies Ltd.` -- DPO listed | KVKK Article 10 requires Turkish data controller address; no physical address provided; no VERBIS registration number | Add full registered address and VERBIS number | Bkz: Detay PRV-020 |
| PRV-021 | LOW | 2 | 2 | medium | 1h | components/CommunityGuidelines.tsx:170-182 | Community guidelines checkbox; no server-side record | Community guidelines acceptance during onboarding not recorded in `user_consents`; no audit trail | Record guideline acceptance via `recordConsent('community_guidelines', 'v1')` | Bkz: Detay PRV-021 |
| PRV-022 | LOW | 2 | 2 | medium | 2h | public/privacy.html:231-232 | `Vitalis is intended for users aged 18 and older` | Children's privacy section acknowledges 18+ but does not specify what happens when underage user is detected; no age-gate mechanism on mobile | Add active age-gate and minor detection/deletion procedures | Bkz: Detay PRV-022 |
| PRV-023 | LOW | 2 | 2 | high | 1h | supabase/migrations/001_complete_schema.sql:56-65 | `user_consents` has `ip_hash TEXT, user_agent TEXT` | Consent table records user agent string which may contain PII (device model, OS version); user agent is raw string not hash | Hash or truncate user agent before storage | Bkz: Detay PRV-023 |

---

## DETAILED FINDINGS

### PRV-001: Registration Completes Without Recording KVKK/GDPR Consent (CRITICAL)

**Severity:** CRITICAL | **Impact:** 5 | **Likelihood:** 5 | **Confidence:** high | **Effort:** 16h

**Regulation:** KVKK Madde 5 (Acik Riza), GDPR Article 6-7 (Lawful Basis / Consent), App Store 5.1.1, Play Store User Data Policy

**Files:**
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/RegistrationFlow.tsx` -- entire file
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx:336-443`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/accountService.ts:142-185`

**Evidence:** The `RegistrationFlow.tsx` component guides users through BASIC -> PROFESSIONAL -> DOCUMENTS -> GUIDELINES -> PENDING steps. The `CommunityGuidelines` component requires a checkbox acceptance (line 170-182), but this acceptance is tracked only as local component state (`isAccepted` useState). Neither `RegistrationFlow.tsx` nor `App.tsx:handleRegistrationComplete()` ever calls `accountService.recordConsent()`. The `user_consents` table exists in the database schema, and `recordConsent()` exists as a service function, but it is never invoked during registration flow.

A grep across all `.tsx` files for `recordConsent` returns zero results -- the function is defined but never called from any UI component.

**Risk:**
- Every user account is created WITHOUT a recorded legal basis for data processing
- KVKK Madde 5: Personal data processing without explicit consent is unlawful
- GDPR Article 7: Controller must demonstrate consent was given -- no audit trail exists
- Regulatory fine risk: Up to 2M TL (KVKK) or 20M EUR / 4% revenue (GDPR)
- App Store / Play Store rejection for missing consent tracking

**Remediation:**
```typescript
// In App.tsx handleRegistrationComplete(), after successful signup:
await accountService.recordConsent('terms_of_service', 'v1.0');
await accountService.recordConsent('privacy_policy', 'v2.0');
await accountService.recordConsent('community_guidelines', 'v1.0');
await accountService.recordConsent('medical_data_processing', 'v1.0');
```

Additionally, the registration flow must present clickable links to privacy policy and terms before the "Accept" action, and the checkbox text must explicitly reference both documents.

---

### PRV-002: No Data Retention Enforcement (CRITICAL)

**Severity:** CRITICAL | **Impact:** 5 | **Likelihood:** 4 | **Confidence:** high | **Effort:** 8h

**Regulation:** KVKK Madde 4(d) (Saklama Suresi Ilkesi), GDPR Article 5(1)(e) (Storage Limitation)

**Files:**
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql` -- entire file
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/public/privacy.html:178-186`

**Evidence:** The privacy policy (v2.0) explicitly promises:
- Messages: "Retained for 2 years after last activity, then deleted"
- Verification Documents: "Deleted within 30 days of verification completion"
- Deleted Accounts: "Personal data anonymized or deleted within 30 days"
- Safety Reports: "Retained for 3 years for legal compliance"

However, there is NO technical enforcement of any of these policies. A grep for `pg_cron`, `ttl`, `retention`, `cleanup`, `purge` across all SQL migrations returns zero retention-related jobs or triggers. Data accumulates indefinitely.

**Risk:**
- Privacy policy makes legally binding commitments that are not fulfilled
- KVKK Madde 4(d): Data must be retained only as long as necessary
- Constitutes deceptive practice -- promising deletion that never occurs
- In case of regulatory audit, gap between stated and actual retention creates liability

**Remediation:**
```sql
-- Add pg_cron extension and schedule retention jobs:
SELECT cron.schedule('cleanup-old-messages', '0 3 * * *',
  $$DELETE FROM messages WHERE created_at < NOW() - INTERVAL '2 years'$$
);

SELECT cron.schedule('cleanup-verified-docs', '0 4 * * *',
  $$DELETE FROM verification_documents
    WHERE status = 'approved'
    AND reviewed_at < NOW() - INTERVAL '30 days'$$
);

SELECT cron.schedule('cleanup-stale-notifications', '0 5 * * *',
  $$DELETE FROM notification_outbox WHERE created_at < NOW() - INTERVAL '90 days'$$
);
```

---

### PRV-003: Mobile Registration Lacks All Privacy Controls (CRITICAL)

**Severity:** CRITICAL | **Impact:** 5 | **Likelihood:** 4 | **Confidence:** high | **Effort:** 4h (assessment) + 40h (full fix)

**Regulation:** KVKK Madde 5-6, GDPR Article 6-7, App Store 5.1.1(iv), Google Play User Data Policy 4.3

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/mobile/app/(auth)/register.tsx:25-201`

**Evidence:**
```typescript
// Lines 182-186: Terms text is static, not clickable
<Text style={styles.terms}>
  Kayit olarak{' '}
  <Text style={styles.termsLink}>Kullanim Sartlari</Text> ve{' '}
  <Text style={styles.termsLink}>Gizlilik Politikasi</Text>
  'ni kabul etmis olursunuz.
</Text>
```

The mobile registration screen:
1. Has NO age verification field (not even self-declared)
2. "Kullanim Sartlari" and "Gizlilik Politikasi" text is styled as links but has NO `onPress` handler -- they are not clickable
3. Records NO consent in the database
4. Has no medical role/specialty collection
5. Has no verification document upload flow
6. No analytics consent banner
7. No community guidelines acceptance
8. Implicit consent ("by registering you accept") is NOT valid under KVKK/GDPR for special category data

**Risk:**
- Mobile app is essentially non-compliant on every privacy dimension
- Both App Store and Play Store will reject during review
- Any mobile-registered user has zero consent records
- Minors could register without any age check

**Remediation:**
The mobile registration flow must be brought to parity with the web `RegistrationFlow.tsx`, including:
1. Age field with 18+ validation
2. Clickable, navigable privacy policy and terms links (use `Linking.openURL`)
3. Explicit consent checkboxes
4. `recordConsent()` calls
5. Medical verification flow

---

### PRV-004: Age Verification is Self-Reported Only (HIGH)

**Severity:** HIGH | **Impact:** 4 | **Likelihood:** 4 | **Confidence:** high | **Effort:** 8h

**Regulation:** KVKK Madde 6(3) (Cocuk Verisi), GDPR Recital 38, COPPA, App Store 1.1

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:35-41`

**Evidence:**
```typescript
age: z.string().min(1, 'Age is required').refine((value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 18 && parsed <= 100;
}, 'Enter a valid age'),
```

Age is collected via a dropdown starting at 18 (line 472). No secondary verification exists. The verification document flow checks medical credentials but NOT date of birth. A minor can simply select age 18+ and proceed.

**Risk:**
- Dating app with 18+ requirement has no enforceable age gate
- If a minor registers, the app processes child data without parental consent
- COPPA violation risk (for US users), KVKK Madde 6(3) violation
- App Store / Play Store may reject or delist

**Remediation:**
Cross-reference the declared age with the graduation year field (a medical professional who graduated in 2026 cannot be 18 and a doctor simultaneously). Additionally, require date of birth instead of age and verify against uploaded verification documents.

---

### PRV-005: Data Export Missing Received Messages (HIGH)

**Severity:** HIGH | **Impact:** 4 | **Likelihood:** 4 | **Confidence:** high | **Effort:** 4h

**Regulation:** GDPR Article 20 (Right to Data Portability), KVKK Madde 11(g)

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/accountService.ts:78-93`

**Evidence:**
```typescript
// Line 88: Only fetches messages where user is sender
messagesResult,  // supabase.from('messages').select('*').eq('sender_id', user.id)
```

The data export function queries messages only where `sender_id` equals the user. Messages received by the user (sent by others in their conversations) are excluded. Similarly, `verification_documents`, `verified_work_emails`, `blocked_profiles`, and `profile_visits` data is not included in the export. The export also misses photos/storage files.

**Risk:**
- GDPR Article 20 requires ALL personal data to be exportable
- Incomplete export = non-compliant data portability
- Users cannot fully understand what data the platform holds about them
- 30-day response obligation under KVKK/GDPR

**Remediation:**
```typescript
// Fix: Query messages via conversation membership
const messagesResult = await supabase
  .from('messages')
  .select('*')
  .in('conversation_id',
    supabase.from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)
  );
// Also add: verification_documents, verified_work_emails, blocks, profile photos
```

---

### PRV-006: Account Deletion Does Not Fully Erase Data (HIGH)

**Severity:** HIGH | **Impact:** 5 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 8h

**Regulation:** GDPR Article 17 (Right to Erasure), KVKK Madde 7 (Silme Hakki)

**Files:**
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql:588-620`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260212_account_deletion_executor.sql:47-68`

**Evidence:**
```sql
-- 001_complete_schema.sql line 599-601: Soft delete only
UPDATE messages
SET content = '[silindi]', is_deleted = TRUE, media_path = NULL
WHERE sender_id = p_user_id;
```

Two different deletion paths exist and are inconsistent:
1. `delete_user_data()` in 001_complete_schema.sql: Soft-deletes messages (replaces content with `[silindi]`), hard-deletes likes/matches/blocks/push_tokens/consents/verification_docs/moderation_queue, then hard-deletes profile
2. `process_account_deletion_request()` in 20260212: Different table names (swipes vs likes, etc.), anonymizes profile instead of deleting it, does NOT touch messages at all

Neither path removes the user's profile photo files from conversation partner's cached views. The `[silindi]` placeholder still retains metadata (timestamps, conversation_id, sender_id). The `profiles` row in path 2 is anonymized but not deleted, retaining the row with `id = target_user`.

**Risk:**
- GDPR Article 17 requires complete erasure, not soft deletion
- Retained message metadata can be used to reconstruct communication patterns
- Two inconsistent deletion paths create confusion about which is actually used
- Regulatory audit would reveal incomplete deletion

**Remediation:**
Unify deletion paths. After a 30-day grace period, hard-delete all message rows (not just content replacement). Ensure both deletion functions produce identical outcomes. Add a final audit step that verifies zero rows remain.

---

### PRV-007: Salary Data Collection Violates Data Minimization (HIGH)

**Severity:** HIGH | **Impact:** 4 | **Likelihood:** 4 | **Confidence:** high | **Effort:** 3h

**Regulation:** KVKK Madde 4(c) (Veri Minimizasyonu), GDPR Article 5(1)(c) (Data Minimization)

**Files:**
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/types.ts:113,282`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/ProfileCompletionView.tsx:57`

**Evidence:**
```typescript
// types.ts line 113
export type SalaryRange = 'RANGE_1' | 'RANGE_2' | 'RANGE_3' | 'RANGE_4' | 'PREFER_NOT';

// types.ts line 282
salaryRange?: SalaryRange;
```

Salary/income data is collected during profile completion. This data:
- Is NOT necessary for the dating/matching functionality
- Is NOT used in any matching algorithm (grep for `salaryRange` shows only collection, storage, and profile upsert -- no filtering logic)
- Creates financial profiling of medical professionals
- Is stored in the main `profiles` table with no special protection

**Risk:**
- KVKK/GDPR requires collecting ONLY data necessary for the stated purpose
- Income data combined with medical specialty creates sensitive financial profiles
- If breached, exposes salary information of identifiable medical professionals
- No clear legal basis for this data collection

**Remediation:**
Either remove the salary field entirely, or: (a) provide explicit justification in the privacy policy, (b) require separate explicit consent, (c) do not store it on the server -- use it only for client-side matching hints.

---

### PRV-008: Analytics SDKs Initialized Without IP Anonymization (HIGH)

**Severity:** HIGH | **Impact:** 4 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 4h

**Regulation:** GDPR Article 5(1)(c) (Data Minimization), KVKK Madde 4(c), ePrivacy Directive

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/src/lib/analytics.ts:55-66`

**Evidence:**
```typescript
// Line 56: No IP anonymization option
mixpanelClient.init(MIXPANEL_TOKEN, { debug: false });

// Line 61-64: PostHog autocapture disabled but no IP anonymization
posthogClient.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST || 'https://app.posthog.com',
  autocapture: false,
});

// Lines 69-70: User ID sent directly to both platforms
if (mixpanelInitialized && mixpanelClient) mixpanelClient.identify(pendingIdentifyId);
if (posthogInitialized && posthogClient) posthogClient.identify(pendingIdentifyId);
```

Even when analytics consent is granted:
1. Mixpanel receives the real IP address (no `ip: false` config)
2. PostHog receives the real IP address (no `mask_all_person_properties` or `ip: false`)
3. Both receive the user's Supabase UUID directly via `identify()`, which can be cross-referenced with profile data
4. No property filtering -- all event properties go to third-party servers

**Risk:**
- Real IP addresses of medical professionals sent to US-based analytics companies
- Combined with user ID, creates deanonymizable tracking profiles
- Cross-border transfer of IP data without adequate protection
- Even with consent, data minimization requires anonymization where possible

**Remediation:**
```typescript
// Mixpanel
mixpanelClient.init(MIXPANEL_TOKEN, {
  debug: false,
  ip: false, // Do not use IP for geolocation
  property_blacklist: ['$current_url', '$referrer'],
});

// PostHog
posthogClient.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST || 'https://app.posthog.com',
  autocapture: false,
  mask_all_person_properties: true,
  person_profiles: 'identified_only',
});

// Use hashed identifier instead of raw UUID
const hashedId = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pendingIdentifyId));
```

---

### PRV-009: No Granular Consent Management; No Withdrawal Mechanism (HIGH)

**Severity:** HIGH | **Impact:** 4 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 4h

**Regulation:** GDPR Article 7(3) (Right to Withdraw Consent), KVKK Madde 5 (Acik Riza Geri Cekilebilir)

**Files:**
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx:1213-1239`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/src/lib/analytics.ts:30-33`

**Evidence:**
```typescript
// App.tsx line 1213: Consent banner only for analytics
{analyticsConsent === null && (
  <div className="...">
    <p>We use analytics to improve matching...</p>
    <button onClick={() => handleConsentChoice('denied')}>Decline</button>
    <button onClick={() => handleConsentChoice('granted')}>Accept</button>
  </div>
)}
```

Issues:
1. Consent banner appears only once and only for analytics
2. After making a choice, there is NO way to change it in-app (no consent management center in settings)
3. No separate consent for: push notifications data, location data, AI icebreaker processing, medical data sharing with other users
4. `setAnalyticsConsent()` stores to localStorage only -- no server-side record
5. KVKK requires consent to be "as easy to withdraw as to give"

**Risk:**
- Users cannot withdraw analytics consent after initial choice
- No consent management UI accessible from settings
- GDPR Article 7(3) violation: withdrawal must be as easy as granting
- No granular control over different processing activities

**Remediation:**
Add a "Privacy & Consent" section to MyProfileView/AccountSettings with toggles for: analytics, push notifications, AI features, location sharing. Each toggle change should call `recordConsent()` or a withdrawal endpoint.

---

### PRV-010: Production Supabase URL Hardcoded in Mobile Client (HIGH)

**Severity:** HIGH | **Impact:** 4 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 2h

**Regulation:** OWASP Mobile Top 10 M9, Security Best Practices

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/mobile/src/services/supabase.ts:11`

**Evidence:**
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cxhwwgnogpsupnbbxvae.supabase.co';
```

The production Supabase project URL (`cxhwwgnogpsupnbbxvae.supabase.co`) is hardcoded as a fallback. This is committed to version control and visible to anyone with repository access. While the anon key is not hardcoded (empty string fallback), the URL itself reveals the exact Supabase project, enabling:
- Targeted reconnaissance of the database endpoint
- Enumeration attempts against known Supabase API paths
- Social engineering attacks referencing the specific project

**Risk:**
- Infrastructure endpoint exposed in source code
- Combined with any leaked anon key, enables unauthorized API access
- Violates security-by-obscurity minimum standards

**Remediation:**
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error('Missing required environment variable: EXPO_PUBLIC_SUPABASE_URL');
}
```

---

### PRV-011: Verification Documents Not Auto-Deleted After Approval (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 4 | **Confidence:** high | **Effort:** 8h

**Regulation:** KVKK Madde 4(d) (Saklama Suresi), GDPR Article 5(1)(e)

**Files:**
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql:160-172`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/public/privacy.html:66`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:910-912`

**Evidence:** The UI tells users "Your documents are encrypted and only used for verification. They will be deleted from our servers after approval." The privacy policy states "Deleted within 30 days of verification completion." The `verification_documents` table has an `expires_at` column (line 171) but no trigger, cron job, or application logic checks this field or deletes expired documents.

Verification documents may include: medical licenses, hospital IDs, diplomas -- highly sensitive identity documents that could enable identity theft if breached.

**Risk:**
- Sensitive identity documents retained indefinitely despite promises
- High-value target for data breaches (medical licenses, government IDs)
- Privacy policy commitment not honored = deceptive practice

**Remediation:**
1. Set `expires_at = NOW() + INTERVAL '30 days'` when document status changes to 'approved'
2. Add pg_cron job: `DELETE FROM verification_documents WHERE expires_at < NOW()`
3. Also delete corresponding files from `verification-docs` storage bucket

---

### PRV-012: IP Address "Hashing" Uses Reversible Base64 (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 2h

**Regulation:** GDPR Recital 30 (IP as Personal Data), KVKK Madde 4

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/accountService.ts:153-161`

**Evidence:**
```typescript
const response = await fetch('https://api.ipify.org?format=json');
const { ip } = await response.json();
// Simple hash - in production use a proper hashing function
ipHash = btoa(ip).substring(0, 20);
```

Multiple issues:
1. `btoa()` is base64 encoding, NOT hashing -- trivially reversible with `atob()`
2. The real IP address is sent to ipify.org, a third-party service not listed in the privacy policy
3. The resulting "hash" is truncated to 20 chars which may cause collisions but is still partially decodable
4. The comment acknowledges this is not production-ready

**Risk:**
- Stored IP "hashes" can be decoded to reveal actual IP addresses
- Third-party data sharing with ipify.org without disclosure
- IP addresses are personal data under GDPR/KVKK

**Remediation:**
```typescript
// Use SubtleCrypto for proper hashing, get IP server-side
const encoder = new TextEncoder();
const data = encoder.encode(clientIpFromServer + SALT);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
```

---

### PRV-013: Sensitive Data Persisted to localStorage in Plaintext (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 2h

**Regulation:** GDPR Article 32 (Security of Processing), KVKK Madde 12

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/stores/matchStore.ts:115-118`

**Evidence:**
```typescript
{
  name: 'match-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ matches: state.matches, swipeHistory: state.swipeHistory }),
}
```

The match store persists to localStorage:
- Full `Match` objects including complete `Profile` data (name, age, role, specialty, hospital, location, images, phone)
- `SwipeHistoryItem` array with full profile objects of every swiped user
- Message arrays within matches

This data is accessible via browser DevTools, XSS attacks, or browser extensions. On web, localStorage has no encryption.

**Risk:**
- XSS vulnerability would expose all matched users' medical professional data
- Browser extensions can read localStorage
- Shared/public computers retain data after logout (localStorage persists)
- Medical professional information in plaintext accessible to client-side attacks

**Remediation:**
1. Use `sessionStorage` instead of `localStorage` for sensitive match data
2. Clear localStorage on logout (already done in `deleteAccount` but not in regular `signOut`)
3. Consider encrypting persisted data with a session-derived key

---

### PRV-014: Terms of Service is Skeleton-Only (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 4h (legal)

**Regulation:** App Store 5.1.1, Google Play Developer Policy 4.0, KVKK Madde 10

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/public/terms.html:1-31`

**Evidence:** The entire Terms of Service file is 30 lines with 4 brief sections. Missing critical sections for a medical dating app:
- Dispute resolution / arbitration clause
- Limitation of liability
- Medical disclaimer (app is NOT for medical advice)
- User content licensing
- Intellectual property
- Data processing terms (required by KVKK/GDPR as separate controller-processor agreements are internal)
- Subscription auto-renewal details (required by App Store)
- Cancellation and refund policy
- Governing law and jurisdiction
- Prohibited content detailed list
- Account termination conditions
- Age verification requirements
- Professional verification disclaimer

**Risk:**
- App Store / Play Store may reject for insufficient terms
- No legal protection for the platform
- Missing medical disclaimer creates liability if users construe anything as medical advice
- Subscription auto-renewal without adequate disclosure violates consumer protection laws

**Remediation:**
Engage a legal professional to draft comprehensive Terms of Service covering all required sections.

---

### PRV-015: Privacy Policy Not Available in Turkish (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 3 | **Confidence:** medium | **Effort:** 3h

**Regulation:** KVKK Madde 10 (Aydinlatma Yukumlulugu), Turkish Consumer Protection Law

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/public/privacy.html:1` (`lang="en"`)

**Evidence:** The privacy policy is written entirely in English. The app primarily targets Turkish medical professionals (Turkish UI text throughout, default country code +90, Turkish city names, Turkish community guidelines). KVKK Article 10 requires that the data controller inform data subjects in an "understandable" manner. For Turkish-speaking users, this means Turkish language.

**Risk:**
- KVKK aydinlatma yukumlulugu ihlali -- users cannot understand their rights
- Argument that users "accepted" terms they could not read
- Regulatory risk if KVKK board investigates

**Remediation:**
Create a Turkish version of the privacy policy at `/public/gizlilik-politikasi.html` or add a language toggle to the existing page. Display the Turkish version by default for Turkish locale users.

---

### PRV-016: Privacy Policy Not Accessible From App Settings (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 4h

**Regulation:** App Store 5.1.1(i), Google Play User Data Policy, KVKK Madde 10

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/MyProfileView.tsx` -- entire file

**Evidence:** The privacy policy link appears only in the analytics consent banner (`App.tsx:1217-1223`). Once a user makes a consent choice, the banner disappears permanently and there is no other way to access the privacy policy within the app. The `MyProfileView` has an "Account & Data" section and a "Community Guidelines" link, but no "Privacy Policy" or "Terms of Service" link.

**Risk:**
- App Store requires privacy policy to be accessible from within the app
- Google Play requires same
- Users cannot review the policy after initial consent
- KVKK requires "easy accessibility" of the aydinlatma metni

**Remediation:**
Add a "Privacy Policy" and "Terms of Service" button in the Account & Data section of `MyProfileView.tsx`, linking to `/privacy.html` and `/terms.html`.

---

### PRV-017: Analytics Consent Not Recorded Server-Side (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 2 | **Confidence:** high | **Effort:** 3h

**Regulation:** GDPR Article 7(1) (Demonstrating Consent), ePrivacy Directive

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx:331-334`

**Evidence:**
```typescript
const handleConsentChoice = useCallback((consent: AnalyticsConsent) => {
    setAnalyticsConsent(consent);       // localStorage only
    setAnalyticsConsentState(consent);  // React state only
}, []);
```

Analytics consent choice is stored ONLY in localStorage (`vitalis_analytics_consent` key). No call to `accountService.recordConsent()` is made. If the user clears their browser data or uses a different device, the consent state is lost. More critically, the controller cannot demonstrate that consent was obtained.

**Risk:**
- GDPR Article 7(1): Controller must be able to demonstrate consent
- No server-side audit trail of consent decision
- Consent withdrawal (deny) is not recorded either
- Browser data clearing resets consent state, causing re-prompt

**Remediation:**
```typescript
const handleConsentChoice = useCallback(async (consent: AnalyticsConsent) => {
    setAnalyticsConsent(consent);
    setAnalyticsConsentState(consent);
    if (consent === 'granted') {
        await accountService.recordConsent('analytics_tracking', 'v1.0');
    } else {
        await accountService.recordConsent('analytics_tracking_denied', 'v1.0');
    }
}, []);
```

---

### PRV-018: Account Deletion Has No Persistent Audit Trail (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 2 | **Confidence:** medium | **Effort:** 4h

**Regulation:** GDPR Article 5(2) (Accountability), KVKK Madde 12(4)

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/functions/delete-account/index.ts:69`

**Evidence:**
```typescript
const deletionLog: string[] = [];
// ... operations push to deletionLog ...
console.log(`Account deleted successfully: ${user.id}`);
console.log('Deletion log:', deletionLog);
```

The deletion log is only written to `console.log()` in the edge function runtime. Edge function logs are ephemeral and may be lost after the function instance terminates. There is no persistent record of: what was deleted, when, which tables were affected, or whether deletion was complete.

**Risk:**
- Cannot prove deletion was completed if user or regulator requests confirmation
- GDPR accountability principle requires documentation of processing activities
- Partial deletion (e.g., storage deletion fails but DB deletion succeeds) leaves no trace

**Remediation:**
Create an `account_deletion_log` table (accessible only to service role) and store: user_id_hash, deletion_timestamp, tables_affected, files_deleted, completion_status. Retain for 3 years per legal requirements.

---

### PRV-019: Account Deletion Does Not Clear All Client Storage (MEDIUM)

**Severity:** MEDIUM | **Impact:** 3 | **Likelihood:** 2 | **Confidence:** medium | **Effort:** 2h

**Regulation:** GDPR Article 17, KVKK Madde 7

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/accountService.ts:52-57`

**Evidence:**
```typescript
// Clear local storage
if (typeof window !== 'undefined') {
  localStorage.clear();
  sessionStorage.clear();
}
```

The deletion clears `localStorage` and `sessionStorage` but does NOT clear:
- IndexedDB (Supabase may cache data here)
- Service worker caches
- On mobile: Expo Secure Store tokens
- Zustand persisted stores that may have written to other storage mechanisms

**Risk:**
- Residual user data remains on client after account deletion
- On shared devices, next user could access cached data
- Mobile app retains tokens in Secure Store after web-initiated deletion

**Remediation:**
Add comprehensive client-side data clearing including IndexedDB, service worker unregistration, and for mobile, clear Expo Secure Store. Also clear all Zustand store caches explicitly.

---

### PRV-020: Data Controller Information Incomplete for KVKK (LOW)

**Severity:** LOW | **Impact:** 2 | **Likelihood:** 3 | **Confidence:** high | **Effort:** 2h

**Regulation:** KVKK Madde 10 (Aydinlatma Yukumlulugu)

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/public/privacy.html:29-32`

**Evidence:**
```html
<p><strong>Vitalis Technologies Ltd.</strong><br>
Email: privacy@vitalis.app<br>
Data Protection Officer: dpo@vitalis.app</p>
```

KVKK Article 10 requires the data controller information to include:
- Full legal entity name (provided)
- Physical address of the company (MISSING)
- VERBIS (Veri Sorumlulari Sicil Bilgi Sistemi) registration number (MISSING)
- MERSiS number (MISSING for Turkish entities)
- KEP (Kayitli Elektronik Posta) address for formal correspondence (MISSING)

**Risk:**
- KVKK regulatory non-compliance for Turkish users
- KVKK board may issue warning or fine
- Users cannot send formal complaints via registered mail

**Remediation:**
Add physical address, VERBIS number, and KEP address to the privacy policy data controller section.

---

### PRV-021: Community Guidelines Acceptance Not Recorded (LOW)

**Severity:** LOW | **Impact:** 2 | **Likelihood:** 2 | **Confidence:** medium | **Effort:** 1h

**Regulation:** Best Practice (Audit Trail)

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/CommunityGuidelines.tsx:170-182`

**Evidence:** The community guidelines component requires a checkbox check (`isAccepted` state) before proceeding, but when `onAccept()` is called, no server-side record is created. If a user later violates guidelines and the platform takes action, there is no proof the user agreed to the guidelines.

**Remediation:**
```typescript
const handleAccept = async () => {
  if (isAccepted && onAccept) {
    await accountService.recordConsent('community_guidelines', 'v1.0');
    onAccept();
  }
};
```

---

### PRV-022: No Active Age Gate Mechanism on Mobile (LOW)

**Severity:** LOW | **Impact:** 2 | **Likelihood:** 2 | **Confidence:** medium | **Effort:** 2h

**Regulation:** COPPA, KVKK Madde 6(3)

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/public/privacy.html:231-232`

**Evidence:** The privacy policy states "We do not knowingly collect data from anyone under 18. If you believe a minor has provided us with personal data, please contact us immediately." However, there is no defined procedure for what happens when an underage user is identified: no automated age-gate on the mobile app, no mechanism to delete their data, no notification to parents.

**Remediation:**
1. Add a date-of-birth input as the first step of registration
2. If age < 18, block registration and display an appropriate message
3. Document the procedure for handling reports of underage users
4. Implement data deletion within 24 hours of confirmed underage user detection

---

### PRV-023: User Agent String Stored Raw in Consent Table (LOW)

**Severity:** LOW | **Impact:** 2 | **Likelihood:** 2 | **Confidence:** high | **Effort:** 1h

**Regulation:** GDPR Article 5(1)(c) (Data Minimization)

**File:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql:63`

**Evidence:**
```sql
user_agent TEXT,
```

The `user_consents` table stores the full user agent string (via `navigator.userAgent` in `accountService.ts:170`). Modern user agent strings can contain detailed device model information, OS version, and browser details that, combined with IP hash, can create a fingerprint.

**Remediation:**
Hash the user agent before storage, or store only a normalized platform identifier (e.g., "web-chrome", "ios", "android").

---

## REGULATORY COMPLIANCE MATRIX

| Requirement | Status | Finding IDs | Notes |
|---|---|---|---|
| KVKK Madde 5 (Acik Riza) | FAIL | PRV-001, PRV-009 | No consent recorded at registration |
| KVKK Madde 4(c) (Veri Minimizasyonu) | PARTIAL | PRV-007, PRV-008 | Salary data unnecessary; analytics not anonymized |
| KVKK Madde 4(d) (Saklama Suresi) | FAIL | PRV-002, PRV-011 | No retention enforcement |
| KVKK Madde 7 (Silme Hakki) | PARTIAL | PRV-006, PRV-019 | Soft-delete only; incomplete client clearing |
| KVKK Madde 10 (Aydinlatma) | PARTIAL | PRV-015, PRV-016, PRV-020 | English-only; not accessible from settings |
| KVKK Madde 11(g) (Veri Tasinabilirligi) | PARTIAL | PRV-005 | Export missing received messages |
| GDPR Article 6-7 (Consent) | FAIL | PRV-001, PRV-009, PRV-017 | Consent not recorded; no withdrawal |
| GDPR Article 17 (Erasure) | PARTIAL | PRV-006, PRV-018 | Soft-delete; no audit trail |
| GDPR Article 20 (Portability) | PARTIAL | PRV-005 | Incomplete data export |
| GDPR Article 25 (Privacy by Design) | PARTIAL | PRV-008, PRV-013 | Analytics not anonymized; localStorage plaintext |
| GDPR Article 32 (Security) | PARTIAL | PRV-010, PRV-012, PRV-013 | Hardcoded URL; base64 "hash"; plaintext localStorage |
| App Store 5.1.1 (Data Collection) | FAIL | PRV-001, PRV-003, PRV-016 | No consent recording; mobile gaps; no in-app policy link |
| Play Store User Data Policy | FAIL | PRV-001, PRV-003, PRV-014 | Same as App Store + skeleton ToS |
| COPPA / Age Verification | PARTIAL | PRV-004, PRV-022 | Self-reported only; no active age gate on mobile |

---

## PRIORITIZED REMEDIATION ROADMAP

### Sprint 1 (CRITICAL -- Before Launch)

1. **PRV-001:** Implement consent recording at registration (all consent types)
2. **PRV-003:** Bring mobile registration to parity with web (age, consent, verification)
3. **PRV-002:** Implement data retention cron jobs matching privacy policy commitments

### Sprint 2 (HIGH -- Within 2 Weeks)

4. **PRV-004:** Enhance age verification with document cross-check
5. **PRV-006:** Unify deletion paths; implement hard-delete after grace period
6. **PRV-005:** Fix data export to include all user data
7. **PRV-009:** Build consent management center in settings
8. **PRV-007:** Remove or justify salary data collection
9. **PRV-008:** Configure analytics SDKs with IP anonymization
10. **PRV-010:** Remove hardcoded Supabase URL

### Sprint 3 (MEDIUM -- Within 1 Month)

11. **PRV-011:** Implement verification document auto-deletion
12. **PRV-012:** Replace base64 IP encoding with proper SHA-256 hashing
13. **PRV-013:** Encrypt or session-scope persisted match data
14. **PRV-014:** Draft comprehensive Terms of Service
15. **PRV-015:** Add Turkish privacy policy translation
16. **PRV-016:** Add privacy policy link to profile/settings
17. **PRV-017:** Record analytics consent server-side
18. **PRV-018:** Create persistent deletion audit trail
19. **PRV-019:** Clear all client storage on account deletion

### Sprint 4 (LOW -- Within 2 Months)

20. **PRV-020:** Complete KVKK data controller information
21. **PRV-021:** Record community guidelines acceptance
22. **PRV-022:** Implement active age-gate on mobile
23. **PRV-023:** Hash user agent before storage

---

## NOTES

1. **Legal Review Required:** This audit is a technical assessment. All findings should be reviewed by a KVKK/GDPR qualified attorney before implementation.

2. **Medical Data Classification:** Under KVKK, medical specialty and hospital affiliation may qualify as "ozel nitelikli kisisel veri" (special category personal data). This would require explicit consent under KVKK Madde 6. Legal counsel should determine the exact classification.

3. **Cross-Border Transfers:** All major third-party services (Stripe, Google Gemini, Mixpanel, PostHog, Sentry, Firebase) are US-based. KVKK Madde 9 requires either "adequate protection" determination by the KVKK Board or Standard Contractual Clauses. The privacy policy references SCCs but no evidence of executed DPAs (Data Processing Agreements) was found in the codebase.

4. **VERBIS Registration:** If Vitalis processes data of Turkish residents, it must register with VERBIS (Veri Sorumlulari Sicil Bilgi Sistemi) before data processing begins. This is a legal prerequisite, not a technical one.

5. **Gemini AI Anonymization:** The icebreaker edge function (`generate-icebreaker/index.ts`) properly anonymizes profile data before sending to Google Gemini (PR-001 fix applied). This is a positive finding -- only role, specialty, and limited interests are sent. However, the AI processing should still be covered by explicit consent since it involves sending user data to a third party.

---

**END OF PRIVACY AUDIT REPORT**
