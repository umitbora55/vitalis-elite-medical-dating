# COMPLIANCE CHECKLIST

## Legal Docs
- [ ] Privacy Policy yayinlandi ve app icinden erisilebilir
- [ ] Terms of Service yayinlandi ve app icinden erisilebilir
- [ ] Purchase terms (abonelik yenileme/iptal/fiyat) acik
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/PremiumView.tsx:270`

## KVKK / GDPR
- [ ] Consent management (analytics/cookies) aktif
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/analytics.ts:39`
- [ ] Data export talebi gercek backend akisina bagli
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:80`
- [ ] Data deletion (forget me) gercekten uygulanmis
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/MyProfileView.tsx:95`

## Trust & Safety
- [ ] Report akisi backend moderation queue'ya yaziyor
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/CommunityGuidelines.tsx:20`
- [ ] Block akisi server-side persist ediliyor
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:518`
- [ ] Incident SLA ve moderation policy dokumante

## Age & Identity
- [ ] 18+ kontrolu sadece self-declare degil, ek dogrulama var
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:26`
- [ ] Belge dogrulama gercek upload + review ile calisiyor
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:480`

## Third-Party Data Sharing
- [ ] Sentry PII gonderimi kapali
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/sentry.ts:9`
- [ ] AI profil verisi paylasimi icin acik riza mevcut
  - Referans: `/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/functions/generate-icebreaker/index.ts:25`

## Sonuc
- Mevcut durumda compliance checklisti **PASS degil**.
