# VITALIS - BACKEND AUDIT REPORT (Consolidated v4)

**Generated:** 2026-02-28
**Auditor:** Backend Security Auditor (Claude Opus 4.6)
**Codebase:** vitalis---elite-medical-dating (branch: HEAD, 972 uncommitted changes)
**Scope:** Database, API (Edge Functions), Auth, Validation, Performance, Integrations, Medical Domain
**Previous audits merged:** v1 (2026-02-15, 18 findings) + Team 5+6 (2026-02-28, 22 findings) + v3 updates

---

### OZET
- Toplam bulgu: **31** (CRITICAL: **5**, HIGH: **7**, MEDIUM: **13**, LOW: **6**)
- En yuksek riskli 3 bulgu: **BE-001**, **BE-002**, **BE-029**
- No finding moduller: `stores/authStore.ts`, `src/lib/supabase.ts`, `src/lib/sentry.ts`, `src/lib/analytics.ts`, `services/geminiService.ts` (client-side), Stripe webhook idempotency, storage bucket policies, `services/explanationService.ts`, `services/aiConsentService.ts`, `services/healthcareVerificationService.ts`
- Onceki audit'ten duzeltilmis bulgular: 13 bulgu (Bkz: DUZELTILMIS BULGULAR tablosu)

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-001 | CRITICAL | 5 | 5 | high | 2h | 20260228_security_default_on.sql:331-341 | `SELECT 1 FROM matches m WHERE m.user1_id = auth.uid()` -- olmayan kolon | Matched kullanici gercek GPS koordinatlarini (real_latitude, real_longitude, offset_seed) okuyabilir; konum obfuscation bypass | RLS policy icin VIEW olusturun; kolon adlarini duzelt | Bkz: Detay BE-001 |
| BE-002 | CRITICAL | 5 | 5 | high | 4h | 20260228_date_flow_system.sql:446, 20260228_security_default_on.sql:338, 20260228_ethical_monetization.sql:161 | `m.user1_id / m.user2_id` -- gercek kolonlar `profile_1_id / profile_2_id` | 4 dosyada 9+ satir hatali kolon; tum matched-user RLS policy'leri sessizce FALSE doner | `user1_id/user2_id` -> `profile_1_id/profile_2_id` | Bkz: Detay BE-002 |
| BE-003 | CRITICAL | 5 | 4 | high | 2h | 20260228_security_default_on.sql:270 | `FROM reports WHERE reported_user_id = p_user_id` -- gercek kolon `reported_id` | compute_profile_risk runtime hata; high-risk kullanicilar tespit edilemez | `reported_user_id` -> `reported_id` | Bkz: Detay BE-003 |
| BE-004 | CRITICAL | 5 | 4 | high | 2h | _shared/admin.ts:10 | `'Access-Control-Allow-Origin': '*'` admin Edge Function'larinda | Tum admin fonksiyonlari (verification-queue, decide-verification, audit-logs, settings) wildcard CORS | CORS whitelist uygulayin (checkout/icebreaker pattern'i gibi) | Bkz: Detay BE-004 |
| BE-029 | CRITICAL | 5 | 4 | high | 3h | services/blockAndReportService.ts:50-60 | `blockUser(blockerId, blockedId)` -- client-supplied blockerId | IDOR: Herhangi bir kullanici baska birinin adina blok/rapor olusturabilir; harassment vektoru | `blockerId` parametresini kaldir, `auth.uid()` kullan | Bkz: Detay BE-029 |
| BE-006 | HIGH | 4 | 3 | high | 3h | 20260209_init.sql:91-101 | `verifications` tablosunda `ENABLE ROW LEVEL SECURITY` yok | Tum authenticated kullanicilar diger kullanicilarin dogrulama kayitlarini (document_url dahil) gorebilir | RLS enable + uygun policy ekle | `ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;` |
| BE-007 | HIGH | 4 | 4 | high | 1h | 20260228_date_flow_system.sql:55 | `UNIQUE (match_id, inviter_id, status) DEFERRABLE` | Declined/expired sonrasi sinirsiz davet gonderme; harassment vektoru | Partial unique index: `WHERE status = 'pending'` | `CREATE UNIQUE INDEX ON date_invitations (match_id, inviter_id) WHERE status = 'pending';` |
| BE-008 | HIGH | 4 | 3 | high | 2h | 20260228_daily_slate_system.sql:126-132 | `UPDATE user_daily_slates ... WHERE id = p_slate_id;` SECURITY DEFINER, sahiplik yok | IDOR: Baska kullanicinin slate counter'larini manipule etme | `AND user_id = v_user_id` kosulu ekle | Bkz: Detay BE-008 |
| BE-009 | HIGH | 5 | 3 | medium | 3h | 20260228_ethical_monetization.sql:329-378 | `activate_trip_mode(p_user_id, ...)` -- auth.uid() kontrolu yok | Baska kullanici adina trip mode aktive etme (IDOR); konum bilgisi manipulasyonu | `IF p_user_id != auth.uid() THEN RAISE;` | `PERFORM public.assert_self_or_service(p_user_id);` |
| BE-010 | HIGH | 4 | 3 | high | 2h | App.tsx:181-183 | `if (event === 'SIGNED_IN') { setAuthStep('APP'); }` -- verification kontrolu yok | OAuth/refresh sonrasi pending/rejected kullanici APP state'ine duser; verification bypass | Verification status kontrolu ekle | Bkz: Detay BE-010 |
| BE-011 | HIGH | 4 | 3 | high | 2h | 20260228_date_flow_system.sql:210-235 | `send_date_invitation(p_match_id, p_invitee_id, ...)` -- match membership kontrolu yok | Ait olmadigi match icin davet gonderebilir | Match membership dogrulama ekle | Bkz: Detay BE-011 |
| BE-030 | HIGH | 4 | 3 | high | 2h | stores/matchStore.ts:115-117 | `storage: createJSONStorage(() => localStorage)` matches + swipeHistory persist | Match verileri, konusma referanslari ve swipe gecmisi plaintext localStorage'da; paylasimli/public cihaz riski | `sessionStorage` veya sifrelenmis storage kullanin | Bkz: Detay BE-030 |
| BE-031 | HIGH | 4 | 3 | high | 1h | moderate-image/index.ts:192 | `fetch(\`\${VISION_API_URL}?key=\${apiKey}\`)` | Vision API key URL query parametresinde; proxy/CDN/log'larda gorulur | API key'i header'a tasiyin veya service account kullanin | Bkz: Detay BE-031 |
| BE-012 | MEDIUM | 3 | 3 | high | 2h | 20260228_security_default_on.sql:229-252 | `log_message_moderation(p_sender_id, ...)` -- sender_id spoofing | Masum kullanicilar sahte moderasyon kayitlariyla flag'lenebilir | `p_sender_id` yerine `auth.uid()` kullanin | `IF p_sender_id != auth.uid() AND NOT auth_has_moderation_access() THEN RAISE;` |
| BE-013 | MEDIUM | 3 | 3 | high | 2h | 20260228_date_flow_system.sql:308-354 | `record_date_feedback` -- reviewer plan katilimcisi mi kontrolu yok | Sahte date feedback enjeksiyonu | Plan katilimci kontrolu ekle | `IF NOT EXISTS(... dp.proposer_id = v_user_id OR dp.responder_id = v_user_id)` |
| BE-014 | MEDIUM | 3 | 2 | high | 1h | 20260228_date_flow_system.sql:291-306 | `expire_stale_invitations()` -- herhangi authenticated user cagirabilir | Cron fonksiyonu public erisilebilir; toplu islem manipulasyonu | `REVOKE FROM authenticated; GRANT TO service_role;` | `REVOKE EXECUTE ON FUNCTION expire_stale_invitations() FROM authenticated;` |
| BE-015 | MEDIUM | 3 | 2 | high | 1h | 20260228_ethical_monetization.sql:461-466 | `submit_monetization_feedback(p_user_id, ...)` -- auth kontrolu yok | Baska biri adina feedback gonderme | `auth.uid()` dogrudan kullan | `INSERT INTO ... VALUES (auth.uid(), ...);` |
| BE-016 | MEDIUM | 3 | 4 | high | 1h | 20260322_seed_invite_code.sql:2 | `INSERT INTO invite_codes VALUES ('VITALIS-VIP', 999, true)` | Production'da herkes VITALIS-VIP koduyla kayit olabilir; davet sistemi bypass | Seed'i production migration'dan cikarin | Environment check veya admin UI ile yonetin |
| BE-017 | MEDIUM | 3 | 3 | high | 4h | supabase/migrations/ | 2 farkli numaralandirma: tarih bazli (20260209_*) ve sira bazli (001_*) | Migration calisma sirasi belirsizligi; bagimlilik sorunlari riski | Tek numaralandirma sistemine gecin | Tum dosyalari tarih bazli yapin |
| BE-018 | MEDIUM | 3 | 3 | high | 2h | 20260216 vs 20260217 | Ayni kolonlar farkli VARCHAR boyutlariyla tekrarlaniyor | `looking_for VARCHAR(20)` vs `VARCHAR(50)` tutarsizligi | Duplicate migration'lari birlestirin | Tutarli boyutlar kullanin |
| BE-019 | MEDIUM | 3 | 3 | medium | 4h | push-worker/index.ts:44 | `'Access-Control-Allow-Origin': '*'` OPTIONS handler'da | Push-worker cron endpoint'i wildcard CORS ile; CRON_SECRET kontrolu var ama browser'dan tetiklenebilir | CORS header'larini tamamen kaldirin (server-to-server) | Webhook-stripe pattern'i takip edin |
| BE-020 | MEDIUM | 3 | 2 | medium | 8h | scheduled-retention-cleanup/index.ts:15-18 | `if (cronSecret) { ... }` -- cronSecret yoksa herkes cagirabilir | RETENTION_CRON_SECRET set edilmemisse kimlik dogrulamasiz calisir | Bosmus kontrolu: `if (!cronSecret) return 403;` | `if (!cronSecret) return response({error:'Missing secret config'}, 500);` |
| BE-021 | MEDIUM | 3 | 2 | medium | 2h | 20260228_security_default_on.sql:364-368 | `CREATE POLICY "Auth users read risk level" ... USING (true)` | Tum authenticated kullanicilar tum risk skorlarini (risk_score, risk_reasons dahil) gorebilir | Sadece risk_level icin VIEW olusturun; detaylari admin-only yapin | `CREATE VIEW public_risk_levels AS SELECT user_id, risk_level FROM profile_risk_scores;` |
| BE-032 | MEDIUM | 3 | 3 | high | 2h | services/profileService.ts:46-48 | `user_role: profile.userRole ?? 'viewer', risk_flags: profile.riskFlags ?? {}` | Client upsert'te user_role ve risk_flags gonderiliyor; privilege escalation vektoru (RLS trigger ile kismi koruma var) | mapProfileToRow'dan `user_role` ve `risk_flags` cikarin | Bkz: Detay BE-032 |
| BE-033 | MEDIUM | 3 | 3 | medium | 3h | services/chatService.ts:143-165 | `uploadChatMedia(conversationId, file)` -- conversationId dogrulanmiyor | Kullanici ait olmadigi conversation'a media yukleyebilir (storage path manipulasyonu) | Conversation membership kontrolu ekle | Bkz: Detay BE-033 |
| BE-034 | MEDIUM | 2 | 3 | medium | 4h | services/ (35 dosya, 80 instance) | `.select('*')` pattern'i 80 yerde kullaniliyor | Over-fetching: hassas kolonlar (risk_flags, notification_settings, vb.) gereksiz cekilir | Spesifik kolon secimi kullanin | `.select('id, name, age, role')` gibi |
| BE-024 | LOW | 2 | 2 | high | 1h | services/authService.ts:42-46 | `localStorage.clear()` Supabase signOut'tan ONCE cagiriliyor | Race condition: signOut basarisiz olursa session token silinmis ama oturum acik | signOut sonrasina tasiyin | `const r = await supabase.auth.signOut(); localStorage.clear(); return r;` |
| BE-026 | LOW | 2 | 3 | high | 2h | App.tsx:395-399 | Zod min 8 char ama Supabase default 6 char kabul ediyor | API dogrudan cagrilirsa 6 char sifre kabul edilir | Supabase Dashboard: min password = 12 + complexity | Supabase Auth config degistir |
| BE-027 | LOW | 1 | 1 | medium | 1h | AUTOMATION_AUDIT.json | qs bagimliginda low severity CVE (GHSA-w7fw-mjwx-w883) | DoS via arrayLimit bypass (CVSS 3.7) | `npm audit fix` | `npm audit fix` |
| BE-028 | LOW | 2 | 2 | medium | 1h | components/LoginView.tsx:297-308 | `normalizeLoginError` string matching on error messages | Supabase hata mesaji degisirse handle edilemez; UX sorunu | Error code/status uzerinden matching yapin | `if (error.status === 400) return '...';` |
| BE-035 | LOW | 2 | 2 | medium | 2h | services/chatService.ts:118-127 | `sendMessage` icinde content uzunluk kontrolu yok | Cok buyuk mesajlar DB'ye yazilabilir; DoS + storage abuse riski | Client + DB seviyesinde max length | `.insert({ content: content.slice(0, 5000), ... })` |
| BE-036 | LOW | 2 | 2 | medium | 1h | services/accountService.ts:194-203 | `fetch('https://api.ipify.org?format=json')` consent kaydi icin | Kullanici IP'si 3. parti servise gonderiliyor; KVKK bilgilendirme gerekli | Self-hosted IP resolution veya Supabase Edge'de IP al | `Deno.env.get('CONNECTING_IP')` veya request header |

---

## DETAYLI KANITLAR

### Detay BE-001: location_privacy RLS -- Gercek Koordinatlar Sizintisi

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260228_security_default_on.sql:331-341`

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
1. **Kolon adi hatasi:** `user1_id/user2_id` kolonlari matches tablosunda mevcut degil (gercek: `profile_1_id/profile_2_id`). PostgreSQL CREATE POLICY bu kolon adlarini lazy evaluate eder -- subquery bos doner, policy her zaman FALSE uretir. Bu durumda matched kullanicilar konum goremez (mevcut davranis). ANCAK bu kolon adi duzeltildiginde (BE-002) ikinci sorun ortaya cikar:
2. **Row-level vs column-level:** RLS satir bazli calisir. Policy TRUE dondugunde matched kullanici `real_latitude`, `real_longitude`, `offset_seed` dahil TUM kolonlari okuyabilir. `locationPrivacyService.getDisplayLocation()` sadece display kolonlarini SELECT ediyor (satir 157-159), ama kotu niyetli bir kullanici dogrudan `supabase.from('location_privacy').select('*')` cagirarak gercek koordinatlara erisir.

**Etki:** 500-1500m konum obfuscation tamamen devre disi kalir. Medikal dating app'te gercek konum bilgisi sizintisi ciddi guvenlik riski olusturur (stalking vektoru).

**Onerilen Duzeltme:**
```sql
-- 1. Gercek koordinatlari ayri tabloya tasiyin (en guvenli yaklasim)
CREATE TABLE location_privacy_raw (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  real_latitude FLOAT, real_longitude FLOAT, offset_seed FLOAT
);
ALTER TABLE location_privacy_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only service role" ON location_privacy_raw
  FOR ALL TO authenticated USING (false); -- Sadece service_role erisir

-- 2. location_privacy tablosundan real_* kolonlarini kaldirin
ALTER TABLE location_privacy DROP COLUMN real_latitude, DROP COLUMN real_longitude, DROP COLUMN offset_seed;
```

---

### Detay BE-002: matches Kolon Adi Tutarsizligi (9+ hatali referans)

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

**Etki:** Etkilenen tum RLS policy'leri runtime'da sessizce basarisiz olur. `user1_id` kolonu yoksa EXISTS subquery bos doner -- policy FALSE uretir. Sonuc:
- Matched user availability goruntuleyemez
- Trip mode matched user goruntulemesi calismaz
- Location privacy matched-user policy calismaz
- Date flow matched-user RLS calismaz

---

### Detay BE-003: compute_profile_risk Hatali Kolon Adi

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

**Not:** `006_admin_panel.sql` icerisinde farkli bir reports tablo yapisi tanimlanmis olabilir (`reported_user_id` ile). Migration calisma sirasi (alfabetik: `006_*` < `20260209_*`) nedeniyle hangi tablo yapisi gecerli belirsiz -- bu BE-017 (migration siralama sorunu) ile iliskili. Eger `006_admin_panel.sql` reports tablosunu olusturuyorsa, `20260209_init.sql` `IF NOT EXISTS` ile atlayacaktir.

---

### Detay BE-004: Admin Edge Functions Wildcard CORS

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/functions/_shared/admin.ts:9-13`

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
```

Bu `corsHeaders` objesi su admin Edge Function'lari tarafindan kullaniliyor:
- `admin-verification-queue`
- `admin-verification-case`
- `admin-claim-verification-request`
- `admin-get-verification-doc-url`
- `admin-decide-verification`
- `admin-settings`
- `admin-audit-logs`
- `scheduled-retention-cleanup`

**Sorun:** `assertModeratorAccess()` fonksiyonu Bearer token + MFA aal2 + role kontrolu yapiyor (bu iyi). Ancak wildcard CORS, herhangi bir web sitesinden bu endpoint'lere istek gonderilmesine izin verir. Eger bir admin'in JWT'si calinicsa (XSS, phishing), saldirgan herhangi bir origin'den admin islemleri yapabilir. CORS whitelist bu riski azaltir.

Karsilastirma: `create-checkout-session` ve `generate-icebreaker` fonksiyonlari CORS whitelist uygulamisken, admin fonksiyonlari wildcard kullaniyor. Bu tutarsizlik.

**Onerilen Duzeltme:**
```typescript
// _shared/admin.ts icinde checkout/icebreaker ile ayni pattern
const getAppBaseUrl = (): string => {
  const appBaseUrl = Deno.env.get('APP_BASE_URL');
  return appBaseUrl ? normalizeBaseUrl(appBaseUrl) : 'https://vitalis.app';
};
// ... getAllowedOrigins, getCorsHeaders fonksiyonlari
```

---

### Detay BE-029: blockAndReportService IDOR -- Client-Supplied blockerId

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/blockAndReportService.ts:50-60`

```typescript
async blockUser(
  blockerId: string,   // CLIENT-SUPPLIED -- IDOR vektoru
  blockedId: string,
  reason?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('blocks')
    .upsert({
      blocker_id: blockerId,  // Uses client value directly
      blocked_id: blockedId,
      reason: reason || null,
      with_report: false,
    }, { onConflict: 'blocker_id,blocked_id' });
```

**Ayni pattern su fonksiyonlarda da mevcut:**
- `blockAndReport()` (satir 78-114) -- `payload.blockerId` kullaniliyor
- `unblockUser()` (satir 116-131) -- `blockerId` parametresi
- `getBlockedUsers()` (satir 133-148) -- `userId` parametresi

**Etki:** Herhangi bir authenticated kullanici baska birinin adina blok olusturabilir. Bu, kurbani hedef kullanicidan izole etmek icin kullanilabilir (sosyal muhendislik). Rapor olusturma fonksiyonunda ise baska birinin adina sahte raporlar iletilebilir.

**Not:** `blocks` tablosunda RLS mevcut (`blocker_id = auth.uid()`), bu da INSERT'i engelleyecektir. Ancak `blockAndReport()` fonksiyonundaki `reports` tablosuna INSERT icin ayri bir RLS policy var ve `reporter_id` kontrolu yapilmiyorsa sorun devam eder.

**Onerilen Duzeltme:**
```typescript
async blockUser(
  blockedId: string,
  reason?: string
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('blocks')
    .upsert({
      blocker_id: user.id,  // auth.uid() ile degistirildi
      blocked_id: blockedId,
      reason: reason || null,
      with_report: false,
    }, { onConflict: 'blocker_id,blocked_id' });
```

---

### Detay BE-030: matchStore localStorage -- Plaintext Match/Swipe Verisi

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/stores/matchStore.ts:114-117`

```typescript
{
  name: 'match-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    matches: state.matches,       // Icerir: profile.id, name, images, messages
    swipeHistory: state.swipeHistory  // Icerir: profileId, action (LIKE/PASS/SUPER_LIKE)
  }),
}
```

**Etki:** Match verileri (profil isimleri, fotograf URL'leri, mesaj referanslari) ve swipe gecmisi (kimi begendigi/gectigib) plaintext olarak localStorage'da saklanir. Paylasimli/public cihazlarda (hastane bilgisayarlari, nobetci odalari) bu veriler sonraki kullanici tarafindan okunabilir. Medikal profesyonellerin dating tercihlerinin ifsa edilmesi reputasyon riski olusturur.

**Onerilen Duzeltme:**
```typescript
// Secenekler (en az riskliden en riskli olana):
// 1. Persist'i kaldir -- her session'da Supabase'den cek
// 2. sessionStorage kullan (tab kapatilinca silinir)
storage: createJSONStorage(() => sessionStorage),
// 3. Sifrelenmis storage (orn: zustand-encrypted-storage)
```

---

### Detay BE-031: Vision API Key URL Query Parametresinde

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/functions/moderate-image/index.ts:192`

```typescript
const visionResponse = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requests: [{
      image: { content: base64Image },
      features: [{ type: 'SAFE_SEARCH_DETECTION' }],
    }],
  }),
});
```

**Etki:** API key URL query parametresinde gonderildiginde:
- Proxy/CDN loglarina kaydedilir
- Browser/server HTTP cache'lerine yazilir
- Supabase Edge Function loglarina gorulur
- `Referer` header'inda sizabilir

**Onerilen Duzeltme:**
```typescript
// Google Cloud Vision API, API key'i header'da da kabul eder:
const visionResponse = await fetch(VISION_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,  // Header'da gonder
  },
  body: JSON.stringify({ ... }),
});
```

---

### Detay BE-032: profileService -- Client user_role ve risk_flags Yazimi

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/profileService.ts:46-48`

```typescript
const mapProfileToRow = (profile: Profile) => {
  return {
    // ... normal alanlar ...
    user_role: profile.userRole ?? 'viewer',      // Client'tan geliyor
    risk_flags: profile.riskFlags ?? {},           // Client'tan geliyor
    suspended_until: profile.suspendedUntil ?? null, // Client'tan geliyor
  };
};
```

**Koruma Durumu:** `20260218_verification_status_protection.sql` icinde `check_profile_update_allowed()` trigger'i `verification_status` ve `premium_tier` icin koruma sagliyor. ANCAK `user_role`, `risk_flags` ve `suspended_until` bu trigger tarafindan kontrol EDILMIYOR.

**Etki:** RLS INSERT/UPDATE policy'si `auth.uid()` kontrolu yapiyor (iyi), ama kullanici kendi profilinde `user_role` alanini `admin` veya `moderator` olarak set edebilir. Eger herhangi bir kod `profiles.user_role` alanini yetki kontrolu icin kullaniyorsa privilege escalation olusur.

**Onerilen Duzeltme:**
```typescript
const mapProfileToRow = (profile: Profile) => {
  return {
    // ... normal alanlar ...
    // user_role, risk_flags, suspended_until CIKARILDI
    // Bu alanlar sadece admin Edge Function'lari uzerinden guncellenebilir
  };
};
```

---

### Detay BE-033: chatService uploadChatMedia -- Conversation Sahiplik Kontrolu Yok

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/chatService.ts:143-165`

```typescript
async uploadChatMedia(conversationId: string, file: File | Blob) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { path: null, error: new Error('Not authenticated') };

  const timestamp = Date.now();
  const path = `${conversationId}/${user.id}_${timestamp}.jpg`;
  // conversationId'nin kullaniciya ait olup olmadigi KONTROL EDILMIYOR

  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, file, { contentType: 'image/jpeg' });
```

**Koruma Durumu:** Storage bucket'inda RLS policy'si storage path icindeki `user.id` segmentini kontrol edebilir, bu da kismi koruma saglar. Ancak conversationId segmenti dogrulanmiyor -- kullanici baska bir conversation path'ine dosya yukleyebilir.

**Onerilen Duzeltme:**
```typescript
// Oncelikle conversation membership kontrolu
const { data: participant } = await supabase
  .from('conversation_participants')
  .select('id')
  .eq('conversation_id', conversationId)
  .eq('user_id', user.id)
  .single();

if (!participant) return { path: null, error: new Error('Not in this conversation') };
```

---

### Detay BE-008: record_slate_interaction IDOR

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

Fonksiyon `SECURITY DEFINER` olarak calisiyor, yani RLS bypass ediliyor. `v_user_id` degiskeni fonksiyonun basinda `auth.uid()` olarak set ediliyor ama `user_daily_slates` update'inde kullanilmiyor.

**Onerilen Duzeltme:**
```sql
WHERE id = p_slate_id AND user_id = v_user_id;  -- Sahiplik kontrolu eklendi
```

---

### Detay BE-010: Auth State Machine Verification Bypass

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx:181-191`

```typescript
const { data: { subscription } } = onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        setAuthStep('APP');  // Dogrudan APP'e gidiyor
        void hydrateProfile();
    } else if (event === 'SIGNED_OUT') {
        setAuthStep('LANDING');
    }
});
```

**Sorun:** `SIGNED_IN` event'inde `verification_status` kontrolu yok. Bu callback su durumlarda tetiklenir:
- OAuth redirect sonrasi
- Sayfa yenilenme (token refresh) sonrasi
- Tab switch sonrasi session recovery

LoginView.tsx icinde profil + user_status kontrolu mevcut (login form icin), ama bu sadece email/password login icin calisiyor.

**Onerilen Duzeltme:**
```typescript
if (event === 'SIGNED_IN' && session) {
    const { data } = await getMyProfile();
    if (data) {
        const mapped = mapRowToProfile(data, USER_PROFILE);
        setUserProfile(mapped);
        const vs = mapped.verificationStatus || 'UNVERIFIED';
        if (['PENDING_VERIFICATION','PENDING','UNDER_REVIEW'].includes(vs)) {
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

### Detay BE-011: send_date_invitation Match Membership Kontrolu Yok

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

## DUZELTILMIS BULGULAR (Onceki Audit'lerden)

Asagidaki bulgular onceki audit'lerde raporlanmis ve duzeltilmistir:

| Eski ID | Durum | Duzeltme Kaniti |
|---------|-------|-----------------|
| BE-005-v1 (icebreaker CORS wildcard) | DUZELTILDI | `generate-icebreaker/index.ts:19-28` -- CORS whitelist eklenmis |
| BE-006-v1 (PII to Gemini) | DUZELTILDI | `generate-icebreaker/index.ts:125-140` -- `anonymizeProfile()` eklenmis |
| BE-009-v1 (icebreaker no auth) | DUZELTILDI | `generate-icebreaker/index.ts:87-93` -- Bearer token dogrulama eklenmis |
| BE-007-v1 (webhook CORS) | DUZELTILDI | `webhooks-stripe/index.ts:8-13` -- Wildcard CORS kaldirilmis |
| BE-013-v1 (webhook plan metadata) | DUZELTILDI | `webhooks-stripe/index.ts:94-108` -- Plan validation eklenmis |
| BE-002-v1 (updateProfileVerificationStatus IDOR) | DUZELTILDI | `verificationService.ts:266-281` -- `auth.uid()` dogrulama eklenmis |
| BE-008-v1 (saveVerifiedEmail IDOR) | DUZELTILDI | `verificationService.ts:140-152` -- `auth.uid()` dogrulama eklenmis |
| SEC-002 (PII client-side) | DUZELTILDI | `geminiService.ts:12-18` -- `minimalProfile()` eklenmis |
| SEC-003 (rate limit) | DUZELTILDI | `generate-icebreaker/index.ts:8-9,60-75` -- In-memory rate limiter eklenmis |
| BE-005-v3 (dev bypass fonksiyonu) | DUZELTILDI | `App.tsx` -- `handleDevBypass` tamamen kaldirilmis |
| BE-025-v3 (as any TypeScript bypass) | DUZELTILDI | `App.tsx` -- dev bypass kodu ile birlikte kaldirilmis |
| BE-022-v3 (demo profile fallback) | DUZELTILDI | `discoveryService.ts:3,220-224` -- DEMO_PROFILES kaldirilmis, hata dondurme eklenmis |
| BE-023-v3 (demo LikesYou fallback) | DUZELTILDI | `discoveryService.ts:304-307` -- Demo fallback kaldirilmis |

---

## MODUL BAZLI ANALIZ

### 1. Veritabani (supabase/migrations/)
**Bulgular:** BE-001, BE-002, BE-003, BE-006, BE-007, BE-008, BE-009, BE-011, BE-012, BE-013, BE-014, BE-015, BE-016, BE-017, BE-018, BE-020, BE-021
**Anahtar Sorun:** Matches kolon adi tutarsizligi (BE-002) 4 migration'i etkiliyor
**Pozitif:** Kapsamli RLS cogu tabloda mevcut; KVKK uyumlu face_embeddings korumasi; idempotent webhook islemesi

### 2. API / Edge Functions (supabase/functions/)
**Bulgular:** BE-004, BE-019, BE-020, BE-031
**Duzeltilmis:** Icebreaker CORS + auth + rate limit, Webhook CORS + plan validation
**Anahtar Sorun:** Admin fonksiyonlarinda wildcard CORS (BE-004); Vision API key URL'de (BE-031)
**Pozitif:** create-checkout-session ornek nitelikte guvenli implementasyon; admin MFA aal2 zorunlulugu

### 3. Auth (App.tsx, authService.ts, authStore.ts)
**Bulgular:** BE-010, BE-024, BE-026
**Duzeltilmis:** Dev bypass tamamen kaldirildi (BE-005-v3, BE-025-v3)
**Pozitif:** Supabase Auth entegrasyonu standart; signOut cleanup mevcut; authStore minimal

### 4. Hata Yonetimi
**Bulgular:** BE-028
**Duzeltilmis:** Demo fallback kaldirildi, error propagation eklendi
**Pozitif:** Edge Function'larda structured error handling; Sentry entegrasyonu (sendDefaultPii: false)

### 5. Performans
**Bulgular:** BE-034 (select * pattern)
**Pozitif:** Discovery service batch-fetch ile N+1 engelliyor (Promise.all); RPC kullanimi dogru; client-side caching (24h stale cache) risk servisinde mevcut

### 6. Validation
**Bulgular:** BE-026 (password length), BE-035 (message length)
**Pozitif:** Zod validation registration flow'da; file MIME type + size kontrolu; admin input validation

### 7. Entegrasyonlar
**Bulgular:** BE-020 (retention cleanup conditionalsiz secret), BE-036 (IP leak)
**Pozitif:** Stripe -- signature dogrulama + idempotency; Gemini -- PII anonymization; FCM -- CRON_SECRET kontrolu

### 8. Medikal Domain
**Pozitif:** Healthcare domain lookup + name-email matching (Levenshtein); liveness check 4-challenge sistemi; fraud signal self-only kisitlamasi; face_embeddings admin-only RLS; KVKK riza kaydi
**No finding:** `healthcareVerificationService.ts` -- dogru auth kontrolu her fonksiyonda; recordFraudSignal userId === auth.uid() kontrolu mevcut

### 9. Services (Client-Side)
**Bulgular:** BE-029 (blockAndReport IDOR), BE-032 (profileService user_role), BE-033 (chatService ownership), BE-034 (select *), BE-035 (message length)
**Duzeltilmis:** Demo profile fallback (BE-022/023)
**Pozitif:** chatService.createConversation match-gated RPC kullaniyor; auth.getUser() cogu fonksiyonda mevcut

### No Finding Moduller

| Modul | Aciklama |
|-------|----------|
| `stores/authStore.ts` | Minimal store, guvenlik mantigi yok (dogru yaklasim) |
| `src/lib/supabase.ts` | Env validation + URL dogrulama mevcut |
| `src/lib/sentry.ts` | sendDefaultPii: false, Authorization header stripped |
| `src/lib/analytics.ts` | Consent-based analytics, no PII without consent |
| `services/geminiService.ts` | Client-side PII minimization (DUZELTILDI) |
| `services/explanationService.ts` | 11 faktor sistemi, anti-creepy filter mevcut |
| `services/aiConsentService.ts` | GDPR/EU AI Act uyumlu consent sistemi |
| `services/healthcareVerificationService.ts` | Dogru auth kontrolu her fonksiyonda |
| Stripe webhook idempotency | `stripe_webhook_events` tablosu + unique index |
| Storage bucket policies | 3 private bucket dogru RLS ile |
| Verification status protection | Trigger `check_profile_update_allowed` mevcut |

---

## RLS KAPSAM MATRISI

| Tablo | RLS Enabled | SELECT | INSERT | UPDATE | DELETE | Durum |
|-------|-------------|--------|--------|--------|--------|-------|
| profiles | Evet | own+discover+admin | Evet | Evet | Eksik (fonksiyon var) | OK |
| messages | Evet | match participants | Evet | Eksik | Eksik | Orta |
| matches | Evet | Evet | Evet | Eksik | Eksik | Orta |
| swipes | Evet | Evet | Evet | Eksik | Eksik | OK |
| blocks | Evet | Evet | Evet | Eksik | Evet | OK |
| reports | Evet | Evet | Evet | Eksik | Eksik | OK |
| **verifications** | **HAYIR** | **Acik** | **Acik** | **Acik** | **Acik** | **BE-006** |
| verified_work_emails | Evet | Evet | Evet | Eksik | Eksik | OK |
| verification_requests | Evet | own+admin | Evet | admin | Eksik | OK |
| verification_documents | Evet | own+admin | Evet | admin | admin | OK |
| date_invitations | Evet | Evet | Evet | via RPC | Eksik | OK |
| trusted_contacts | Evet | own | FOR ALL | FOR ALL | FOR ALL | OK |
| safety_alerts | Evet | own+admin | Evet | Eksik | Eksik | OK |
| date_feedback | Evet | own | FOR ALL | FOR ALL | FOR ALL | OK |
| face_embeddings | Evet | Admin-only | own | Admin-only | Admin-only | OK (KVKK) |
| fraud_signals | Evet | Admin-only | Admin-only | Admin-only | Admin-only | OK |
| user_risk_scores | Evet | Admin-only | Admin-only | Admin-only | Admin-only | OK |
| location_privacy | Evet | own+matched (SORUNLU) | Evet | Evet | Eksik | **BE-001** |
| profile_risk_scores | Evet | USING(true) | Eksik | Eksik | Eksik | **BE-021** |
| ai_consent | Evet | own+admin | own | own | own | OK |
| ai_usage_log | Evet | own+admin | admin | admin | admin | OK |
| user_security_settings | Evet | own | own | own | Eksik | OK |

---

## SECURITY DEFINER IDOR RISKI TABLOSU

Asagidaki RPC fonksiyonlari `SECURITY DEFINER` olarak calisiyor ve `p_user_id` parametresini `auth.uid()` ile dogrulamiyor:

| Fonksiyon | Dosya | auth.uid() kontrolu | Bulgu |
|-----------|-------|---------------------|-------|
| `record_slate_interaction` | daily_slate_system.sql | `v_user_id = auth.uid()` ama slate sahiplik yok | **BE-008** |
| `activate_trip_mode` | ethical_monetization.sql | YOK | **BE-009** |
| `save_filter_set` | ethical_monetization.sql | YOK | BE-015 kapsaminda |
| `submit_monetization_feedback` | ethical_monetization.sql | YOK | **BE-015** |
| `log_message_moderation` | security_default_on.sql | YOK | **BE-012** |
| `send_date_invitation` | date_flow_system.sql | `auth.uid()` inviter olarak ama match kontrolu yok | **BE-011** |
| `record_date_feedback` | date_flow_system.sql | `auth.uid()` reviewer olarak ama plan kontrolu yok | **BE-013** |
| `expire_stale_invitations` | date_flow_system.sql | Herkese acik cron fonksiyonu | **BE-014** |
| `compute_profile_risk` | security_default_on.sql | N/A (kolon adi hatasi) | **BE-003** |
| `get_user_capabilities` | ethical_monetization.sql | YOK | DUSUK (read-only) |

---

## ONCELIK SIRASI

### P0 -- LANSMAN ENGELLEYICI (Hemen duzelt)
- **BE-001** (CRITICAL): location_privacy gercek koordinat sizintisi riski
- **BE-002** (CRITICAL): matches kolon adi hatasi (user1_id vs profile_1_id) -- 4 migration etkileniyor
- **BE-003** (CRITICAL): compute_profile_risk hatali kolon adi
- **BE-004** (CRITICAL): Admin Edge Functions wildcard CORS
- **BE-029** (CRITICAL): blockAndReportService IDOR -- client-supplied blockerId

### P1 -- YUKSEK ONCELIK (1 hafta icinde)
- **BE-006** (HIGH): verifications tablosu RLS eksik
- **BE-007** (HIGH): date_invitations sinirsiz davet sorunu
- **BE-008** (HIGH): record_slate_interaction IDOR
- **BE-009** (HIGH): activate_trip_mode IDOR
- **BE-010** (HIGH): Auth state machine verification bypass
- **BE-011** (HIGH): send_date_invitation match kontrolu eksik
- **BE-030** (HIGH): matchStore localStorage plaintext persistence
- **BE-031** (HIGH): Vision API key URL query parametresinde

### P2 -- ORTA ONCELIK (2 hafta icinde)
- **BE-012**: log_message_moderation sender_id spoofing
- **BE-013**: record_date_feedback katilimci kontrolu
- **BE-014**: expire_stale_invitations access kontrolu
- **BE-015**: submit_monetization_feedback IDOR
- **BE-016**: Production seed davet kodu
- **BE-017**: Migration numaralandirma birlestirmesi
- **BE-018**: Duplicate migration kolon tutarsizligi
- **BE-019**: Push-worker wildcard CORS
- **BE-020**: Retention cleanup conditionalsiz secret
- **BE-021**: Profile risk scores tam erisim
- **BE-032**: profileService user_role/risk_flags client write
- **BE-033**: chatService uploadChatMedia sahiplik kontrolu
- **BE-034**: select('*') over-fetching (80 instance, 35 dosya)

### P3 -- DUSUK ONCELIK (Sprint planlama)
- **BE-024**: signOut localStorage siralama
- **BE-026**: Password policy Supabase config
- **BE-027**: qs dependency CVE
- **BE-028**: Login error handling
- **BE-035**: Message content length limit
- **BE-036**: IP leak to ipify.org

---

## AUTOMATION OZETI

### TypeScript Check (AUTOMATION_TSC.txt)
- **Durum:** GECTI (0 hata)
- **Not:** `mobile/`, `supabase/functions/`, `SwipeableCard.tsx`, `pushService.ts` exclude edilmis

### ESLint Check
- **Durum:** ATLANDI
- **Neden:** ESLint v9.39.2 requires `eslint.config.js` ama proje'de config yok
- **Aksiyon:** `eslint.config.js` olusturun

### NPM Audit (AUTOMATION_AUDIT.json)
- **Toplam:** 1 zafiyet (LOW)
- **Paket:** qs (dolayli bagimlilik)
- **Sorun:** arrayLimit bypass (DoS, CVSS 3.7)
- **Cozum:** `npm audit fix`

---

## SONUC

Bu rapor onceki audit raporlarini (v1 2026-02-15 + Team 5+6 2026-02-28 + v3 2026-02-28) birlestirmis, yeni bulgular eklenmis ve duzeltilmis bulgular guncellemistir.

**Pozitif gelismeler:**
- 13 bulgu onceki audit'lerden sonra basariyla duzeltilmis (AUDIT-FIX etiketleri ile)
- Dev bypass fonksiyonu App.tsx'ten tamamen kaldirilmis
- Demo profile fallback'leri kaldirilmis, hata propagation eklenmis
- Icebreaker fonksiyonu artik auth + CORS + rate limit + PII anonymization ile korunuyor
- Stripe webhook fonksiyonu artik CORS'suz + plan validation ile calisiyor
- verificationService IDOR'lari duzeltilmis (auth.uid() kontrolu eklenmis)
- geminiService client-side PII minimization eklenmis

**Kalici riskler:**
- 5 CRITICAL bulgu hala acik (konum sizintisi, kolon adi hatalari, admin CORS, blockAndReport IDOR)
- SECURITY DEFINER fonksiyonlarda sistematik IDOR pattern'i (8+ fonksiyon)
- verifications tablosu hala RLS'siz
- matchStore plaintext localStorage persistence (medikal profesyonel gizliligi)
- Vision API key URL'de ifsa

**Yeni bulgular (v3'e eklenen):**
- BE-029 (CRITICAL): blockAndReportService IDOR
- BE-030 (HIGH): matchStore localStorage plaintext
- BE-031 (HIGH): Vision API key in URL
- BE-032 (MEDIUM): profileService user_role/risk_flags client write
- BE-033 (MEDIUM): chatService conversation ownership
- BE-034 (MEDIUM): select('*') over-fetching (80 instance)
- BE-035 (LOW): Message content length limit
- BE-036 (LOW): IP leak to ipify.org

**Duzeltildi olarak isaretlenen (v3'ten kaldirilan):**
- BE-005-v3 (dev bypass) -- App.tsx'ten tamamen kaldirilmis
- BE-022/023-v3 (demo fallback) -- discoveryService'ten kaldirilmis
- BE-025-v3 (as any bypass) -- dev bypass ile birlikte kaldirilmis

**Tahmini toplam duzeltme suresi:** ~55 saat (P0: 13h, P1: 16h, P2: 20h, P3: 6h)

---

*Rapor tamamlandi. Tum dosya yollari mutlak path olarak referanslanmistir.*
*Son duzeltme: 2026-02-28 | Denetci: Claude Opus 4.6*
