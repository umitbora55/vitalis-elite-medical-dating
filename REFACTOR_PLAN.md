# Refactor Plan

Bu plan, büyük refactor gerektiren alanları ve önerilen sıralamayı içerir.

## 1) App Container Ayrıştırma

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx:1] `App.tsx` 1267 satır; UI router + domain logic + state orchestration aynı dosyada.
ÖNCELİK: P2
ÖNERİ: Aşağıdaki modüllere ayır:
`/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/App.tsx` içindeki view switch bloklarını `containers/` altına taşı (örn `containers/AppShell.tsx`, `containers/AuthGate.tsx`, `containers/DiscoveryContainer.tsx`).

## 2) ChatView Modülerleştirme

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/components/ChatView.tsx:73] 1000+ satır chat component'i çok fazla sorumluluk taşıyor.
ÖNCELİK: P2
ÖNERİ: Parçala:
`useChatScheduler`, `useReadReceipts`, `useCallSimulation`, `useChatSearch` hook'ları çıkar; UI overlay'leri ayrı component olarak böl.

## 3) Mock Data ve Domain Katmanları

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/constants.ts:134] Büyük mock data production bundle'a giriyor.
ÖNCELİK: P2
ÖNERİ: Mock data'yı `mocks/` altına taşı ve sadece `import.meta.env.DEV` altında yükle. Gerçek veriye geçilecekse `services/` altında Supabase query'leri ile besle.

## 4) Supabase Şema ve RLS Standardizasyonu

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql:18] `profiles` FK modeli `auth.users` yerine `public.users` kullanıyor.
ÖNCELİK: P0
ÖNERİ: Şemayı Supabase auth desenine hizala: `profiles.id REFERENCES auth.users(id)`; gereksiz `public.users` tablosunu kaldır veya trigger ile sync et.

2. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/supabase/migrations/20260209_init.sql:253] RLS sadece `profiles` ve `messages` için tanımlı.
ÖNCELİK: P1
ÖNERİ: `subscriptions`, `verification_requests`, `verified_work_emails`, `matches`, `swipes`, `notifications` için RLS + policy seti tasarla ve migration'a ekle.

## 5) Push Notification Entegrasyonunu Tamamlama

1. SORUN: [/Users/umitboragunaydin/Desktop/vitalis---elite-medical-dating/src/lib/pushNotifications.ts:4] Token alımı var ama SW registration ve backend token saklama yok.
ÖNCELİK: P1
ÖNERİ: `src/lib/pushNotifications.ts` içine SW registration ekle; Supabase'de `push_tokens` tablosu + upsert ile token'ı kullanıcıya bağla.

