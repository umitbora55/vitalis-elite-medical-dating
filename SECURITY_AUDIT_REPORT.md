# VITALIS ELITE MEDICAL DATING - SECURITY AUDIT REPORT v2

**Audit Date:** 2026-02-17
**Previous Audit:** 2026-02-15 (19 findings)
**Auditor:** Claude Security Auditor (Opus 4.6)
**Scope:** Full codebase security review (frontend, backend, database, edge functions, storage, third-party integrations)
**Application Type:** Medical Dating Platform (HIGHEST SENSITIVITY - handles PII, medical credentials, verification documents, romantic communications)
**Branch:** main (latest commit: 6c41987)

---

### OZET

- **Toplam bulgu:** 22 (CRITICAL: 2, HIGH: 5, MEDIUM: 10, LOW: 5)
- **En yuksek riskli 3 bulgu:** SEC-001, SEC-002, SEC-003
- **No finding moduller:** XML External Entities (N/A - no XML parsing), Insecure Deserialization (N/A - no untrusted deserialization), Stored XSS (no dangerouslySetInnerHTML), SQL Injection (parameterized queries via Supabase client)
- **Onceki audit'ten duzeltilen bulgular:** Dev bypass (LandingView), IDOR (verificationService), Sentry PII, Webhook CORS, RegExp injection, Webhook idempotency

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| SEC-001 | CRITICAL | 5 | 4 | high | 2h | moderate-image/index.ts:50-81 | `serve(async (req) => { ... })` -- no auth check | Unauthenticated callers can invoke moderation with service role key access | Auth guard + CORS whitelist ekle | Bkz: Detay SEC-001 |
| SEC-002 | CRITICAL | 5 | 4 | high | 1h | geminiService.ts:9-11 | `body: { myProfile, matchProfile }` | Full Profile PII (name, hospital, age, bio) sent to Edge Function over network | Client'tan sadece profile ID gonder, server fetch etsin | Bkz: Detay SEC-002 |
| SEC-003 | HIGH | 4 | 4 | high | 1h | delete-account/index.ts:18-22 | `'Access-Control-Allow-Origin': '*'` | Wildcard CORS on account deletion endpoint enables CSRF from any origin | Origin whitelist uygula | Bkz: Detay SEC-003 |
| SEC-004 | HIGH | 4 | 3 | high | 2h | verificationService.ts:153-161 | `updateProfileVerificationStatus('VERIFIED')` | Client can set own verification_status to VERIFIED via RLS UPDATE policy | Server-side only verification status update; RLS check column restriction | Bkz: Detay SEC-004 |
| SEC-005 | HIGH | 4 | 3 | high | 1h | App.tsx:164-171 | `getSession().then(... setAuthStep('APP'))` | Session restoration skips verification status check; uses getSession (local JWT) not getUser (server) | getUser + verification_status kontrolu ekle | Bkz: Detay SEC-005 |
| SEC-006 | HIGH | 3 | 3 | high | 2h | stores/matchStore.ts:117-118 | `storage: createJSONStorage(() => localStorage)` | Matches + swipe history (profile names, photos, messages) persisted to localStorage | Hassas alanlari partialize'dan cikar veya sessionStorage kullan | Bkz: Detay SEC-006 |
| SEC-007 | HIGH | 4 | 2 | medium | 3h | 001_complete_schema.sql:340-341 | `USING (bucket_id = 'profile-photos' AND auth.role() = 'authenticated')` | Any authenticated user can read ANY user's profile photos via storage path | `auth.uid()::text = (storage.foldername(name))[1]` ya da signed URL-only | Bkz: Detay SEC-007 |
| SEC-008 | MEDIUM | 3 | 3 | high | 1h | moderate-image/index.ts:52-56 | `'Access-Control-Allow-Origin': '*'` | Wildcard CORS on moderation endpoint (compounded with SEC-001) | Origin whitelist or remove CORS entirely | CORS whitelist |
| SEC-009 | MEDIUM | 3 | 3 | high | 0.5h | RegistrationFlow.tsx:46 | `password: z.string().min(8, ...)` | Only min 8 chars, no complexity (uppercase, digit, special char) | Zod regex constraint ekle | `.regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%])/)` |
| SEC-010 | MEDIUM | 3 | 3 | medium | 2h | accountService.ts:155-161 | `fetch('https://api.ipify.org?format=json')` | Client IP sent to third-party (ipify.org) without user consent/notice | Server-side IP hashing veya 3rd-party cagrisini kaldir | Edge function'da req header'dan IP al |
| SEC-011 | MEDIUM | 3 | 2 | high | 1h | pushNotifications.ts:30-31 | `btoa(JSON.stringify(firebaseMessagingConfig))` | Firebase config (API key, project ID, sender ID) encoded as base64 in SW URL | Config'i inline SW dosyasina yaz veya importScripts kullan | Bkz: Detay SEC-011 |
| SEC-012 | MEDIUM | 2 | 2 | high | 0.5h | push-worker/index.ts:186 | `console.log(\`Disabled invalid token: ${token.substring(0, 20)}...\`)` | Partial push token logged to server console | Token loglama kaldir veya hash kullan | `console.log('Disabled invalid token:', hash(token))` |
| SEC-013 | MEDIUM | 3 | 2 | medium | 4h | supabase/migrations/*.sql | No TTL/retention policy on messages, swipes, notifications | Eski veriler sonsuza kadar saklanir - GDPR data minimization ihlali | Cron job ile TTL-based cleanup | `DELETE FROM swipes WHERE created_at < NOW() - INTERVAL '2 years'` |
| SEC-014 | MEDIUM | 3 | 3 | medium | 2h | create-checkout-session/index.ts:149-157 | `customer_email: user.email \|\| undefined` | Raw email passed to Stripe instead of Stripe Customer object | Stripe Customer olustur, customer ID kullan | `customer: await getOrCreateCustomer(user.id)` |
| SEC-015 | MEDIUM | 2 | 2 | medium | 1h | create-checkout-session/index.ts (full) | No rate limiting on checkout session creation | Attacker could create many Stripe sessions to exhaust API quota | In-memory rate limiter ekle (generate-icebreaker'daki gibi) | checkRateLimit pattern'ini kopyala |
| SEC-016 | MEDIUM | 2 | 2 | high | 0.5h | 20260211_security_hardening.sql:217-219 | `USING (true)` on verified_domains | verified_domains tablosu tum anonim/authenticated kullanicilara acik; tier bilgisi gorunur | `USING (auth.uid() IS NOT NULL)` ile sinirla | authenticated-only policy |
| SEC-017 | MEDIUM | 3 | 2 | medium | 1h | 001_complete_schema.sql:350-363 | No SELECT policy on verification-documents storage | verification-documents bucket'inda SELECT policy tanimlanmamis; varsayilan deny | Explicit admin-only SELECT policy ekle | `USING (public.is_service_role())` |
| SEC-018 | LOW | 2 | 2 | high | 0.5h | AUTOMATION_AUDIT.json | qs 6.7.0-6.14.1 DoS (GHSA-w7fw-mjwx-w883, CVSS 3.7) | Indirect dependency, low DoS risk | `npm audit fix` | N/A |
| SEC-019 | LOW | 1 | 1 | high | 0.5h | generate-icebreaker/index.ts:1, create-checkout-session/index.ts:2, webhooks-stripe/index.ts:1 | `// @ts-nocheck` | TypeScript type checking disabled in 3 edge functions; type errors invisible | @ts-nocheck kaldir, Deno tipleri ekle | `/// <reference lib="deno.ns" />` |
| SEC-020 | LOW | 2 | 2 | medium | 1h | constants.ts:11 | `const IS_DEV = import.meta.env.DEV` | IS_DEV exported but not used as guard in production-critical paths | Kullanilmiyorsa kaldir, kullaniliyorsa build-time sabiti yap | Dead code kaldir |
| SEC-021 | LOW | 1 | 1 | high | 0.5h | delete-account/index.ts:174 | `console.log(\`Account deleted successfully: ${user.id}\`)` | UUID logged on deletion; low risk but unnecessary PII in logs | Hash or omit user ID from deletion logs | `console.log('Account deleted successfully')` |
| SEC-022 | LOW | 2 | 1 | medium | 1h | .env.local:1-14 | Real credentials present (Supabase anon key, Stripe pk_test, Firebase config, Sentry DSN) | .gitignore correctly excludes *.local; risk only if leaked via backup/screenshot | Secret rotation after any accidental exposure; use vault in production | Bkz: Detay SEC-022 |

---

## DETAYLI BULGULAR

### Detay SEC-001: Unauthenticated Edge Function with Service Role Key (CRITICAL)

**Dosya:** `/supabase/functions/moderate-image/index.ts:50-81`

```typescript
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',    // Wildcard CORS
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
  // ... NO AUTH CHECK HERE ...
  const { imagePath, bucket }: ModerationRequest = await req.json();
  // Uses SERVICE ROLE KEY internally:
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
```

**Exploit Senaryosu:**
1. Saldirgan, Edge Function URL'ini kesfeder (Supabase public URL pattern'i tahmin edilebilir)
2. Authorization header olmadan POST istegi gonderir
3. `imagePath` parametresine herhangi bir bucket path verir
4. Function, SERVICE_ROLE_KEY ile herhangi bir bucket'tan signed URL olusturur (satir 85-87)
5. Saldirgan, verification-documents, chat-media dahil TUM bucket'lardaki dosyalara erisir

**Etki:** Service role key ile any-bucket-any-file okuma; verification belgeleri (kimlik, diploma) dahil tum storage'a yetkisiz erisim.

**Oneri:**
```typescript
// Auth check ekle (generate-icebreaker pattern'ini kullan)
const { user, error: authError } = await getAuthenticatedUser(
  req.headers.get('authorization')
);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: corsHeaders
  });
}
// Bucket whitelist: sadece profile-photos izin ver
if (bucket !== 'profile-photos') {
  return new Response(JSON.stringify({ error: 'Forbidden bucket' }), {
    status: 403, headers: corsHeaders
  });
}
```

---

### Detay SEC-002: Full PII Sent to Edge Function Over Network (CRITICAL)

**Dosya:** `/services/geminiService.ts:4-11`

```typescript
export const generateMedicalIcebreaker = async (
  myProfile: Profile,      // FULL Profile object with all PII
  matchProfile: Profile     // FULL Profile object with all PII
): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-icebreaker', {
    body: { myProfile, matchProfile },  // Entire Profile transmitted
  });
```

**Analiz:** Edge function (`generate-icebreaker/index.ts`) server-side'da `anonymizeProfile()` ile PII'yi temizliyor (satir 125-140). Ancak client-side'da FULL Profile (isim, yas, hastane, bio, konum, foto URL'leri) network uzerinden gonderiliyor. HTTPS olsa bile:
- Network interceptor/proxy ile gorulebilir
- Supabase Edge Function loglari request body icerebilir
- MITM senaryosunda (cert pinning yoksa) full PII aciliga cikar

**Profile type icerigi (types.ts):**
- name, age, gender, location_city, hospital, bio, role, specialty
- photos (URL array), interests, personalityTags
- verificationStatus, last_active_at

**Oneri:**
```typescript
// Client: sadece profile ID gonder
const { data, error } = await supabase.functions.invoke('generate-icebreaker', {
  body: { myProfileId: myProfile.id, matchProfileId: matchProfile.id },
});

// Server: profile'lari kendi fetch etsin ve anonimize etsin
const { data: myData } = await supabase
  .from('profiles')
  .select('role, specialty, interests, personalityTags')
  .eq('id', myProfileId)
  .single();
```

---

### Detay SEC-003: Wildcard CORS on Account Deletion Endpoint (HIGH)

**Dosya:** `/supabase/functions/delete-account/index.ts:18-22`

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};
```

**Exploit Senaryosu:**
1. Kullanici, saldirganin kontrolundeki bir web sitesini ziyaret eder
2. Site, kullanicinin tarayicisinda saklanan Supabase JWT'si ile birlikte delete-account endpoint'ine fetch istegi gonder
3. `'Access-Control-Allow-Origin': '*'` nedeniyle browser CORS kontrolu gecilir
4. Bearer token cookies/localStorage'dan okunur ve Authorization header'a eklenir
5. Hesap silinir (storage + database + auth user)

**Not:** JWT, Supabase'de httpOnly cookie degil localStorage'da saklandigi icin, ayriyeten bir XSS gerekir. Ancak wildcard CORS, cookie-based auth senaryolarinda dogrudan CSRF'e acik.

**Oneri:**
```typescript
// create-checkout-session pattern'ini kullan
const getAllowedOrigins = (appBaseUrl: string): Set<string> => { ... };
const getCorsHeaders = (origin, allowedOrigins, appBaseUrl) => { ... };
```

---

### Detay SEC-004: Client-Side Verification Status Update (HIGH)

**Dosya:** `/services/verificationService.ts:153-161`

```typescript
export const updateProfileVerificationStatus = async (
  status: 'PENDING_VERIFICATION' | 'EMAIL_VERIFICATION_SENT' | 'REJECTED' | 'VERIFIED',
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }
  return supabase.from('profiles').update({ verification_status: status }).eq('id', authData.user.id);
};
```

**Analiz:** RLS policy (001_complete_schema.sql:217-220) `profiles_update_policy` sadece `auth.uid() = id` kontrol ediyor, kolon bazli kisitlama yok. Bu demek ki:
1. Herhangi bir authenticated kullanici kendi `verification_status`'unu 'VERIFIED' yapabilir
2. `updateProfileVerificationStatus('VERIFIED')` client'tan cagirilabilir
3. Sahte medical professional profilleri olusturulabilir

**Oneri:**
```sql
-- RLS policy'de verification_status kolonunu kisitla
CREATE POLICY "profiles_update_restricted" ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    -- verification_status degismediyse izin ver
    verification_status IS NOT DISTINCT FROM (SELECT verification_status FROM profiles WHERE id = auth.uid())
    OR public.is_service_role()
  )
);
```

Veya daha basit: `verification_status` guncellemesini sadece server-side RPC ile sinirla.

---

### Detay SEC-005: Session Restoration Without Verification Check (HIGH)

**Dosya:** `/App.tsx:164-171`

```typescript
useEffect(() => {
    getSession().then(({ data }) => {
        if (data.session) {
            setAuthStep('APP');  // Direkt APP'e gonder
            // verification_status kontrol edilmiyor!
        }
    });
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            setAuthStep('APP');  // Ayni sorun
        }
    });
```

**Sorunlar:**
1. `getSession()` yerel JWT'yi okur, sunucu dogrulamasi yapmaz. Supabase docs `getUser()` kullanilmasini onerir.
2. `verification_status` kontrol edilmiyor; PENDING veya REJECTED kullanicilar da APP'e girebilir.
3. SEC-004 ile birlestiginde: kullanici verification'i bypass edip, kendi status'unu VERIFIED yapabilir.

**Oneri:**
```typescript
getUser().then(async ({ data }) => {
  if (!data.user) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', data.user.id)
    .single();
  if (profile?.verification_status === 'VERIFIED') {
    setAuthStep('APP');
  } else {
    setAuthStep('PENDING_VERIFICATION');
  }
});
```

---

### Detay SEC-006: Sensitive Data in localStorage (HIGH)

**Dosya:** `/stores/matchStore.ts:115-119`

```typescript
{
  name: 'match-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    matches: state.matches,        // Profile objects (name, age, hospital, photos)
    swipeHistory: state.swipeHistory  // Swipe decisions (like/pass/superlike)
  }),
}
```

**Etki:** localStorage XSS ile okunabilir. Medical dating app'te match verileri hassas: kimlerin kimi begendigi, hastane/klinik bilgileri, mesajlar. KVKK/GDPR kapsaminda "ozel nitelikli kisisel veri" olabilir.

**Oneri:**
```typescript
partialize: (state) => ({
  // Sadece ID'leri sakla, hassas veriyi tutma
  matchIds: state.matches.map(m => m.profile.id),
  swipeHistoryIds: state.swipeHistory.map(s => s.id),
}),
```

---

### Detay SEC-007: Profile Photos Accessible to All Authenticated Users (HIGH)

**Dosya:** `/supabase/migrations/001_complete_schema.sql:339-341`

```sql
CREATE POLICY "profile_photos_select" ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');
```

**Analiz:** Herhangi bir authenticated kullanici, herhangi bir baska kullanicinin profil fotograflarina dogrudan erisebilir (path biliyorsa). Pattern: `{userId}/{timestamp}_{index}.jpg` -- userId bilinen bir UUID ise tahmin edilebilir.

**Ek Risk:** Block edilen kullanici bile, blok sonrasi path'i bildigi fotograflara erismeye devam edebilir.

**Oneri:**
```sql
-- Sadece kendi fotograflarini veya blocklanmamis kullanicilarin fotograflarini gor
CREATE POLICY "profile_photos_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      auth.role() = 'authenticated'
      AND (storage.foldername(name))[1]::uuid NOT IN (
        SELECT blocked_id FROM blocks WHERE blocker_id = auth.uid()
        UNION
        SELECT blocker_id FROM blocks WHERE blocked_id = auth.uid()
      )
    )
  )
);
```

---

### Detay SEC-011: Firebase Config Exposed in Service Worker URL

**Dosya:** `/src/lib/pushNotifications.ts:30-31`

```typescript
const encodedConfig = btoa(JSON.stringify(firebaseMessagingConfig));
const swUrl = `/firebase-messaging-sw.js?config=${encodeURIComponent(encodedConfig)}`;
```

**Analiz:** Firebase config (API key, project ID, sender ID, app ID) base64 encode edilerek SW registration URL'ine ekleniyor. Bu bilgiler:
- Browser developer tools > Application > Service Workers'da gorunur
- Server access loglarinda URL query parameter olarak kaydedilir
- Referer header ile ucuncu parti servislere sizabilir

**Not:** Firebase API key'ler normalde public olarak kabul edilir, ancak bu bilgilerin URL'de tasinmasi best practice degildir.

**Oneri:**
```typescript
// SW dosyasina config'i build time'da inject edin
// veya SW icinde importScripts ile config yukleyin
const swUrl = '/firebase-messaging-sw.js';
// SW icinde: self.__FIREBASE_CONFIG = { ... } global olarak inject edilsin
```

---

### Detay SEC-022: Credentials in .env.local

**Dosya:** `/.env.local:1-14`

```
VITE_SUPABASE_URL=https://[REDACTED].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ[REDACTED]...
VITE_STRIPE_PUBLIC_KEY=pk_test_[REDACTED]...
VITE_FIREBASE_API_KEY=AIza[REDACTED]...
VITE_SENTRY_DSN=https://[REDACTED]@[REDACTED].ingest.de.sentry.io/[REDACTED]
```

**Durum:** `.gitignore` dosyasinda `*.local` pattern'i mevcut (satir 13), dolayisiyla .env.local git'e commit edilMEMELI. Ancak `git status` ciktisinda `.env.local` listelenmiyor -- bu dosya tracked olmadigini gosterir. DOGRU.

**Risk:** Dusuk. Ancak:
- Supabase anon key frontend bundle'a dahil edilir (beklenen davranis)
- Stripe pk_test key de public'tir
- Asil risk: `.env.local` backup/screenshot/disk image ile sizarsa, credential rotation gerekir

**Oneri:** Production'da vault/secrets manager kullanin. Anon key rotation sonrasi tum client'lari guncelleyin.

---

## OWASP TOP 10 COVERAGE

### 1. Injection
| Check | Status | Notes |
|-------|--------|-------|
| SQL Injection | SAFE | Supabase client uses parameterized queries |
| XSS (Stored) | SAFE | No dangerouslySetInnerHTML; React JSX escaping |
| XSS (Reflected) | SAFE | No URL params rendered unsafely |
| XSS (DOM-based) | SAFE | React virtual DOM protection |
| Regex DoS | FIXED | `escapeRegExp()` implemented (ChatView.tsx:60) |
| Command Injection | N/A | No shell commands executed |

### 2. Broken Authentication
| Check | Status | Notes |
|-------|--------|-------|
| Dev Bypass (LandingView) | FIXED | `onDevBypass` prop removed (FE-001 AUDIT-FIX) |
| Dev Bypass (App.tsx) | FIXED | No dev bypass button in current LandingView render (line 1077) |
| Password Policy | MEDIUM | SEC-009 - Only length check, no complexity |
| Session Verification | HIGH | SEC-005 - getSession without verification check |
| Brute Force | SAFE | Supabase built-in rate limiting |
| Account Enumeration | SAFE | Error messages normalized (LoginView.tsx:190-202) |

### 3. Sensitive Data Exposure
| Check | Status | Notes |
|-------|--------|-------|
| PII to Network | CRITICAL | SEC-002 - Full profile sent to edge function |
| Sentry PII | FIXED | sendDefaultPii: false, Authorization header stripped |
| localStorage Data | HIGH | SEC-006 - Matches/profiles persisted |
| Profile Photos | HIGH | SEC-007 - All authenticated users can access |
| Push Token Logging | MEDIUM | SEC-012 - Partial token in server logs |
| HTTPS Enforcement | SAFE | Supabase enforces TLS |

### 4. Broken Access Control
| Check | Status | Notes |
|-------|--------|-------|
| RLS Policies | GOOD | Comprehensive RLS in schema + hardening migration |
| IDOR | FIXED | All services use auth.getUser() (AUDIT-FIX: BE-002/008) |
| Verification Bypass | HIGH | SEC-004 - Client can set VERIFIED status |
| Service Role Key | SAFE | Only used in server-side edge functions |
| Block Bypass (Photos) | HIGH | SEC-007 - Blocked users can still access photos |

### 5. Security Misconfiguration
| Check | Status | Notes |
|-------|--------|-------|
| CORS - Checkout | GOOD | Origin whitelist with APP_BASE_URL |
| CORS - Icebreaker | FIXED | Origin whitelist + auth + rate limit added |
| CORS - Webhook | FIXED | CORS headers removed (server-to-server) |
| CORS - Delete Account | HIGH | SEC-003 - Wildcard CORS |
| CORS - Moderate Image | CRITICAL | SEC-001 - Wildcard CORS + no auth |
| TypeScript Checking | LOW | SEC-019 - @ts-nocheck in 3 edge functions |

### 6. Using Known Vulnerable Components
| Check | Status | Notes |
|-------|--------|-------|
| npm audit | LOW | SEC-018 - qs package DoS (CVSS 3.7) |
| Package versions | SAFE | Recent versions in package.json |

### 7. Insufficient Logging & Monitoring
| Check | Status | Notes |
|-------|--------|-------|
| Security Event Logging | MISSING | No dedicated security event table |
| Audit Trail | PARTIAL | created_at timestamps exist, no modification audit |
| SIEM Integration | MISSING | No log forwarding |
| User ID in Logs | LOW | SEC-021 - Raw UUID in deletion logs |

---

## DUZELTILMIS BULGULAR (Onceki Audit'ten)

| Onceki ID | Durum | Aciklama |
|---|---|---|
| SEC-001 (v1) | FIXED | Dev bypass `onDevBypass` prop LandingView'dan kaldirildi. App.tsx render'da artik bu prop gecilmiyor. |
| SEC-002 (v1) | PARTIALLY FIXED | Edge function'da `anonymizeProfile()` eklendi. Ancak client hala full Profile gonderiyor (yeni SEC-002). |
| SEC-003 (v1) | FIXED | generate-icebreaker CORS whitelist, auth check, rate limit eklendi. |
| SEC-004 (v1) | FIXED | webhooks-stripe CORS headers tamamen kaldirildi, idempotency eklendi. |
| SEC-008 (v1) | FIXED | RegExp injection: `escapeRegExp()` fonksiyonu ChatView.tsx:60'ta aktif. |
| SEC-017 (v1) | FIXED | Sentry `sendDefaultPii: false` dogrulandi; Authorization header beforeSend'de strip ediliyor. |

---

## COMPLIANCE GAPS

### GDPR/KVKK
- [x] **Article 17 (Right to Erasure):** delete-account edge function implemented (storage + DB + auth deletion)
- [x] **Article 20 (Data Portability):** accountService.exportData() implemented (JSON export)
- [x] **Article 7 (Consent):** Analytics consent implemented (analytics.ts); user_consents table exists
- [ ] **Article 35 (DPIA):** No Data Protection Impact Assessment documented
- [ ] **Data Minimization:** SEC-013 - No TTL/retention policies on messages, swipes, notifications
- [ ] **Lawful Basis:** Third-party IP lookup (ipify.org) without explicit consent (SEC-010)

### HIPAA (Advisory)
- [ ] **BAA Required:** No Business Associate Agreement with Google (Gemini), Google (Vision), analytics providers
- [ ] **Audit Logs:** No access logging for PHI-adjacent data
- [ ] **Minimum Necessary:** Full profile sent to AI (SEC-002)

---

## POZITIF BULGULAR

| # | Alan | Detay |
|---|------|-------|
| 1 | IDOR Prevention | Tum servisler `auth.getUser()` kullanir (AUDIT-FIX sonrasi) |
| 2 | Webhook Security | Stripe signature verification + idempotency table |
| 3 | RLS Coverage | profiles, messages, conversations, push_tokens, user_consents, verification_documents, blocks, reports, swipes, matches, subscriptions |
| 4 | Storage Buckets | Tum bucket'lar private (public = FALSE) |
| 5 | Photo Ownership | photoService.deletePath() path ownership kontrolu yapar |
| 6 | MIME Validation | Bucket-level allowed_mime_types + client-side validation |
| 7 | File Size Limits | 5MB (photos), 10MB (verification docs) - bucket + client |
| 8 | Message INSERT RLS | conversation_participants membership kontrolu |
| 9 | RegExp Safety | escapeRegExp() chat search'te aktif |
| 10 | Error Normalization | Login hata mesajlari genel (account enumeration onlenir) |
| 11 | Sentry PII Protection | sendDefaultPii: false; Authorization header stripped |
| 12 | Checkout CORS | Origin whitelist with HTTPS enforcement |
| 13 | Rate Limiting | generate-icebreaker per-user rate limit (10/min) |

---

## ONCELIK SIRASI (Remediation Roadmap)

### P0 - Immediate (Before Launch)
1. **SEC-001:** moderate-image'a auth guard + bucket whitelist ekle
2. **SEC-002:** Client'tan profile ID gonder, server fetch etsin
3. **SEC-004:** verification_status guncellemesini RLS'de kisitla veya server-only RPC yap

### P1 - High Priority (Week 1)
4. **SEC-003:** delete-account CORS whitelist ekle (checkout pattern'ini kopyala)
5. **SEC-005:** Session restoration'da getUser + verification check
6. **SEC-006:** localStorage persist'ten hassas alanlari cikar
7. **SEC-007:** Profile photos SELECT policy'yi owner + non-blocked users ile sinirla

### P2 - Medium Priority (Week 2-3)
8. **SEC-009:** Password complexity policy ekle
9. **SEC-010:** ipify.org cagrisini server-side'a tasi veya kaldir
10. **SEC-013:** Data retention policy (TTL) implement et
11. **SEC-014:** Stripe Customer object kullan
12. **SEC-015:** Checkout rate limiting ekle
13. **SEC-016:** verified_domains authenticated-only yap
14. **SEC-017:** verification-documents bucket SELECT policy ekle

### P3 - Low Priority (Backlog)
15. **SEC-018:** `npm audit fix`
16. **SEC-019:** @ts-nocheck kaldir
17. **SEC-020:** Dead IS_DEV code temizle
18. **SEC-021:** UUID loglama temizle
19. **SEC-011:** Firebase config URL'den cikar
20. **SEC-012:** Push token loglama temizle
21. Security event logging table olustur
22. SIEM integration

---

## APPENDIX: Files Reviewed

### Edge Functions (6)
- `/supabase/functions/moderate-image/index.ts` (219 lines) -- CRITICAL findings
- `/supabase/functions/delete-account/index.ts` (206 lines) -- HIGH findings
- `/supabase/functions/generate-icebreaker/index.ts` (179 lines) -- FIXED + remaining issues
- `/supabase/functions/create-checkout-session/index.ts` (169 lines) -- Good CORS pattern
- `/supabase/functions/webhooks-stripe/index.ts` (171 lines) -- FIXED (idempotency, CORS removed)
- `/supabase/functions/push-worker/index.ts` (243 lines) -- MEDIUM findings

### Migrations (3)
- `/supabase/migrations/001_complete_schema.sql` (~500 lines) -- RLS, storage policies
- `/supabase/migrations/20260210_verification.sql` -- verified_domains table
- `/supabase/migrations/20260211_security_hardening.sql` -- Additional RLS policies

### Services (8)
- `/services/authService.ts` -- Auth wrappers
- `/services/verificationService.ts` -- IDOR fixed, verification status risk
- `/services/geminiService.ts` -- PII transmission
- `/services/photoService.ts` -- Photo management with ownership checks
- `/services/chatService.ts` -- Match-gated messaging
- `/services/accountService.ts` -- GDPR compliance
- `/services/pushService.ts` -- Push notification
- `/services/checkoutService.ts` -- Stripe checkout

### Components (6)
- `/App.tsx` (~1460 lines) -- Session management, auth flow
- `/components/LandingView.tsx` -- Dev bypass FIXED
- `/components/LoginView.tsx` -- Error normalization
- `/components/RegistrationFlow.tsx` -- Password policy
- `/components/ChatView.tsx` -- RegExp escaping
- `/components/ControlPanel.tsx` -- Settings/preferences

### Stores (2)
- `/stores/matchStore.ts` -- localStorage persistence
- `/stores/userStore.ts` -- User profile state

### Infrastructure
- `/src/lib/supabase.ts` -- Client initialization
- `/src/lib/sentry.ts` -- Error monitoring (PII fixed)
- `/src/lib/analytics.ts` -- Consent-based analytics
- `/src/lib/firebase.ts` -- Firebase configuration
- `/src/lib/pushNotifications.ts` -- Push notification setup

### Configuration
- `/.env.local` -- Credentials (gitignored)
- `/.env.example` -- Template
- `/.gitignore` -- Correctly excludes secrets
- `/AUTOMATION_AUDIT.json` -- npm audit results
- `/AUTOMATION_SUMMARY.txt` -- Build/lint baseline

---

**Report Generated:** 2026-02-17
**Previous Report:** 2026-02-15
**Delta:** +3 new findings, -6 fixed findings, 16 carried forward (some re-assessed)
**Next Audit Recommended:** Before production launch, then quarterly
