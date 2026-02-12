# Vitalis Master Issues

Bu dosya, projede doğrulanmış sorunların tek bir birleşik listesidir. Her madde somut dosya ve satır numarası içerir.

## KRİTİK (P0) - Hemen Düzelt

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/vitest.config.ts:10] `npm test` / CI unit test'ler `mobile/node_modules` altındaki bağımlılık testlerini de koşuyor ve testler fail oluyor (projede test komutu çalışmıyor).
ÖNCELİK: P0
ÖNERİ: `exclude` pattern'ini `**/node_modules/**` ve `mobile/**` kapsayacak şekilde güncelle veya `include` ile sadece kendi test dosyalarını seç. Örn: `exclude: ['e2e/**', '**/node_modules/**', 'mobile/**']`.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/.husky/pre-commit:4] Pre-commit hook `npm run test:ci` çalıştırıyor ama mevcut durumda testler fail olduğu için commit akışı bloklanıyor.
ÖNCELİK: P0
ÖNERİ: Önce `vitest.config.ts` exclude fix'i ile `npm run test:ci` stabil hale getir; ardından hook'ları tekrar doğrula.

3. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:950] Landing ekranında “DEV: Skip to App” bypass üretimde açık (verification gate'i tamamen bypass ediyor).
ÖNCELİK: P0
ÖNERİ: Bu butonu üretimde render etme. `if (import.meta.env.DEV)` guard'ı ile yalnızca dev ortamda göster veya tamamen kaldır.

4. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:501] Kayıt akışında “[DEV: Simulate Admin Approval]” butonu üretimde açık ve doğrulama sürecini bypass ediyor.
ÖNCELİK: P0
ÖNERİ: Bu butonu üretimde render etme. `import.meta.env.DEV` ile koşullandır veya kaldır. Gerçek admin onayı için server-side akış ekle.

5. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:58] Kullanıcı girdisi (`highlight`) direkt `RegExp` içine gömülüyor. Geçersiz regex input'u runtime exception fırlatıp tüm uygulamayı ErrorBoundary fallback'ine düşürebilir.
ÖNCELİK: P0
ÖNERİ: `highlight` değerini regex için escape et (`escapeRegExp`) ve `g` flag'i kullanmadan split/highlight yap. Örn: `const escaped = highlight.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'); const regex = new RegExp(\`(\${escaped})\`, 'i');`.

6. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql:18] `profiles.id` foreign key'i `public.users(id)` tablosuna bağlı; ancak uygulama `supabase.auth` kullanıyor ve `public.users` tablosuna hiç insert yok (kodda `from('users')` yok). Bu şema uygulamayla uyumsuz ve FK violation riski taşıyor.
ÖNCELİK: P0
ÖNERİ: `profiles.id` FK'sini `auth.users(id)` referanslayacak şekilde değiştir ve `public.users` tablosunu kaldır (veya `auth.users` ile senkronlayan trigger ekle). En yaygın desen: `profiles.id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.

## YÜKSEK (P1) - Bu Hafta Düzelt

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/functions/webhooks-stripe/index.ts:55] Stripe webhook handler `checkout.session.completed` event'inde `subscriptions` tablosuna her seferinde `insert` yapıyor; idempotency yok. Stripe event retry'larında duplicate kayıt oluşabilir.
ÖNCELİK: P1
ÖNERİ: `store_transaction_id` için unique constraint ekle ve webhook'ta `upsert` kullan veya önce `select` ile var mı kontrol et. Ayrıca Stripe event id'si ile processed-events tablosu tut.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql:172] `subscriptions.store_transaction_id` için unique constraint yok; webhook duplicate insert riskini artırıyor.
ÖNCELİK: P1
ÖNERİ: `ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_store_transaction_id_unique UNIQUE (store_transaction_id);` gibi bir constraint ekle (NULL için ayrıca düşün).

3. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/hooks/useSwipeLimit.ts:27] Günlük limit reset tetikleme mantığı (`diff <= 1000`) ve interval (60sn) kombinasyonu pratikte reset'in çoğu zaman hiç çağrılmamasına yol açabilir.
ÖNCELİK: P1
ÖNERİ: Bir sonraki midnight'a `setTimeout` ile tek seferlik timer kur veya “tarih değişti mi?” kontrolü ile reset'i güvenilir yap.

4. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileDetailView.tsx:25] Block confirm akışında `setShowBlockConfirm(false)` yok; kullanıcı “Confirm Block”a basınca modal kapanmıyor.
ÖNCELİK: P1
ÖNERİ: `handleBlockConfirm` içinde `setShowBlockConfirm(false)` ve gerekiyorsa `setIsMenuOpen(false)` çağır.

5. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/pushNotifications.ts:15] Push token alınıyor ama service worker registration yapılmıyor ve token backend'e kaydedilmiyor; gerçek push akışı incomplete.
ÖNCELİK: P1
ÖNERİ: `navigator.serviceWorker.register('/firebase-messaging-sw.js')` ile kayıt yap, `getToken(..., { serviceWorkerRegistration })` kullan ve token'ı Supabase'de kullanıcıya bağla (örn `push_tokens` tablosu).

6. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileCard.tsx:127] Swipe card üzerinde “Verified” badge koşulsuz gösteriliyor; `profile.verified` / `profile.verificationStatus` dikkate alınmıyor.
ÖNCELİK: P1
ÖNERİ: Badge'i yalnızca `profile.verificationStatus === 'VERIFIED'` veya `profile.verified === true` olduğunda göster.

7. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ProfileDetailView.tsx:125] Detay ekranında “Verified Healthcare Professional” badge koşulsuz gösteriliyor.
ÖNCELİK: P1
ÖNERİ: Badge render'ını doğrulama durumuna bağla ve statüyü UI'da doğru yansıt.

## ORTA (P2) - Bu Ay Düzelt

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/index.html:55] `/index.css` dosyası linklenmiş ama dosya yok; `vite build` sırasında uyarı üretiyor.
ÖNCELİK: P2
ÖNERİ: Link'i kaldır veya gerçekten kullanılan minimal CSS dosyasını oluştur.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/index.html:7] Tailwind CDN runtime kullanımı production bundle performansını ve deterministik build'i zayıflatır (CSS purge yok, runtime config var).
ÖNCELİK: P2
ÖNERİ: Tailwind'i build-time entegre et (tailwindcss + postcss) ve CDN script'ini kaldır.

3. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1] `App.tsx` 1267 satır ve çok fazla sorumluluk içeriyor (routing, discovery, tips, billing, verification, UI state).
ÖNCELİK: P2
ÖNERİ: Görünümleri ayrı container'lara böl, view-router katmanı çıkar, store/selectors ile render yüzeyini küçült.

4. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:73] `ChatView` 1000+ satır “god component” (tema, arama, arama overlay, planlama, arama highlight, arama, call overlay, scheduling, templates).
ÖNCELİK: P2
ÖNERİ: Alt modüllere ayır: state machines (call/scheduler), hooks, UI components.

5. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/constants.ts:134] Büyük mock dataset (profiller, içerikler) production bundle'a dahil oluyor ve ana chunk'ı şişiriyor.
ÖNCELİK: P2
ÖNERİ: Mock datayı yalnızca dev ortamda yükle, JSON dosyasına taşı veya API'den getir; build'te tree-shake edilebilir hale getir.

6. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/sentry.ts:9] `sendDefaultPii: true` ile varsayılan PII gönderimi açık.
ÖNCELİK: P2
ÖNERİ: Varsayılanı kapat (`false`), `beforeSend` ile redaction uygula, kullanıcı rızası/consent ekle.

7. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/.eslintrc.json:1] ESLint v9 yüklü (package.json) ancak config `.eslintrc.json` formatında; `npx eslint` flat config beklediği için çalışmıyor.
ÖNCELİK: P2
ÖNERİ: `eslint.config.js` (flat config) oluştur veya ESLint'i v8'e pinle; CI'ya `lint` script'i ekle.

## DÜŞÜK (P3) - Backlog

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/package.json:19] `@google/genai` bağımlılığı (ve `index.html` importmap girişi) kodda kullanılmıyor.
ÖNCELİK: P3
ÖNERİ: Kullanılmayacaksa kaldır; kullanılacaksa edge function tarafına taşıyıp tip güvenli wrapper yaz.

