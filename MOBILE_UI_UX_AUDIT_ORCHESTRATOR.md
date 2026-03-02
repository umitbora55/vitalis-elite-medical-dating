# 📱 MOBILE UI/UX AUDIT ORCHESTRATOR v1.0

## Mission: Vitalis'in Mobil Uyumluluğunu %100 Garantile

> **Hedef:** Tüm UI elementlerinin iOS ve Android'de kusursuz çalışmasını sağla
> **Yöntem:** 12 uzman ajan paralel audit
> **Çıktı:** Detaylı rapor + fix listesi + öncelik sıralaması

---

## 🎯 AUDIT SCOPE

Bu audit şunları kapsar:
- Touch targets (dokunma alanları)
- Button states (hover, active, disabled)
- Form inputs (keyboard handling, validation)
- Navigation (gestures, transitions)
- Typography (okunabilirlik, font scaling)
- Spacing (safe areas, padding, margins)
- Performance (scroll, animation FPS)
- Accessibility (screen readers, contrast)
- Responsive breakpoints
- Platform-specific behaviors (iOS vs Android)

---

## 👥 AGENT DEFINITIONS

### 🔴 AGENT-01: TOUCH TARGET AUDITOR

**Rol:** Dokunma alanlarının minimum boyut standartlarına uygunluğunu kontrol eder.

**Kontrol Listesi:**
```
□ Tüm butonlar minimum 44x44px (iOS) / 48x48dp (Android)
□ Linkler ve tıklanabilir textler yeterli padding'e sahip
□ İkonlar touch-friendly boyutta
□ Butonlar arası minimum 8px boşluk
□ Form elementleri (checkbox, radio) yeterli boyutta
□ Tab bar ikonları minimum 44px
□ Navigation butonları (back, close) erişilebilir
□ Swipe action butonları yeterli genişlikte
□ Modal close butonları kolay erişilebilir
□ Dropdown/select elementleri touch-friendly
```

**Test Yöntemi:**
1. Chrome DevTools → Mobile view (375px width)
2. Her tıklanabilir elemente "Inspect" yap
3. Computed styles'dan width/height kontrol et
4. 44px altındakileri raporla

**Output Format:**
```markdown
## Touch Target Audit Report

### ❌ FAILED (Kritik)
| Element | Dosya:Satır | Mevcut Boyut | Gerekli Boyut |
|---------|-------------|--------------|---------------|
| Login Button | LoginForm.tsx:45 | 36x36px | 44x44px |

### ⚠️ WARNING
| Element | Dosya:Satır | Sorun |
|---------|-------------|-------|
| Settings Icon | Header.tsx:23 | Padding yetersiz |

### ✅ PASSED
- Ana navigation butonları: OK
- Tab bar: OK
```

---

### 🔴 AGENT-02: BUTTON STATE AUDITOR

**Rol:** Buton durumlarının (normal, hover, active, disabled, loading) doğru çalıştığını kontrol eder.

**Kontrol Listesi:**
```
□ Her butonun 5 state'i tanımlı: default, hover, active, disabled, loading
□ Hover state mobilde görünmüyor (touch cihazlarda)
□ Active state (pressed) görsel feedback veriyor
□ Disabled state görsel olarak ayırt edilebilir (opacity, color)
□ Loading state spinner/indicator gösteriyor
□ Double-tap koruması var (debounce)
□ Haptic feedback tanımlı (varsa)
□ Focus state keyboard navigation için tanımlı
□ Buton text'i duruma göre değişiyor mu
□ Transition/animation smooth (300ms altı)
```

**Test Yöntemi:**
1. Her buton component'ını incele
2. CSS/Tailwind class'larını kontrol et
3. onClick handler'da loading state kontrolü
4. Disabled prop kullanımı

**Output Format:**
```markdown
## Button State Audit Report

### Component: PrimaryButton
- [x] Default state
- [x] Active state (:active)
- [ ] ❌ Loading state YOK
- [x] Disabled state
- [ ] ⚠️ Double-tap koruması YOK

### Component: IconButton
...
```

---

### 🔴 AGENT-03: FORM INPUT AUDITOR

**Rol:** Form elementlerinin mobil kullanılabilirliğini kontrol eder.

**Kontrol Listesi:**
```
□ Input height minimum 48px
□ Font size minimum 16px (iOS zoom engellemek için)
□ Doğru keyboard type (email, tel, number, password)
□ Autocomplete/autofill attributes
□ Label'lar input'a bağlı (htmlFor/id)
□ Placeholder text okunabilir
□ Error state görsel olarak belirgin
□ Success state feedback
□ Clear button (x) var mı
□ Password show/hide toggle
□ Input focus scroll into view
□ Keyboard dismiss on tap outside
□ Return key doğru action (next, done, search)
□ Validation real-time veya onBlur
□ Error mesajları input altında
```

**Test Yöntemi:**
1. Her form component'ını test et
2. inputMode/type attribute kontrol
3. Validation logic review
4. Mobil cihazda gerçek test

**Output Format:**
```markdown
## Form Input Audit Report

### LoginForm
| Input | Type | Keyboard | AutoComplete | Min Height | Font Size | Status |
|-------|------|----------|--------------|------------|-----------|--------|
| Email | email | ✅ | ✅ | ❌ 40px | ✅ 16px | FAIL |
| Password | password | ✅ | ❌ | ✅ 48px | ✅ 16px | WARN |

### Issues:
1. Email input height 40px → 48px olmalı
2. Password autocomplete="current-password" eksik
```

---

### 🔴 AGENT-04: NAVIGATION & GESTURE AUDITOR

**Rol:** Navigasyon akışı ve gesture'ların mobil uyumluluğunu kontrol eder.

**Kontrol Listesi:**
```
□ Back gesture çalışıyor (iOS swipe from edge)
□ Navigation stack doğru yönetiliyor
□ Deep linking çalışıyor
□ Tab bar sabit pozisyonda (fixed bottom)
□ Tab bar safe area içinde
□ Header safe area içinde (notch)
□ Pull-to-refresh implementasyonu
□ Swipe to delete/archive
□ Long press context menu
□ Pinch to zoom (gerekli yerlerde)
□ Double tap to like (opsiyonel)
□ Modal dismiss gesture (swipe down)
□ Drawer/sidebar gesture (swipe from edge)
□ Page transitions smooth (60fps)
□ Scroll momentum doğal hissettiriyor
```

**Test Yöntemi:**
1. Navigation flow'u test et
2. Gesture handler'ları incele
3. react-navigation veya router config kontrol
4. Safe area inset kullanımı kontrol

**Output Format:**
```markdown
## Navigation & Gesture Audit Report

### Navigation Flow
- [x] Login → Home: OK
- [x] Home → Profile: OK
- [ ] ❌ Profile → Settings: Back gesture çalışmıyor

### Gestures
| Gesture | Sayfa | Durum | Not |
|---------|-------|-------|-----|
| Swipe back | Tüm sayfalar | ⚠️ | iOS only, Android eksik |
| Pull refresh | Home | ❌ | Implementasyon yok |
| Swipe card | Discover | ✅ | OK |
```

---

### 🔴 AGENT-05: TYPOGRAPHY AUDITOR

**Rol:** Tipografi ve metin okunabilirliğini kontrol eder.

**Kontrol Listesi:**
```
□ Base font size minimum 16px
□ Line height minimum 1.4 (body text)
□ Heading hierarchy mantıklı (h1 > h2 > h3)
□ Font weight contrast yeterli
□ Text truncation (...) doğru çalışıyor
□ Long text wrapping doğru
□ RTL support (gerekirse)
□ Font scaling (accessibility) destekleniyor
□ Contrast ratio WCAG AA (4.5:1 body, 3:1 large)
□ Link text'ler ayırt edilebilir
□ Error text'ler kırmızı + icon
□ Placeholder text daha açık renk
□ Disabled text görsel olarak farklı
□ Number formatting (1,000 vs 1.000)
□ Date formatting locale-aware
```

**Test Yöntemi:**
1. Typography scale review
2. Contrast checker tool kullan
3. Font scaling test (Settings → Accessibility)
4. Text overflow test (uzun content)

**Output Format:**
```markdown
## Typography Audit Report

### Font Scale
| Level | Size | Weight | Line Height | Status |
|-------|------|--------|-------------|--------|
| H1 | 32px | 700 | 1.2 | ✅ |
| Body | 14px | 400 | 1.5 | ❌ 16px olmalı |
| Caption | 12px | 400 | 1.4 | ⚠️ Küçük ama OK |

### Contrast Issues
| Element | Foreground | Background | Ratio | Required | Status |
|---------|------------|------------|-------|----------|--------|
| Placeholder | #9CA3AF | #FFFFFF | 2.8:1 | 4.5:1 | ❌ FAIL |
```

---

### 🔴 AGENT-06: SPACING & LAYOUT AUDITOR

**Rol:** Spacing, padding, margin ve layout tutarlılığını kontrol eder.

**Kontrol Listesi:**
```
□ Safe area insets kullanılıyor (notch, home indicator)
□ Consistent spacing scale (4px, 8px, 12px, 16px, 24px, 32px)
□ Card padding minimum 16px
□ List item padding minimum 12px vertical
□ Section spacing minimum 24px
□ Screen edge padding minimum 16px
□ Keyboard açıkken layout shift yok
□ Landscape orientation destekleniyor (veya lock)
□ Tablet layout responsive
□ Bottom sheet safe area
□ Modal padding yeterli
□ Toast/snackbar pozisyonu safe area içinde
□ FAB pozisyonu ergonomik
□ Thumb zone optimization (bottom navigation)
```

**Test Yöntemi:**
1. Spacing token'ları review
2. Safe area usage kontrolü
3. Farklı ekran boyutlarında test
4. Keyboard açık/kapalı test

**Output Format:**
```markdown
## Spacing & Layout Audit Report

### Safe Area Usage
| Component | Top Inset | Bottom Inset | Status |
|-----------|-----------|--------------|--------|
| Header | ✅ | N/A | OK |
| TabBar | N/A | ❌ | FAIL - home indicator overlap |
| Modal | ✅ | ✅ | OK |

### Spacing Inconsistencies
| Location | Expected | Actual | Fix |
|----------|----------|--------|-----|
| Card padding | 16px | 12px | components/Card.tsx:15 |
```

---

### 🔴 AGENT-07: PERFORMANCE AUDITOR

**Rol:** UI performansını (scroll, animation, render) kontrol eder.

**Kontrol Listesi:**
```
□ List virtualization (FlatList/VirtualizedList)
□ Image lazy loading
□ Image optimization (WebP, srcset)
□ Animation 60fps (useNativeDriver)
□ No layout thrashing (forced reflows)
□ Memoization kullanımı (React.memo, useMemo)
□ Bundle size optimized
□ Code splitting / lazy loading
□ Font preloading
□ Critical CSS inline
□ No memory leaks (useEffect cleanup)
□ Scroll handler throttled/debounced
□ Touch handler optimized
□ Skeleton loading screens
□ Optimistic UI updates
```

**Test Yöntemi:**
1. Chrome DevTools → Performance tab
2. React DevTools → Profiler
3. Lighthouse mobile audit
4. FPS monitor (60fps hedef)

**Output Format:**
```markdown
## Performance Audit Report

### Lighthouse Scores (Mobile)
| Metric | Score | Target | Status |
|--------|-------|--------|--------|
| Performance | 65 | 90+ | ❌ |
| FCP | 2.8s | <1.8s | ❌ |
| LCP | 4.2s | <2.5s | ❌ |
| CLS | 0.05 | <0.1 | ✅ |

### Issues Found
1. ❌ Home feed FlatList virtualization yok
2. ❌ Profile images lazy loading yok
3. ⚠️ Animation jank: SwipeCard 45fps
```

---

### 🔴 AGENT-08: ACCESSIBILITY AUDITOR

**Rol:** Erişilebilirlik standartlarına uygunluğu kontrol eder.

**Kontrol Listesi:**
```
□ Tüm interactive elementlerde accessible label
□ Image'larda alt text
□ Form label'ları bağlı
□ Focus order mantıklı (tab navigation)
□ Skip navigation link
□ ARIA roles doğru kullanılıyor
□ Screen reader test (VoiceOver/TalkBack)
□ Color contrast WCAG AA
□ Color-only information yok (icon/text eşlik)
□ Motion reduced preference respected
□ Font scaling 200% destekleniyor
□ Touch target minimum 44x44
□ Error announcements (aria-live)
□ Loading state announcements
□ Modal focus trap
```

**Test Yöntemi:**
1. axe DevTools extension
2. VoiceOver/TalkBack test
3. Keyboard-only navigation test
4. High contrast mode test

**Output Format:**
```markdown
## Accessibility Audit Report

### WCAG 2.1 AA Compliance
| Criterion | Status | Issues |
|-----------|--------|--------|
| 1.1.1 Non-text Content | ❌ | 12 images missing alt |
| 1.4.3 Contrast | ⚠️ | 3 elements low contrast |
| 2.4.7 Focus Visible | ❌ | No focus indicators |

### Screen Reader Issues
1. Login button: label yok
2. Profile image: alt text yok
3. Tab navigation: role="tablist" eksik
```

---

### 🔴 AGENT-09: RESPONSIVE BREAKPOINT AUDITOR

**Rol:** Farklı ekran boyutlarında layout davranışını kontrol eder.

**Kontrol Listesi:**
```
□ 320px (iPhone SE) - minimum desteklenen
□ 375px (iPhone X/11/12/13)
□ 390px (iPhone 12/13 Pro)
□ 428px (iPhone 12/13 Pro Max)
□ 768px (iPad portrait)
□ 1024px (iPad landscape)
□ Horizontal overflow yok
□ Text truncation düzgün
□ Image aspect ratio korunuyor
□ Grid layout responsive
□ Navigation responsive (hamburger vs tabs)
□ Modal/dialog responsive
□ Form layout responsive
□ Table horizontal scroll
```

**Test Yöntemi:**
1. Chrome DevTools → Device toolbar
2. Her breakpoint'te full audit
3. Orientation change test
4. Real device test

**Output Format:**
```markdown
## Responsive Breakpoint Audit Report

### 320px (iPhone SE)
| Component | Status | Issue |
|-----------|--------|-------|
| Header | ✅ | OK |
| Login Form | ❌ | Buttons overflow |
| Profile Card | ⚠️ | Text truncation aggressive |

### 375px (iPhone X)
| Component | Status | Issue |
|-----------|--------|-------|
| Header | ✅ | OK |
| Login Form | ✅ | OK |
...
```

---

### 🔴 AGENT-10: PLATFORM-SPECIFIC AUDITOR

**Rol:** iOS ve Android arasındaki platform farklılıklarını kontrol eder.

**Kontrol Listesi:**
```
iOS Specific:
□ Safe area (notch, home indicator)
□ Swipe back gesture
□ Status bar style (light/dark)
□ Haptic feedback (UIImpactFeedbackGenerator)
□ SF Symbols ikon kullanımı
□ iOS keyboard accessories
□ iOS share sheet
□ App Store guidelines compliance

Android Specific:
□ Material Design guidelines
□ Back button behavior
□ Status bar color
□ Navigation bar color
□ Ripple effect on touch
□ FAB positioning
□ Android keyboard behavior
□ Play Store guidelines compliance

Cross-Platform:
□ Platform-specific components (Platform.OS)
□ Platform-specific styles
□ Platform-specific fonts
□ Deep linking both platforms
□ Push notification handling
□ Biometric auth (Face ID / Fingerprint)
```

**Test Yöntemi:**
1. iOS Simulator test
2. Android Emulator test
3. Platform.select usage review
4. Native module compatibility

**Output Format:**
```markdown
## Platform-Specific Audit Report

### iOS Issues
1. ❌ Home indicator overlap on TabBar
2. ⚠️ Haptic feedback not implemented
3. ✅ Safe area handled correctly

### Android Issues
1. ❌ Back button doesn't close modal
2. ❌ No ripple effect on buttons
3. ⚠️ Status bar color not set

### Cross-Platform Issues
1. Platform.OS check missing for keyboard behavior
```

---

### 🔴 AGENT-11: DARK MODE AUDITOR

**Rol:** Dark mode uyumluluğunu ve tutarlılığını kontrol eder.

**Kontrol Listesi:**
```
□ System preference detection (prefers-color-scheme)
□ Manual toggle option
□ Smooth transition (no flash)
□ All colors have dark variants
□ Image handling (dark mode friendly)
□ Shadow adjustments for dark mode
□ Border visibility in dark mode
□ Icon colors adapt
□ Status bar adapts
□ Text contrast maintained
□ Disabled states visible
□ Error/success colors adjusted
□ Chart/graph colors adjusted
□ Map dark mode
□ Persistence of preference
```

**Test Yöntemi:**
1. System dark mode toggle
2. Manual toggle test
3. All screens screenshot compare
4. Contrast check in dark mode

**Output Format:**
```markdown
## Dark Mode Audit Report

### Color Token Coverage
| Token | Light | Dark | Status |
|-------|-------|------|--------|
| bg-primary | #FFFFFF | #1A1A1A | ✅ |
| text-primary | #1A1A1A | #FFFFFF | ✅ |
| border-default | #E5E7EB | ❌ MISSING | ❌ |

### Component Issues
1. Card shadow too strong in dark mode
2. Placeholder text invisible in dark mode
3. Success badge color doesn't adapt
```

---

### 🔴 AGENT-12: LOADING & ERROR STATE AUDITOR

**Rol:** Loading ve error durumlarının UX kalitesini kontrol eder.

**Kontrol Listesi:**
```
Loading States:
□ Initial page load skeleton
□ Button loading state
□ Form submit loading
□ Image loading placeholder
□ List loading (infinite scroll)
□ Pull-to-refresh indicator
□ Navigation transition loading
□ API call loading indicators
□ Upload progress indicator
□ Download progress indicator

Error States:
□ Network error handling
□ API error messages (user-friendly)
□ Form validation errors
□ Empty state design
□ 404 page
□ Timeout handling
□ Retry mechanism
□ Offline mode indication
□ Error boundary (crash prevention)
□ Error reporting (Sentry etc.)

Success States:
□ Form submit success feedback
□ Action completion toast
□ Animation/confetti (where appropriate)
□ Haptic feedback on success
```

**Test Yöntemi:**
1. Network throttling test
2. Offline mode test
3. Invalid data input test
4. API error simulation

**Output Format:**
```markdown
## Loading & Error State Audit Report

### Loading States
| Screen/Component | Skeleton | Spinner | Progress | Status |
|------------------|----------|---------|----------|--------|
| Home Feed | ❌ | ✅ | N/A | PARTIAL |
| Profile | ❌ | ❌ | N/A | ❌ FAIL |
| Image Upload | N/A | ✅ | ❌ | PARTIAL |

### Error Handling
| Scenario | Handled | User Message | Retry | Status |
|----------|---------|--------------|-------|--------|
| Network offline | ❌ | N/A | N/A | ❌ FAIL |
| API 500 | ✅ | Generic | ❌ | ⚠️ WARN |
| Invalid form | ✅ | Specific | N/A | ✅ OK |
```

---

## 📋 EXECUTION PROTOCOL

### Phase 1: Preparation (10 dakika)
1. Development server başlat (`npm run dev`)
2. Chrome DevTools aç (Mobile view: iPhone 12 Pro)
3. React DevTools extension aktif
4. axe DevTools extension aktif
5. Lighthouse hazır

### Phase 2: Parallel Audit (Her agent kendi alanını tarar)

```
Agent 01-03: Core Interactions (Touch, Button, Form)
Agent 04-06: Navigation & Visual (Nav, Typography, Spacing)
Agent 07-09: Quality & Compatibility (Perf, A11y, Responsive)
Agent 10-12: Platform & States (Platform, Dark, Loading)
```

### Phase 3: Report Consolidation

Her agent kendi raporunu üretir:
```
audit/mobile/
├── 01_TOUCH_TARGET_AUDIT.md
├── 02_BUTTON_STATE_AUDIT.md
├── 03_FORM_INPUT_AUDIT.md
├── 04_NAVIGATION_GESTURE_AUDIT.md
├── 05_TYPOGRAPHY_AUDIT.md
├── 06_SPACING_LAYOUT_AUDIT.md
├── 07_PERFORMANCE_AUDIT.md
├── 08_ACCESSIBILITY_AUDIT.md
├── 09_RESPONSIVE_AUDIT.md
├── 10_PLATFORM_SPECIFIC_AUDIT.md
├── 11_DARK_MODE_AUDIT.md
├── 12_LOADING_ERROR_AUDIT.md
└── MASTER_MOBILE_AUDIT_REPORT.md
```

### Phase 4: Master Report

```markdown
# MOBILE UI/UX MASTER AUDIT REPORT

## Executive Summary
- Total Issues: XXX
- Critical (P0): XX
- High (P1): XX
- Medium (P2): XX
- Low (P3): XX

## Overall Mobile Readiness Score: XX/100

## Top 10 Critical Issues (Must Fix Before Launch)
1. [P0] Touch targets too small - affects 15 buttons
2. [P0] No loading states - affects all screens
...

## Fix Priority Matrix
| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Touch targets | High | Low | P0 |
| Loading states | High | Medium | P0 |
...
```

---

## 🚀 STARTUP COMMAND

```
MOBILE_UI_UX_AUDIT_ORCHESTRATOR.md dosyasını oku.

12 Mobile UI/UX Audit Agent'ı ile Vitalis'in mobil uyumluluğunu denetle.

ADIMLAR:
1. npm run dev ile uygulamayı başlat
2. Chrome DevTools → Mobile view (iPhone 12 Pro, 390x844)
3. Her agent kendi alanını tara
4. Bulguları raporla
5. MASTER_MOBILE_AUDIT_REPORT.md oluştur

Her agent için:
1. Kontrol listesini uygula
2. Sorunları bul
3. Dosya:satır ile lokasyon belirt
4. Öncelik ata (P0/P1/P2/P3)
5. Fix önerisi yaz

Hedef: Tüm P0 ve P1 sorunları tespit et.

📱 BAŞLA
```

---

## 📊 SEVERITY DEFINITIONS

| Severity | Tanım | Örnek |
|----------|-------|-------|
| **P0 - Critical** | Kullanıcı akışını engelliyor | Buton tıklanamıyor, form submit olmuyor |
| **P1 - High** | Ciddi UX sorunu | Touch target küçük, loading state yok |
| **P2 - Medium** | Göze batan sorun | Spacing tutarsız, contrast düşük |
| **P3 - Low** | Polish/iyileştirme | Animasyon smooth değil, micro-interaction eksik |

---

## ✅ SUCCESS CRITERIA

Audit başarılı sayılır eğer:
- [ ] 12 agent raporu tamamlandı
- [ ] Tüm P0 issues listelendi
- [ ] Her issue için fix lokasyonu belirtildi
- [ ] Master report oluşturuldu
- [ ] Mobile Readiness Score hesaplandı

---

## 🔧 TOOLS REQUIRED

1. **Chrome DevTools** - Mobile emulation, Performance, Accessibility
2. **React DevTools** - Component inspection, Profiler
3. **axe DevTools** - Accessibility audit
4. **Lighthouse** - Performance & best practices
5. **Color Contrast Checker** - WCAG compliance
6. **Real Device** - Final validation (opsiyonel ama önerilen)
