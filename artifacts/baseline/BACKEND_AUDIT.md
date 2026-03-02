# VITALIS -- BACKEND AUDIT REPORT

**Auditor:** Backend Security Agent (Opus 4.6)
**Date:** 2026-02-17
**Scope:** All backend services, database schema, edge functions, state management, auth flow
**Codebase:** vitalis---elite-medical-dating (main branch)

---

### OZET

- Toplam bulgu: **24** (CRITICAL: **4**, HIGH: **6**, MEDIUM: **9**, LOW: **5**)
- En yuksek riskli 3 bulgu: **BE-001**, **BE-002**, **BE-003**
- No finding moduller: `stores/authStore.ts`, `stores/uiStore.ts`

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-001 | CRITICAL | 5 | 5 | high | 2h | `001_complete_schema.sql:530` | `WHERE (user1_id = p_user1_id AND user2_id = p_user2_id)` -- matches tablosu `profile_1_id`/`profile_2_id` kullaniyor | Match-gate fonksiyonu calismiyor; mesajlasma kilitli veya match kontrolu bypass olabilir | Bkz: Detay BE-001 | Bkz: Detay BE-001 |
| BE-002 | CRITICAL | 5 | 5 | high | 1h | `001_complete_schema.sql:212-213` | `SELECT blocked_user_id FROM blocks WHERE blocker_id` -- blocks tablosunda `blocked_id` kolonu var, `blocked_user_id` yok | RLS profil filtreleme tamamen kirik; engellenmis kullanicilar gorulmeye devam eder | Bkz: Detay BE-002 | Bkz: Detay BE-002 |
| BE-003 | CRITICAL | 5 | 4 | high | 1h | `delete-account/index.ts:13` | `const STORAGE_BUCKETS = ['profile-photos', 'verification-docs']` -- gercek bucket adi `verification-documents` | GDPR hesap silme fonksiyonu dogrulama belgelerini silemiyor; yasal uyumsuzluk | Bkz: Detay BE-003 | Bkz: Detay BE-003 |
| BE-004 | CRITICAL | 5 | 4 | high | 3h | `moderate-image/index.ts:69-81` | Fonksiyonda `auth.getUser()` cagrisi yok; herhangi bir JWT olmadan cagrilabilir | Kimlik dogrulamasi olmayan moderation endpoint; kotu niyetli kisiler sahte moderation sonuclari olusturabilir | Auth header kontrolu ekle | Bkz: Detay BE-004 |
| BE-005 | HIGH | 4 | 4 | high | 4h | `accountService.ts:89` | `supabase.from('matches').select('*').or('user1_id.eq...user2_id.eq...')` -- tablo `profile_1_id` kullaniyor | GDPR data export bos donuyor; matches ve likes verisi asla alinmiyor | Kolon isimlerini duzelt: `profile_1_id`, `profile_2_id` | Bkz: Detay BE-005 |
| BE-006 | HIGH | 4 | 5 | high | 2h | `001_complete_schema.sql:610` | `DELETE FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id` | `delete_user_data` RPC fonksiyonu hatali kolon referansi; GDPR silme eksik | Kolon isimlerini `profile_1_id`/`profile_2_id` olarak guncelle | Bkz: Detay BE-006 |
| BE-007 | HIGH | 4 | 3 | high | 2h | `chatService.ts:329-347` | `subscribeToConversationUpdates` global conversations tablosunu filtre olmadan dinliyor | Tum kullanicilarin conversation guncelleme eventleri alinabiliyor; bilgi sizintisi | Bkz: Detay BE-007 | Bkz: Detay BE-007 |
| BE-008 | HIGH | 4 | 4 | high | 2h | `App.tsx:167-169` | `getSession().then(({data}) => { if (data.session) setAuthStep('APP') })` -- `getSession` kullaniliyor | `getSession()` local storage'dan okuyor, sunucu dogrulamasi yapmiyor; manipule edilebilir | `getUser()` kullan | Bkz: Detay BE-008 |
| BE-009 | HIGH | 4 | 3 | high | 1h | `mobile/src/services/supabase.ts:11` | `const SUPABASE_URL = ... \|\| 'https://cxhwwgnogpsupnbbxvae.supabase.co'` | Hardcoded Supabase URL production'da fallback olarak kullaniliyor; env yoksa yanlis instance'a baglanir | Fallback URL'yi kaldir, env zorunlu yap | Bkz: Detay BE-009 |
| BE-010 | HIGH | 3 | 4 | high | 4h | `App.tsx:2,531` | `import { MOCK_PROFILES... } from './constants'` ve `MOCK_PROFILES.filter(profile => ...)` | Tum discovery motoru mock data kullaniyor; gercek Supabase query'leri yok | Mock'lari Supabase query'leri ile degistir | Bkz: Detay BE-010 |
| BE-011 | MEDIUM | 3 | 3 | high | 4h | `services/*.ts` (tum servisler) | Hicbir serviste rate limiting implementasyonu yok | Auth, chat, photo upload, safety endpointleri rate limiting olmadan cagirilabilir | Supabase RPC veya middleware seviyesinde rate limiting ekle | Bkz: Detay BE-011 |
| BE-012 | MEDIUM | 3 | 3 | high | 2h | `001_complete_schema.sql:317-318` | `ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY` -- policy tanimlanmamis | RLS aktif ama policy yok; service_role disinda kimse erisimiyor AMA ayni zamanda hatali erisim engellenmiyor | Service role icin explicit policy ekle | Bkz: Detay BE-012 |
| BE-013 | MEDIUM | 3 | 3 | high | 2h | `delete-account/index.ts:19` | `'Access-Control-Allow-Origin': '*'` | Wildcard CORS; hesap silme gibi kritik islem icin origin kisitlanmali | Origin whitelist kullan | Bkz: Detay BE-013 |
| BE-014 | MEDIUM | 3 | 3 | medium | 3h | `chatService.ts:143-164` | `uploadChatMedia` -- dosya tipi dogrulamasi yok, sabit `contentType: 'image/jpeg'` | Kullanici herhangi bir dosya tipini yukleyip JPEG olarak etiketleyebilir | MIME type kontrolu ekle, magic bytes dogrula | Bkz: Detay BE-014 |
| BE-015 | MEDIUM | 3 | 3 | high | 1h | `001_complete_schema.sql:445-448` | `queue_match_notification` trigger'i `NEW.user1_id`/`NEW.user2_id` kullaniyor | Match notification trigger'i calismiyor; yeni eslesmeler bildirim olusturmuyor | `profile_1_id`/`profile_2_id` olarak duzelt | Bkz: Detay BE-015 |
| BE-016 | MEDIUM | 3 | 2 | high | 3h | `001_complete_schema.sql:507-558` | `create_conversation` SECURITY DEFINER ile calisiyor; iceride `assert_self_or_service` var ama race condition korumasi yok | Concurrent conversation olusturma girisimleri duplicate kayit yaratabilir (UNIQUE constraint yoksa) | `SELECT ... FOR UPDATE` veya upsert pattern kullan | Bkz: Detay BE-016 |
| BE-017 | MEDIUM | 3 | 2 | medium | 2h | `services/authService.ts:28-33` | `signUpWithEmail` -- metadata parametresi `Record<string, unknown>` kabul ediyor, dogrulama yok | Keyfi metadata auth.users tablosuna yazilabilir | Metadata icin Zod schema tanimla ve dogrula | Bkz: Detay BE-017 |
| BE-018 | MEDIUM | 2 | 3 | high | 4h | `pushService.ts:330-365` | `updatePreferences` -- read-then-write pattern, transaction yok | Concurrent preference guncellemelerinde race condition; veri kaybi olabilir | Supabase RPC ile atomik guncelleme yap | Bkz: Detay BE-018 |
| BE-019 | MEDIUM | 2 | 2 | medium | 2h | `services/chatService.ts:109-137` | `sendMessage` -- mesaj icerigi icin sanitization/validation yok | XSS veya script injection riski (Supabase RLS insert izin veriyor) | Input sanitization ekle, max length kontrolu yap | Bkz: Detay BE-019 |
| BE-020 | LOW | 2 | 2 | high | 1h | `stores/matchStore.ts:3,34` | `swipeHistory: MOCK_SWIPE_HISTORY` ve `notifications: MOCK_NOTIFICATIONS` | Zustand store'lar mock data ile baslatiliyor; production'da sahte veri gorulecek | Mock data'yi bos array ile degistir | Bkz: Detay BE-020 |
| BE-021 | LOW | 2 | 2 | high | 1h | `services/checkoutService.ts:3` | `createCheckoutSession(plan: 'GOLD' \| 'PLATINUM')` -- webhook `DOSE/FORTE/ULTRA` kullaniliyor | Plan isim uyumsuzlugu; client `GOLD/PLATINUM`, webhook `DOSE/FORTE/ULTRA` kabul ediyor | Plan isimlerini birlesik hale getir | Bkz: Detay BE-021 |
| BE-022 | LOW | 1 | 2 | high | 1h | `20260216_profile_data_collection.sql` ve `20260217_profile_preferences.sql` | Ayni kolonlar iki ayri migration'da ekleniyor (`gender_preference`, `university`, vb.) | Duplicate migration; cakisma riski (IF NOT EXISTS ile korunuyor ama karisiklik yaratiyor) | Tek migration'a birlestirilmeli | - |
| BE-023 | LOW | 1 | 2 | medium | 2h | `services/profileService.ts:39` | `on_call_frequency: profile.shiftFrequency \|\| null` -- kolon adi uyumsuzlugu (shift_frequency vs on_call_frequency) | 20260217 migration `on_call_frequency`, 20260216 migration `shift_frequency` olusturuyor; veri yanlis kolona yazilabilir | Kolon adini birlestir | - |
| BE-024 | LOW | 1 | 1 | medium | 1h | `services/authService.ts:46` | `getSession()` fonksiyonu `supabase.auth.getSession()` cagiriyor; Supabase v2+ deprecation uyarisi | `getSession` yerine `getUser` kullanilmali (guvenlik ve API uyumlulugu) | `getUser()` ile degistir | - |

---

## DETAYLI BULGULAR

### Detay BE-001: Match-Gate Fonksiyonunda Kolon Adi Uyumsuzlugu (CRITICAL)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql` satirlar 528-531

**Kanit:**
```sql
-- create_conversation fonksiyonundaki match kontrolu:
IF NOT EXISTS (
    SELECT 1 FROM matches
    WHERE (user1_id = p_user1_id AND user2_id = p_user2_id)
       OR (user1_id = p_user2_id AND user2_id = p_user1_id)
) THEN
    RAISE EXCEPTION 'users are not matched';
END IF;
```

Ancak `matches` tablosu `20260209_init.sql` satirlar 123-124'te soyle tanimlanmis:
```sql
CREATE TABLE IF NOT EXISTS matches (
    profile_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    profile_2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ...
);
```

**Etki:** `user1_id` ve `user2_id` kolonlari `matches` tablosunda mevcut degil. Bu sorgu PostgreSQL runtime hatasi verecek. Match-gate kontrolu tamamen calismiyor; ya hic conversation olusturulamaz (500 hata), ya da hata yakalama mekanizmasina bagli olarak match kontrolu atlanabilir.

**Duzeltme:**
```sql
IF NOT EXISTS (
    SELECT 1 FROM matches
    WHERE (profile_1_id = p_user1_id AND profile_2_id = p_user2_id)
       OR (profile_1_id = p_user2_id AND profile_2_id = p_user1_id)
) THEN
    RAISE EXCEPTION 'users are not matched';
END IF;
```

---

### Detay BE-002: Profiles RLS Politikasinda Block Filtresi Kirik (CRITICAL)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql` satirlar 212-213

**Kanit:**
```sql
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT
USING (
  id = auth.uid()
  OR (
    is_active = TRUE
    AND id NOT IN (SELECT blocked_user_id FROM blocks WHERE blocker_id = auth.uid())
    AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_user_id = auth.uid())
  )
);
```

`blocks` tablosu `20260209_init.sql` satir 195'te `blocked_id` kolon adi ile tanimlanmis, ancak RLS politikasi `blocked_user_id` kullaniyor.

**Etki:** Bu RLS politikasi PostgreSQL hatasi verecek veya (eger baska bir migration bu kolonu ekliyorsa) yanlis kolona referans verecek. Engellenmis kullanicilar profil listesinden filtrelenmez; stalking ve harassment riski.

**Duzeltme:**
```sql
AND id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = auth.uid())
AND id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = auth.uid())
```

---

### Detay BE-003: GDPR Hesap Silme Fonksiyonunda Yanlis Bucket Adi (CRITICAL)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/functions/delete-account/index.ts` satir 13

**Kanit:**
```typescript
const STORAGE_BUCKETS = ['profile-photos', 'verification-docs'];
```

Ancak `20260213_verification_documents_storage.sql`'de bucket adi `verification-documents`:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', false)
```

Ve `verificationService.ts` satir 9:
```typescript
const VERIFICATION_DOC_BUCKET = 'verification-documents';
```

`001_complete_schema.sql`'de ise farkli bir bucket tanimlanmis:
```sql
VALUES ('verification-docs', 'verification-docs', FALSE, 10485760, ...)
```

**Etki:** Iki farkli migration iki farkli bucket adi kullaniyor. Hangisi production'da aktifse, delete-account fonksiyonu yalnizca o bucket'i temizleyebilir. Dogrulama belgeleri (kimlik belgeleri, lisanslar gibi hassas belgeler) silinmeden kalabilir. GDPR/KVKK ihlali.

**Duzeltme:**
```typescript
const STORAGE_BUCKETS = ['profile-photos', 'verification-documents'];
```
Ayrica tum migration'larda bucket adini tekil bir standarda birlestirilmeli.

---

### Detay BE-004: moderate-image Edge Function'da Auth Eksikligi (CRITICAL)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/functions/moderate-image/index.ts`

**Kanit:**
Fonksiyon hicbir authentication kontrolu uygulamiyor. `Authorization` header'i alinmiyor ve `auth.getUser()` cagirilmiyor. Dogrudan service role key ile Supabase client olusturuluyor:

```typescript
const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

Request body'den gelen `imagePath` ve `bucket` dogrudan isleniyor.

**Etki:** Herhangi biri bu edge function'a POST istegi gonderip, keyfi dosya yollarini moderation queue'ya ekleyebilir veya baskalarinin dosyalarini tarayabilir. Service role ile calistigi icin RLS bypass ediliyor.

**Duzeltme:**
```typescript
// Auth check eklenmeli
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
});
const { data: { user }, error } = await authClient.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
// imagePath'in user.id ile basladigini dogrula
if (!imagePath.startsWith(user.id)) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
```

---

### Detay BE-005: GDPR Data Export'ta Yanlis Kolon Referanslari (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/services/accountService.ts` satirlar 88-90

**Kanit:**
```typescript
supabase.from('matches').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
supabase.from('likes').select('*').eq('liker_id', user.id),
```

- `matches` tablosu `profile_1_id`/`profile_2_id` kullaniyor, `user1_id`/`user2_id` degil.
- `likes` tablosu schema'da tanimlanmamis (swipes tablosu `swiper_id`/`swiped_id` kullaniyor).

**Etki:** GDPR data export fonksiyonu matches ve likes verisini alamiyor. Kullanici data portability hakkini kullanamiyor. Supabase query hata vermese bile (bos sonuc donecek) yasal uyumsuzluk olusur.

**Duzeltme:**
```typescript
supabase.from('matches').select('*').or(`profile_1_id.eq.${user.id},profile_2_id.eq.${user.id}`),
supabase.from('swipes').select('*').eq('swiper_id', user.id),
```

---

### Detay BE-006: delete_user_data RPC'de Yanlis Kolon Referanslari (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql` satirlar 609-611

**Kanit:**
```sql
DELETE FROM likes WHERE liker_id = p_user_id OR liked_id = p_user_id;
DELETE FROM matches WHERE user1_id = p_user_id OR user2_id = p_user_id;
DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_user_id = p_user_id;
```

- `likes` tablosu yok (`swipes` tablosu var)
- `matches` tablosu `profile_1_id`/`profile_2_id` kullaniyor
- `blocks` tablosu `blocked_id` kullaniyor, `blocked_user_id` degil

**Etki:** GDPR hesap silme isleminde kullanici verisi (matches, blocks, swipes) silinmiyor. PostgreSQL runtime hatasi olusacak ve tum silme islemi rollback olabilir.

**Duzeltme:**
```sql
DELETE FROM swipes WHERE swiper_id = p_user_id OR swiped_id = p_user_id;
DELETE FROM matches WHERE profile_1_id = p_user_id OR profile_2_id = p_user_id;
DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
```

---

### Detay BE-007: Filtresiz Realtime Conversation Subscription (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/services/chatService.ts` satirlar 329-347

**Kanit:**
```typescript
subscribeToConversationUpdates(
    onUpdate: (conversation: Conversation) => void
): RealtimeChannel | null {
    return supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          // SORUN: Hicbir filter yok! Tum conversations tablosundaki
          // UPDATE eventleri dinleniyor.
        },
        (payload) => onUpdate(payload.new as Conversation)
      )
      .subscribe();
},
```

**Etki:** Supabase Realtime, RLS'yi `postgres_changes` icin row-level filtreleme ile uygular, ancak metadata (conversation guncellendi bilgisi) yine de client'a ulasabilir. Ayrica `last_message_preview` gibi hassas alanlar RLS'ye ragmen Realtime broadcast'te gorunebilir. En az gereksiz network trafigi ve potansiyel bilgi sizintisi.

**Duzeltme:**
```typescript
// Kullanicinin katildigi conversation ID'leri ile filtrele
// veya her conversation icin ayri subscription olustur
subscribeToConversationUpdates(
    conversationIds: string[],
    onUpdate: (conversation: Conversation) => void
): RealtimeChannel[] {
    return conversationIds.map(id =>
        supabase.channel(`conv:${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversations',
                filter: `id=eq.${id}`,
            }, (payload) => onUpdate(payload.new as Conversation))
            .subscribe()
    );
}
```

---

### Detay BE-008: getSession ile Auth Dogrulama (Server-side Kontrolsuz) (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/App.tsx` satirlar 167-169

**Kanit:**
```typescript
getSession().then(({ data }) => {
    if (data.session) {
        setAuthStep('APP');
    }
});
```

`authService.ts` satir 44-46:
```typescript
export const getSession = async () => {
  return supabase.auth.getSession();
};
```

**Etki:** Supabase'in `getSession()` metodu local storage'dan JWT token'i okur ve sunucu dogrulamasi yapmaz. Bir saldirgan localStorage'da manipule edilmis bir session objesi olusturursa, uygulamanin auth state'ini bypass edebilir. Supabase dokumantasyonu guvenli auth kontrolu icin `getUser()` kullanilmasini onerir.

**Duzeltme:**
```typescript
// getSession yerine getUser kullan
import { getCurrentUser } from './services/authService';

getCurrentUser().then(({ data }) => {
    if (data.user) {
        setAuthStep('APP');
    }
});
```

---

### Detay BE-009: Hardcoded Supabase URL Fallback (Mobile) (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/mobile/src/services/supabase.ts` satir 11

**Kanit:**
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cxhwwgnogpsupnbbxvae.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
```

**Etki:** Gercek bir Supabase instance URL'si kaynak koduna gomulmus. Environment variable eksik oldugunda bu fallback kullanilir. Bu hem guvenlik riski (instance kesfedilebilir) hem de anon key bos string ise uygulamanin sessizce basarisiz olacagi anlamina gelir.

**Duzeltme:**
```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing required Supabase environment variables');
}
```

---

### Detay BE-010: Discovery Motoru Tamamen Mock Data Kullaniyor (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/App.tsx` satirlar 2, 531

**Kanit:**
```typescript
import { MOCK_PROFILES, MOCK_LIKES_YOU_PROFILES, ... } from './constants';

// satir 531:
let filtered = MOCK_PROFILES.filter(profile => {
    if (blockedProfileIds.has(profile.id)) return false;
    // ...
});
```

**Etki:** Uygulamanin ana ozelligi olan profil kesfi tamamen mock data kullaniyor. Gercek kullanici profilleri veritabanindan cekilmiyor. Production'da tum kullanicilar ayni sahte profilleri gorecek. Bu bir UX sorunu degil, bir veri butunlugu sorunu -- swipe'lar, matchler, begeniler gercek kullanicilara baglanmiyor.

**Duzeltme:** `MOCK_PROFILES` kullanimini Supabase query'leri ile degistir:
```typescript
const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .eq('is_active', true)
    .limit(50);
```

---

### Detay BE-011: Client Servislerinde Rate Limiting Yok (MEDIUM)

**Dosyalar:** Tum `services/*.ts` dosyalari

**Kanit:** `services/` dizinindeki hicbir dosyada rate limiting implementasyonu yok. `grep -r "rate.?limit\|throttle" services/` sonucu bos donuyor.

**Etki:**
- `sendMessage`: Sinirsiz mesaj gonderilebilir (spam)
- `uploadFromFile`: Sinirsiz dosya yuklenebilir (storage abuse)
- `signUpWithEmail`/`signInWithEmail`: Brute force saldirilari
- `blockProfile`/`reportProfile`: Report flooding

Not: Supabase'in kendi rate limitleri mevcut (GoTrue icin) ama bunlar cok yuksek ve uygulama seviyesi kontrolleri gerektiriyor.

**Duzeltme:** Her kritik servis icin debounce/throttle wrapper ekle veya Supabase Edge Function seviyesinde rate limiting uygula (generate-icebreaker'daki gibi).

---

### Detay BE-012: notification_outbox ve moderation_queue Icin RLS Policy Eksik (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql` satirlar 317-318

**Kanit:**
```sql
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
-- Policy tanimlanmamis!
```

**Etki:** RLS aktif ama policy tanimlanmamis. Bu "secure by default" -- hicbir kullanici erisemiyor. Ancak bu ayni zamanda service_role erisimini de belgesiz birakiyor. Best practice olarak explicit service_role policy'si tanimlanmali.

**Duzeltme:**
```sql
CREATE POLICY "Service role manages outbox" ON notification_outbox FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages moderation" ON moderation_queue FOR ALL
USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
```

---

### Detay BE-013: Wildcard CORS on Critical Edge Functions (MEDIUM)

**Dosyalar:**
- `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/functions/delete-account/index.ts` satir 19
- `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/functions/moderate-image/index.ts` satir 53
- `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/functions/push-worker/index.ts` satir 44

**Kanit:**
```typescript
'Access-Control-Allow-Origin': '*',
```

**Etki:** `delete-account` gibi kritik islemler icin `Access-Control-Allow-Origin: *` kullanilmasi, herhangi bir kaynak sitesinden bu fonksiyonlara CORS istegi yapilmasina izin verir. CSRF benzeri senaryolarda risk olusturur. (Not: push-worker CRON_SECRET gerektiriyor, bu yuzden riski daha dusuk.)

**Duzeltme:** `create-checkout-session` ve `generate-icebreaker`'daki gibi origin whitelist uygula:
```typescript
const corsHeaders = getCorsHeaders(req.headers.get('origin'), allowedOrigins, appBaseUrl);
```

---

### Detay BE-014: Chat Media Upload'da Dosya Tipi Dogrulamasi Yok (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/services/chatService.ts` satirlar 143-164

**Kanit:**
```typescript
async uploadChatMedia(conversationId: string, file: File | Blob): Promise<...> {
    const timestamp = Date.now();
    const path = `${conversationId}/${user.id}_${timestamp}.jpg`;

    const { error } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(path, file, { contentType: 'image/jpeg' });
    // File tipi, boyutu veya MIME type kontrolu YAPILMIYOR
}
```

Karsilastirma: `photoService.ts` dosyasinda dosya tipi ve boyut kontrolu dogru bir sekilde yapiliyor (`validateFile` metodu).

**Etki:** Kullanici herhangi bir dosya tipini (executable, script, vb.) yukleyip `image/jpeg` olarak etiketleyebilir. Storage bucket seviyesinde MIME type kontrolu mevcut ama client-side validation eksik.

**Duzeltme:**
```typescript
async uploadChatMedia(conversationId: string, file: File | Blob): Promise<...> {
    // photoService.validateFile gibi dogrulama ekle
    const MAX_CHAT_MEDIA_SIZE = 10 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > MAX_CHAT_MEDIA_SIZE) {
        return { path: null, error: new Error('File too large') };
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
        return { path: null, error: new Error('Invalid file type') };
    }
    // ...
}
```

---

### Detay BE-015: Match Notification Trigger Kirik (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql` satirlar 443-448

**Kanit:**
```sql
-- queue_match_notification trigger'i:
INSERT INTO notification_outbox (...)
VALUES
    (NEW.user1_id, 'match', ...),  -- YANLIS: profile_1_id olmali
    (NEW.user2_id, 'match', ...);  -- YANLIS: profile_2_id olmali
```

**Etki:** `matches` tablosunda `user1_id`/`user2_id` kolonlari mevcut degil. Bu trigger calismayacak ve yeni eslesmeler icin bildirim olusturulmayacak. Kullanicilar eslesmelerinden haberdar olamayacak.

**Duzeltme:**
```sql
INSERT INTO notification_outbox (...)
VALUES
    (NEW.profile_1_id, 'match', 'Yeni Esleme!', '...', ...),
    (NEW.profile_2_id, 'match', 'Yeni Esleme!', '...', ...);
```

---

### Detay BE-016: create_conversation'da Race Condition (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/migrations/001_complete_schema.sql` satirlar 536-548

**Kanit:**
```sql
-- Check existing
SELECT cp1.conversation_id INTO existing_conv_id
FROM conversation_participants cp1
JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
WHERE cp1.user_id = p_user1_id
    AND cp2.user_id = p_user2_id
    AND cp1.is_deleted = FALSE
    AND cp2.is_deleted = FALSE
LIMIT 1;

IF existing_conv_id IS NOT NULL THEN
    RETURN existing_conv_id;
END IF;

-- Create new (race condition penceresi burada)
INSERT INTO conversations DEFAULT VALUES
RETURNING id INTO new_conv_id;
```

**Etki:** Iki kullanici ayni anda conversation olusturmaya calisirsa, iki ayri conversation olusabilir. `conversation_participants` tablosunda `(conversation_id, user_id)` UNIQUE constraint mevcut ama bu farkli conversation_id'ler icin koruma saglamiyor.

**Duzeltme:**
`SELECT ... FOR UPDATE` kullanarak veya ayri bir `(LEAST(user1, user2), GREATEST(user1, user2))` unique constraint ekleyerek coz.

---

### Detay BE-017: signUpWithEmail Metadata Dogrulamasi Yok (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/services/authService.ts` satirlar 28-33

**Kanit:**
```typescript
export const signUpWithEmail = async (email: string, password: string, metadata?: Record<string, unknown>) => {
  return supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  });
};
```

**Etki:** `metadata` parametresi `Record<string, unknown>` tipinde, herhangi bir Zod/schema dogrulamasi yok. Keyfi veri `auth.users.raw_user_meta_data`'ya yazilabilir.

**Duzeltme:**
```typescript
const signUpMetadataSchema = z.object({
    name: z.string().min(2).max(100),
    role: z.nativeEnum(MedicalRole),
}).strict();

export const signUpWithEmail = async (email: string, password: string, metadata?: z.infer<typeof signUpMetadataSchema>) => {
    if (metadata) {
        signUpMetadataSchema.parse(metadata);
    }
    return supabase.auth.signUp({ ... });
};
```

---

### Detay BE-018: Notification Preferences Read-Then-Write Race Condition (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/services/pushService.ts` satirlar 330-365

**Kanit:**
```typescript
async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<...> {
    // Step 1: Read
    const { data: currentData } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .single();

    const currentSettings = currentData?.notification_settings || {};

    // Step 2: Write (race condition penceresi)
    const { error } = await supabase
        .from('profiles')
        .update({
            notification_settings: { ...currentSettings, ...preferences },
        })
        .eq('id', user.id);
}
```

**Etki:** Read ve write arasinda baska bir istek ayarlari degistirirse, onceki degisiklik kaybolur (lost update problemi).

**Duzeltme:** PostgreSQL `jsonb_set` veya RPC fonksiyonu ile atomik guncelleme yap.

---

### Detay BE-019: Chat Mesajlarinda Input Sanitization Yok (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/services/chatService.ts` satirlar 109-137

**Kanit:**
```typescript
async sendMessage(params: SendMessageParams): Promise<...> {
    const { conversationId, content, messageType = 'text', mediaPath } = params;

    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content,  // Dogrudan DB'ye yaziliyor, sanitization yok
            message_type: messageType,
            media_path: mediaPath,
        })
```

**Etki:** Mesaj icerigi icin max length, HTML strip, veya XSS sanitization uygulanmiyor. React varsayilan olarak XSS'e karsi koruma saglar ama `dangerouslySetInnerHTML` kullanildiysa veya mesaj baska bir context'te (push notification, email) render edildiyse risk olusur.

**Duzeltme:**
```typescript
const MAX_MESSAGE_LENGTH = 5000;
const sanitizedContent = content.trim().slice(0, MAX_MESSAGE_LENGTH);
if (!sanitizedContent) {
    return { message: null, error: new Error('Message cannot be empty') };
}
```

---

### Detay BE-020: Zustand Store'lar Mock Data ile Baslatiliyor (LOW)

**Dosyalar:**
- `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/stores/matchStore.ts` satir 34
- `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/stores/notificationStore.ts` satir 14

**Kanit:**
```typescript
// matchStore.ts
swipeHistory: MOCK_SWIPE_HISTORY,

// notificationStore.ts
notifications: MOCK_NOTIFICATIONS,
```

**Etki:** Production'da kullanicilar sahte swipe history ve sahte bildirimlerle karsilasacak. Veri karmasasi ve kullanici guveni kaybi.

**Duzeltme:**
```typescript
swipeHistory: [],
notifications: [],
```

---

### Detay BE-021: Plan Isimleri Uyumsuzlugu (Client vs Webhook) (LOW)

**Dosyalar:**
- `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/services/checkoutService.ts` satir 3
- `/Users/umitboragunaydin/Desktop/Eski Masaustru/vitalis---elite-medical-dating/supabase/functions/webhooks-stripe/index.ts` satir 16

**Kanit:**
```typescript
// checkoutService.ts:
createCheckoutSession(plan: 'GOLD' | 'PLATINUM')

// webhooks-stripe/index.ts:
const VALID_PLANS = new Set(['DOSE', 'FORTE', 'ULTRA', 'GOLD', 'PLATINUM']);
```

Ayrica `types.ts`'de premium tier tanimlari:
```typescript
premiumTier: 'FREE' | 'DOSE' | 'FORTE' | 'ULTRA';
```

**Etki:** Client `GOLD`/`PLATINUM` gonderiyor ama uygulama `DOSE`/`FORTE`/`ULTRA` kullaniyor. Stripe metadata'da hangi plan ismi kullanildigina bagli olarak yanlis abonelik tipi olusabilir.

**Duzeltme:**
```typescript
// checkoutService.ts:
createCheckoutSession(plan: 'DOSE' | 'FORTE' | 'ULTRA')
```

---

## NO FINDING MODULLER

| Modul | Durum | Notlar |
|---|---|---|
| `stores/authStore.ts` | No finding | Minimal, guvenli implementasyon. Session verisi saklamiyor. |
| `stores/uiStore.ts` | No finding | Yalnizca UI state yonetiyor, hassas veri yok. |
| `stores/discoveryStore.ts` | No finding | Yerel state, persist yok, guvenlik riski dusuk. |
| `supabase/functions/push-worker/` | No finding | CRON_SECRET ile korunuyor, idempotent claim mekanizmasi saglam. |
| `supabase/functions/webhooks-stripe/` | No finding | Signature dogrulama, idempotency key, plan validation mevcut. |
| `supabase/functions/create-checkout-session/` | No finding | Auth check, origin whitelist, plan validation dogru uygulanmis. |
| `supabase/functions/generate-icebreaker/` | No finding | Auth, rate limiting, PII anonymization uygulanmis. |
| `supabase/migrations/20260211_security_hardening.sql` | No finding | Kapsamli RLS politikalari dogru tanimlanmis. |
| `supabase/migrations/20260212_account_deletion_executor.sql` | No finding | Service role exclusive, FOR UPDATE ile locking, exception handling mevcut. |
| `supabase/migrations/20260213_verification_documents_storage.sql` | No finding | Storage RLS politikalari dogru uygulanmis. |

---

## MIGRATION CARPISMA ANALIZI

Schema'da iki paralel migration zinciri mevcut ve birbiriyle catisan tanimlar iceriyor:

1. **Orijinal schema** (`20260209_init.sql`): `matches` tablosunda `profile_1_id`/`profile_2_id`, `blocks` tablosunda `blocked_id`
2. **Yeni schema** (`001_complete_schema.sql`): Ayni tablolara `user1_id`/`user2_id`/`blocked_user_id` ile referans veriyor

Bu iki migration'in calistirma sirasi ve ortamina bagli olarak farkli sema durumlari olusuyor. **Bu, BE-001, BE-002, BE-005, BE-006, ve BE-015 bulgularinin temel nedeni.**

**Oneri:** Tum migration'lari tek bir kaynaktan (single source of truth) yeniden olusturun ve kolon isimlerini standardize edin.

---

## GENEL DEGERLEMIDIRME

### Guclu Yanlar
1. **IDOR korumalari:** Tum client servisler `auth.getUser()` kullaniyor (BE-002/BE-008 audit fix'leri uygulanmis)
2. **RLS kapsami genis:** Tum ana tablolarda RLS aktif ve policy tanimli
3. **Stripe webhook guvenli:** Signature dogrulama + idempotency key + plan validation
4. **Icebreaker PII korumasi:** Gemini AI'a gonderilen profiller anonimize ediliyor
5. **Notification sistemi saglam:** Claim-process-reclaim pattern, exponential backoff retry
6. **Verification flow iyi tasarlanmis:** Dual path (corporate email + document), MIME check, filename sanitization

### Zayif Yanlar
1. **Schema tutarsizligi:** Birden fazla migration ayni tablolara farkli kolon adlariyla referans veriyor (4 CRITICAL bulgu)
2. **Mock data kalintilari:** Discovery engine, stores ve constants'ta production kodu yerine mock data kullaniliyor
3. **Rate limiting eksik:** Client servislerinde hicbir rate limiting yok (Supabase varsayilanlari disinda)
4. **CORS wildcard:** Kritik edge function'larda `Access-Control-Allow-Origin: *` kullaniliyor
5. **Input validation eksikleri:** Chat mesajlarinda ve auth metadata'da schema dogrulama yok

---

**RAPOR SONU**
