# Tech Debt Envanteri

Bu dosya, “çalışıyor ama sürdürülebilir değil” kategorisindeki borçları listeler (her madde doğrulanmış referans içerir).

## Yapı ve Organizasyon

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:28] `src/lib/*` ile `components/`, `services/`, `hooks/` root-level karışık (örn `./src/lib/analytics` import'ları).
ÖNCELİK: P2
ÖNERİ: Tüm uygulama kodunu tek kök altında topla (`src/`), alias'ları (`@/`) standardize et.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1] God component: `App.tsx` (1267 satır).
ÖNCELİK: P2
ÖNERİ: Container/view ayrımı yap, domain logic'i services/hooks katmanına taşı.

3. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:73] God component: `ChatView.tsx` (1011 satır).
ÖNCELİK: P2
ÖNERİ: Hook + alt component'lara böl, state machine yaklaşımı kullan.

## Tooling ve Kalite Kapıları

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/.eslintrc.json:1] ESLint v9 ile `.eslintrc` uyumsuz; lint komutu doğrudan çalışmıyor.
ÖNCELİK: P2
ÖNERİ: Flat config'e geç (`eslint.config.js`) ve `npm run lint` ekle.

## Unused / Dead Code

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/stripe.ts:5] `getStripe` wrapper'ı projede kullanılmıyor.
ÖNCELİK: P3
ÖNERİ: Gerçek Stripe Elements kullanılmayacaksa kaldır; kullanılacaksa Premium checkout akışında entegre et.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/services/authService.ts:19] `getSession` ve `onAuthStateChange` helper'ları kullanılmıyor (auth hydration yok).
ÖNCELİK: P2
ÖNERİ: App bootstrap'ta session hydration ve auth listener ekle veya kullanılmayan fonksiyonları kaldır.

3. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/pushNotifications.ts:22] `listenForMessages` helper'ı kullanılmıyor.
ÖNCELİK: P3
ÖNERİ: Foreground message handling gerekiyorsa kullan; değilse kaldır.

4. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/package.json:19] `@google/genai` dependency kodda kullanılmıyor.
ÖNCELİK: P3
ÖNERİ: Kaldır veya edge function tarafına taşıyıp gerçek kullanım ekle.

## Demo/Mock Üretim Borcu

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/RegistrationFlow.tsx:398] Belge upload ve admin onayı simülasyon; gerçek upload/storage yok.
ÖNCELİK: P1
ÖNERİ: Supabase Storage upload + verification_requests kaydı + admin panel/iş akışı ekle.

