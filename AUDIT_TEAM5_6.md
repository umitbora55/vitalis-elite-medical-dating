# VITALIS -- AUDIT TEAM 5+6: DATABASE & MIGRATIONS + AUTH FLOW

**Tarih:** 2026-02-28
**Denetci:** Backend Audit Agent (Takim 5: Database & Migrations + Takim 6: Auth Flow)
**Kapsam:** 33 migration dosyasi + auth servisleri + auth state management
**Onceki Rapor Referansi:** BACKEND_AUDIT_REPORT.md (2026-02-15, 18 bulgu)

---

### OZET
- Toplam bulgu: **22** (CRITICAL: **3**, HIGH: **6**, MEDIUM: **8**, LOW: **5**)
- En yuksek riskli 3 bulgu: **BE-T56-001**, **BE-T56-002**, **BE-T56-003**
- No finding moduller: `stores/authStore.ts`, `src/lib/supabase.ts`, Stripe webhook idempotency, account deletion flow, storage bucket policies

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-T56-001 | CRITICAL | 5 | 5 | high | 2h | 20260228_security_default_on.sql:331-341 | Bkz: Detay BE-T56-001 | Matched kullanici gercek GPS koordinatlarini dogrudan okur; konum obfuscation tamamen bypass edilir | RLS SELECT policy'sinde view veya column-level security kullanin | Bkz: Detay BE-T56-001 |
| BE-T56-002 | CRITICAL | 5 | 4 | high | 4h | 20260228_date_flow_system.sql:446, 20260228_security_default_on.sql:338, 20260228_ethical_monetization.sql:161 | `m.user1_id / m.user2_id` -- gercek kolon adlari `profile_1_id / profile_2_id` | 3 migration'da 9 satir hatali kolon referansi; RLS policy'leri hep FALSE doner, erisim kirilir | Tum `user1_id/user2_id` referanslarini `profile_1_id/profile_2_id` olarak duzelt | Bkz: Detay BE-T56-002 |
| BE-T56-003 | CRITICAL | 5 | 4 | high | 2h | 20260228_security_default_on.sql:270 | `FROM reports WHERE reported_user_id = p_user_id` -- gercek kolon `reported_id` | Risk skoru hesaplama fonksiyonu runtime hata verir; high-risk kullanicilar tespit edilemez | `reported_user_id` -> `reported_id` olarak duzelt | Bkz: Detay BE-T56-003 |
| BE-T56-004 | HIGH | 4 | 4 | high | 4h | 20260228_daily_slate_system.sql:8 | `ALTER TABLE daily_picks ADD COLUMN ...` -- daily_picks CREATE'i baska migration'da | daily_picks yoksa migration hata verir; tum slate sistemi devre disi | daily_picks CREATE'ini bu migration'a da ekle veya bagimlilik dokumante et | Bkz: Detay BE-T56-004 |
| BE-T56-005 | HIGH | 4 | 3 | high | 3h | 20260209_init.sql:91-104 | `verifications` tablosunda RLS ENABLE yok | Authenticated kullanici diger kullanicilarin dogrulama kayitlarini (belge URL dahil) gorebilir | RLS enable + uygun policy ekle | `ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;` |
| BE-T56-006 | HIGH | 4 | 4 | high | 1h | 20260228_date_flow_system.sql:55 | `UNIQUE (match_id, inviter_id, status) DEFERRABLE` | Declined/expired sonrasi sinirsiz davet gonderme; harassment vector | Partial unique index: `WHERE status = 'pending'` | `CREATE UNIQUE INDEX ON date_invitations (match_id, inviter_id) WHERE status = 'pending';` |
| BE-T56-007 | HIGH | 4 | 3 | high | 2h | 20260228_daily_slate_system.sql:96-168 | `record_slate_interaction`: p_slate_id parametresinde sahiplik kontrolu yok | IDOR: Baska kullanicinin slate counter'larini manipule etme | Slate sahiplik kontrolu ekle | Bkz: Detay BE-T56-007 |
| BE-T56-008 | HIGH | 4 | 3 | high | 2h | App.tsx:395-399 | `signUpWithEmail(email, password, {...})` -- Zod min 8 char ama Supabase default 6 | API dogrudan cagrilabilir; Supabase server-side 6 char kabul eder | Supabase Dashboard: min password = 12 + complexity | Supabase Auth config degistir |
| BE-T56-009 | HIGH | 5 | 3 | medium | 3h | 20260228_ethical_monetization.sql:303-378 | `activate_trip_mode(p_user_id, ...)` RPC: auth.uid() kontrolu yok | Baska kullanici adina trip mode aktive etme (IDOR) | `p_user_id = auth.uid()` assertion ekle | `PERFORM public.assert_self_or_service(p_user_id);` |
| BE-T56-010 | MEDIUM | 3 | 3 | high | 4h | migrations/ dizini | 2 farkli numaralandirma: tarih bazli (20260209_*) ve sira bazli (001_*) | Migration calisma sirasi belirsizligi; bagimlilik sorunlari | Tek numaralandirma sistemine gecin | Tum dosyalari tarih bazli yapin |
| BE-T56-011 | MEDIUM | 3 | 3 | high | 2h | 20260216 + 20260217 | Ayni kolonlar farkli VARCHAR boyutlariyla tekrarlaniyor | `looking_for VARCHAR(20)` vs `VARCHAR(50)` -- hangisi gecerli belirsiz | Duplicate migration'lari birlestirin | Tutarli boyutlar kullanin |
| BE-T56-012 | MEDIUM | 3 | 4 | high | 1h | 20260322_seed_invite_code.sql:2 | `INSERT INTO invite_codes VALUES ('VITALIS-VIP', 999, true)` | Production'da herkes bu kodla kayit olabilir; davet sistemi bypass | Seed'i production'dan cikarin | Environment check ekleyin |
| BE-T56-013 | MEDIUM | 3 | 3 | high | 2h | 20260228_date_flow_system.sql:200-236 | `send_date_invitation`: match katilimci kontrolu yok | Ait olmadigi match icin davet gonderebilir | Match membership dogrulama ekle | Bkz: Detay BE-T56-013 |
| BE-T56-014 | MEDIUM | 3 | 3 | medium | 2h | 20260228_date_flow_system.sql:308-354 | `record_date_feedback`: reviewer plan'a ait mi kontrolu yok | Sahte review enjeksiyonu | Plan katilimci kontrolu ekle | `IF NOT EXISTS(... dp.proposer_id = v_user_id OR dp.responder_id = v_user_id) THEN RAISE;` |
| BE-T56-015 | MEDIUM | 3 | 3 | high | 1h | 20260228_security_default_on.sql:229-252 | `log_message_moderation(p_sender_id, ...)`: sender_id spoofing | Masumlar flag'lenebilir | `p_sender_id` yerine `auth.uid()` kullanin | `IF p_sender_id != auth.uid() AND NOT auth_has_moderation_access() THEN RAISE;` |
| BE-T56-016 | MEDIUM | 3 | 2 | high | 1h | 20260228_date_flow_system.sql:291-306 | `expire_stale_invitations`: herhangi bir authenticated user cagirabilir | Cron fonksiyonu public erisilebilir; DoS riski | `REVOKE FROM authenticated; GRANT TO service_role;` | `REVOKE EXECUTE ON FUNCTION expire_stale_invitations() FROM authenticated;` |
| BE-T56-017 | MEDIUM | 3 | 2 | high | 1h | 20260228_ethical_monetization.sql:461-466 | `submit_monetization_feedback(p_user_id, ...)`: auth kontrolu yok | Baska biri adina feedback gonderme | `auth.uid()` dogrudan kullan | `INSERT INTO ... VALUES (auth.uid(), ...);` |
| BE-T56-018 | LOW | 2 | 2 | high | 1h | 20260209_init.sql:6-14 | `users` tablosu olusturuluyor ama hicbir yerde kullanilmiyor | Sema karisikligi; fix migration mevcut ama siralama garantisi yok | Migration sirasini dogrulayin | N/A (20260215 fix mevcut) |
| BE-T56-019 | LOW | 2 | 2 | medium | 2h | matches tablosu vs diger migration'lar | `profile_1_id/profile_2_id` vs `user1_id/user2_id` tutarsizligi | Farkli migration'larda farkli kolon adlari | Tutarli isimlendirme kullanin | BE-T56-002 ile birlikte cozulebilir |
| BE-T56-020 | LOW | 2 | 3 | high | 1h | App.tsx:181-191 | `onAuthStateChange` SIGNED_IN: dogrudan `setAuthStep('APP')` -- verification kontrolu yok | Pending/rejected kullanici APP state'ine duser | Verification status kontrolu ekle | Bkz: Detay BE-T56-020 |
| BE-T56-021 | LOW | 1 | 2 | high | 1h | services/authService.ts:40-47 | `signOut()`: localStorage.clear() Supabase signOut'tan ONCE | Race condition: minimal etki | signOut sonrasina tasiyin | `const r = await supabase.auth.signOut(); localStorage.clear(); return r;` |
| BE-T56-022 | LOW | 2 | 2 | medium | 1h | components/LoginView.tsx:297-308 | `normalizeLoginError`: string matching on error messages | Mesaj degisirse handle edilemez; UX sorunu | Error code/status uzerinden matching yapin | `if (error.status === 400) return '...';` |

---

## DETAYLI KANITLAR

### Detay BE-T56-001: location_privacy RLS -- Gercek Koordinatlar Sizintisi

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260228_security_default_on.sql`
**Satirlar:** 331-341

```sql
CREATE POLICY "Matched users read display location"
  ON location_privacy FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM matches m WHERE m.is_active = true
        AND ((m.user1_id = auth.uid() AND m.user2_id = location_privacy.user_id)
          OR (m.user2_id = auth.uid() AND m.user1_id = location_privacy.user_id))
    )
  );
```

**Sorun (iki katli):**
1. RLS satir bazli calisir, kolon bazli degil. Policy TRUE dondugunde matched kullanici `real_latitude`, `real_longitude`, `offset_seed` dahil TUM kolonlari okuyabilir. 500-1500m obfuscation tamamen devre disi kalir.
2. `user1_id/user2_id` kolon adi hatasi nedeniyle policy su an calismaz (BE-T56-002). Ancak kolon adi duzeltildiginde gercek koordinat sizintisi baslar.

**Onerilen Duzeltme:** Public erisim icin bir VIEW olusturun:

```sql
CREATE VIEW location_privacy_display AS
SELECT user_id, display_latitude, display_longitude, display_radius_m, city, district, privacy_level
FROM location_privacy;
-- RLS'yi view uzerinde uygula; gercek koordinatlar sadece own-row ile erisilir
```

---

### Detay BE-T56-002: matches Kolon Adi Tutarsizligi

**Gercek kolon tanimlari (`20260209_init.sql:122-123`):**
```sql
profile_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
profile_2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
```

**Hatali referanslar:**

| Dosya | Satir | Kullanilan | Olmasi gereken |
|-------|-------|------------|----------------|
| `20260228_date_flow_system.sql` | 446-447 | `m.user1_id`, `m.user2_id` | `m.profile_1_id`, `m.profile_2_id` |
| `20260228_security_default_on.sql` | 338-339 | `m.user1_id`, `m.user2_id` | `m.profile_1_id`, `m.profile_2_id` |
| `20260228_ethical_monetization.sql` | 161-162 | `m.user1_id`, `m.user2_id` | `m.profile_1_id`, `m.profile_2_id` |
| `005_events_community.sql` | 252-256 | `m.user1_id`, `m.user2_id` | `m.profile_1_id`, `m.profile_2_id` |

**Etki:** PostgreSQL CREATE POLICY syntax'i subquery'deki kolon adini dogrulamaz (lazy evaluation). Runtime'da `user1_id` kolonu yoksa subquery bos doner -- policy her zaman FALSE uretir. Sonuc:
- Matched user availability goruntuleyemez
- Trip mode matched user goruntulemesi calismaz
- Location privacy matched-user policy calismaz

---

### Detay BE-T56-003: compute_profile_risk Hatali Kolon Adi

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260228_security_default_on.sql:270`

```sql
(SELECT COUNT(*) FROM reports WHERE reported_user_id = p_user_id AND status = 'pending'),
```

**Gercek reports tablosu (`20260209_init.sql:201-213`):**
```sql
CREATE TABLE IF NOT EXISTS reports (
    ...
    reported_id UUID REFERENCES profiles(id),  -- "reported_id", NOT "reported_user_id"
    ...
);
```

**Not:** `006_admin_panel.sql` icinde tanimlanan reports yapisi `reported_user_id` kullanir ama bu ayri bir CREATE TABLE olabilir veya ALTER ile eklenmis olabilir. Orijinal `20260209_init.sql` tablosu kesinlikle `reported_id` kullaniyor. Migration calisma sirasina gore hangi tablo yapisi gecerli belirsiz -- bu da BE-T56-010 (migration siralama sorunu) ile iliskili.

---

### Detay BE-T56-004: daily_picks Tablosu Bagimlilik Sorunu

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260228_daily_slate_system.sql:8`

```sql
ALTER TABLE daily_picks
  ADD COLUMN IF NOT EXISTS slate_category TEXT DEFAULT 'high_compatibility' ...
```

`daily_picks` tablosu `002_user_journey.sql` icinde tanimlanmis. Supabase CLI migration siralama mantigi:
- Alfabetik: `001_*` < `002_*` < ... < `008_*` < `20260209_*` < ... < `20260228_*`
- Bu durumda `002_user_journey.sql` ONCE calisir -- siralama dogru.

Ancak risk: eger `002_user_journey.sql` atlanir/basarisiz olursa veya migration rollback yapilirsa `20260228_daily_slate_system.sql` hata verir. daily_picks tablosu 20260228 migration'larina explicit bagimli degil.

---

### Detay BE-T56-007: record_slate_interaction IDOR

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260228_daily_slate_system.sql:126-132`

```sql
-- 2. Update slate container counters
IF p_slate_id IS NOT NULL THEN
  UPDATE user_daily_slates
  SET
    seen_count   = seen_count   + CASE WHEN p_action IN ('seen','liked','passed') THEN 1 ELSE 0 END,
    liked_count  = liked_count  + CASE WHEN p_action = 'liked'  THEN 1 ELSE 0 END,
    passed_count = passed_count + CASE WHEN p_action = 'passed' THEN 1 ELSE 0 END
  WHERE id = p_slate_id;  -- Sahiplik kontrolu YOK
END IF;
```

RLS `user_daily_slates` tablosunda `user_id = auth.uid()` kontrolu var, ancak bu fonksiyon `SECURITY DEFINER` olarak calisiyor, yani RLS bypass ediliyor. Saldirgan baska birinin `slate_id`'sini bilerek counter'larini sifirdan artirabilir.

**Onerilen Duzeltme:**
```sql
UPDATE user_daily_slates
SET ...
WHERE id = p_slate_id AND user_id = v_user_id;  -- Sahiplik kontrolu eklendi
```

---

### Detay BE-T56-013: send_date_invitation Match Membership Kontrolu Yok

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260228_date_flow_system.sql:210-235`

```sql
CREATE OR REPLACE FUNCTION send_date_invitation(
  p_match_id UUID, p_invitee_id UUID, p_preferred_type TEXT, ...
)
...
  v_inviter_id UUID := auth.uid();
...
  -- Match katilimci kontrolu YAPILMIYOR
  INSERT INTO date_invitations
    (match_id, inviter_id, invitee_id, ...)
  VALUES (p_match_id, v_inviter_id, p_invitee_id, ...);
```

**Onerilen Duzeltme:**
```sql
-- Match membership kontrolu
IF NOT EXISTS(
  SELECT 1 FROM matches
  WHERE id = p_match_id
    AND is_active = TRUE
    AND (profile_1_id = v_inviter_id OR profile_2_id = v_inviter_id)
    AND (profile_1_id = p_invitee_id OR profile_2_id = p_invitee_id)
) THEN
  RAISE EXCEPTION 'NOT_IN_MATCH';
END IF;
```

---

### Detay BE-T56-020: Auth State Machine Verification Bypass

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx:181-191`

```typescript
const { data: { subscription } } = onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        setAuthStep('APP');  // Dogrudan APP'e gidiyor -- verification yok
        void hydrateProfile();
    } else if (event === 'SIGNED_OUT') {
        setAuthStep('LANDING');
    }
});
```

**Sorun:** SIGNED_IN event'inde verification_status kontrolu yok. Bu callback su durumlarda tetiklenir:
- OAuth redirect sonrasi
- Sayfa yenilenme (token refresh) sonrasi
- Tab switch sonrasi session recovery

LoginView.tsx icinde profil + user_status kontrolu mevcut (satir 50-58), ama bu sadece email/password form login icin calisiyor.

**Onerilen Duzeltme:**
```typescript
if (event === 'SIGNED_IN' && session) {
    const { data } = await getMyProfile();
    if (data) {
        const mapped = mapRowToProfile(data, USER_PROFILE);
        setUserProfile(mapped);
        const vs = mapped.verificationStatus || 'UNVERIFIED';
        if (vs === 'PENDING_VERIFICATION' || vs === 'PENDING' || vs === 'UNDER_REVIEW') {
            setAuthStep('PENDING_VERIFICATION');
        } else if (vs === 'REJECTED') {
            setAuthStep('REGISTRATION');
        } else {
            setAuthStep('APP');
        }
    } else {
        setAuthStep('REGISTRATION');
    }
}
```

---

## AUTH FLOW DETAYLI ANALIZ

### Kayit Akisi (RegistrationFlow.tsx)

| Kontrol | Durum | Detay |
|---------|-------|-------|
| Email validation | OK | Zod `z.string().email()` |
| Password strength | SORUNLU (BE-T56-008) | Client: min 8 char; Supabase default: 6 char |
| Duplicate email check | OK | Supabase Auth signUp hata dondurur |
| Personal email detection | OK | `PERSONAL_EMAIL_DOMAINS` set ile kontrol |
| Device fingerprint | OK | `deviceAbuseService` entegrasyonu mevcut |
| Document size/type | OK | 10MB limit, JPEG/PNG/WEBP/PDF |
| Liveness check | OK | 4 challenge, skor >= 0.75 |
| Name-email match | OK | Levenshtein mesafesi kontrolu |

### Login Akisi (LoginView.tsx)

| Kontrol | Durum | Detay |
|---------|-------|-------|
| Error bilgi sizintisi | OK | `normalizeLoginError` generic mesajlar dondurur |
| Rate limiting | OK | Supabase Auth built-in |
| OAuth redirect | OK | `getAuthRedirectUrl()` origin-based |
| Verification check | KISMI | Login form'da var, OAuth/refresh'te yok (BE-T56-020) |

### Session Yonetimi

| Kontrol | Durum | Detay |
|---------|-------|-------|
| Token refresh | OK | Supabase JS client otomatik |
| Logout cleanup | OK (minör) | localStorage+sessionStorage temizlenir (siralama: BE-T56-021) |
| State persistence | OK | authStore persist etmiyor (dogru tasarim) |
| matchStore persist | UYARI | localStorage persist middleware -- hassas veri yoksa OK |

### Route Protection

| Kontrol | Durum | Detay |
|---------|-------|-------|
| Client-side guard | OK | `authStep` state machine + `isActionRestricted()` |
| Server-side guard | OK | RLS + SECURITY DEFINER fonksiyonlar |
| Verification restriction | OK | `restrictedActionSet` ile swipe/chat/premium kisitlamasi |
| Admin route protection | OK | `AdminSecurityGate` + IP/device fingerprint whitelist |

---

## MIGRATION SCHEMA BUTUNLUGU

### Eksik Tablo Kontrolleri

| Servis Dosyasi | Beklenen Tablo | Migration'da Var mi? |
|----------------|---------------|---------------------|
| slateService.ts | `daily_picks` | Evet (002_user_journey.sql) |
| slateService.ts | `user_daily_slates` | Evet (20260228_daily_slate) |
| dateInvitationService.ts | `date_invitations` | Evet (20260228_date_flow) |
| dateSafetyService.ts | `trusted_contacts` | Evet (20260228_date_flow) |
| dateSafetyService.ts | `safety_alerts` | Evet (20260228_date_flow) |
| explanationService.ts | `explanation_templates` | Evet (20260228_explanation) |
| healthcareVerificationService.ts | `healthcare_domains` | Evet (20260228_liveness) |
| healthcareVerificationService.ts | `liveness_checks` | Evet (20260228_liveness) |
| healthcareVerificationService.ts | `face_embeddings` | Evet (20260228_liveness) |
| locationPrivacyService.ts | `location_privacy` | Evet (20260228_security_default_on) |
| contentModerationService.ts | `message_moderation_log` | Evet (20260228_security_default_on) |
| profileRiskService.ts | `profile_risk_scores` | Evet (20260228_security_default_on) |
| aiConsentService.ts | `ai_consent` | Evet (20260228_privacy_first_ai) |
| aiConsentService.ts | `ai_model_registry` | Evet (20260228_privacy_first_ai) |

### RLS Kapsam Kontrolu

| Tablo | RLS Enabled | SELECT | INSERT | UPDATE | DELETE | Durum |
|-------|-------------|--------|--------|--------|--------|-------|
| profiles | Evet | Evet (own+discover+admin) | Evet | Evet | Eksik (ama hard delete profile icin fonksiyon var) | OK |
| messages | Evet | Evet (match participants) | Evet | Eksik | Eksik | Orta risk |
| matches | Evet | Evet | Evet | Eksik | Eksik | Orta risk |
| swipes | Evet | Evet | Evet | Eksik | Eksik | OK (update/delete gerekmiyor) |
| blocks | Evet | Evet | Evet | Eksik | Evet | OK |
| reports | Evet | Evet | Evet | Eksik | Eksik | OK (update admin-only) |
| notifications | Evet | Evet | Eksik | Evet | Eksik | OK (insert server-side) |
| subscriptions | Evet | Evet | Eksik | Eksik | Eksik | OK (webhook-only write) |
| **verifications** | **HAYIR** | **Acik** | **Acik** | **Acik** | **Acik** | **BE-T56-005** |
| verified_work_emails | Evet | Evet | Evet | Eksik | Eksik | OK |
| verification_requests | Evet | Evet (own+admin) | Evet | Evet (admin) | Eksik | OK |
| verification_documents | Evet | Evet (own+admin) | Evet | Evet (admin) | Evet (admin) | OK |
| date_invitations | Evet | Evet | Evet | Eksik (guncelleme RPC ile) | Eksik | OK |
| trusted_contacts | Evet | Evet | Evet (via FOR ALL) | Evet | Evet | OK |
| safety_alerts | Evet | Evet (own+admin) | Evet | Eksik | Eksik | OK |
| date_feedback | Evet | Evet (own) | Evet (via FOR ALL) | Evet | Evet | OK |
| face_embeddings | Evet | Admin-only (kullanici okuyamaz) | Evet (own) | Admin-only | Admin-only | OK (KVKK uyumlu) |
| fraud_signals | Evet | Admin-only | Admin-only | Admin-only | Admin-only | OK |
| user_risk_scores | Evet | Admin-only | Admin-only | Admin-only | Admin-only | OK |
| location_privacy | Evet | Own + matched (sorunlu: BE-T56-001) | Evet | Evet | Eksik | SORUNLU |
| profile_risk_scores | Evet | Herkese acik (risk_level public) | Eksik | Eksik | Eksik | UYARI (skor public) |

### CASCADE Delete/Update Kontrol

| Tablo | ON DELETE | Dogru mu? |
|-------|----------|-----------|
| profiles | CASCADE (auth.users'tan) | Evet |
| profile_photos | CASCADE (profiles'tan) | Evet |
| profile_interests | CASCADE (profiles'tan) | Evet |
| messages.sender_id | SET NULL olabilir mi? | Hayir, suan sadece REFERENCES (no action) -- soft delete fonksiyonu bunu handle ediyor |
| matches | CASCADE (profiles'tan) | Evet |
| date_invitations | CASCADE (matches + profiles) | Evet |
| face_embeddings | CASCADE (profiles'tan) | Evet |
| user_risk_scores | CASCADE (profiles'tan) | Evet |

---

## MODUL BAZLI NO FINDING DURUMU

| Modul | Durum | Aciklama |
|-------|-------|----------|
| `stores/authStore.ts` | No finding | Minimal store, 3 property, guvenlik mantigi yok (dogru yaklasim) |
| `src/lib/supabase.ts` | No finding | Env validation + URL dogrulama mevcut, throw on missing |
| Stripe webhook idempotency | No finding | `stripe_webhook_events` tablosu + unique index (20260211) |
| Account deletion | No finding | `delete_user_data` SECURITY DEFINER + auth/service_role kontrolu |
| Storage buckets | No finding | 3 private bucket (verification-documents, verification-docs, liveness-videos) dogru RLS ile |
| Verification status protection | No finding | Trigger `check_profile_update_allowed` VERIFIED+premium_tier degisikliklerini engeller |

---

## ONCELIK SIRASI

### P0 -- LAUNCH BLOCKER (Hemen duzelt)
- **BE-T56-001** (CRITICAL): location_privacy gercek koordinat sizintisi
- **BE-T56-002** (CRITICAL): matches kolon adi hatasi (user1_id vs profile_1_id)
- **BE-T56-003** (CRITICAL): compute_profile_risk hatali kolon adi

### P1 -- YUKSEK ONCELIK (1 hafta icinde)
- **BE-T56-005** (HIGH): verifications tablosu RLS eksik
- **BE-T56-006** (HIGH): date_invitations sinirsiz davet sorunu
- **BE-T56-007** (HIGH): record_slate_interaction IDOR
- **BE-T56-008** (HIGH): Supabase password policy yapilandirmasi
- **BE-T56-009** (HIGH): activate_trip_mode IDOR
- **BE-T56-013** (MEDIUM): send_date_invitation match kontrolu eksik

### P2 -- ORTA ONCELIK (2 hafta icinde)
- **BE-T56-014**: record_date_feedback katilimci kontrolu
- **BE-T56-015**: log_message_moderation sender_id spoofing
- **BE-T56-016**: expire_stale_invitations access kontrolu
- **BE-T56-017**: submit_monetization_feedback IDOR
- **BE-T56-012**: Production seed davet kodu

### P3 -- DUSUK ONCELIK (Sprint planlama)
- **BE-T56-010**: Migration numaralandirma birlestirilmesi
- **BE-T56-011**: Duplicate migration kolon tutarsizligi
- **BE-T56-020**: Auth state machine verification bypass
- **BE-T56-021**: signOut siralama sorunu
- **BE-T56-022**: Login error handling iyilestirmesi

---

*Rapor sonu. Tum dosya yollari mutlak path olarak verilmistir.*
*Onceki rapor (BACKEND_AUDIT_REPORT.md, 2026-02-15) ile cakisan bulgular: BE-003 -> BE-T56-002/artik duzeltilmis (discovery RLS), BE-004 -> BE-T56-018 (users tablosu).*
