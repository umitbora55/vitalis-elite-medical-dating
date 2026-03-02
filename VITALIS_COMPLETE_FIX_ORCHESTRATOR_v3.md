# 🚀 VITALIS COMPLETE FIX ORCHESTRATOR v3.0

## Multi-Agent Quality Protocol ile Web → Mobile Tam Düzeltme

---

## 0) ANA HEDEF

**Faz 1:** Web uygulamasını production-ready hale getir (Google/Apple login dahil)
**Faz 2:** Mobile uygulamayı production-ready hale getir (165 issue fix)
**Nihai Hedef:** Üst düzey, profesyonel, hatasız, App Store/Play Store ready uygulama

---

## 1) GİRDİLER

### 1.1 Bağlam
- **Amaç:** Vitalis - Sağlık profesyonelleri için premium dating uygulaması
- **Hedef Kitle:** Doktorlar, hemşireler, sağlık çalışanları (Türkiye)
- **Dil/Ton:** Profesyonel, güvenilir, premium hissi
- **Platform:** Web (Vite/React) + Mobile (React Native/Expo)
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions)

### 1.2 Mevcut Durum

**Web Durumu:**
- ✅ Vite/React çalışıyor (localhost:3001)
- ✅ UI render ediliyor
- ❌ Google/Apple OAuth aktif değil
- ❌ Bazı import hataları var
- ⚠️ Tam fonksiyonel test yapılmadı

**Mobile Durumu (Audit Sonucu):**
- Overall Score: 58/100 (D+)
- 🔴 CRITICAL: 11 issue
- 🟠 HIGH: 41 issue
- 🟡 MEDIUM: 81 issue
- 🟢 LOW: 32 issue
- **Toplam:** 165 issue

**Backend Durumu:**
- ✅ Supabase schema deployed
- ✅ Edge Functions deployed (push-worker, delete-account, moderate-image)
- ✅ CRON job aktif
- ⚠️ Google/Apple OAuth provider'ları kapalı

### 1.3 Kalite Standardı (Baraj)

**Web Release Gate:**
- Kritik hata = 0
- Authentication çalışıyor (Email + Google + Apple)
- Core flow'lar fonksiyonel (Login → Browse → Like → Match → Chat)
- Performance: Lighthouse Score ≥ 80

**Mobile Release Gate:**
- P0 (Critical) = 0
- P1 (High) ≤ 5
- Overall Score ≥ 80/100
- iOS App Store guidelines compliance
- Android Play Store guidelines compliance

---

## 2) ROLLER VE SORUMLULUKLAR

### 2.1 PATRON (Orkestratör / Baş Hakem)
- Süreci yönetir, ajanlara görev verir
- Faz geçişlerini onaylar
- Uyuşmazlıklarda karar verir
- Gate kontrollerini yapar

### 2.2 WEB FAZI AJANLARI

| Ajan | Rol | Sorumluluk |
|------|-----|------------|
| **W-01** | Auth Specialist | OAuth setup (Google, Apple, Email) |
| **W-02** | UI/UX Auditor | Component review, responsive check |
| **W-03** | API Integrator | Supabase service connections |
| **W-04** | Performance Engineer | Bundle size, Lighthouse optimization |
| **W-05** | Security Auditor | XSS, CSRF, auth flow security |
| **W-06** | QA/Tester | E2E flow testing, bug hunting |
| **W-07** | Editör | Code quality, refactoring |

### 2.3 MOBILE FAZI AJANLARI

| Ajan | Rol | Sorumluluk |
|------|-----|------------|
| **M-01** | Touch Target Fixer | 44px minimum, hitSlop |
| **M-02** | Button State Fixer | Press feedback, loading states |
| **M-03** | Form Input Fixer | Keyboard handling, validation |
| **M-04** | Navigation Fixer | Gestures, back button, deep link |
| **M-05** | Typography Fixer | Font scale, readability |
| **M-06** | Layout Fixer | Safe area, spacing |
| **M-07** | Performance Fixer | FlatList, memo, native driver |
| **M-08** | Accessibility Fixer | VoiceOver, TalkBack |
| **M-09** | Responsive Fixer | Screen sizes, orientation |
| **M-10** | Platform Fixer | iOS/Android specific |
| **M-11** | Dark Mode Fixer | Theme system |
| **M-12** | State Fixer | Loading, error, empty states |

### 2.4 CROSS-FUNCTIONAL AJANLAR

| Ajan | Rol | Sorumluluk |
|------|-----|------------|
| **X-01** | Eleştirmen (Red Team) | Varsayımları zorlar, açıkları bulur |
| **X-02** | Doğrulayıcı (Tester) | Test senaryoları, kanıt üretir |
| **X-03** | Entegratör | Web-Mobile-Backend tutarlılığı |

---

## 3) ÇALIŞMA ŞEKLİ

### FAZ 1: WEB UYGULAMASI (Tahmini: 2-3 gün)

```
┌─────────────────────────────────────────────────────────────┐
│                    SPRINT W1: AUTH SETUP                    │
│  Hedef: Google + Apple + Email login çalışır durumda        │
└─────────────────────────────────────────────────────────────┘

Görevler:
├── W-01: Supabase Google OAuth Provider aktif et
├── W-01: Supabase Apple OAuth Provider aktif et  
├── W-01: Client-side OAuth flow implement et
├── W-03: Auth callback handling
├── W-05: Token storage security review
└── X-02: Auth flow test senaryoları

Çıktı:
- [ ] Google login çalışıyor
- [ ] Apple login çalışıyor
- [ ] Email/password login çalışıyor
- [ ] Session persistence çalışıyor
- [ ] Logout çalışıyor

┌─────────────────────────────────────────────────────────────┐
│                  SPRINT W2: CORE FLOWS                      │
│  Hedef: Temel kullanıcı akışları fonksiyonel                │
└─────────────────────────────────────────────────────────────┘

Görevler:
├── W-02: Onboarding flow review
├── W-03: Profile CRUD operations
├── W-03: Discovery/Browse profiles
├── W-03: Like/Pass actions
├── W-03: Match detection
├── W-03: Chat messaging
├── W-06: Her flow için test
└── X-01: Edge case review

Çıktı:
- [ ] Yeni kullanıcı kaydı
- [ ] Profil oluşturma/düzenleme
- [ ] Profil keşfetme
- [ ] Beğenme/geçme
- [ ] Eşleşme bildirimi
- [ ] Mesajlaşma

┌─────────────────────────────────────────────────────────────┐
│                SPRINT W3: POLISH & DEPLOY                   │
│  Hedef: Production-ready web app                            │
└─────────────────────────────────────────────────────────────┘

Görevler:
├── W-04: Lighthouse audit & optimization
├── W-02: Responsive breakpoint fixes
├── W-05: Final security audit
├── W-07: Code cleanup & refactor
├── X-02: Full regression test
└── PATRON: Gate decision

Çıktı:
- [ ] Lighthouse Score ≥ 80
- [ ] Mobile responsive OK
- [ ] Security checklist passed
- [ ] Code review passed
- [ ] ✅ WEB GATE PASSED
```

### FAZ 2: MOBILE UYGULAMA (Tahmini: 3-4 hafta)

```
┌─────────────────────────────────────────────────────────────┐
│              SPRINT M1: CRITICAL FIXES (P0)                 │
│  Hedef: 11 kritik issue çözülür                             │
└─────────────────────────────────────────────────────────────┘

P0 Issues from Audit:
1. Mobile app is template scaffold - Core features missing
2. No React Navigation setup
3. No Supabase client initialization  
4. No authentication flow
5. No profile management
6. No discovery/swipe screen
7. No match handling
8. No chat implementation
9. No push notification handling
10. No deep linking
11. No error boundaries

Görevler:
├── M-04: React Navigation setup
├── M-ALL: Core screens implementation
│   ├── AuthScreen (Login/Register)
│   ├── OnboardingScreen
│   ├── DiscoveryScreen (Swipe)
│   ├── MatchesScreen
│   ├── ChatScreen
│   ├── ProfileScreen
│   └── SettingsScreen
├── X-03: Web logic'i mobile'a port et
└── X-02: Her screen için test

Çıktı:
- [ ] Navigation structure complete
- [ ] All core screens exist
- [ ] Basic functionality works
- [ ] P0 count = 0

┌─────────────────────────────────────────────────────────────┐
│                SPRINT M2: HIGH FIXES (P1)                   │
│  Hedef: 41 yüksek öncelikli issue çözülür                   │
└─────────────────────────────────────────────────────────────┘

P1 Categories:
- Touch targets (M-01): ~8 issues
- Button states (M-02): ~6 issues
- Form inputs (M-03): ~7 issues
- Navigation (M-04): ~5 issues
- Performance (M-07): ~8 issues
- Loading/Error states (M-12): ~7 issues

Her ajan kendi kategorisini paralel çözer.

Çıktı:
- [ ] Touch targets ≥ 44px
- [ ] All buttons have feedback
- [ ] Keyboard handling proper
- [ ] Gestures working
- [ ] List virtualization
- [ ] Loading states everywhere
- [ ] P1 count ≤ 5

┌─────────────────────────────────────────────────────────────┐
│              SPRINT M3: MEDIUM/LOW FIXES (P2/P3)            │
│  Hedef: Polish ve refinement                                │
└─────────────────────────────────────────────────────────────┘

P2/P3 Categories:
- Typography (M-05)
- Layout/Spacing (M-06)
- Accessibility (M-08)
- Responsive (M-09)
- Platform-specific (M-10)
- Dark mode (M-11)

Çıktı:
- [ ] Typography consistent
- [ ] Safe areas handled
- [ ] VoiceOver/TalkBack works
- [ ] All screen sizes supported
- [ ] iOS/Android parity
- [ ] Dark mode complete
- [ ] Overall Score ≥ 80

┌─────────────────────────────────────────────────────────────┐
│               SPRINT M4: STORE SUBMISSION                   │
│  Hedef: App Store + Play Store ready                        │
└─────────────────────────────────────────────────────────────┘

Görevler:
├── App icons & splash screens
├── Store screenshots
├── Privacy policy & terms
├── App Store metadata
├── Play Store metadata
├── TestFlight build
├── Internal testing track
└── PATRON: Final gate

Çıktı:
- [ ] iOS build successful
- [ ] Android build successful
- [ ] Store assets ready
- [ ] Compliance documents ready
- [ ] ✅ MOBILE GATE PASSED
```

---

## 4) TUR BAZLI ÇALIŞMA PROTOKOLÜ

Her sprint içinde şu döngü tekrarlanır:

### TUR N — SORUN AVI (Paralel)

Her ajan kendi alanını tarar:

```markdown
## SORUN LİSTESİ - [AJAN ID]

### ISSUE-[ID]
- **Kategori:** Kritik / Orta / Düşük
- **Dosya:** [path/to/file.tsx:line]
- **Sorun:** [Açıklama]
- **Kanıt:** [Kod snippet veya screenshot]
- **Etki:** [Neden önemli]
- **Önerilen Fix:** [Ne yapılmalı]
- **Effort:** S / M / L
```

### TUR N — TARTIŞMA & BİRLEŞTİRME

- Ajanlar birbirlerinin bulgularını review eder
- Duplicate'lar birleştirilir
- Öncelik sıralaması yapılır
- PATRON nihai backlog'u onaylar

### TUR N — DÜZELTME UYGULAMA

```markdown
## CHANGELOG - TUR [N]

### [ISSUE-ID]: [Kısa Başlık]
- **Durum:** ✅ Çözüldü
- **Değişiklik:** [Ne değişti]
- **Dosyalar:** [Değişen dosyalar]
- **Test:** [Nasıl doğrulandı]
```

### TUR N — DOĞRULAMA KAPISI

- X-01 (Eleştirmen): Yeni açık var mı?
- X-02 (Doğrulayıcı): Fix'ler çalışıyor mu?
- PATRON: Gate kararı

---

## 5) ÇIKTI FORMATI

Her sprint sonunda şu 5 bölüm zorunlu:

### 1) ✅ Revize Edilmiş Çıktı
- Güncel kod durumu
- Çalışan özellikler listesi

### 2) 🔎 Değişiklik Özeti (Changelog)
```markdown
| Tarih | Issue | Değişiklik | Dosyalar |
|-------|-------|------------|----------|
| ... | ... | ... | ... |
```

### 3) 🧾 Sorun Takip Tablosu
```markdown
| ID | Seviye | Sorun | Durum | Not |
|----|--------|-------|-------|-----|
| ... | P0 | ... | ✅/⏳/❌ | ... |
```

### 4) 🧠 Varsayımlar & Belirsizlikler
- Net olmayan kararlar
- Sorulması gereken sorular
- Risk alanları

### 5) 🧪 Doğrulama Planı
- Test senaryoları
- Kabul kriterleri
- Gate checklist

---

## 6) GATE DEFINITIONS

### WEB GATE (Faz 1 Sonu)

```markdown
## WEB RELEASE GATE CHECKLIST

### Authentication
- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] Apple OAuth login works
- [ ] Password reset works
- [ ] Session persistence works
- [ ] Logout works

### Core Features
- [ ] User registration complete
- [ ] Profile creation works
- [ ] Profile editing works
- [ ] Photo upload works
- [ ] Discovery feed loads
- [ ] Like action works
- [ ] Pass action works
- [ ] Match notification shows
- [ ] Chat opens on match
- [ ] Messages send/receive

### Quality
- [ ] Lighthouse Performance ≥ 80
- [ ] Lighthouse Accessibility ≥ 90
- [ ] No console errors
- [ ] Responsive: 320px - 1920px
- [ ] Cross-browser: Chrome, Safari, Firefox

### Security
- [ ] No exposed secrets
- [ ] HTTPS only
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting active

**GATE DECISION:** PASS / FAIL
```

### MOBILE GATE (Faz 2 Sonu)

```markdown
## MOBILE RELEASE GATE CHECKLIST

### Issue Count
- [ ] P0 (Critical) = 0
- [ ] P1 (High) ≤ 5
- [ ] P2 (Medium) ≤ 20

### Scores (from re-audit)
- [ ] Overall Score ≥ 80/100
- [ ] Touch Targets ≥ 90
- [ ] Navigation ≥ 85
- [ ] Performance ≥ 80
- [ ] Accessibility ≥ 85

### Platform
- [ ] iOS Simulator: All flows pass
- [ ] Android Emulator: All flows pass
- [ ] iPhone SE (real device): OK
- [ ] Android mid-range (real device): OK

### Store Compliance
- [ ] iOS: App Store Review Guidelines
- [ ] Android: Play Store Policy
- [ ] Privacy policy linked
- [ ] Terms of service linked

**GATE DECISION:** PASS / FAIL
```

---

## 7) BAŞLATMA KOMUTU

```
VITALIS_COMPLETE_FIX_ORCHESTRATOR_v3.md dosyasını oku.

Sen PATRON rolündesin. Multi-Agent Quality Protocol'ü başlat.

FAZ 1 - WEB UYGULAMASI ile başla.

SPRINT W1: AUTH SETUP
- Google OAuth kurulumu
- Apple OAuth kurulumu
- Auth flow implementation

Önce mevcut auth durumunu analiz et:
1. src/lib/supabase.ts dosyasını incele
2. Auth ile ilgili component'ları bul
3. Supabase Dashboard'da yapılması gerekenleri listele

Sorun Avı formatında raporla:
- ISSUE-W001, ISSUE-W002, ...
- Kategori, Dosya, Sorun, Fix önerisi

🚀 BAŞLA
```

---

## 8) TAHMİNİ ZAMAN ÇİZELGESİ

```
Hafta 1:
├── Gün 1-2: Web Auth (Google + Apple)
├── Gün 3-4: Web Core Flows
└── Gün 5: Web Polish + Gate

Hafta 2:
├── Gün 1-3: Mobile P0 Fixes (11 critical)
└── Gün 4-5: Mobile P1 Start

Hafta 3:
├── Gün 1-3: Mobile P1 Complete (41 high)
└── Gün 4-5: Mobile P2 Start

Hafta 4:
├── Gün 1-3: Mobile P2/P3 Complete
├── Gün 4: Mobile Re-audit
└── Gün 5: Store Submission Prep

Hafta 5:
├── TestFlight / Internal Testing
└── Store Submission
```

---

## 9) DOSYA YAPISI

```
audit/
├── mobile/                    # Mevcut mobile audit raporları
│   ├── AGENT_01_TOUCH.md
│   ├── AGENT_02_BUTTON.md
│   └── ...
├── web/                       # Web audit raporları (oluşturulacak)
│   ├── AUTH_AUDIT.md
│   ├── FLOW_AUDIT.md
│   └── ...
└── MASTER_MOBILE_AUDIT_v2.md  # Mevcut

sprints/
├── W1_AUTH_SETUP/
│   ├── BACKLOG.md
│   ├── CHANGELOG.md
│   └── GATE_RESULT.md
├── W2_CORE_FLOWS/
├── W3_POLISH/
├── M1_CRITICAL/
├── M2_HIGH/
├── M3_MEDIUM_LOW/
└── M4_STORE/

reports/
├── WEB_GATE_REPORT.md
├── MOBILE_GATE_REPORT.md
└── FINAL_RELEASE_REPORT.md
```

---

## 10) BAŞARI KRİTERLERİ

### Faz 1 Başarı (Web)
- ✅ Kullanıcı Google ile giriş yapabiliyor
- ✅ Kullanıcı Apple ile giriş yapabiliyor
- ✅ Temel dating akışı çalışıyor
- ✅ Lighthouse ≥ 80
- ✅ Production deploy ready

### Faz 2 Başarı (Mobile)
- ✅ P0 = 0, P1 ≤ 5
- ✅ Score ≥ 80/100
- ✅ iOS build başarılı
- ✅ Android build başarılı
- ✅ Store submission ready

### Nihai Başarı
- ✅ Web app canlıda
- ✅ iOS App Store'da
- ✅ Android Play Store'da
- ✅ Gerçek kullanıcılar kullanabiliyor
