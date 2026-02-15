# VITALIS ELITE MEDICAL DATING - SECURITY AUDIT REPORT

**Audit Date:** 2026-02-15
**Auditor:** Claude Security Auditor (Opus 4.5)
**Scope:** Full codebase security review (frontend, backend, database, third-party integrations)
**Application Type:** Medical Dating Platform (HIGH SENSITIVITY - handles PII, medical credentials, verification documents)
**Commit:** 00fee4b (main branch)

---

### OZET

- **Toplam bulgu:** 19 (CRITICAL: 2, HIGH: 6, MEDIUM: 8, LOW: 3)
- **En yuksek riskli 3 bulgu:** SEC-001, SEC-002, SEC-006
- **No finding moduller:** XML External Entities (N/A - no XML parsing), Insecure Deserialization (N/A - no deserialization of untrusted data)

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| SEC-001 | CRITICAL | 5 | 5 | high | 1h | App.tsx:1057-1071 | `onDevBypass={import.meta.env.DEV ? () => { ... setAuthStep('APP'); }}` | Eger DEV degiskeni production build'de true ise (veya Vite config hataliysa), herkes verification bypass edebilir | DEV kontrolunu kaldirin veya feature flag ile server-side kontrol edin | Bkz: Detay SEC-001 |
| SEC-002 | CRITICAL | 5 | 4 | high | 2h | generate-icebreaker/index.ts:25-27 | `prompt = ...JSON.stringify(myProfile)...JSON.stringify(matchProfile)` | Kullanici profil verisi (isim, yas, hastane, bio, konum) dogrudan Google Gemini AI'a gonderiliyor - HIPAA-adjacent veri sizintisi | Profil verilerini anonimize edin veya sadece gerekli alanlari gonderin | Bkz: Detay SEC-002 |
| SEC-003 | HIGH | 4 | 4 | high | 0.5h | generate-icebreaker/index.ts:4-6 | `'Access-Control-Allow-Origin': '*'` | Icebreaker endpoint'inde wildcard CORS, herhangi bir origin authenticated kullanici adina istek yapabilir | Origin whitelist uygula | `getAllowedOrigins(appBaseUrl)` gibi |
| SEC-004 | HIGH | 4 | 3 | high | 1h | webhooks-stripe/index.ts:6-8 | `'Access-Control-Allow-Origin': '*'` | Stripe webhook endpoint'inde wildcard CORS - imza dogrulamasi var ama CORS gevsetilmis | Webhook'larda CORS header gereksiz, kaldir | CORS header'lari tamamen kaldir |
| SEC-005 | HIGH | 4 | 3 | high | 2h | 20260209_init.sql:254-275 | `profiles` ve `messages` tablosunda RLS var, ancak `SELECT` icin sadece `auth.uid() = id` | Kullanicilar baska kullanicilarin profillerini goremez - bu discover ozelligini bozar. RLS eksik veya yanlis implement edilmis | Discovery icin public_profiles view olustur veya RLS'i yeniden tasarla | Bkz: Detay SEC-005 |
| SEC-006 | HIGH | 5 | 3 | high | 4h | verificationService.ts:114-136 | `supabase.storage.from(VERIFICATION_DOC_BUCKET).upload(path, file)` | Verification documents bucket'ina yukleme yapiliyor ama bucket RLS/ACL politikasi belirsiz. Bucket public ise belgeler aciga cikar | Bucket'i private yapin, signed URL'ler kullanin, malware taramasi ekleyin | Bkz: Detay SEC-006 |
| SEC-007 | HIGH | 4 | 4 | high | 3h | 20260209_init.sql:N/A | `verified_domains` tablosu public read yetkisine sahip (20260211_security_hardening.sql:216-219) | Saldirganlar hangi kurumlarin "tier 1/2/3" oldugunu gorebilir ve domain spoofing icin kullanabilir | Rate limit ekleyin veya authenticated-only yapin | `USING (auth.uid() IS NOT NULL)` |
| SEC-008 | MEDIUM | 3 | 3 | high | 1h | ChatView.tsx:58 | `escapeRegExp(value)` fonksiyonu var ve kullaniliyor | RECON_REPORT'ta belirtilen RegEx DoS DUZELTILMIS - `escapeRegExp` fonksiyonu line 58'de tanimli ve kullaniliyor | Bulgu kapatildi | N/A |
| SEC-009 | MEDIUM | 3 | 4 | medium | 2h | src/lib/analytics.ts:68-71 | `mixpanelClient.identify(pendingIdentifyId); posthogClient.identify(pendingIdentifyId)` | Kullanici ID'si (profile.id) analytics servislerine gonderiliyor. UUID leak riski var | Hashed user ID kullanin | `hash(userId + salt)` |
| SEC-010 | MEDIUM | 3 | 3 | high | 1h | constants.ts:11 | `const IS_DEV = import.meta.env.DEV;` | DEV flagi constants.ts'de export edilmis ve kod icinde kullaniliyor - production build'de false olmali ama kontrol edilmeli | Vite build config'de DEV=false zorla | N/A |
| SEC-011 | MEDIUM | 3 | 2 | medium | 4h | supabase/migrations/*.sql | Notification, swipe, match tablolarinda `created_at` index var ama TTL/retention policy yok | Eski mesajlar, swipe'lar, bildirimler sonsuza kadar saklanir - GDPR data minimization ihlali | Cron job ile eski verileri temizle | `DELETE FROM swipes WHERE created_at < NOW() - INTERVAL '2 years'` |
| SEC-012 | MEDIUM | 2 | 3 | high | 0.5h | RegistrationFlow.tsx:44 | `password: z.string().min(8, 'Password must be at least 8 characters')` | Minimum 8 karakter sifre politikasi var ama complexity (uppercase, number, special char) yok | Zod schema'ya regex ekleyin | `.regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)` |
| SEC-013 | MEDIUM | 3 | 3 | medium | 2h | LoginView.tsx:113-125 | `normalizeLoginError()` fonksiyonu hata mesajlarini gizliyor ama "rate" iceriyorsa farkli mesaj veriyor | Account enumeration riski dusuk ama bruteforce korumasinin client-side'a baglanmasi dogru degil | Supabase Auth rate limiting aktif - ek server-side kontrol gereksiz | N/A |
| SEC-014 | MEDIUM | 3 | 2 | medium | 2h | App.tsx:382 | `localStorage.getItem('vitalis_onboarding_seen')` | Onboarding durumu localStorage'da - XSS ile manipule edilebilir | Session-based state kullanin veya server-side flag | Profile tablosuna `onboarding_completed` kolonu ekle |
| SEC-015 | MEDIUM | 2 | 2 | low | 1h | stores/userStore.ts:2 | `USER_PROFILE as INITIAL_USER_PROFILE` | Zustand store'lari localStorage'a persist edildiginde hassas profil verisi client-side'da saklanir | Persist middleware kullaniliyorsa hassas alanlari exclude edin | `partialize: (state) => ({ ...state, profile: undefined })` |
| SEC-016 | LOW | 2 | 2 | high | 0.5h | AUTOMATION_AUDIT.json | `qs` paketi 6.7.0-6.14.1 araliginda DoS vulnerability (GHSA-w7fw-mjwx-w883) | Indirect dependency, DoS riski dusuk | `npm audit fix` calistirin | N/A |
| SEC-017 | LOW | 1 | 1 | high | 0.5h | src/lib/sentry.ts:11 | `sendDefaultPii: false` | RECON_REPORT'ta `sendDefaultPii: true` olarak belirtilmis ama kod incelemesinde FALSE goruldu - DUZELTILMIS | Bulgu kapatildi | N/A |
| SEC-018 | LOW | 2 | 2 | medium | 1h | .env.example:23 | `# SUPABASE_SERVICE_ROLE_KEY=` | Service role key sadece server-side'da kullaniliyor (webhooks-stripe), client-side'da kullanilmiyor - DOGRU | Bulgu kapatildi - best practice takip ediliyor | N/A |
| SEC-019 | MEDIUM | 3 | 3 | medium | 3h | create-checkout-session/index.ts:157 | `customer_email: user.email || undefined` | Stripe session'a email gonderiliyor - PCI-DSS uyumlulugu icin dogrudan email yerine customer ID kullanilmali | Stripe Customer objesi olusturun | `customer: await getOrCreateStripeCustomer(user.id)` |

---

## DETAYLI BULGULAR

### Detay SEC-001: Dev Bypass Authentication

**Dosya:** `/App.tsx:1057-1071`

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

**Exploit Senaryosu:**
1. Vite production build'de `import.meta.env.DEV` normalde `false` olur
2. Ancak build configuration hatasi, environment injection, veya custom build script bu degeri true yapabilir
3. `LandingView.tsx:97-103`'te `onDevBypass` prop'u varsa button render edilir
4. Saldirgan butona tiklayarak verification olmadan uygulamaya erisir

**Risk:** Verification bypass = sahte profiller, medical professional olmayan kullanicilar

**Oneri:**
- Bu prop'u tamamen kaldirin veya
- Environment variable yerine feature flag servisi kullanin (LaunchDarkly, Unleash)
- IP whitelist ile sadece internal network'ten erisime izin verin

---

### Detay SEC-002: PII Leakage to Third-Party AI

**Dosya:** `/supabase/functions/generate-icebreaker/index.ts:25-27`

```typescript
const prompt = `Create a short, professional but playful icebreaker for a medical dating app.\nMy profile: ${JSON.stringify(
  myProfile,
)}\nTheir profile: ${JSON.stringify(matchProfile)}\nReturn one sentence.`;
```

**Gonderilen Veriler:**
- Full name
- Age
- Medical role
- Specialty/sub-specialty
- Hospital/institution
- Bio
- Location
- Photos URLs
- Interests
- Personality tags

**Etki:**
- Google Gemini API'a tam profil verisi gonderiliyor
- Bu veri Google'in data retention politikasina tabi
- HIPAA Business Associate Agreement (BAA) olmadan saglık profesyoneli verisi paylaşılıyor
- GDPR Article 44-49 - Third country transfer gereksinimleri ihlal edilebilir

**Oneri:**
```typescript
// Sadece gerekli minimal veriyi gonderin
const safeProfile = {
  role: myProfile.role,
  specialty: myProfile.specialty,
  interestCount: myProfile.interests?.length || 0,
  // Isim, yas, hastane gibi PII gondermeyın
};
```

---

### Detay SEC-005: RLS Policy Discovery Problemi

**Dosya:** `/supabase/migrations/20260209_init.sql:254-257`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

**Problem:**
Sadece `auth.uid() = id` kontrolu var. Bu demek ki:
- Kullanici sadece kendi profilini gorebilir
- Discovery/swipe ozelliginde baska profilleri goremez
- Bu da uygulamanin calismasi icin ya:
  1. RLS bypass edilmis (service role key client'ta)
  2. Farkli bir mekanizma kullaniliyor
  3. Mock data kullaniliyor (constants.ts'de MOCK_PROFILES var)

**Mevcut Durum Analizi:**
`constants.ts` dosyasinda `MOCK_PROFILES` array'i var ve App.tsx'te bu kullaniliyor:
```typescript
const visibleProfiles = useMemo(() => {
    let filtered = MOCK_PROFILES.filter(profile => { ... });
```

Bu demek ki production'da gercek kullanici profilleri discovery'de gorunmuyor, sadece mock data gosteriliyor.

**Oneri:**
Discovery icin public_profile view olusturun:
```sql
CREATE VIEW public_profiles AS
SELECT id, name, age, role, specialty, location_city,
       (SELECT url FROM profile_photos WHERE profile_id = profiles.id AND is_primary = true LIMIT 1) as photo
FROM profiles
WHERE verification_status = 'VERIFIED' AND is_frozen = false;

GRANT SELECT ON public_profiles TO authenticated;
```

---

### Detay SEC-006: Verification Document Storage Security

**Dosya:** `/services/verificationService.ts:114-136`

```typescript
const VERIFICATION_DOC_BUCKET = 'verification-documents';

export const uploadVerificationDocument = async (
  userId: string,
  file: File,
): Promise<{ documentPath: string | null; error: Error | null }> => {
  // Client-side validation only
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) { ... }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) { ... }

  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(VERIFICATION_DOC_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
```

**Sorunlar:**
1. **Client-side MIME validation:** `file.type` manipule edilebilir, server-side magic bytes kontrolu yok
2. **Bucket ACL belirsiz:** Supabase Storage bucket'inin public/private durumu migration'larda tanimlanmamis
3. **Path predictability:** `${userId}/${Date.now()}-${filename}` pattern'i tahmin edilebilir
4. **Malware taramasi yok:** PDF/image exploit'leri yuklenebilir
5. **Document URL storage:** `verification_requests.document_url` TEXT field - full URL saklaniyorsa leak riski

**Oneri:**
```sql
-- Supabase Dashboard veya migration ile:
-- Storage > verification-documents > Policies
-- INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
-- SELECT: (auth.role() = 'service_role') -- Sadece admin okuyabilir
-- UPDATE: false
-- DELETE: false
```

---

## OWASP TOP 10 COVERAGE

### 1. Injection
| Check | Status | Notes |
|-------|--------|-------|
| SQL Injection | SAFE | Supabase client uses parameterized queries |
| NoSQL Injection | N/A | PostgreSQL only |
| XSS | SAFE | React's JSX escaping prevents XSS by default |
| Command Injection | N/A | No shell commands executed |
| Regex DoS | FIXED | `escapeRegExp()` function implemented (ChatView.tsx:58) |

### 2. Broken Authentication
| Check | Status | Notes |
|-------|--------|-------|
| Dev Bypass | CRITICAL | SEC-001 - import.meta.env.DEV guard may fail |
| Password Policy | MEDIUM | SEC-012 - Only length check, no complexity |
| Session Management | SAFE | Supabase Auth handles JWT properly |
| Brute Force | SAFE | Supabase has built-in rate limiting |
| Account Enumeration | LOW | Error messages normalized (LoginView.tsx:113) |

### 3. Sensitive Data Exposure
| Check | Status | Notes |
|-------|--------|-------|
| PII to Third-Party | CRITICAL | SEC-002 - Full profile to Gemini AI |
| Analytics Tracking | MEDIUM | SEC-009 - User ID sent to Mixpanel/PostHog |
| Sentry PII | FIXED | sendDefaultPii: false (SEC-017) |
| HTTPS Enforcement | SAFE | Supabase enforces TLS |
| Verification Docs | HIGH | SEC-006 - Bucket ACL uncertain |

### 4. XML External Entities
| Check | Status | Notes |
|-------|--------|-------|
| XXE | N/A | No XML parsing in codebase |

### 5. Broken Access Control
| Check | Status | Notes |
|-------|--------|-------|
| RLS Policies | GOOD | Comprehensive RLS in 20260211_security_hardening.sql |
| IDOR | SAFE | All queries use auth.uid() |
| Privilege Escalation | SAFE | No admin endpoints exposed |
| Service Role Key | SAFE | Only used in webhook handler (server-side) |

### 6. Security Misconfiguration
| Check | Status | Notes |
|-------|--------|-------|
| CORS - Checkout | GOOD | Origin whitelist implemented |
| CORS - Icebreaker | HIGH | SEC-003 - Wildcard CORS |
| CORS - Webhook | HIGH | SEC-004 - Wildcard CORS (unnecessary) |
| Default Credentials | SAFE | No hardcoded credentials found |
| Verbose Errors | SAFE | Generic error messages returned |

### 7. Cross-Site Scripting (XSS)
| Check | Status | Notes |
|-------|--------|-------|
| Stored XSS | SAFE | No dangerouslySetInnerHTML usage found |
| Reflected XSS | SAFE | No URL params rendered unsafely |
| DOM-based XSS | SAFE | React's virtual DOM prevents this |

### 8. Insecure Deserialization
| Check | Status | Notes |
|-------|--------|-------|
| Object Deserialization | N/A | No untrusted deserialization |

### 9. Using Components with Known Vulnerabilities
| Check | Status | Notes |
|-------|--------|-------|
| npm audit | LOW | SEC-016 - qs package DoS vulnerability |
| Outdated Packages | SAFE | Recent versions in package.json |

### 10. Insufficient Logging & Monitoring
| Check | Status | Notes |
|-------|--------|-------|
| Security Events | MISSING | No security event logging (failed logins, blocks, reports) |
| Audit Trail | PARTIAL | created_at timestamps exist but no audit log table |
| SIEM Integration | MISSING | No log forwarding to security monitoring |

---

## COMPLIANCE GAPS

### GDPR
- [ ] **Article 17 (Right to Erasure):** `account_deletion_requests` table exists but processing unclear
- [ ] **Article 20 (Data Portability):** `data_export_requests` table exists but no export function
- [ ] **Article 35 (DPIA):** No Data Protection Impact Assessment documented
- [x] **Article 7 (Consent):** Analytics consent implemented (analytics.ts)

### HIPAA (Advisory - Not Audited for Compliance)
- [ ] **BAA Required:** No Business Associate Agreement with Google (Gemini), Stripe, analytics providers
- [ ] **Audit Logs:** No access logging for PHI
- [ ] **Encryption at Rest:** Supabase encryption status not verified

---

## ONCELIK SIRASI (Remediation Roadmap)

### Immediate (Before Launch)
1. **SEC-001:** Remove dev bypass or add server-side feature flag
2. **SEC-002:** Implement profile data anonymization for AI
3. **SEC-006:** Configure verification-documents bucket as private, implement signed URLs

### High Priority (Week 1)
4. **SEC-003:** Implement origin whitelist for generate-icebreaker
5. **SEC-004:** Remove CORS headers from webhook endpoint
6. **SEC-007:** Rate limit verified_domains endpoint

### Medium Priority (Week 2-3)
7. **SEC-012:** Strengthen password policy
8. **SEC-011:** Implement data retention policies
9. **SEC-019:** Use Stripe Customer objects instead of raw email

### Low Priority (Backlog)
10. **SEC-016:** Run `npm audit fix`
11. Implement security event logging
12. Add SIEM integration

---

## APPENDIX: Files Reviewed

### Core Security Files
- `/App.tsx` (1415 lines)
- `/components/RegistrationFlow.tsx` (687 lines)
- `/components/ChatView.tsx` (1185 lines)
- `/components/LoginView.tsx` (126 lines)
- `/components/LandingView.tsx` (115 lines)

### Services
- `/services/authService.ts`
- `/services/verificationService.ts`
- `/services/profileService.ts`
- `/services/safetyService.ts`

### Infrastructure
- `/src/lib/supabase.ts`
- `/src/lib/sentry.ts`
- `/src/lib/analytics.ts`
- `/supabase/functions/*/index.ts` (3 functions)
- `/supabase/migrations/*.sql` (3 migrations)

### Stores
- `/stores/authStore.ts`
- `/stores/userStore.ts`

### Configuration
- `/.env.example`
- `/.gitignore`
- `/AUTOMATION_AUDIT.json`

---

**Report Generated:** 2026-02-15
**Next Audit Recommended:** Before production launch, then quarterly
