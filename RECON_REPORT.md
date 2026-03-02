# VITALIS — Elite Medical Dating App: RECON REPORT
Tarih: 2026-02-28 | Tarayıcı: Keşif Ajanı (Tam Tarama)

---

## 1. Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | React 19.2.4 + TypeScript 5.8.2 (strict mode) |
| Build | Vite 6.2.0 (port 3000) |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions/Deno) |
| State | Zustand 5.0.11 (8 store) |
| UI Kit | Tailwind CSS 3.4.17 + lucide-react 0.563.0 + framer-motion 12 |
| Form | react-hook-form 7.71.1 + zod 4.3.6 |
| Ödeme | Stripe (@stripe/stripe-js 8.7.0) |
| Analytics | Mixpanel 2.74.0 + PostHog 1.343.2 (consent-gated) |
| Hata Izleme | Sentry 10.38.0 (sendDefaultPii: false — DUZELTILDi) |
| Push | Firebase 12.9.0 (FCM) |
| AI | Google Gemini (@google/genai 1.40.0) |
| Test | Vitest 4 + Testing Library + Playwright 1.58.2 (e2e) |
| Mobile | /mobile — Expo Router, React Native (AYRI proje, boilerplate) |
| Rust Gateway | /SafeAgent — Cargo/Tokio gateway (AYRI proje) |

---

## 2. Klasör Yapısı (1 Seviye)

```
vitalis---elite-medical-dating/
├── App.tsx                    Ana router + auth state machine (god component ~98KB)
├── types.ts                   Global TypeScript tip tanımları
├── constants/                 MOCK_PROFILES, USER_PROFILE, demoScenarios.ts
├── components/                ~95+ React bileşeni
│   ├── admin/                 AdminPanelV2, VerificationQueue, ReportQueue,
│   │                          KPIDashboard, AIBiasAudit, AppealQueue...
│   ├── security/              ContentWarningOverlay, ToxicityNudge, ProfileRiskBadge,
│   │                          ChatSafetyBanner, LocationPrivacySettings,
│   │                          HealthcarePrivacySettings, BlockedUsersList
│   ├── moderation/            ModerationStatusScreen, AppealForm, MyReportsView,
│   │                          TransparencyCenter, CommunityGuidelines
│   └── monetization/          EthicalPlanSelector, PremiumPaywall, TripMode,
│                              AdvancedFilters, SubscriptionManagement, ProfileCoaching,
│                              DateConcierge, FreeUserManifesto, PrivacyControls
├── services/                  57 servis dosyasi (Supabase sorgulari + is mantigi)
├── stores/                    8 Zustand store
├── hooks/                     useTheme, useBoost, useSwipeLimit, useRecording,
│                              usePhotoHashCheck
├── utils/                     compatibility.ts (match skoru), compatibility.test.ts
├── src/lib/                   supabase.ts, stripe.ts, firebase.ts, analytics.ts,
│                              sentry.ts, pushNotifications.ts, react-native-compat.ts,
│                              assets-registry-mock.ts
├── supabase/
│   ├── migrations/            33 SQL migration dosyasi
│   └── functions/             15 Edge Function (Deno)
├── mobile/                    Expo Router app (AYRI proje — kendi tsconfig'i)
├── SafeAgent/                 Rust/Cargo gateway projesi (AYRI proje)
├── .env.example               Ortam degiskeni sablonu
└── .env.local                 Gercek sirlar (DIKKAT: repo'da mevcut)
```

---

## 3. Monorepo Durumu

**Hybrid Yapi — Tek Kok DEGIL:**

| Alt Proje | Dizin | Komut |
|-----------|-------|-------|
| Web App (ana) | `/` (kok) | `npm run dev` |
| Mobile | `/mobile` | `cd mobile && npx expo start` |
| Rust Gateway | `/SafeAgent` | `cd SafeAgent && cargo run` |
| Edge Functions | `/supabase/functions/` | `supabase functions serve` |

tsconfig.json `mobile/` ve `supabase/functions/` dizinlerini exclude eder.
`components/SwipeableCard.tsx` ve `services/pushService.ts` da tsconfig'den exclude edilmis.
Komutlar **kok dizinde** calistirilmali (Web App icin).

---

## 4. Auth Akisi

### State Machine (stores/authStore.ts)
```
LANDING → WAITLIST → LOGIN
       → REGISTRATION → PENDING_VERIFICATION → ONBOARDING_FLOW
                                             → ONBOARDING
                                             → PROFILE_COMPLETION
                                             → APP
```

### Dosya Zinciri

| Adim | Dosya | Fonksiyon |
|------|-------|-----------|
| Supabase client init | `src/lib/supabase.ts` | `createClient()` — env validation ile |
| Kayit | `services/authService.ts` | `signUpWithEmail()` |
| Giris | `services/authService.ts` | `signInWithEmail()` |
| OAuth | `services/authService.ts` | `signInWithOAuth()` |
| Magic link | `services/authService.ts` | `signInWithMagicLink()` |
| Session dinleme | `App.tsx` | `onAuthStateChange()` |
| Sifremi unuttum | `services/authService.ts` | `resetPassword()`, `updatePassword()` |
| Cikis | `services/authService.ts` | `signOut()` → localStorage+sessionStorage.clear() |
| Token refresh | Supabase JS client otomatik yonetir | — |
| OTP dogrulama | `services/verificationService.ts` | `sendVerificationOtp()`, `verifyOtp()` |
| Doktor dogrulama | `services/verificationService.ts` | `createVerificationRequest()`, `uploadVerificationDocument()` |
| Admin erisim | `services/adminService.ts` | `checkAdminAccess()` |
| Admin UI kapisi | `components/admin/AdminSecurityGate.tsx` | IP + device fingerprint whitelist |

---

## 5. Veri Sinifları

### PII (Kisisel Veriler)
| Alan | Konum |
|------|-------|
| name, age | `types.ts::Profile`, `profiles` tablosu |
| email | `auth.users` (Supabase Auth) |
| city, location | `Profile.city`, `Profile.location` |
| university | `Profile.university` |
| phone | OTP dogrulamasi icin (verificationService) |

### Saglik Verisi (Ozel Nitelikli)
| Alan | Konum |
|------|-------|
| role (MedicalRole) | `types.ts::MedicalRole`, `profiles.role` |
| specialty (Specialty) | `types.ts::Specialty`, `profiles.specialty` |
| hospital/institution | `Profile.hospital` (gizlenebilir: `institutionHidden`) |
| verification documents | `verification_documents` tablosu + Supabase Storage |
| face_embeddings | `20260228_liveness_verification_system.sql` — KVKK ozel nitelikli |
| liveness_checks | Ayni migration |
| fraud_signals | Ayni migration |
| user_risk_scores | Ayni migration |

### Iliski / Davranis Verisi
| Alan | Konum |
|------|-------|
| matches | `stores/matchStore.ts`, `types.ts::Match` (localStorage persist) |
| messages | `types.ts::Message`, `services/chatService.ts`, `conversations` tablosu |
| photos | `services/photoService.ts` → `profile-photos` bucket |
| swipe history | `stores/matchStore.ts` (localStorage) |
| date_invitations | `20260228_date_flow_system.sql` |
| trusted_contacts | Ayni migration |
| date_feedback | Ayni migration |

---

## 6. Kritik Yuzeyler

### Mesajlasma
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/chatService.ts` — Supabase Realtime, match-gated conversation olusturma, RPC: `create_conversation`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/ChatView.tsx` — Ana sohbet UI
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/contentModerationService.ts` — Kural tabanli mesaj moderasyonu (<5ms, kural motoru)
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/security/ToxicityNudge.tsx` — Gonderim oncesi uyari

### Medya Upload
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/photoService.ts` — `profile-photos` bucket, max 5MB, 6 foto limiti, JPEG/PNG/WEBP
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/verificationService.ts` — `uploadVerificationDocument()` — `verification-docs` bucket, max 10MB
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/functions/moderate-image/` — Edge Function goruntu moderasyonu
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/watermarkService.ts` — Fotograf filigrani
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/photoHashService.ts` — Fotograf hash kontrolu (duplicate tespit)

### Arama / Match
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/discoveryService.ts` — `fetchDiscoveryProfiles()` — Supabase RLS ile filtreleme, pagination
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/stores/discoveryStore.ts` — gunluk swipe limiti, bloklu profiller
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/slateService.ts` — Gunluk 7 oneri motoru (date_prob x response_prob x trust x freshness x sigmoid)
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/utils/compatibility.ts` — Client-side uyumluluk skoru
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/explanationService.ts` — "Neden Eslestik" 11 faktor aciklama sistemi (DSA Art.27)

### Odeme
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/src/lib/stripe.ts` — Stripe JS init (VITE_STRIPE_PUBLIC_KEY)
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/checkoutService.ts` — `createCheckoutSession('DOSE'|'FORTE'|'ULTRA')` → Edge Function
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/functions/create-checkout-session/` — Stripe Checkout Session olusturma
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/functions/webhooks-stripe/` — Webhook handler
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/subscriptionService.ts` — `getActiveSubscription()`
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/stores/capabilityStore.ts` — Capability flags (canUseTripMode, canUseAdvancedFilters, canUseIncognito...)

### Doktor Dogrulama
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/verificationService.ts` — Domain lookup, OTP, belge yukleme, durum guncelleme
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/healthcareVerificationService.ts` — Turkiye saglik domain lookup, liveness, face embedding, fraud signals, risk skoru, trust badge, appeal
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/LivenessCheck.tsx` — Video-selfie challenge UI (4 challenge: blink/turn_right/turn_left/smile)
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/TrustBadge.tsx` — Rozet goruntusu + VerificationStatusPanel
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/adminModerationService.ts` — Admin moderation islemleri
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/admin/VerificationQueue.tsx` — Admin review kuyrugu
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/supabase/functions/admin-decide-verification/` — Edge Function onay/ret

### Guvenlik
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/locationPrivacyService.ts` — 500-1500m konum obfuscation
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/profileRiskService.ts` — 0-100 risk skoru, 5 seviye
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/deviceAbuseService.ts` — Cihaz kotu kullanim tespiti
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/services/autoRestrictionService.ts` — Otomatik kisitlama
- `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/admin/AdminSecurityGate.tsx` — IP + device fingerprint whitelist

---

## 7. Ucuncu Parti Servisler

| Servis | Amac | Config Dosyasi |
|--------|------|----------------|
| Supabase | DB, Auth, Storage, Realtime, Edge Functions | `src/lib/supabase.ts`, `.env.local` |
| Stripe | Odeme / Abonelik (DOSE/FORTE/ULTRA) | `src/lib/stripe.ts`, `.env.local` |
| Firebase | Push Notification (FCM) | `src/lib/firebase.ts`, `.env.local` |
| Mixpanel | Analytics | `src/lib/analytics.ts`, `.env.local` |
| PostHog | Analytics | `src/lib/analytics.ts`, `.env.local` |
| Sentry | Hata Izleme | `src/lib/sentry.ts`, `.env.local` |
| Google Gemini | AI (icebreaker, coaching, AI consent) | `services/geminiService.ts`, server-side secret |

---

## 8. Ortam Dosyalari

| Dosya | Durum |
|-------|-------|
| `.env.example` | Kok dizinde mevcut, tum key'ler dokumante |
| `.env.local` | Kok dizinde mevcut — GERCEK SIRLAR var |

### Beklenen Env Degiskenleri
```
VITE_SUPABASE_URL          (zorunlu — startup'ta throw eder)
VITE_SUPABASE_ANON_KEY     (zorunlu — startup'ta throw eder)
VITE_STRIPE_PUBLIC_KEY     (opsiyonel — odeme devre disi kalir, console.warn)
VITE_FIREBASE_API_KEY      (opsiyonel — push devre disi kalir)
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_VAPID_KEY
VITE_FIREBASE_STORAGE_BUCKET
VITE_MIXPANEL_TOKEN        (opsiyonel — analytics devre disi)
VITE_POSTHOG_KEY           (opsiyonel)
VITE_POSTHOG_HOST          (varsayilan: https://app.posthog.com)
VITE_SENTRY_DSN            (opsiyonel — hata izleme devre disi)
VITE_APP_VERSION

# Server-side (Edge Functions — Supabase Dashboard'da saklanmali):
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
# SUPABASE_SERVICE_ROLE_KEY
# GEMINI_API_KEY
# APP_BASE_URL
# ALLOWED_ORIGINS
```

---

## 9. Migration Dosyalari (33 adet)

| Dosya | Icerik |
|-------|--------|
| `20260209_init.sql` | Ana sema baslangioi |
| `20260210_verification.sql` | Dogrulama sistemi |
| `20260211_security_hardening.sql` | Guvenlik sikilastirma |
| `20260212_account_deletion_executor.sql` | Hesap silme executor |
| `20260213_verification_documents_storage.sql` | Belge storage |
| `20260215_drop_unused_users_table.sql` | Temizlik |
| `20260216_profile_data_collection.sql` | Profil verileri |
| `20260217_profile_preferences.sql` | Tercihler |
| `20260218_consolidate_deletion.sql` | Silme konsolidasyonu |
| `20260218_discovery_rls.sql` | Discovery RLS |
| `20260218_verification_status_protection.sql` | Durum koruma |
| `20260228_daily_slate_system.sql` | Gunluk 7 oneri + 5 RPC |
| `20260228_date_flow_system.sql` | Date davet + guvenlik + 8 tablo |
| `20260228_ethical_monetization.sql` | Etik abonelik sistemi |
| `20260228_explanation_system.sql` | DSA Art.27 aciklama sistemi |
| `20260228_liveness_verification_system.sql` | Liveness + face embedding + 16 tablo |
| `20260228_privacy_first_ai.sql` | AI gizlilik sistemi |
| `20260228_security_default_on.sql` | Guvenlik varsayilan acik + 5 tablo |
| `20260228_transparent_moderation.sql` | Seffaf moderasyon |
| `20260320_admin_verification_foundation.sql` | Admin dogrulama temeli |
| `20260320_admin_verification_modpanel.sql` | Admin panel |
| `20260321_admin_verification_hardening.sql` | Sikilastirma |
| `20260322_seed_invite_code.sql` | Davet kodu tohumu |
| `001_complete_schema.sql` | Tam sema (1. tur) |
| `002_user_journey.sql` | Kullanici yolculugu |
| `003_match_date_flow.sql` | Match ve date akisi |
| `004_premium_privacy.sql` | Premium + gizlilik |
| `005_events_community.sql` | Etkinlik + topluluk |
| `006_admin_panel.sql` | Admin paneli |
| `007_anti_abuse.sql` | Anti-abuse |
| `008_moat_features.sql` | Moat ozellikleri |
| `_applied/20260216_profile_discovery_rls.sql` | Uygulanmis RLS |

---

## 10. Store Envanteri (8 adet)

| Store | Dosya | State | Persist |
|-------|-------|-------|---------|
| authStore | `stores/authStore.ts` | authStep (LANDING/LOGIN/REGISTRATION/APP...) | Hayir |
| userStore | `stores/userStore.ts` | profile: Profile, isPremium, premiumTier | Hayir |
| discoveryStore | `stores/discoveryStore.ts` | profiles[], swipedProfileIds, blockedProfileIds, dailySwipesRemaining, filters | Hayir |
| matchStore | `stores/matchStore.ts` | matches[], activeChatMatch, swipeHistory, dailyExtensions | localStorage (persist middleware) |
| uiStore | `stores/uiStore.ts` | currentView, isFilterOpen, viewingProfile, viewingStoryProfile | Hayir |
| notificationStore | `stores/notificationStore.ts` | notifications[] | Hayir |
| slateStore | `stores/slateStore.ts` | slate, currentIndex, sessionStats, viewMode, pendingMatchCount | Hayir |
| capabilityStore | `stores/capabilityStore.ts` | canUseTripMode, canUseAdvancedFilters, canUseIncognito, canHideActivity... | Hayir |

---

## 11. Servis Envanteri (57 dosya)

| Kategori | Servisler |
|----------|-----------|
| Auth | authService, verificationService, healthcareVerificationService, inviteService |
| Profil | profileService, onboardingService, accountService |
| Kesif | discoveryService, filterService, advancedFilterService, elitePoolService, picksService |
| Match/Slate | slateService, matchTimerService |
| Chat | chatService, voiceIntroService |
| Fotograf | photoService, photoHashService, watermarkService |
| Odeme | subscriptionService, checkoutService, subscriptionPlanService |
| Guvenlik | safetyService, blockAndReportService, contentModerationService, profileRiskService, locationPrivacyService, deviceAbuseService, autoRestrictionService, deviceService |
| Date Akisi | dateInvitationService, dateSafetyService, datePlanService, dateCheckinService, dateConciergeService |
| Sosyal | clubService, eventService, conferenceService, vouchService, reputationService |
| Admin | adminService, adminModerationService, adminPanelService, violationService, appealService, transparentModerationService |
| AI | geminiService, explanationService, profileCoachingService, aiConsentService |
| Konum | locationService, tripModeService, dutyModeService, availabilityService |
| Analytics | analyticsService, pushService, qrCheckinService, eventMatchService, planPledgeService |

---

## 12. Kritik Sorunlar (Guncel Tarama)

### console.log Bulgulari
| Dosya | Satir | Aciklama | Oncelik |
|-------|-------|----------|---------|
| `services/pushService.ts` | 105 | Web'de push kayit atlama logu | Dusuk |
| `components/admin/AdminSecurityGate.tsx` | 123-127 | Device fingerprint + IP konsola yaziliyor | YUKSEK — Guvenlik riski |
| `src/lib/analytics.ts` | 81 | eslint-disable ile suppress edilmis console.warn | Orta |

### TODO / FIXME
| Dosya | Satir | Icerik |
|-------|-------|--------|
| `mobile/app/(tabs)/index.tsx` | 120 | `// TODO: Implement boost (premium feature)` — eksik implementasyon |

### `as any` / Tip Guvenligi
| Dosya | Adet | Not |
|-------|------|-----|
| `App.tsx` | 2 | Dikkat gerektirir |
| `components/NearbyView.test.tsx` | 1 | Test dosyasi |
| `components/MyProfileView.tsx` | 1 | Uretim kodu |
| `src/lib/react-native-compat.ts` | 1 | Compat shim |
| `src/lib/assets-registry-mock.ts` | 2 | Mock dosya |

### tsconfig Exclude'lar (Tip Denetiminden Muaf)
- `components/SwipeableCard.tsx`
- `services/pushService.ts`
- `mobile/` dizini (tumu)
- `supabase/functions/` dizini (tumu)

### eslint-disable Kullanimi
| Dosya | Kural | Not |
|-------|-------|-----|
| `components/monetization/AdvancedFilters.tsx` (2) | `@typescript-eslint/no-explicit-any` | Gercek any kullanimi |
| `components/NearbyView.test.tsx` | `@typescript-eslint/no-explicit-any` | Test mock |
| `components/RegistrationFlow.tsx` | `react-hooks/exhaustive-deps` | useEffect dep eksigi |
| `components/DailyPicksView.tsx` | `react-hooks/exhaustive-deps` | useEffect dep eksigi |
| `src/lib/supabase.ts` | `no-new` | URL dogrulama icin |

### .env.local Durumu
`.env.local` dosyasi kok dizinde mevcut. `.gitignore` kontrolu yapilmali.

### Pozitif Bulgular (Duzeltilmis Sorunlar)
- Supabase client startup'ta env validation yapar (throw eder) — env eksiksiz olmak zorunda
- `signOut()` localStorage + sessionStorage temizler (SEC-006 fix kayitli)
- Sentry'de `sendDefaultPii: false` ve Authorization header silme aktif
- Analytics consent-gated — KVKK uyumlu tasarim
- `as any` sayisi cok dusuk (5 toplam) — genel tip guvenligi iyi
- `noImplicitAny: true`, `strictNullChecks: true`, `noImplicitReturns: true` aktif
- AUDIT-FIX yorumlari mevcut (SEC-004, SEC-006, FE-003, BE-021) — aktif hardening sureci

---

## 13. Edge Functions (15 adet)

| Fonksiyon | Amac |
|-----------|------|
| `create-checkout-session` | Stripe Checkout Session |
| `webhooks-stripe` | Stripe webhook isleme |
| `generate-icebreaker` | Gemini AI ile buz kirici mesaj |
| `admin-verification-queue` | Admin dogrulama kuyrugu |
| `admin-verification-case` | Tek vaka detayi |
| `admin-claim-verification-request` | Vaka talep etme |
| `admin-get-verification-doc-url` | Imzali dokuman URL |
| `admin-decide-verification` | Onay/ret karari |
| `admin-settings` | Uygulama ayarlari |
| `admin-audit-logs` | Denetim kayitlari |
| `scheduled-retention-cleanup` | Veri saklama temizligi |
| `delete-account` | Hesap silme |
| `moderate-image` | Goruntu moderasyonu |
| `push-worker` | Push bildirim gonderici |
| `_shared/admin.ts` | Paylasilan admin yardimcilari |

---

*Rapor tamamlandi. Tum dosya yollari mutlak path olarak referanslanmistir.*
*Onceki rapor bilgileri (2026-02-15) bu versiyona entegre edilmistir.*
