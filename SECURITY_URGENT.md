# Security Urgent

Bu dosya, güvenlik ve güvenilirlik açısından acil ele alınması gereken doğrulanmış maddeleri listeler.

## P0 - Hemen

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:950] “DEV: Skip to App” bypass ile doğrulama gereksinimi atlanabiliyor.
RİSK SEVİYESİ: Critical
SALDIRI SENARYOSU: Her kullanıcı landing ekranından doğrulama olmadan uygulamanın “APP” adımına geçebilir.
ÇÖZÜM: Bypass butonunu üretimde kaldır veya sadece `import.meta.env.DEV` altında render et.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:501] “[DEV: Simulate Admin Approval]” ile admin onayı simüle edilip doğrulama bypass ediliyor.
RİSK SEVİYESİ: Critical
SALDIRI SENARYOSU: Kullanıcı kayıt akışında doğrulama sürecini atlayıp `onComplete` tetikleyebilir.
ÇÖZÜM: Üretimde bu butonu kaldır veya dev-only koşullandır. Gerçek admin onay akışı için server-side status güncellemesi uygula.

## P1 - Bu Hafta

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql:253] RLS/policy seti yalnızca `profiles` ve `messages` için tanımlı; `subscriptions` gibi hassas tablolar için migration'da RLS enable/policy yok.
RİSK SEVİYESİ: High
SALDIRI SENARYOSU: Supabase API üzerinden yetkisiz okuma/yazma riskini artırır (row-level kısıt olmadığı için).
ÇÖZÜM: `subscriptions`, `verification_requests`, `verified_work_emails` gibi tablolar için RLS aç ve policy yaz.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/sentry.ts:9] `sendDefaultPii: true` ile varsayılan PII gönderimi açık.
RİSK SEVİYESİ: High
SALDIRI SENARYOSU: Kullanıcıların PII verileri (örn IP) 3. parti servise beklenenden geniş kapsamda gidebilir.
ÇÖZÜM: `sendDefaultPii: false` yap, `beforeSend` ile redaction uygula ve consent mekanizması ekle.

3. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/functions/create-checkout-session/index.ts:38] `origin` header'ı success/cancel URL üretiminde kullanılıyor.
RİSK SEVİYESİ: Medium
SALDIRI SENARYOSU: Fonksiyon erişimi kısıtlı değilse, attacker kendi `Origin` header'ı ile redirect URL'leri istediği domaine yönlendirebilir.
ÇÖZÜM: Origin allowlist kullan veya ortam değişkeninden sabit `APP_BASE_URL` ile URL üret.

