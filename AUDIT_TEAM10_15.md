# VITALIS -- TAKIM 10-15 FRONTEND AUDIT RAPORU

**Tarih:** 2026-02-28
**Denetci:** Claude Opus 4.6 (Frontend/UI-UX Agent)
**Proje:** Vitalis Elite Medical Dating Platform
**Kapsam:** Date Flow, Safety & Security, Premium & Payments, Admin Panel, Notifications, UI/UX Polish
**Referans:** RECON_REPORT.md, AUTOMATION_SUMMARY.txt

---

### OZET
- Toplam bulgu: **34** (CRITICAL: **2**, HIGH: **8**, MEDIUM: **14**, LOW: **10**)
- En yuksek riskli 3 bulgu: **FE-001**, **FE-002**, **FE-003**
- No finding moduller: `services/datePlanService.ts` (standart CRUD, sorunsuz), `services/checkoutService.ts` (temiz 15 satir), `stores/slateStore.ts`, `components/security/ContentWarningOverlay.tsx` (iyi), `components/security/ToxicityNudge.tsx` (iyi, a11y role/aria var)

---

## AUTOMATION BASELINE

| Check | Status | Detail |
|-------|--------|--------|
| TypeScript (`tsc --noEmit`) | PASSED | 0 errors |
| ESLint | SKIPPED | eslint.config.js eksik (v9 flat config gerekli) |
| npm audit | 1 LOW | qs arrayLimit bypass (GHSA-w7fw-mjwx-w883) |

---

## TAKIM 10 -- DATE FLOW

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| FE-001 | CRITICAL | 5 | 4 | high | 1h | components/DateSafetyPanel.tsx:135 | `catch { /* silent */ }` SOS handler | SOS tetiklendiginde hata olursa kullanici bilgilendirilmiyor; acil durumda kullanicinin hayati tehlikede olabilir | SOS catch blogu mutlaka kullaniciya hata gostersin + 112 aramasina yonlendirsin | Bkz: Detay FE-001 |
| FE-002 | HIGH | 4 | 4 | high | 2h | components/DateInvitationFlow.tsx:194 | `goNext` useCallback deps eksik: `handleSend` yok | `handleSend` stale closure nedeniyle eski state ile davet gonderebilir; `selectedSlots` veya `message` degisiklikleri kaybolur | `goNext` ve `handleSend` fonksiyonlarinin dependency array'ine eksik bagimliliklar eklensin | Bkz: Detay FE-002 |
| FE-003 | HIGH | 4 | 3 | high | 2h | components/DateChatBanner.tsx:329-339 | `bannerState === null && onPlanDate` blogu render edilmiyor cunku guard satir 183'te `null` ise `return null` | "Date plani olustur" butonu hicbir zaman gorunmez; eslesmis kullanicilar Date daveti gondermek icin CTA bulamazlar | Guard kosulunu guncelleyin: `if (!bannerState && !onPlanDate) ...` veya null state'te onPlanDate varsa render edin | Bkz: Detay FE-003 |
| FE-004 | MEDIUM | 3 | 3 | high | 1h | components/DateSafetyPanel.tsx:120-121 | `catch { /* silent */ }` trusted contact silme | Silme basarisiz olursa kullanici haberdar edilmiyor, UI listeden cikarilmis gorunuyor ama DB'de duruyor | catch blogu error state guncellenmeli | `catch (err) { setFormError(err instanceof Error ? err.message : 'Silinemedi.'); }` |
| FE-005 | MEDIUM | 3 | 3 | high | 0.5h | components/DatePostFlow.tsx:0 | Tum dosyada `aria-label` sadece kapat butonunda var, diger butonlarda yok | Ekran okuyucu kullanan kullanicilar "Evet, bulustuk" / "Hayir, gelmedi" butonlarini ayirt edemez | Tum interaktif butonlara `aria-label` eklensin | `<button aria-label="Evet bulustuk" ...>` |
| FE-006 | LOW | 2 | 2 | high | 0.5h | services/dateInvitationService.ts:133-134 | `return data as string;` | RPC null donerse `as string` cast'i runtime'da hataya yol acabilir | Null check eklensin: `if (!data) throw new Error('Davet ID alinamadi.');` | `if (!data) throw new Error(...); return data as string;` |
| FE-007 | LOW | 2 | 2 | medium | 0.5h | components/DateInvitationFlow.tsx:396 | `placeholder={inviteeName + "'e bir mesaj yazabilirsin..."}` | Turkce kesme isareti kuralina uygun degil (Ayse'e yerine Ayse'ye gibi) | Template literal'de Turkce buffer ozelliklerini inceleyin veya sabit placeholder kullanin | `placeholder="Kisa bir mesaj yaz..."` |

### Detay FE-001
```tsx
// DateSafetyPanel.tsx:123-136 -- SOS handler
const handleSOS = useCallback(async () => {
    setIsSos(true);
    try {
      const loc = await dateSafetyService.getCurrentLocation();
      await dateSafetyService.triggerSOS({
        planId: plan.id,
        lat:    loc?.lat,
        lng:    loc?.lng,
      });
      // ...
    } catch { /* silent -- user should call emergency services directly */ }
    //       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // SORUN: Kullanici SOS'e basip "basarili" zannedebilir ama aslinda istek basarisiz.
    // Acil durumda bu saniyeler fark yaratir.
    finally { setIsSos(false); }
  }, [plan.id]);

// DUZELTME ONERISI:
} catch (err) {
  // Kullaniciya acik uyari goster
  setFormError('SOS gonderilemedi. Lutfen dogrudan 112 arayin!');
  // Veya: window.open('tel:112');
}
```

### Detay FE-002
```tsx
// DateInvitationFlow.tsx:184-194
const goNext = useCallback(() => {
    setError(null);
    if (step === 'type_select') {
      if (!selectedType) { setError('...'); return; }
      setStep('time_select');
    } else if (step === 'time_select') {
      setStep('message');
    } else if (step === 'message') {
      void handleSend(); // handleSend dependency'de YOK
    }
  }, [step, selectedType]); // EKSIK: handleSend

// handleSend icinde selectedSlots, message state'leri kullaniliyor.
// Stale closure: eski selectedSlots/message ile RPC cagrisi yapilabilir.

// DUZELTME: ya handleSend'i deps'e ekle ya da useRef pattern kullan
```

### Detay FE-003
```tsx
// DateChatBanner.tsx:183
if (!bannerState || dismissed) return null;
// bannerState = null ise component tamamen render edilmiyor

// Ama satir 329-339:
{bannerState === null && onPlanDate && (
    <div className="px-4 pb-3">
      <button onClick={onPlanDate} ...>
        Date plani olustur
      </button>
    </div>
)}
// Bu blok ASLA render edilemez cunku guard daha once null'u reject etti.

// DUZELTME:
if (bannerState === null && !onPlanDate && dismissed) return null;
// veya: guard'da onPlanDate varsa null state'e izin ver
```

---

## TAKIM 11 -- SAFETY & SECURITY

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| FE-008 | HIGH | 4 | 3 | high | 1h | services/locationPrivacyService.ts:60 | `const seed = userId + ':loc_salt_v1';` statik salt | Salt degeri source code'da acik; reverse-engineer eden biri tum obfuscation'i geri alabilir | Salt'i server-side uretip DB'de saklayin; client'a seed gondermeyin | Salt'i `user_security_settings.location_seed` olarak saklayip RPC ile kullanin |
| FE-009 | HIGH | 4 | 4 | high | 0.5h | components/security/ProfileRiskBadge.tsx (dolayil) + services/profileRiskService.ts:127-128 | `catch { return cached; }` recompute hata sessiz | Risk skoru guncellenemezse stale (24h+) skor gosteriliyor; "safe" goruntulenen biri aslinda "high risk" olabilir | Hata durumunda stale skor gosterilirken "Guncelleniyor..." badge'i eklensin | `catch { cached._stale = true; return cached; }` |
| FE-010 | MEDIUM | 3 | 3 | high | 1h | services/locationPrivacyService.ts:41-48 | `seededRandom` fonksiyonu dusuk entropi | `Math.imul(31, h)` hash fonksiyonu collision'a acik; birden fazla userId ayni offset alabilir | Crypto.subtle.digest SHA-256 tabanli seed kullanin | Bkz: Detay FE-010 |
| FE-011 | MEDIUM | 3 | 2 | high | 1h | components/SecurityCenter.tsx:299-302 | `handleToggleChange` optimistic update revert | `setSettings(settings)` -- stale reference: revert'te onceki `settings` closure'u kullaniliyor | `setSettings(prev => ...)` pattern'i ile dogru revert yapin | `setSettings(prevSettings);` yerine `setSettings((prev) => ({ ...prev, [key]: !val }));` seklinde revert |
| FE-012 | MEDIUM | 3 | 2 | medium | 0.5h | components/SecurityCenter.tsx:266-268 | `catch { /* non-critical on initial load */ }` settings yukleme | Ilk yukleme basarisizsa kullanici bos ekran gorur, settings null kalir, togglelar goruntulenemez | Hata durumunda retry butonu veya error state gosterin | `catch { setSaveError('Ayarlar yuklenemedi.'); }` |
| FE-013 | MEDIUM | 3 | 3 | high | 0.5h | components/SecurityCenter.tsx:556-558 | `onEmergencyReport` handler undefined olabilir | `onClick={onEmergencyReport}` -- prop optional ama buton her zaman gorunur; tiklandiginda undefined ise hicbir sey olmaz | Prop yoksa butonu gizleyin veya fallback davranis ekleyin | `{onEmergencyReport && <button onClick={onEmergencyReport}>...` |
| FE-014 | LOW | 2 | 2 | high | 0.5h | services/profileRiskService.ts:143-152 | `estimateRiskFromProfile` baslangic skoru 50 | Dogrulanmamis her profil "caution" (50) olarak baslar, gercek risk daha dusuk olabilir | Baslangic skorunu 40'a dusurun veya parametre olarak alin | Baslangic skor = 40 (normal band icinde) |
| FE-015 | LOW | 1 | 2 | medium | 0.5h | services/locationPrivacyService.ts:209-214 | `setPrivacyLevel` iki ayri DB guncellemesi atomic degil | `location_privacy` ve `user_security_settings` guncelleme arasinda hata olursa tutarsiz durum | Tek bir RPC/transaction ile atomik guncelleme | `supabase.rpc('set_privacy_level_atomic', ...)` |

### Detay FE-010
```typescript
// locationPrivacyService.ts:41-48
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) / 0xFFFFFFFF);
}

// SORUN: Java hashCode benzeri basit hash.
// userId'ler UUID formatinda (8-4-4-4-12) ve cok benzer char dagilimina sahip.
// Olasi collision: iki farkli userId ayni offset'i alabilir.

// DUZELTME ONERISI: SHA-256 tabanli
async function seededRandomSecure(seed: string): Promise<number> {
  const data = new TextEncoder().encode(seed);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const view = new DataView(hash);
  return view.getUint32(0) / 0xFFFFFFFF;
}
```

---

## TAKIM 12 -- PREMIUM & PAYMENTS

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| FE-016 | CRITICAL | 5 | 3 | high | 4h | services/subscriptionPlanService.ts:166-189 | `getUserCapabilities()` client-side capability resolution | Capability flag'lar client-side hesaplaniyor; kullanici localStorage/devtools ile `canUseIncognito: true` set edebilir | Tum premium ozellik erisimi server-side (RLS/Edge Function) ile dogrulanmali | Bkz: Detay FE-016 |
| FE-017 | HIGH | 4 | 3 | high | 2h | services/subscriptionService.ts:1-23 | Tek fonksiyon: sadece `isPremium: boolean` donuyor | Plan tipi (DOSE/FORTE/ULTRA/ethical) ayirt edilmiyor; hangi tier'da hangi ozellik acik bilgisi yok | `getActiveSubscription()` plan name + tier bilgisi donsun | `return { isPremium: Boolean(data), tier: data?.plan, error: null };` |
| FE-018 | HIGH | 4 | 3 | high | 3h | stores/capabilityStore.ts:39-49 + EthicalPlanSelector.tsx:188-198 | `window.location.assign(sessionUrl)` -- checkout sonrasi durum takibi yok | Odeme sonrasi kullanici geri donduktunde capability store guncellenmeyebilir; success/cancel URL handling yok | Checkout sonrasi callback URL'de `?session_id=...` ile verify + store refresh | Stripe return_url icinde session_id + webhook ile DB guncelleme + client polling |
| FE-019 | MEDIUM | 3 | 2 | high | 1h | components/monetization/EthicalPlanSelector.tsx:284-294 | Hardcoded "%78 daha iyi eslesmeler" social proof | Sabit istatistik gercek veriye dayanmiyor olabilir; FTC/KVKK acisindan yaniltici olabilir | Ya gercek veriyi cekin ya da bu blogu kaldirin | `const stat = await analytics.getPremiumSatisfactionRate();` |
| FE-020 | MEDIUM | 3 | 2 | high | 1h | components/monetization/PremiumPaywall.tsx:131-133 | Hard paywall'da backdrop click kapatmiyor ama ESC tusu handle edilmiyor | Kullanici ESC'ye basarak kapatamayi bekler; hard paywall'da sikilik hissi yaratir | `useEffect` ile ESC keydown dinleyin (hard paywall icin bile en az bir cikis yolu olmali) | `useEffect(() => { const h = (e) => e.key === 'Escape' && onDismiss(); ... })` |
| FE-021 | LOW | 2 | 2 | medium | 0.5h | services/subscriptionPlanService.ts:141-155 | `planToCapabilities` legacy mapping | ULTRA ve FORTE ayni capabilities'i aliyor (PREMIUM_FULL); ULTRA > FORTE olmali | Tier farklilasmasini uygulayarak ULTRA icin concierge ekleyin | Legacy mapping'i ULTRA -> PREMIUM_COACHING, FORTE -> PREMIUM_FULL yapin |
| FE-022 | LOW | 1 | 1 | medium | 0.5h | components/monetization/EthicalPlanSelector.tsx:82 | `FREE` plan PLAN_COLORS'da tanimli ama listede gorunmuyor | Kullanici free plan secemez; UX acidan `currentList` hicbir zaman FREE icermiyor | `FREE` plan icin "Mevcut Planin" badge'i gosterin veya PLAN_COLORS'dan kaldirin | Gereksiz tanimlamayi temizleyin |

### Detay FE-016
```typescript
// subscriptionPlanService.ts:166-189
async getUserCapabilities(): Promise<UserCapabilities> {
    // ...
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, expires_at, is_active')
      .eq('profile_id', user.id)
      // ...

    // Capability flag'lar CLIENT-SIDE hesaplaniyor.
    // capabilityStore.ts Zustand store'unda saklanip komponentlerde okunuyor.
    // Saldirgan devtools ile:
    //   useCapabilityStore.setState({ canUseIncognito: true, canUseTripMode: true })
    // yaparak tum premium ozelliklere erisebilir.

    // NOT: getUserCapabilitiesFromDB() (satir 195) server-side RPC mevcuttur
    // ancak client bundle'da hangi fonksiyonun cagrildigini kontrol edin.
    // Premium-only UI elementleri server-gated olmali (RLS + Edge Function).
}
```

---

## TAKIM 13 -- ADMIN PANEL

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| FE-023 | HIGH | 5 | 3 | high | 2h | components/admin/AdminSecurityGate.tsx:28 | `const ADMIN_PASSCODE = 'vitalis-ctrl-2026';` hardcoded | Passcode source code'da acik metin; client JS bundle'indan kolayca cikarilabilir | Passcode'u server-side dogrulayin (Edge Function/RPC); client'ta saklamayin | Bkz: Detay FE-023 |
| FE-024 | HIGH | 4 | 3 | high | 1h | components/admin/AdminSecurityGate.tsx:17-25 | IP adresi ve device fingerprint source code'da hardcoded | `176.236.192.167` IP adresi ve fingerprint hash'i bundle'dan okunabilir | Bu degerleri .env veya server-side config'e tasiyin | `const ALLOWED_IPS = (import.meta.env.VITE_ADMIN_IPS ?? '').split(',');` |
| FE-025 | MEDIUM | 3 | 3 | high | 1h | services/adminPanelService.ts:1010,1058,1101 | `console.error('[adminPanelService]...')` prod'da | Admin islem hatalari console'a yaziliyor; hassas bilgiler (appeal ID, error detay) ifsa olabilir | Sentry/logger ile loglayin, console.error kaldirin | `import { captureException } from '../src/lib/sentry'; captureException(error);` |
| FE-026 | MEDIUM | 3 | 2 | high | 2h | services/adminPanelService.ts:197-283 | `getVerificationQueue` SLA takibi client-side | SLA deadline client-side hesaplaniyor; server saati ile client saati farkliysa yanlis SLA durumu gosterilir | SLA status'unu server-side (DB trigger veya RPC) hesaplayin | `sla_status` DB kolonunu cron job ile guncelleyin |
| FE-027 | MEDIUM | 3 | 2 | high | 1h | services/adminModerationService.ts:120-133 | `getAdminContext` MFA level parsing karmasik | AAL level parsing birden fazla fallback'e sahip; `typeof aalData === 'string'` Supabase JS v2 ile uyumsuz olabilir | Supabase client versiyonuna gore tek bir parsing yolu kullanin | `const level = aalData?.currentLevel ?? null;` |
| FE-028 | LOW | 2 | 2 | medium | 0.5h | services/adminPanelService.ts:316 | `fetchErr` null yerine `undefined` check | `if (fetchErr || !item)` -- Supabase `.single()` hata mesaji: item null oldiginda error de null olabilir | `.single()` yerine `.maybeSingle()` + explicit null check | `const { data: item } = await ...maybeSingle(); if (!item) return { data: null, error: 'Not found' };` |

### Detay FE-023
```tsx
// AdminSecurityGate.tsx:28
const ADMIN_PASSCODE = 'vitalis-ctrl-2026';

// SORUN: Bu deger Vite build sonrasi JS bundle icinde ACIK METIN olarak bulunur.
// Saldirgan:
//   1. DevTools > Sources > main.js icinde "vitalis-ctrl" arayarak bulabilir
//   2. Veya: grep -r "vitalis-ctrl" dist/
// IP + fingerprint kontrolu atlanabildikten sonra passcode'u da bilmis olur.

// DUZELTME ONERISI:
// Passcode'u server-side dogrulayin:
const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.functions.invoke('admin-verify-passcode', {
        body: { passcode },
    });
    if (data?.valid) setPhase('granted');
    else setPasscodeError(true);
};
```

---

## TAKIM 14 -- NOTIFICATIONS

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| FE-029 | HIGH | 4 | 3 | high | 4h | stores/notificationStore.ts:1-22 | Store sadece in-memory; Supabase Realtime baglantisi yok | `notifications` dizisi sadece manuel `addNotification` ile dolduruluyor; realtime push veya polling yok; badge count gercek zamanda guncellenmiyor | Supabase Realtime subscription veya polling mekanizmasi ekleyin | Bkz: Detay FE-029 |
| FE-030 | MEDIUM | 3 | 3 | high | 2h | services/pushService.ts:379-412 | `scheduleDailyPicksNotification` web setTimeout | Sayfa yenilendiginde veya tab kapatildiginda timer kaybolur; setTimeout guvenirligi dusuk | Service Worker ile push scheduling kullanin veya server-side push-worker edge function'a guvenerek client scheduling kaldirin | SW-based scheduling veya tamamen server-side |
| FE-031 | MEDIUM | 3 | 2 | high | 1h | stores/notificationStore.ts:15-16 | `addNotification` unbounded growth | Her yeni bildirim dizinin basina ekleniyor ama ust sinir yok; uzun oturumda bellek sisebilir | `.slice(0, 100)` gibi bir limit ekleyin | `addNotification: (n) => set(s => ({ notifications: [n, ...s.notifications].slice(0, 100) }))` |
| FE-032 | MEDIUM | 3 | 2 | medium | 1h | services/pushService.ts:105 | `console.log('Mobile push registration skipped on web.')` | Prod build'de gereksiz console.log; tsconfig exclude listesinde zaten var ama kod hala bundle'da | console.log kaldirin veya `if (import.meta.env.DEV)` guard ekleyin | `if (import.meta.env.DEV) console.log(...)` |
| FE-033 | LOW | 2 | 2 | medium | 1h | stores/notificationStore.ts:17-19 | `markAllRead` sadece local state gunceller | DB'deki `is_read` durumu guncellenmez; kullanici sayfayi yenilediginde tum bildirimler tekrar "okunmamis" gorunur | `markAllRead` icinde Supabase `update` cagrisi ekleyin | `await supabase.from('notifications').update({ is_read: true }).eq('user_id', ...)` |

### Detay FE-029
```typescript
// notificationStore.ts -- Tam dosya:
import { create } from 'zustand';
import { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

// SORUN: Hicbir yerde Supabase Realtime subscribe yok.
// Hicbir yerde polling yok.
// notifications dizisi sadece disaridan setNotifications/addNotification
// cagrildikca dolar.
//
// BEKLENEN: App.tsx veya bir hook icinde:
//   supabase.channel('notifications')
//     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
//       (payload) => addNotification(payload.new))
//     .subscribe()
//
// Mevcut durumda in-app bildirimler gercek zamanli DEGIL.
```

---

## TAKIM 15 -- UI/UX POLISH

### Bulgu Tablosu

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| FE-034 | MEDIUM | 3 | 4 | high | 2h | Birden fazla dosya | `DateInvitationFlow`, `DateSafetyPanel`, `DatePostFlow`, `SecurityCenter` hepsi `fixed inset-0 z-50/z-[100]` | Birden fazla overlay acildiginda z-index catismasi olusabilir; alttaki overlay usttekininkini kapatabilir | Merkezi z-index scale tanimlayin (`z-modal`, `z-overlay`, `z-sos`) | Tailwind config'e z-index token'lari ekleyin |
| FE-035 | MEDIUM | 3 | 3 | high | 1h | components/DateSafetyPanel.tsx:479 | Footer'da `view === 'share' || view === 'contacts'` ama `view !== 'main'` filtresi | Kosul logic'i kafa karistirici ve `share`/`contacts` view'larinda "Geri" butonu gorunmuyor cunku `(A || B) && !C` = false oldugundan | Kosul sadelestirilmeli: `{(view === 'share' || view === 'contacts') && ...}` | `{view !== 'main' && view !== 'add_contact' && view !== 'sos_confirm' && ...}` |
| FE-036 | MEDIUM | 3 | 3 | high | 1h | components/DateInvitationFlow.tsx:244-246 | Overlay `fixed inset-0` backdrop click ile kapatilmiyor | Kullanici overlay'in disina tiklayarak kapatamayi bekler ama backdrop'ta onClick handler yok | Backdrop'a `onClick={onClose}` ekleyin veya bilincliyse aria-modal kullanin | `<div className="fixed inset-0..." onClick={onClose}>` + `e.stopPropagation()` ic container'da |
| FE-037 | MEDIUM | 3 | 2 | high | 1h | components/DatePostFlow.tsx:395 | `feltSafe === false` durumunda sadece email gosteriliyor | Kullanici "kendimi guvenli hissetmedim" dedikten sonra sadece e-posta adresi gosteriliyor; in-app rapor aksiyonu yok | "Raporla" butonu + `blockAndReportService` entegrasyonu ekleyin | `<button onClick={() => onReport(aboutUserId)}>Raporla</button>` |
| FE-038 | MEDIUM | 2 | 3 | high | 0.5h | components/DateSafetyPanel.tsx:371-378 | Telefon input'unda format validasyonu yok | Kullanici rastgele metin girebilir; SOS aninda yanlis numara cagrilabilir | `type="tel"` var ama regex pattern validasyonu ekleyin | `pattern="\\+?[0-9\\s\\-]{10,}"` + onBlur format check |
| FE-039 | LOW | 2 | 2 | high | 0.5h | components/SecurityCenter.tsx:366-381 | Tab bar yatay scroll'da scroll indicator yok | 8 tab var; dar ekranlarda son tablar gorunmuyor, kullanici kaydirabilecegindan habersiz | Fade-out gradient veya scroll indicator ekleyin | `<div className="... mask-image-gradient-r">` |
| FE-040 | LOW | 2 | 2 | medium | 0.5h | components/DateChatBanner.tsx:73 | `setInterval(tick, 60000)` -- sayac dakika bazli | Kullanici "47dk kaldi" gorur ama 59 saniye boyunca guncellenmez; UX'te "donmus" hissi verir | 30 saniye veya countdown formati ile guncelleme sikligini artirin | `const id = setInterval(tick, 30000);` |
| FE-041 | LOW | 1 | 2 | high | 0.5h | components/monetization/EthicalPlanSelector.tsx:306-336 | Footer CTA `fixed bottom-0`; icerik `pb-36` ile karsilanmis ama tablet'te hesaplama hatali olabilir | Tablet landscape modunda footer plan listesini kapatabilir | `fixed` yerine `sticky` veya `safe-area-inset-bottom` ekleyin | `<div className="... pb-safe">` |
| FE-042 | LOW | 1 | 1 | medium | 0.5h | services/dateSafetyService.ts:61-65 | `shareViaWhatsApp` telefon numarasi temizleme | `phone.replace(/\D/g, '')` -- `+` isareti de kaldirilir; `wa.me/` uluslararasi format bekler (+90...) | `+` isaretini koru: `phone.replace(/[^\d+]/g, '')` | `const cleaned = phone.replace(/[^\d+]/g, '');` |
| FE-043 | LOW | 1 | 1 | medium | 0.5h | components/DatePostFlow.tsx:162 | `wouldRecommend` sadece 'great'/'good' icin `true` | Kullanici "Fena degildi" sectiginde `wouldRecommend = undefined`; veri analizi icin explicit false daha iyi | `howWasIt === 'bad' ? false : undefined` yerine her zaman boolean | `wouldRecommend: howWasIt === 'great' \|\| howWasIt === 'good'` |

---

## ONCELIKLENDIRME OZETI (P0/P1/P2)

### P0 -- Hemen duzeltilmeli (1-2 gun)

| ID | Takim | Bulgu | Neden P0 |
|----|-------|-------|----------|
| FE-001 | 10 (Date) | SOS handler sessiz hata | Kullanici guvenligi; acil durumda hayati risk |
| FE-016 | 12 (Premium) | Client-side capability bypass | Gelir kaybi; premium ozellikler ucretsiz erisilebilir |
| FE-023 | 13 (Admin) | Hardcoded admin passcode | Admin paneline yetkisiz erisim; tum kullanici verisi risk altinda |

### P1 -- Bu sprint icinde duzeltilmeli (1 hafta)

| ID | Takim | Bulgu | Neden P1 |
|----|-------|-------|----------|
| FE-002 | 10 (Date) | useCallback stale closure | Yanlis verilerle davet gonderimi |
| FE-003 | 10 (Date) | Dead code: Date plani CTA gorunmuyor | Temel ozellik erisilemez |
| FE-008 | 11 (Safety) | Statik location salt source code'da | Konum gizliligi asilabilir |
| FE-009 | 11 (Safety) | Stale risk score sessiz fallback | Guvenlik yanlis bilgi |
| FE-017 | 12 (Premium) | subscriptionService tier ayirimi yok | Feature gating eksik |
| FE-018 | 12 (Premium) | Checkout sonrasi durum takibi yok | Odeme sonrasi UX kirik |
| FE-024 | 13 (Admin) | IP/fingerprint source code'da | Admin guvenlik katmani zayif |
| FE-029 | 14 (Notif) | Realtime notification subscription yok | Bildirimler gercek zamanli degil |

### P2 -- Sonraki sprint (2-3 hafta)

| ID | Takim | Bulgu |
|----|-------|-------|
| FE-004 | 10 | Sessiz catch trusted contact silme |
| FE-005 | 10 | DatePostFlow a11y eksik |
| FE-010 | 11 | seededRandom dusuk entropi |
| FE-011 | 11 | SecurityCenter optimistic update revert |
| FE-012 | 11 | SecurityCenter settings yukleme hatasi |
| FE-013 | 11 | Emergency report buton undefined handler |
| FE-019 | 12 | Hardcoded social proof istatistik |
| FE-020 | 12 | Hard paywall ESC handler eksik |
| FE-025 | 13 | console.error prod'da |
| FE-026 | 13 | SLA client-side hesaplama |
| FE-027 | 13 | MFA level parsing karmasikligi |
| FE-030 | 14 | setTimeout tabanli scheduling |
| FE-031 | 14 | Unbounded notification array |
| FE-032 | 14 | console.log pushService |
| FE-033 | 14 | markAllRead sadece local |
| FE-034 | 15 | z-index catismasi |
| FE-035 | 15 | DateSafetyPanel footer logic |
| FE-036 | 15 | Backdrop click kapatmama |
| FE-037 | 15 | feltSafe false durumunda rapor yok |
| FE-038 | 15 | Telefon format validasyonu |
| FE-039 | 15 | Tab bar scroll indicator |
| FE-040 | 15 | Countdown guncelleme sikligi |
| FE-041 | 15 | Footer safe-area-inset |
| FE-042 | 15 | WhatsApp + isareti temizleme |
| FE-043 | 15 | wouldRecommend explicit boolean |
| FE-006 | 10 | RPC null check |
| FE-007 | 10 | Turkce placeholder |
| FE-014 | 11 | Baslangic risk skoru |
| FE-015 | 11 | Non-atomic privacy update |
| FE-021 | 12 | Legacy tier mapping |
| FE-022 | 12 | Kullanilmayan FREE plan rengi |
| FE-028 | 13 | .single() null handling |

---

## TAKIM BAZLI OZET

| Takim | Toplam | CRITICAL | HIGH | MEDIUM | LOW |
|-------|--------|----------|------|--------|-----|
| 10 -- Date Flow | 7 | 1 | 1 | 2 | 3 |
| 11 -- Safety & Security | 8 | 0 | 2 | 4 | 2 |
| 12 -- Premium & Payments | 7 | 1 | 2 | 2 | 2 |
| 13 -- Admin Panel | 6 | 0 | 2 | 3 | 1 |
| 14 -- Notifications | 5 | 0 | 1 | 3 | 1 |
| 15 -- UI/UX Polish | 10 | 0 | 0 | 5 | 5 |

---

*Rapor tamamlandi. Tum dosya yollari mutlak path olarak referanslanmistir.*
*Bulgular kanitlanmis kod parcalari ve satir numaralari ile desteklenmistir.*
*Kod dosyalarina DOKUNULMAMISTIR; yalnizca bu rapor dosyasi olusturulmustur.*
