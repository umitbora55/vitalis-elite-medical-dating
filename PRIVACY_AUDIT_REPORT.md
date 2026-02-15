# VITALIS ELITE MEDICAL DATING - PRIVACY AUDIT REPORT

**Generated:** 2026-02-15
**Auditor:** Privacy & Compliance Agent
**Scope:** GDPR/KVKK compliance, medical data handling, consent management, age verification, data retention, third-party data sharing
**Classification:** CONFIDENTIAL - Medical Dating Application

---

### OZET
- **Toplam bulgu:** 14 (CRITICAL: 2, HIGH: 5, MEDIUM: 5, LOW: 2)
- **En yuksek riskli 3 bulgu:** PR-001, PR-002, PR-003
- **No finding moduller:** Supabase Storage RLS (properly configured for verification docs)

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| PR-001 | CRITICAL | 5 | 5 | high | 16h | supabase/functions/generate-icebreaker/index.ts:25-27 | `JSON.stringify(myProfile)` PII to Gemini API | Kullanici profil verileri (isim, yas, hastane, uzmanlik) ucuncu parti AI servisine acik metin olarak gonderiliyor | PII anonymizasyonu veya yalnizca non-PII alan gonderin | Bkz: Detay PR-001 |
| PR-002 | CRITICAL | 5 | 4 | high | 8h | supabase/migrations/20260209_init.sql:20 | `age >= 18` sadece DB constraint | Yas dogrulama self-declare ile sinirli, KYC yok; 18 yas alti kullanici riski | KYC provider entegrasyonu veya belge bazli yas dogrulama | Bkz: Detay PR-002 |
| PR-003 | HIGH | 4 | 4 | high | 4h | public/privacy.html:1-32 | Minimalist privacy policy | KVKK/GDPR icin yetersiz aydinlatma metni; veri kategorileri, isleme amaci, saklama suresi, 3. parti aktarim detaylari eksik | Tam uyumlu KVKK aydinlatma metni hazirlat | Bkz: Detay PR-003 |
| PR-004 | HIGH | 4 | 4 | high | 8h | - | No data retention policy defined | Mesajlar, swipe'lar, fotograflar icin TTL/retention suresi tanimlanmamis | Veri saklama politikasi belirle, cron job ile expired veri temizligi | Bkz: Detay PR-004 |
| PR-005 | HIGH | 4 | 3 | high | 12h | supabase/migrations/20260212_account_deletion_executor.sql:47-67 | Profile anonymized but row kept | Silinen hesapta profil satiri korunuyor (audit icin); ancak messages tablosu silinmiyor | Iliskili tum verileri sil veya 30 gun sonra hard delete | Bkz: Detay PR-005 |
| PR-006 | HIGH | 4 | 3 | high | 6h | services/verificationService.ts:114-136 | Client-side MIME validation only | Dogrulama belgeleri icin server-side MIME kontrolu yok; malware yukleme riski | Edge function veya Supabase hook ile server-side validation | Bkz: Detay PR-006 |
| PR-007 | HIGH | 4 | 4 | medium | 4h | components/RegistrationFlow.tsx:605-606 | Verification doc deletion claim unverified | "Documents deleted after approval" iddiasi kod tabaninda dogrulanamadi | Otomatik belge silme mekanizmasi implement et | Bkz: Detay PR-007 |
| PR-008 | MEDIUM | 3 | 4 | high | 3h | services/accountService.ts:10-20 | Export request created but no processor | data_export_requests tablosuna insert var ama isleme/export olusturma mantigi yok | Edge function ile export dosyasi uretimi implement et | Bkz: Detay PR-008 |
| PR-009 | MEDIUM | 3 | 3 | high | 2h | App.tsx:1180-1207 | Analytics consent UI present | Consent banner var ve calisir durumda; ancak consent withdraw UI eksik | Settings'te consent geri cekme secenegi ekle | Bkz: Detay PR-009 |
| PR-010 | MEDIUM | 3 | 3 | medium | 4h | src/lib/analytics.ts:69-70 | Profile ID sent to Mixpanel/PostHog | `identify(profile.id)` ile user ID ucuncu parti analytics'e gonderiliyor | Pseudonymous ID kullan veya consent scope'unu genislet | Bkz: Detay PR-010 |
| PR-011 | MEDIUM | 3 | 3 | high | 2h | public/privacy.html:1-32 | No cookie policy | Ayri cookie politikasi yok; analytics cookie'leri icin detay eksik | Cookie policy sayfasi olustur, consent banner'a baglanti ekle | Bkz: Detay PR-011 |
| PR-012 | MEDIUM | 3 | 2 | medium | 4h | - | No data processing inventory | Hangi veri nerede saklandigi, kim eristigi dokumante edilmemis | KVKK veri envanteri (VERBiS formatinda) hazirla | Bkz: Detay PR-012 |
| PR-013 | LOW | 2 | 2 | high | 1h | public/privacy.html:16 | Last updated date visible | Privacy policy tarihi gorulur (Feb 11, 2026); ancak versiyon kontrolu yok | Changelog veya version history ekle | Bkz: Detay PR-013 |
| PR-014 | LOW | 2 | 2 | high | 2h | App.tsx:1183-1189 | Privacy/Terms links present | Consent banner'da Privacy ve Terms linkleri var; ancak uygulama icinde kolay erisim yok | Profil ayarlarinda Privacy/Terms erisimi ekle | Bkz: Detay PR-014 |

---

## DETAYLI BULGULAR

### PR-001: PII Gonderimi Gemini AI Servisine (CRITICAL)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/functions/generate-icebreaker/index.ts:25-27`

**Kanit:**
```typescript
const prompt = `Create a short, professional but playful icebreaker for a medical dating app.\nMy profile: ${JSON.stringify(
  myProfile,
)}\nTheir profile: ${JSON.stringify(matchProfile)}\nReturn one sentence.`;
```

**Etki:**
- Tam profil objesi (isim, yas, hastane, uzmanlik, bio, konum, fotograflar) Google Gemini API'sine acik metin olarak gonderiliyor
- KVKK Madde 9 (ozel nitelikli kisisel verilerin yurt disina aktarimi) ihlali riski
- Saglik calisan bilgisi = saglik verisi kategorisi; ozel koruma gerektirir
- Google'in veri isleme politikasi altinda kullanici verisi

**Oneri:**
```typescript
// Sadece non-PII alan gonder
const safeProfile = {
  specialty: myProfile.specialty,
  interests: myProfile.interests?.slice(0, 3),
  role: myProfile.role
};
const prompt = `Create a playful icebreaker.\nRole: ${safeProfile.role}, Specialty: ${safeProfile.specialty}`;
```

---

### PR-002: Yetersiz Yas Dogrulama (CRITICAL)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql:20`

**Kanit:**
```sql
age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
```

Ve frontend'de:
```typescript
// components/RegistrationFlow.tsx:38-41
.refine((value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 18 && parsed <= 100;
}, 'Enter a valid age'),
```

**Etki:**
- Yas dogrulama sadece self-declare (kullanici beyanina dayali)
- 18 yas alti kullanici kaydi engellemiyor (sadece yalan yazmak yeterli)
- COPPA/KVKK cocuk maddesi ihlali riski
- Dating app = 18+ zorunlu; platform yasal sorumlulugu

**Oneri:**
- Belge bazli yas dogrulama (ID upload + OCR)
- Trusted KYC provider entegrasyonu (Onfido, Jumio)
- Apple/Google age rating ile uyumlu zorunlu gate

---

### PR-003: Yetersiz Aydinlatma Metni (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/public/privacy.html:1-32`

**Kanit:**
```html
<h2>What We Collect</h2>
<p>Profile details, verification data, app usage events (with consent), subscription metadata, support requests, and safety reports.</p>
```

**Etki:**
- KVKK Madde 10 (Aydinlatma Yukumlulugu) gereksinimleri karsilanmiyor:
  - Veri sorumlusu kimligi ve iletisim bilgileri eksik
  - Isleme amaci spesifik degil
  - Verilerin aktarilacagi alicilar (Stripe, Mixpanel, PostHog, Gemini, Sentry) belirtilmemis
  - Saklama suresi belirtilmemis
  - Ilgili kisi haklari detaylandirilmamis

**Oneri:**
Tam uyumlu KVKK aydinlatma metni hazirlanmali:
- Veri sorumlusu unvani ve adresi
- Veri kategorileri (kimlik, iletisim, lokasyon, saglik, finansal)
- Her kategori icin isleme amaci ve hukuki dayanak
- Ucuncu parti aktarim listesi ve amaci
- Saklama sureleri
- Ilgili kisi haklari (erisim, duzeltme, silme, itiraz, tasima)

---

### PR-004: Data Retention Politikasi Eksik (HIGH)

**Dosya:** Tum veritabani tablolari

**Kanit:**
RECON_REPORT.md'den:
```
- **Data Retention:** No TTL policies on messages/swipes/photos
```

Veritabani semasindan dogrulanmistir - hicbir tabloda retention/TTL sutunu veya cron job yok.

**Etki:**
- GDPR/KVKK veri minimizasyonu ilkesi ihlali
- Eski/pasif kullanici verileri suresiz saklanir
- Depolama maliyeti ve yasal risk artar

**Oneri:**
- Her veri kategorisi icin retention suresi belirle:
  - Mesajlar: 2 yil sonra arsivle/sil
  - Swipe gecmisi: 1 yil
  - Pasif hesaplar: 2 yil inaktivite sonrasi bildirim, 3 yil sonra silme
- pg_cron ile otomatik temizlik job'lari

---

### PR-005: Hesap Silmede Eksik Veri Temizligi (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260212_account_deletion_executor.sql:47-67`

**Kanit:**
```sql
-- Keep profile row for referential/audit continuity, but anonymize.
UPDATE profiles
SET
  name = 'Deleted User',
  age = 18,
  role = 'DELETED',
  ...
WHERE id = target_user;
```

`messages` tablosu silme listesinde yok.

**Etki:**
- KVKK silme hakki (Madde 7) tam olarak saglanmiyor
- Mesaj iceriklerinde kullanici verileri kalabilir
- Anonymize edilse bile profil satiri kaliyor

**Oneri:**
- Silme fonksiyonuna messages tablosunu ekle:
  ```sql
  DELETE FROM messages WHERE sender_id = target_user;
  ```
- 30 gun soft-delete sonrasi hard delete uygula
- Silme oncesi otomatik export sunumu

---

### PR-006: Server-Side Dosya Validasyonu Eksik (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/verificationService.ts:114-136`

**Kanit:**
```typescript
if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
  return { documentPath: null, error: new Error('Unsupported document format') };
}
```

Bu kontrol client-side'da. Supabase Storage'a yukleme sirasinda server-side MIME kontrolu yok.

**Etki:**
- Malicious file upload riski
- Client-side bypass ile zararli dosya yuklenebilir
- Verification document bucket'inda executable dosyalar saklanabilir

**Oneri:**
- Supabase Edge Function veya Database trigger ile server-side magic byte kontrolu
- Storage bucket policy'de file type restriction

---

### PR-007: Dogrulama Belgelerinin Silinme Iddisi Dogrulanamadi (HIGH)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:605-606`

**Kanit:**
```html
<p className="text-xs text-blue-200/80 leading-relaxed">
  Your documents are encrypted and only used for verification. They will be deleted from our servers after approval.
</p>
```

Ancak kod tabaninda bu silme islemini gerceklestiren bir mekanizma bulunamadi.

**Etki:**
- Kullaniciya yaniltici bilgi
- Dogrulama belgelerinde hassas PII (lisans no, kimlik) suresiz saklanir
- KVKK veri minimizasyonu ihlali

**Oneri:**
- Verification onayindan sonra otomatik belge silme trigger'i
- Admin panel'de manuel onay + silme workflow'u

---

### PR-008: Data Export Request Islenmiyor (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/accountService.ts:10-20`

**Kanit:**
```typescript
export const requestDataExport = async () => {
  // ... insert into data_export_requests ...
  return { error: (error as unknown as Error) || null };
};
```

Request olusturuluyor ancak isleme mantigi (export dosyasi uretimi) yok.

**Etki:**
- KVKK veri tasima hakki (portability) saglanamaz
- Kullanici talebi karsilansiz kalir
- 30 gun icinde yanit verme yukumlulugu ihlali

**Oneri:**
- Edge function ile export ZIP olusturma
- Scheduled job ile pending request'leri isle
- E-posta ile download link gonderimi

---

### PR-009: Consent Geri Cekme UI Eksik (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1180-1207`

**Kanit:**
Analytics consent banner mevcut ve calisir:
```typescript
{analyticsConsent === null && (
  <div className="fixed bottom-4 ...">
    ...
    <button onClick={() => handleConsentChoice('denied')}>Decline</button>
    <button onClick={() => handleConsentChoice('granted')}>Accept</button>
  </div>
)}
```

Ancak bir kez verilen izni geri cekme secenegi Settings'te bulunmuyor.

**Etki:**
- GDPR/KVKK consent withdraw hakki saglanmiyor
- Kullanici onceki iznini iptal edemez

**Oneri:**
- MyProfileView veya AccountSettings'e "Analytics izni geri cek" toggle'i ekle
- localStorage'dan consent key'i sil + analytics SDK'lari opt-out cagir

---

### PR-010: Profile ID Analytics'e Gonderiliyor (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/analytics.ts:69-70`

**Kanit:**
```typescript
if (mixpanelInitialized && mixpanelClient) mixpanelClient.identify(pendingIdentifyId);
if (posthogInitialized && posthogClient) posthogClient.identify(pendingIdentifyId);
```

`pendingIdentifyId` = `profile.id` (UUID)

**Etki:**
- Kullanici kimligi ucuncu parti analytics servislerine gonderiliyor
- Cross-platform tracking riski
- Consent scope belirsiz

**Oneri:**
- Pseudonymous ID (hash) kullan
- Veya consent banner'da "analytics icin ID paylasimi" scope'unu acikca belirt

---

### PR-011: Cookie Policy Eksik (MEDIUM)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/public/privacy.html:1-32`

**Kanit:**
Privacy policy'de cookie kullanimi hakkinda detay yok. Ayri cookie policy sayfasi mevcut degil.

**Etki:**
- ePrivacy Directive gereksinimleri karsilanmiyor
- Analytics cookie'leri (Mixpanel, PostHog) icin teknik detay eksik
- Cookie suresi, tipi, amaci belirtilmemis

**Oneri:**
- `/public/cookies.html` olustur
- Kullanilan cookie'lerin listesi, suresi, amaci
- Consent banner'dan link

---

### PR-012: Veri Isleme Envanteri Eksik (MEDIUM)

**Dosya:** Dokumantasyon eksik

**Kanit:**
Kod tabaninda veya audit klasorunde veri isleme envanteri bulunamadi.

**Etki:**
- KVKK VERBiS kayit yukumlulugu karsilanamaz
- Hangi veri nerede, kim tarafindan, hangi amacla isleniyor belirsiz
- Audit/compliance sorularinda zorluk

**Oneri:**
- Veri kategorisi - saklama yeri - erisim yetkisi - saklama suresi matrisi olustur
- VERBiS formatinda kayit

---

### PR-013: Privacy Policy Versiyon Kontrolu Yok (LOW)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/public/privacy.html:16`

**Kanit:**
```html
<p class="muted">Last updated: February 11, 2026</p>
```

Tarih var ancak onceki versiyonlara erisim veya changelog yok.

**Etki:**
- Kullanici onceki versiyonu goremez
- Degisiklik takibi zor

**Oneri:**
- Version history veya changelog bolumu ekle
- Major degisikliklerde kullaniciya bildirim

---

### PR-014: Uygulama Ici Privacy/Terms Erisimi (LOW)

**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1183-1189`

**Kanit:**
Consent banner'da linkler var:
```typescript
<a href="/privacy.html" target="_blank" ...>Privacy Policy</a>
<a href="/terms.html" target="_blank" ...>Terms</a>
```

Ancak MyProfileView veya Settings icinde bu sayfalara kolay erisim yok.

**Etki:**
- Kullanici policy'lere sonradan ulasmakta zorlanabilir
- KVKK aydinlatma metni kolay erisilebilir olmali

**Oneri:**
- Account & Data bolumune Privacy Policy ve Terms of Service linkleri ekle

---

## POZITIF BULGULAR (No Finding)

### Sentry PII Korumasi (DUZELTILMIS)
**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/sentry.ts:11`

```typescript
sendDefaultPii: false,
beforeSend(event) {
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.Authorization;
  }
  return event;
},
```

RECON_REPORT'ta `sendDefaultPii: true` olarak raporlanmis ancak kod `false` olarak duzeltilmis. Ek olarak authorization header'lari redact ediliyor. **UYUMLU**.

### Analytics Consent Mekanizmasi
**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/analytics.ts:35-38`

```typescript
const hasAnalyticsConsent = (): boolean => getAnalyticsConsent() === 'granted';

export const initAnalytics = (profile?: Profile) => {
  if (!hasAnalyticsConsent()) return;
```

Analytics consent olmadan tracking baslamiyor. **UYUMLU** (consent withdraw eksik - ayri bulgu).

### Verification Documents Storage RLS
**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260211_verification_documents_storage.sql:8-30`

```sql
CREATE POLICY "Users can upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

Kullanicilar sadece kendi klasorlerine erisebilir. **UYUMLU**.

### Block ve Report Mekanizmasi
**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/safetyService.ts:11-41`

Block ve report fonksiyonlari mevcut ve veritabanina kaydediliyor. **UYUMLU**.

### Account Deletion Request
**Dosya:** `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/accountService.ts:22-33`

Hesap silme talep mekanizmasi mevcut. Executor fonksiyonu var ancak message silme eksik (ayri bulgu).

---

## ONERILEN AKSIYON PLANI

### P0 - Acil (Lansman Oncesi Zorunlu)
1. **PR-001:** Gemini API'ye gonderilen veriyi anonimize et
2. **PR-002:** KYC/belge bazli yas dogrulama implement et
3. **PR-003:** Tam uyumlu KVKK aydinlatma metni hazirla

### P1 - Yuksek Oncelik (30 gun icinde)
4. **PR-004:** Data retention politikasi belirle ve uygula
5. **PR-005:** Hesap silmede tum iliskili verileri temizle
6. **PR-006:** Server-side dosya validasyonu ekle
7. **PR-007:** Dogrulama belgesi otomatik silme mekanizmasi

### P2 - Orta Oncelik (60 gun icinde)
8. **PR-008:** Data export isleyicisi implement et
9. **PR-009:** Consent withdraw UI ekle
10. **PR-010:** Analytics ID pseudonymization
11. **PR-011:** Cookie policy olustur
12. **PR-012:** Veri isleme envanteri hazirla

### P3 - Dusuk Oncelik (90 gun icinde)
13. **PR-013:** Privacy policy versiyonlama
14. **PR-014:** Uygulama ici policy erisimi iyilestir

---

## YASAL UYARILAR

1. **KVKK Uyumluluk:** Bu rapor teknik incelemeye dayanmaktadir. Hukuki uyumluluk icin avukat danismanligi alinmalidir.

2. **Saglik Verisi:** Doktor uzmanligi/hastane bilgisi KVKK kapsaminda ozel nitelikli kisisel veri olarak degerlendirilebilir. Acik riza gerekebilir.

3. **Yurt Disi Veri Aktarimi:** Gemini (Google), Mixpanel, PostHog, Stripe servisleri ABD merkezlidir. KVKK Madde 9 kapsaminda yeterli koruma veya standart sozlesme sartlari gereklidir.

4. **18+ Zorunlulugu:** Dating uygulamasi olarak 18 yas alti kullanim yasal sorumluluk dogurmaktadir. Guclu yas dogrulama kritik oneme sahiptir.

---

**Rapor Sonu**

*Bu rapor Vitalis Elite Medical Dating uygulamasinin 2026-02-15 tarihli kod tabanina dayanmaktadir.*
