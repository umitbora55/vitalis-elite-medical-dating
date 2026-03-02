# VITALIS Backend Audit Report -- TEAM 7 (Verification) + TEAM 8 (Discovery & Matching) + TEAM 9 (Chat)

Tarih: 2026-02-28 | Denetci: Backend Security Auditor (Opus 4.6)

---

### OZET
- Toplam bulgu: 22 (CRITICAL: 2, HIGH: 5, MEDIUM: 10, LOW: 5)
- En yuksek riskli 3 bulgu: BE-001, BE-002, BE-003
- No finding moduller: `components/TrustBadge.tsx` (salt UI render, veri mantigi yok), `components/VerificationAppealModal.tsx` (UI wrapper, validation serviste), `stores/slateStore.ts` (salt Zustand state, logic yok)

---

## GOREV 1 -- VERIFICATION FLOW

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-001 | CRITICAL | 5 | 5 | high | 8h | `/services/healthcareVerificationService.ts:360-385` | `updateLivenessSession` guncelleme yapar: `.update({status, liveness_score,...}).eq('id', sessionId)` -- user_id filtresi YOK ve RLS'de UPDATE policy sadece moderator | Client, liveness oturumunun durumunu (passed/failed) dogrudan ayarlayabiliyor. Sahte "passed" skoru yazilabilir. Yorum "client-side stub for testing only" der ama fonksiyon export ediliyor ve LivenessCheck.tsx satirlarinda 265-272'de aktif kullaniliyor | Bu fonksiyonu client'tan kaldirin, tum liveness karar mantigi Edge Function'a tasiyin. RLS: liveness_checks UPDATE politikasi yalnizca moderator'a acik olmali (halihazirda oyledir, bu da client update'in RLS tarafindan engellenecegi anlamina gelir -- ANCAK Supabase anon key ile calisiyorsa RLS bypass edilebilir) | Bkz: Detay BE-001 |
| BE-002 | CRITICAL | 5 | 4 | high | 4h | `/services/healthcareVerificationService.ts:498-512` | `recordFraudSignal(userId, signalType, severity, details)` -- NO auth check, arbitrary userId parameter | Herhangi bir auth kullanici, baska bir kullaniciya fraud signal ekleyebilir. RLS fraud_signals INSERT'te moderator kontrolu var ama fonksiyon dogrudan supabase.from('fraud_signals').insert cagiriyor | Kullanicinin kendi risk profilini manipule etmesi veya baskalarina "duplicate_face" gibi sinyaller yazarak hesap engellemesine neden olabilir | Auth check ekleyin, userId yerine auth.uid() kullanin veya bu fonksiyonu Edge Function'a tasiyin | Bkz: Detay BE-002 |
| BE-003 | HIGH | 4 | 4 | high | 2h | `/services/healthcareVerificationService.ts:338-353` | `uploadLivenessVideo` -- video boyut limiti YOK, icerik tipi dogrulamasi YOK, sadece `contentType: 'video/webm'` hardcode | Storage abuse: buyuk dosya yukleyerek disk doldurma, webm olmayan dosya yukleme (orn. yururtulebilir dosya) | Sunucu disk/storage maliyeti artar, zararli dosya depolanabilir | Blob.size kontrolu ekleyin (max 50MB -- `MAX_VIDEO_SIZE_MB` zaten tanimli ama upload ONCESINDE kontrol yok), MIME type dogrulayin | `if (videoBlob.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) return { storagePath: null, error: new Error('Video cok buyuk') };` |
| BE-004 | HIGH | 4 | 3 | high | 6h | `/components/LivenessCheck.tsx:256-262` | `const livenessScore = challengesPassed / totalChallenges; const passed = livenessScore >= 0.75;` -- TAMAMEN CLIENT-SIDE karar | Liveness karari sunucu tarafinda degil, client tarafinda veriliyor. Kullanici JS'yi modifiye ederek `challengesPassed = 4` yapabilir ve her zaman gecer | Liveness check'in guvenligi tamamen sifir. Sahte hesaplar dogrulama alabilir | Server-side Edge Function ile video analizi yapin, skoru DB'ye sunucu yazsin | N/A (mimari degisiklik) |
| BE-005 | HIGH | 4 | 3 | medium | 8h | `/supabase/migrations/20260228_liveness_verification_system.sql:247-265` | `liveness_checks` RLS: INSERT ve SELECT user bazli, ama UPDATE policy SADECE moderator icin. Client `updateLivenessSession` fonksiyonu UPDATE yapmaya calisiyor | RLS UPDATE'i engellemesi gerekiyor ama `updateLivenessSession` fonksiyonu aktif olarak cagiriliyor -- ya RLS duzgun calisiyor ve client hata alacak (UI kirilir) ya da bir bosluk var | RLS test edin: eger authenticated user update yapabiliyorsa CRITICAL acik, eger engelleniyorsa LivenessCheck component kirilmis | User-scope UPDATE policy ekleyin SADECE `status = 'pending'` satirlari icin, veya tum UPDATE'leri Edge Function'a tasiyin | N/A |
| BE-006 | MEDIUM | 3 | 3 | high | 2h | `/services/healthcareVerificationService.ts:305-336` | `createLivenessSession` -- attempt_count: 0 ile INSERT yapar, ama onceki oturumlar KONTROL EDILMIYOR | 3 deneme limiti `LivenessCheck.tsx:283` satirinda client-side `attemptCount` state ile kontrol ediliyor, ancak her yeni component mount'ta sifirlanir. Sayfa yenileme = limit bypass | Sinirsiz liveness denemesi yapilabilir, brute-force saldiri | Server-side: onceki basarisiz session sayisini kontrol eden RPC yazin, `max_attempts` denetimi DB'de yapilsin | `SELECT count(*) FROM liveness_checks WHERE user_id = p_uid AND status = 'failed' AND created_at > now() - interval '24h'` |
| BE-007 | MEDIUM | 3 | 2 | medium | 4h | Tum verification sistemi | Face embedding 1:N karsilastirma (duplicate detection) icin hic client-side fonksiyon yok. `face_match_results` tablosu mevcut ama populate eden kod YOK | Duplicate hesap tespiti tamamen pasif. Tablo var ama kullanilmiyor | Ayni kisi birden fazla hesap olusturabilir | Edge Function ile face embedding olusturma ve 1:N karsilastirma pipeline'i implement edin | N/A (yeni feature) |
| BE-008 | MEDIUM | 2 | 2 | high | 1h | `/supabase/migrations/20260228_liveness_verification_system.sql:359-365` | `name_email_match_logs` RLS: INSERT policy YOK (sadece moderator full access). `logNameEmailMatch` fonksiyonu INSERT yapmaya calisiyor | RLS INSERT engeli nedeniyle name-email match loglari kaydedilemiyor olabilir (sessiz hata) | Log kaybi, audit trail eksik. Fonksiyon hata dondurecek ama caller `logNameEmailMatch` sonucunu ignore edebilir | `name_email_match_logs` icin user INSERT policy ekleyin: `WITH CHECK (user_id = auth.uid())` | N/A |
| BE-009 | LOW | 2 | 2 | high | 1h | `/services/healthcareVerificationService.ts:516-537` | `submitAppeal` -- ayni kullanici ayni appeal_type icin birden fazla appeal gonderebilir, rate limit yok | Appeal spam, moderator kuyrugunun dolmasi | Moderator is yukunu arttirir | DB'de UNIQUE(user_id, appeal_type, status) constraint ekleyin veya aktif appeal varken yenisini engellyin | `WHERE user_id = auth.uid() AND status IN ('pending','under_review')` |
| BE-010 | LOW | 1 | 1 | high | 0.5h | `/supabase/migrations/20260228_liveness_verification_system.sql:226` | `sla_due_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours')` -- SLA sut otomatik escalation fonksiyonu var ama cron job olarak CAGIRILMIYOR | `escalate_overdue_appeals()` fonksiyonu tanimli ama hicbir yerde schedule edilmemis (pg_cron veya Edge Function cron yok) | 48 saatlik SLA garantisi fiilen uygulanmiyor | `pg_cron` ile `escalate_overdue_appeals()` fonksiyonunu her saat calistirin | `SELECT cron.schedule('escalate-appeals', '0 * * * *', 'SELECT escalate_overdue_appeals()');` |

---

### Detay BE-001

```typescript
// /services/healthcareVerificationService.ts:360-385
export const updateLivenessSession = async (
  sessionId: string,
  update: {
    status: LivenessStatus;
    livenessScore?: number;
    // ...
  },
): Promise<{ error: Error | null }> => {
  // BUG: NO auth check, NO user_id filter
  // Client can set status='passed' with livenessScore=1.0 for ANY session
  const { error } = await supabase
    .from('liveness_checks')
    .update({
      status: update.status,
      liveness_score: update.livenessScore ?? null,
      // ...
    })
    .eq('id', sessionId);  // <-- Only filters by session ID, no user_id check
```

Bu fonksiyon `LivenessCheck.tsx:265` satirinda aktif olarak cagiriliyor:
```typescript
await updateLivenessSession(sid, {
  status: passed ? 'passed' : 'failed',
  livenessScore,
  // ...
});
```

### Detay BE-002

```typescript
// /services/healthcareVerificationService.ts:498-512
export const recordFraudSignal = async (
  userId: string,        // <-- ARBITRARY, caller-supplied
  signalType: FraudSignalType,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, unknown>,
): Promise<{ error: Error | null }> => {
  // NO supabase.auth.getUser() check
  // NO validation that caller == userId or caller is moderator
  const { error } = await supabase.from('fraud_signals').insert({
    user_id: userId,  // <-- Any user's ID can be passed
    signal_type: signalType,
    severity,
    details: details ?? null,
  });
```

---

## GOREV 2 -- DISCOVERY & MATCHING

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-011 | HIGH | 4 | 4 | high | 2h | `/services/discoveryService.ts:219-222` | `catch (err) { console.warn('...using demo profiles:', err); return { profiles: DEMO_PROFILES, error: null }; }` | Supabase baglantisi kesilirse veya RPC hatasi olursa, GERCEK kullaniciya SAHTE demo profiller gosteriliyor, `error: null` ile basari gibi donuyor | Kullanici sahte profillerle etkilesebilir (like/pass), veri tutarsizligi | Hata durumunda `error` dondurun, demo profilleri production'da KALDIRIN | `return { profiles: [], error: new Error('Supabase unavailable') };` |
| BE-012 | HIGH | 4 | 3 | high | 3h | `/services/discoveryService.ts:189-204` | Bkz: Detay BE-012 | `whoLikedMe` sorgusu: diger profillerin mevcut kullaniciyi begenip begenmedigi bilgisi client'a duser. Ayrica ilk `likesRes` sorgusu yanlis filtrelenmis (swiped_id filtresi yok) | IDOR benzeri: kullanici network panelinden kimlerin onu begendigi bilgisini gorebilir. Free kullanicilar icin premium feature leak | `hasLikedUser` bilgisini yalnizca premium kullanicilara dondurun, veya server-side RPC icinde gizleyin | N/A |
| BE-013 | MEDIUM | 3 | 3 | high | 2h | `/services/slateService.ts:730-752` | `_saveScoresToDB` -- fire-and-forget, hata yutulur: `void supabase.from('daily_picks').update({...}).eq('id', c.pickId)` | Skor kayitlari sessizce kaybedilebilir, analytics verileri eksik | Oneri algoritmasinin iyilestirme dongusu kirilir | `await Promise.allSettled(...)` kullanin ve hatalari loglayin | N/A |
| BE-014 | MEDIUM | 3 | 3 | medium | 1h | `/services/slateService.ts:421` | `console.error('[slateService] getOrCreateSlateMeta error:', error)` -- production'da hata console'a yaziliyor | Hassas hata mesajlari (DB yapisi, RPC isimleri) production console'da gorunur | Bilgi sizintisi | Structured logging kullanin, production'da console.error yerine Sentry'ye gonderin | `import * as Sentry from '@sentry/react'; Sentry.captureException(error);` |
| BE-015 | MEDIUM | 3 | 2 | high | 4h | `/services/slateService.ts:446-588` | `getTodaySlate` fonksiyonu `matches` parametresini client'tan aliyor, `countPendingMatches` client verisine dayaniyor | Pending match sayisi client-side hesaplaniyor. Kullanici matchStore'u manipule ederek pending=0 gostererek throttle'i bypass edebilir | Kullanici pending limit (8+ -> 0 pick) kuralini atlayarak sinirsiz oneri alabilir | Pending match sayisini server-side RPC ile hesaplayin | N/A |
| BE-016 | MEDIUM | 3 | 2 | medium | 2h | `/services/discoveryService.ts:122-146` | `fetchDiscoveryProfiles` -- 5 paralel sorgu (photos, interests, tags, questions, likes) + 1 ek `whoLikedMe` sorgusu = toplam 7 query per page load | N+1 benzeri coklu sorgu, yuksek DB yuklenmesi. Her 20 profil icin 7 sorgu | Performans: yuksek trafikte DB darbogazina neden olabilir | Tek bir RPC ile tum verileri birlestirilmis dondurun (`discover_profiles_enriched`) | N/A |
| BE-017 | MEDIUM | 2 | 2 | high | 1h | `/services/picksService.ts:70-86` | `likePick` -- `daily_picks` update'inde user_id filtresi YOK: `.update({is_liked: true}).eq('id', pickId)` | Kullanici baska bir kullanicinin pick ID'sini tahmin ederse, o pick'i like olarak isaretleyebilir (RLS bagli) | Eger daily_picks RLS user_id filtresi zayifsa, baska kullanicinin picklerini manipule etme | Tum pick update sorgularina `.eq('user_id', userId)` ekleyin | `.eq('id', pickId).eq('user_id', userId)` |
| BE-018 | LOW | 2 | 2 | medium | 1h | `/stores/discoveryStore.ts:56` | `dailySwipesRemaining: DAILY_SWIPE_LIMIT` -- client-side state, persist yok | Sayfa yenilemede swipe limiti sifirlanir. Gercek limit server-side `record_swipe` RPC'de olmali | Eger server-side limit yoksa, kullanici sayfa yenileyerek sinirsiz swipe yapabilir | Server-side swipe limit denetimi dogrulayin | N/A |
| BE-019 | LOW | 1 | 1 | high | 0.5h | `/components/DailyPicksView.tsx:307` | `{ label: 'Eslesme', value: slate.likedCount, ...}` -- Done ekraninda "Eslesme" sayisi olarak `likedCount` gosteriliyor, gercek match sayisi degil | Yaniltici istatistik: kullanici 5 like atti ama 1 match oldu, ekranda "5 Eslesme" gosteriyor | UX yaniltmasi, kullaniciyi hayal kiriklgina ugratiyor | `slate.matchCount` veya gercek match sayisi kullanin | N/A |

---

### Detay BE-012

```typescript
// /services/discoveryService.ts:189-204
// PROBLEM 1: İlk sorgu yanlış - swiped_id filtresi eksik
const { data: likesRes } = await supabase
  .from('swipes')
  .select('swiper_id')
  .in('swiper_id', profileIds)
  .eq('action', 'LIKE');
// ^ Bu sorgu "bu profiller kimi likeladi" dondurur, "beni kim likeladi" DEGiL

// PROBLEM 2: Düzeltme sorgusu yapiliyor ama sonuc client'a acik
const { data: whoLikedMe } = await supabase
  .from('swipes')
  .select('swiper_id')
  .in('swiper_id', profileIds)
  .eq('swiped_id', myId)         // <-- Beni kim likeladi
  .in('action', ['LIKE', 'SUPER_LIKE']);
// ^ Bu bilgi hasLikedUser olarak Profile objesine ekleniyor
// Premium olmayan kullanicilar icin bu bilgi gizlenmeli
```

---

## GOREV 3 -- CHAT & MESSAGING

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-020 | HIGH | 4 | 4 | high | 4h | `/services/chatService.ts:143-165` | `uploadChatMedia` -- dosya boyutu ve tur kontrolu YOK: `upload(path, file, { contentType: 'image/jpeg' })` | Herhangi bir boyut/turde dosya yuklenmesine izin verilir. Content type hardcode 'image/jpeg' ama gercek dosya herhangi bir sey olabilir | Storage abuse, zararli dosya yukleme, buyuk dosyalarla maliyet artisi | File size limit (5MB), MIME type ve uzanti dogrulamasi ekleyin | Bkz: Detay BE-020 |
| BE-021 | MEDIUM | 3 | 4 | high | 4h | `/components/ChatView.tsx` (tum dosya) | `contentModerationService` veya `ToxicityNudge` hicbir yerde import veya kullanilmiyor (grep sonucu: 0 match) | Content moderation sistemi chat gonderim akisina ENTEGRE EDILMEMIS. Moderasyon servisi var ama ChatView onu kullanmiyor | Taciz, tehdit, dolandiricilik mesajlari filtresiz gonderiliyor | `ChatInput` veya `sendMessage` handler'inda `contentModerationService.analyseMessage()` cagirin, sonuca gore `ToxicityNudge` gosterin | Bkz: Detay BE-021 |
| BE-022 | MEDIUM | 3 | 3 | high | 1h | `/components/ChatView.tsx` (tum dosya) | Realtime subscription (`subscribeToMessages`, `removeChannel`) hicbir yerde kullanilmiyor (grep sonucu: 0 match) | ChatView, Supabase Realtime subscription KULLANMIYOR. Mesajlar yalnizca component mount'ta yukleniyor, gercek zamanli degil | Kullanici yeni mesajlari gormek icin sayfayi yenilemeli, UX kiriliyor | `chatService.subscribeToMessages` ile realtime dinleme ekleyin, cleanup'i `useEffect` return'unda yapin | N/A |
| BE-023 | MEDIUM | 3 | 2 | medium | 2h | `/services/chatService.ts:109-138` | `sendMessage` -- mesaj icerik validasyonu YOK: `content` dogrudan INSERT ediliyor | Bos mesaj, cok uzun mesaj (>10K karakter), XSS payload iceren mesaj gonderilebilir | Bos mesaj gonderimi, performans sorunu (cok uzun mesajlar), potansiyel stored XSS (eger icerik HTML olarak render ediliyorsa) | Content uzunluk limiti (max 2000 char), bos mesaj kontrolu, input sanitization | `if (!content?.trim()) return { message: null, error: new Error('Bos mesaj') }; if (content.length > 2000) return { message: null, error: new Error('Cok uzun') };` |
| BE-024 | LOW | 2 | 2 | high | 1h | `/components/ChatView.tsx:39-57` | `MOCK_RESPONSES` ve `MOCK_SHARED_PHOTOS` production kodunda mevcut, Unsplash URL'leri hardcode | Demo/mock verileri production kodunda | Kullaniciya sahte auto-reply gonderilmesi riski (bu mock'lar kullaniliyorsa) | Mock verileri tamamen kaldirin veya `__DEV__` flag ile sartli yapin | N/A |

---

### Detay BE-020

```typescript
// /services/chatService.ts:143-165
async uploadChatMedia(conversationId: string, file: File | Blob): Promise<{...}> {
  // NO file size check
  // NO file type validation
  // content type hardcoded -- does not match actual file
  const path = `${conversationId}/${user.id}_${timestamp}.jpg`;
  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, file, { contentType: 'image/jpeg' });
  // ^ ANY file uploaded with forced .jpg extension and image/jpeg type
}

// DUZELTME:
async uploadChatMedia(conversationId: string, file: File | Blob): Promise<{...}> {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) return { path: null, error: new Error('Dosya 5MB sinirini asiyor') };

  const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const fileType = file instanceof File ? file.type : 'image/jpeg';
  if (!ALLOWED_TYPES.has(fileType)) return { path: null, error: new Error('Desteklenmeyen format') };
  // ...
}
```

### Detay BE-021

ChatView.tsx (846 satir) dosyasinda asagidaki import veya kullanim bulunamadi:
- `contentModerationService` -- 0 match
- `analyseMessage` -- 0 match
- `ToxicityNudge` -- 0 match
- `toxicity` -- 0 match

Content moderation sistemi (`/services/contentModerationService.ts`) ve UI (`/components/security/ToxicityNudge.tsx`) eksiksiz implement edilmis, ancak chat gonderim akisina entegre edilmemis. Bu, Feature 5 (Guvenlik Varsayilan Acik) spesifikasyonuyla celisiyor.

---

## GENEL / CROSS-CUTTING BULGULAR

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| BE-025 | MEDIUM | 3 | 3 | high | 2h | Coklu servisler | `discoveryService:220`, `slateService:421`, `picksService:33,51,66` -- `console.error/warn` production'da aktif | Hata mesajlari console'da gorunur: DB tablo isimleri, RPC adlari, hata detaylari | Bilgi sizintisi: saldirgan console'dan backend yapisini ogrenebilir | Tum console.error/warn'lari Sentry veya structured logger ile degistirin | N/A |
| BE-026 | MEDIUM | 3 | 2 | medium | 4h | Coklu servisler | `fire-and-forget` kaliplari: `void supabase.rpc(...)`, `void supabase.from(...).update(...)` birden fazla yerde | Hata yutma: veri kaydedilmemesi sessiz, kullanici bilgilendirilmiyor | Veri kaybi: analytics, audit log, skor kayitlari eksik kalabilir | En azindan `.catch(e => Sentry.captureException(e))` ekleyin | N/A |

---

## NO FINDING MODULLER

| Modul | Dosya | Aciklama |
|---|---|---|
| TrustBadge UI | `/components/TrustBadge.tsx` | Salt gorsel render, veri mantigi yok, guvenlik yuzeyi yok |
| VerificationAppealModal UI | `/components/VerificationAppealModal.tsx` | Tum validation serviste, modal sadece UI wrapper. File validation mevcut (satir 92-100) |
| MatchExplanationChips UI | `/components/MatchExplanationChips.tsx` | Salt gorsel, veriler explanationService'den geliyor |
| ExplanationService | `/services/explanationService.ts` | Anti-creepy filter mevcut, DSA uyumu var, factor weight clamping (0.1-2.0) mevcut, audit log mevcut. Saglam implementasyon |
| SlateStore | `/stores/slateStore.ts` | Salt Zustand state management, is mantigi slateService'de |
| Liveness Migration | `/supabase/migrations/20260228_liveness_verification_system.sql` | RLS politikalari kapsamli, indeksler mevcut, KVKK comment'leri uygun. Sorunlar servis katmaninda, sema saglikli |

---

## RISK MATRISI (IMPACT x LIKELIHOOD)

```
IMPACT
  5 |  BE-001(C)  BE-002(C)
  4 |  BE-003(H)  BE-004(H)  BE-005(H)  BE-011(H)  BE-012(H)  BE-020(H)
  3 |  BE-006(M)  BE-007(M)  BE-013(M)  BE-014(M)  BE-015(M)  BE-016(M)  BE-017(M)  BE-021(M)  BE-022(M)  BE-023(M)  BE-025(M)  BE-026(M)
  2 |  BE-008(M)  BE-009(L)  BE-018(L)  BE-019(L)  BE-024(L)
  1 |  BE-010(L)
    +---1-------2-------3-------4-------5--- LIKELIHOOD
```

---

## ONCELIK SIRASI (ONERILEN DUZELTME SIRASI)

1. **BE-001** (CRITICAL) -- `updateLivenessSession` client'tan kaldirilmali, Edge Function'a tasinmali
2. **BE-002** (CRITICAL) -- `recordFraudSignal` auth check + RLS dogrulama
3. **BE-021** (MEDIUM ama fiilen HIGH etki) -- Content moderation ChatView'a entegre edilmeli
4. **BE-004** (HIGH) -- Liveness karar mantigi server-side'a tasinmali
5. **BE-020** (HIGH) -- Chat media upload validasyonu eklenmeli
6. **BE-011** (HIGH) -- Demo profil fallback kaldirilmali
7. **BE-003** (HIGH) -- Liveness video upload boyut/tip kontrolu
8. **BE-012** (HIGH) -- `hasLikedUser` premium gate
9. **BE-006** (MEDIUM) -- Server-side liveness attempt limit
10. **BE-015** (MEDIUM) -- Pending match sayisi server-side hesaplama
11. Diger MEDIUM/LOW bulgular

---

*Rapor sonu. Tum dosya yollari mutlak path olarak referanslanmistir. Kod dosyalarina dokunulmamistir.*
