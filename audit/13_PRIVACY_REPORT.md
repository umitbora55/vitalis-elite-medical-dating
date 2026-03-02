# AGENT 13: PRIVACY & COMPLIANCE AUDIT REPORT

**Generated:** 2026-02-17
**Auditor:** Privacy Specialist Agent (Opus 4.5)
**Scope:** KVKK/GDPR Compliance, Data Protection, User Rights, Medical Data Handling

---

### OZET
- Toplam bulgu: 11 (CRITICAL: 1, HIGH: 3, MEDIUM: 5, LOW: 2)
- En yuksek riskli 3 bulgu: PR-001, PR-002, PR-003
- No finding moduller: Stripe integration (proper data minimization), Block/Report mechanism (functional)

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| PR-001 | CRITICAL | 5 | 5 | high | 4h | App.tsx:1058-1063 | `onClick={() => setAuthStep('APP')}` Dev Bypass butonu | 18+ yas dogrulamasi tamamen atlanabilir, KVKK cocuk maddesi ihlali riski | Butonu tamamen kaldir veya env-guard ile koruma altina al | Bkz: Detay PR-001 |
| PR-002 | HIGH | 4 | 4 | high | 8h | supabase/migrations/*.sql | Mesaj, swipe, verification data icin TTL/retention policy yok | KVKK veri minimizasyonu ve saklama suresi ilkeleri ihlali | Otomatik data retention cron job veya pg_cron policy ekle | Bkz: Detay PR-002 |
| PR-003 | HIGH | 4 | 3 | high | 4h | services/accountService.ts:10-19 | `requestDataExport` sadece talep olusturur, gercek export yok | GDPR Article 20 veri tasinabilirligi hakki tam uygulanmamis | Backend export fonksiyonu + email delivery implement et | Bkz: Detay PR-003 |
| PR-004 | HIGH | 4 | 4 | high | 2h | geminiService.ts:9-11 | `body: { myProfile, matchProfile }` tam profil gonderimi | Client-side'da PII anonimizasyonu yok, 3. parti veri aktarimi | Client'da da anonymization uygula, backend validasyona guvenme | Bkz: Detay PR-004 |
| PR-005 | MEDIUM | 3 | 3 | high | 2h | RegistrationFlow.tsx:33-70 | Schema'da age validation: `parsed >= 18 && parsed <= 100` | Self-reported yas, gercek dogrulama yok; COPPA/KVKK cocuk riski | Kimlik belgesi veya telefon dogrulamasi ile yas teyidi | Bkz: Detay PR-005 |
| PR-006 | MEDIUM | 3 | 3 | medium | 4h | components/MyProfileView.tsx:81-90 | `handleDataRequest` status DONE ama download link yok | Kullanici veri talebinin tamamlanip tamamlanmadigini bilemez | Status polling + download link gosterimi ekle | Bkz: Detay PR-006 |
| PR-007 | MEDIUM | 3 | 2 | high | 2h | App.tsx:1197-1224 | Consent banner sadece analytics icin | Push notification, konum, kamera izinleri ayri consent yok | Her izin kategorisi icin granular consent UI ekle | Bkz: Detay PR-007 |
| PR-008 | MEDIUM | 3 | 3 | medium | 6h | supabase/migrations/20260212_account_deletion_executor.sql:33-45 | Messages tablosu silme isleminde dahil degil | Kullanici silme talep etse bile mesajlari karsi tarafta kalabilir | Messages tablosuna delete + anonymize logic ekle | Bkz: Detay PR-008 |
| PR-009 | MEDIUM | 2 | 3 | high | 1h | public/privacy.html | Aydinlatma metni mevcut ve kapsamli | Privacy policy uygulama ici link olmadan sadece /privacy.html'de | App icinde Settings > Privacy Policy linki ekle | Bkz: Detay PR-009 |
| PR-010 | LOW | 2 | 2 | medium | 3h | constants.ts | MOCK_PROFILES gercek kisi bilgisi icermiyor | Mock data production bundle'da kaliyor, data leak riski dusuk | Build time mock data exclusion veya env-guard | Bkz: Detay PR-010 |
| PR-011 | LOW | 1 | 2 | high | 1h | types.ts:182-188 | PrivacySettings interface tanimli ama persistence belirsiz | Privacy settings supabase schema'da gorulmuyor | profiles tablosuna privacy_settings JSONB column ekle | Bkz: Detay PR-011 |

---

## DETAYLI BULGULAR

### PR-001: Dev Bypass 18+ Yas Dogrulamasini Atliyor (CRITICAL)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx:1058-1063`

**Kanit:**
```tsx
<button
    onClick={() => setAuthStep('APP')}
    className="fixed bottom-4 right-4 z-[9999] bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm transition-all"
>
    Dev Bypass
</button>
```

**Etki:**
- Dating uygulamasi 18+ zorunlu tutulmali (KVKK Madde 6, COPPA, GDPR Recital 38)
- Bu buton ile herhangi bir kullanici (reşit olmayan dahil) dogrudan uygulamaya girebilir
- Yas dogrulamasi, email dogrulamasi, mesleki dogrulama tamamen atlanir
- Sahte profil riski ciddi sekilde artar
- Regulatory ceza riski: KVKK'da 2M TL'ye kadar, GDPR'da 20M EUR'ya kadar

**Oneri:**
1. Bu butonu tamamen production build'den kaldir
2. Eger development amacli kalacaksa: `import.meta.env.DEV && <button>...</button>`
3. Test hesaplari icin proper test credentials kullan (test@vitalis.com gibi)

**Ornek Duzeltme:**
```tsx
// SADECE development ortaminda goster
{import.meta.env.DEV && (
    <button onClick={() => setAuthStep('APP')} className="...">
        Dev Bypass
    </button>
)}
```

---

### PR-002: Data Retention Policy Eksik (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql` ve ilgili migration dosyalari

**Kanit:**
- `messages` tablosunda TTL yok, mesajlar surekli saklanir
- `swipes` tablosunda temizlik mekanizmasi yok
- `verification_requests` tablosunda belge saklama suresi belirsiz
- Privacy policy'de "Messages: Retained for 2 years after last activity" yazili ama teknik uygulama yok

**Etki:**
- KVKK Madde 4(d): "Ilgili mevzuatta ongorulen veya islendikleri amac icin gerekli olan sure kadar muhafaza edilmeli"
- GDPR Article 5(1)(e): Storage limitation ilkesi ihlali
- Gereksiz veri birikimi = guvenlik riski artisi
- Kullanici "unutulma hakki" talep ettiginde tam silme zor

**Oneri:**
1. pg_cron veya Supabase scheduled functions ile otomatik temizlik:
   - 2 yillik inaktif mesajlar
   - 30 gunluk onaylanmis verification documents
   - 90 gunluk eski swipe records

**Ornek Duzeltme:**
```sql
-- Cron job: Her gece 03:00'te calistir
SELECT cron.schedule('retention-cleanup', '0 3 * * *', $$
  -- 2 yillik eski mesajlari sil
  DELETE FROM messages
  WHERE created_at < NOW() - INTERVAL '2 years';

  -- Onaylanmis 30+ gunluk verification dokumanlari sil
  DELETE FROM verification_requests
  WHERE status = 'APPROVED' AND created_at < NOW() - INTERVAL '30 days';
$$);
```

---

### PR-003: Data Export Fonksiyonu Incomplete (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/accountService.ts:10-19`

**Kanit:**
```typescript
export const requestDataExport = async () => {
  // ...
  const { error } = await supabase.from('data_export_requests').insert({
    user_id: userId,
    status: 'PENDING',
  });
  return { error: (error as unknown as Error) || null };
};
```

**Etki:**
- GDPR Article 20: Veri tasinabilirligi hakki
- KVKK Madde 11(g): "Kisisel verilerin aktarilmasini isteme hakki"
- Kullanici talep ediyor ama:
  - Backend'de export isleyen fonksiyon yok
  - download_url alani kullanilmiyor
  - Email/push notification ile kullaniciya bildirim yok

**Oneri:**
1. Supabase Edge Function: `process-data-export`
2. Kullanicinin tum verisini JSON formatinda topla
3. Supabase Storage'a yukle, signed URL olustur
4. Email ile kullaniciya link gonder (7 gun gecerli)

**Ornek Duzeltme (Edge Function):**
```typescript
// supabase/functions/process-data-export/index.ts
serve(async (req) => {
  const userId = await getAuthenticatedUserId(req);

  // Tum kullanici verisini topla
  const [profile, messages, matches, swipes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('messages').select('*').eq('sender_id', userId),
    supabase.from('matches').select('*').or(`profile_1_id.eq.${userId},profile_2_id.eq.${userId}`),
    supabase.from('swipes').select('*').eq('swiper_id', userId),
  ]);

  const exportData = { profile, messages, matches, swipes, exportedAt: new Date() };

  // Storage'a yukle
  const path = `exports/${userId}/${Date.now()}.json`;
  await supabase.storage.from('data-exports').upload(path, JSON.stringify(exportData));

  // Signed URL olustur (7 gun)
  const { data: urlData } = await supabase.storage.from('data-exports').createSignedUrl(path, 604800);

  // Request'i guncelle
  await supabase.from('data_export_requests')
    .update({ status: 'COMPLETED', download_url: urlData.signedUrl, completed_at: new Date() })
    .eq('user_id', userId).eq('status', 'PENDING');

  // Email gonder (SendGrid/Resend integration gerekli)
});
```

---

### PR-004: Gemini AI'a PII Gonderimi (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/geminiService.ts:9-11`

**Kanit:**
```typescript
const { data, error } = await supabase.functions.invoke('generate-icebreaker', {
  body: { myProfile, matchProfile },
});
```

**NOT:** Backend (generate-icebreaker/index.ts:125-140) PII'yi anonimize ediyor, ANCAK client-side tam Profile objesi gonderiyor.

**Etki:**
- Network uzerinden gereksiz PII transferi
- Man-in-the-middle riski (HTTPS olsa bile metadata loglari)
- Privacy policy'de "Anonymized professional data only" yaziyor ama client tarafinda bu gerceklesmiyor

**Oneri:**
1. Client tarafinda da sadece gerekli alanlari gonder
2. Backend validasyona ek olarak client-side data minimization

**Ornek Duzeltme:**
```typescript
export const generateMedicalIcebreaker = async (
  myProfile: Profile,
  matchProfile: Profile
): Promise<string> => {
  // Client-side anonymization
  const safeMyProfile = {
    role: myProfile.role,
    specialty: myProfile.specialty,
    interests: (myProfile.interests || []).slice(0, 3),
  };
  const safeMatchProfile = {
    role: matchProfile.role,
    specialty: matchProfile.specialty,
    interests: (matchProfile.interests || []).slice(0, 3),
  };

  const { data, error } = await supabase.functions.invoke('generate-icebreaker', {
    body: { myProfile: safeMyProfile, matchProfile: safeMatchProfile },
  });
  // ...
};
```

---

### PR-005: Self-Reported Yas Dogrulamasi (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:33-41`

**Kanit:**
```typescript
age: z
  .string()
  .min(1, 'Age is required')
  .refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 18 && parsed <= 100;
  }, 'Enter a valid age'),
```

**Etki:**
- Kullanici isterse 18 yasindan kucuk oldugu halde 18 secebilir
- Dating app + medikal profesyonel iddiasi = ciddi yasal sorumluluk
- ABD'de COPPA, Turkiye'de KVKK 6(3) ihlali potansiyeli

**Oneri:**
1. Verification document upload sirasinda dogum tarihi kontrolu
2. ID/diploma uzerinden yas dogrulamasi
3. Telefon numarasi dogrulamasi (carrier age-gating ile)

---

### PR-006: Data Export Status UX Eksik (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/MyProfileView.tsx:81-90`

**Kanit:**
```typescript
const handleDataRequest = async () => {
    setDataRequestStatus('PROCESSING');
    const { error } = await requestDataExport();
    if (error) {
        setDataRequestStatus('IDLE');
        showToast("Veri talebi alinamadi...");
        return;
    }
    setDataRequestStatus('DONE');
    showToast("Veri indirme talebin alindi. E-postani kontrol et.");
};
```

**Etki:**
- Kullanici talep etti, DONE gosteriyor ama gercekte hicbir sey olmuyor
- 30 gun icinde yanit vermek yasal zorunluluk (GDPR/KVKK)
- Kullanici deneyimi kotu, guven kaybina yol acar

**Oneri:**
1. Backend export tamamlandiginda push notification
2. Profile sayfasinda "Export hazir - indir" butonu
3. Email ile download linki

---

### PR-007: Granular Consent Eksik (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx:1197-1224`

**Kanit:**
```tsx
{analyticsConsent === null && (
    <div className="...">
        <p>We use analytics to improve matching and app stability...</p>
        <button onClick={() => handleConsentChoice('denied')}>Decline</button>
        <button onClick={() => handleConsentChoice('granted')}>Accept</button>
    </div>
)}
```

**Etki:**
- Sadece analytics consent soruluyor
- Push notification, konum verisi, kamera/galeri erisimi icin ayri consent yok
- GDPR Article 7: Consent specific, informed, unambiguous olmali

**Oneri:**
1. Her izin kategorisi icin ayri toggle
2. Settings > Privacy > Manage Permissions ekrani
3. "Accept All" ve "Manage" opsiyonlari

---

### PR-008: Mesaj Verisi Silme Eksikligi (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/migrations/20260212_account_deletion_executor.sql:33-45`

**Kanit:**
```sql
DELETE FROM swipes WHERE swiper_id = target_user OR swiped_id = target_user;
DELETE FROM matches WHERE profile_1_id = target_user OR profile_2_id = target_user;
-- Messages tablosu eksik!
```

**Etki:**
- Kullanici hesabini sildikten sonra mesajlari karsi tarafta gorunebilir
- "sender_id" NULL veya "Deleted User" olarak kalir ama mesaj icerik kalir
- GDPR "right to erasure" tam uygulanmiyor

**Oneri:**
```sql
-- Gonderdigi mesajlari anonimize et
UPDATE messages SET text = '[Message deleted]', sender_id = NULL
WHERE sender_id = target_user;
-- Veya tamamen sil (tercih meselesi)
DELETE FROM messages WHERE sender_id = target_user;
```

---

### PR-009: Privacy Policy In-App Link Eksik (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/public/privacy.html`

**Durum:** Privacy policy kapsamli ve GDPR/KVKK uyumlu (v2.0). Ancak:

**Etki:**
- Uygulama ici Settings/Profile ekraninda direkt link yok
- Kullanicinin "/privacy.html" adresini bilmesi gerekiyor
- KVKK aydinlatma yukumlulugu: "Kolayca erisilebilir olmali"

**Oneri:**
- MyProfileView'a "Gizlilik Politikasi" linki ekle
- Footer'a kalici link ekle

---

### PR-010: Mock Data Production Bundle'da (LOW)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/constants.ts`

**Etki:**
- MOCK_PROFILES gercek kisi verisi icermiyor (iyi)
- Ancak gereksiz veri production bundle'da
- Potansiyel gelecek riski: Biri yanlislikla gercek test verisi ekleyebilir

**Oneri:**
- Vite define ile development-only import
- Veya ayri mock-data.dev.ts dosyasi

---

### PR-011: Privacy Settings Persistence Belirsiz (LOW)

**Dosya:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/types.ts:182-188`

**Kanit:**
```typescript
export interface PrivacySettings {
  ghostMode: boolean;
  hideSameInstitution: boolean;
  hiddenProfileIds: string[];
  showInNearby: boolean;
  recordProfileVisits: boolean;
}
```

**Etki:**
- Profile interface'de tanimli
- Ancak profiles tablosunda bu field gorunmuyor
- Kullanici ayarlari sunucuya kaydedilmiyor olabilir

**Oneri:**
```sql
ALTER TABLE profiles ADD COLUMN privacy_settings JSONB DEFAULT '{}';
```

---

## OLUMLU BULGULAR (No Finding)

### Analytics Consent Mekanizmasi
- **Dosya:** `src/lib/analytics.ts`
- `hasAnalyticsConsent()` kontrolu her event oncesi yapiliyor
- Consent localStorage'da saklanir, kullanici tercihi korunur
- Mixpanel/PostHog sadece consent verilmisse aktif

### Sentry PII Korumasi
- **Dosya:** `src/lib/sentry.ts:11`
- `sendDefaultPii: false` ayarli (RECON raporunda belirtilen `true` duzeltilmis)
- Authorization header'lar beforeSend'de temizleniyor

### Account Deletion Flow
- **Dosya:** `accountService.ts`, `20260212_account_deletion_executor.sql`
- GDPR Article 17 uyumlu talep mekanizmasi
- RLS ile korunmus tablolar
- Anonymization logic mevcut (iyilestirilebilir - PR-008)

### Verification Document Handling
- **Dosya:** `verificationService.ts`
- MIME type validasyonu mevcut
- File size limit (10MB)
- User-scoped storage path

### Third-Party Data Disclosure
- **Dosya:** `privacy.html`
- Stripe, Supabase, Gemini, Mixpanel, PostHog, Sentry tam listeli
- Standard Contractual Clauses referansi mevcut
- Data retention sureleri belirtilmis

---

## COMPLIANCE SUMMARY

| Madde | Durum | Notlar |
|-------|-------|--------|
| KVKK Acik Riza | PARTIAL | Analytics consent var, diger izinler eksik |
| KVKK Aydinlatma | PASS | privacy.html kapsamli, uygulama ici link eklenmel |
| KVKK Veri Minimizasyonu | PARTIAL | Gemini icin backend'de var, client'da eksik |
| KVKK Silme Hakki | PARTIAL | Mekanizma var, mesaj silme eksik |
| KVKK Veri Tasinabilirligi | FAIL | Talep mekanizmasi var, gercek export yok |
| KVKK Saklama Suresi | FAIL | Retention policy teknik olarak uygulanmiyor |
| GDPR Article 7 (Consent) | PARTIAL | Granular consent eksik |
| GDPR Article 17 (Erasure) | PARTIAL | Mesaj verisi tam silinmiyor |
| GDPR Article 20 (Portability) | FAIL | Export fonksiyonu incomplete |
| GDPR Article 25 (Privacy by Design) | PARTIAL | Client-side data minimization eksik |
| COPPA/18+ Verification | FAIL | Dev bypass ile tamamen atlanabilir |

---

## ONCELIK SIRASI

1. **CRITICAL - Hemen:** PR-001 Dev Bypass kaldirmak
2. **Bu hafta:** PR-002 Data Retention, PR-003 Export, PR-005 Yas dogrulama
3. **Launch oncesi:** PR-004 Gemini PII, PR-007 Granular consent
4. **Sonra:** PR-006, PR-008, PR-009, PR-010, PR-011

---

**Rapor Sonu**
