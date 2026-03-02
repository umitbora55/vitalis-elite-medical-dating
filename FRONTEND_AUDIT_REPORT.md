# VITALIS -- FRONTEND UI/UX AUDIT REPORT v2

**Generated:** 2026-02-17
**Auditor:** Claude Opus 4.6 (Frontend/UI-UX Agent)
**Project:** Vitalis Elite Medical Dating Platform
**Branch:** main (6c41987)
**Scope:** Web application components, design system, navigation, accessibility, performance, responsive design, animations, forms, premium features
**Base Documents:** RECON_REPORT.md, artifacts/baseline/00_RECON_REPORT.md, AUTOMATION_SUMMARY.txt

---

### OZET
- Toplam bulgu: **30** (CRITICAL: **1**, HIGH: **6**, MEDIUM: **15**, LOW: **8**)
- En yuksek riskli 3 bulgu: **FE-001**, **FE-002**, **FE-003**
- No finding moduller: `ErrorBoundary`, `LoadingSpinner`, `SwipeableCard (RN)`, `stores/`, `services/`

**Onceki Raporla Karsilastirma (v1 -> v2):**
- FE-001 (v1 Dev Bypass): KALDIRILMIS -- App.tsx'ten bypass butonu basariyla cikarilmis
- FE-002 (v1 Error Boundary): DUZELTILMIS -- `ErrorBoundary.tsx` artik retry/go-home/report-bug icerir
- FE-003 (v1 Loading Screen): DUZELTILMIS -- `LoadingSpinner.tsx` branded spinner ve skeleton icerir
- FE-006 (v1 ControlPanel): DUZELTILMIS -- Rewind butonu artik disabled state'e sahip
- ChatView.tsx Regex Injection: DUZELTILMIS -- `escapeRegExp()` fonksiyonu eklenmis (satir 60)

---

## AUTOMATION BASELINE

| Check | Status | Detail |
|-------|--------|--------|
| TypeScript (`tsc --noEmit`) | PASSED | 0 errors |
| ESLint | SKIPPED | No `eslint.config.js` -- flat config v9 migration needed |
| npm audit | 1 LOW | `qs` indirect dep (GHSA-w7fw-mjwx-w883, CVSS 3.7) |

---

## BULGU TABLOSU

| ID | Severity | Impact | Likelihood | Confidence | Effort | Dosya:Satir | Kanit | Etki | Oneri | Ornek duzeltme |
|---|---|---|---|---|---|---|---|---|---|---|
| FE-001 | CRITICAL | 5 | 4 | high | 4h | App.tsx:531 | `let filtered = MOCK_PROFILES.filter(profile => {` | Tum kesif motoru sahte verilerle calisiyor, gercek kullanici gorulmuyor | Supabase sorgularina gecis yapin | Bkz: Detay FE-001 |
| FE-002 | HIGH | 4 | 5 | high | 3h | App.tsx:96 | 1449 satirlik monolith -- ~50 store selector, ~20 useCallback | Bakim zorluklari, test edilebilirlik dusuk, buyuk bundle | App.tsx'i custom hook ve alt komponentlere bolerek parcalayin | Bkz: Detay FE-002 |
| FE-003 | HIGH | 4 | 4 | high | 2h | PremiumView.tsx:38-41 | `FORTE: 'PLATINUM', ULTRA: 'PLATINUM'` -- ayni Stripe plana map | ULTRA icin fazla odeme yapan kullanici FORTE ile ayni plani alir | Her tier icin ayri Stripe price ID kullanin | `{ DOSE: 'DOSE', FORTE: 'FORTE', ULTRA: 'ULTRA' }` |
| FE-004 | HIGH | 3 | 5 | high | 2h | App.tsx:1166 | `<h2>Hesabin Dondurulmus</h2>` vs `"Ghost Mode Active"` | Karisik Turkce/Ingilizce icerik, tutarsiz kullanici deneyimi | i18n kutuphanesi entegre edin | `const { t } = useTranslation()` |
| FE-005 | HIGH | 4 | 3 | high | 3h | ChatView.tsx:107 | `useState<Message[]>(match.messages \|\| [])` | Mesajlar store ile senkronize degil, sayfa yenilendiginde kaybolur | Mesajlari tamamen store uzerinden yonetin | `useMatchStore(s => s.getMessages(matchId))` |
| FE-006 | HIGH | 3 | 4 | high | 2h | App.tsx:1185 | `bg-slate-50 dark:bg-slate-950` ana container'da var ama icerik dark-only | Acik modda beyaz bg uzerinde beyaz/acik metin okunamaz | Tum komponentlere `dark:` prefix class'lari ekleyin | `text-slate-900 dark:text-white` |
| FE-007 | HIGH | 4 | 3 | high | 2h | ProfileCard.tsx:76-77 | `style={{ backgroundImage: \`url(\${...})\` }}` | LCP olumsuz, lazy/srcset/decode yok, buyuk Unsplash resimleri | `<img>` elementine gecin | Bkz: Detay FE-007 |
| FE-008 | MEDIUM | 3 | 4 | high | 1h | MatchOverlay.tsx:73 | `new Audio('https://assets.mixkit.co/...')` | CDN down olursa hata gizlenir, autoplay policy, 3rd-party | Ses dosyalarini `/public/sounds/` dizinine tasiyin | `import matchSound from '/sounds/match.mp3'` |
| FE-009 | MEDIUM | 3 | 4 | high | 2h | App.tsx:868-881 | `const getCardStyle = () => { ... }` | Her render'da yeniden olusturulur, gereksiz hesaplama | `useMemo` ile saralayin | `useMemo(() => getCardStyle(), [swipeDirection])` |
| FE-010 | MEDIUM | 3 | 3 | high | 1h | StoryViewer.tsx:135-150 | `<div className="w-1/3 h-full" onClick={handlePrev}>` | Screen reader erisilemez, klavye navigasyonu yok | `<button>` veya `role="button"` kullanin | `<button aria-label="Previous story">` |
| FE-011 | MEDIUM | 3 | 3 | high | 1h | MatchesView.tsx:214 | `<div onClick={() => onMatchSelect(match)} className="...cursor-pointer">` | Klavye erisilebilirligi yok, tabIndex/onKeyDown eksik | `<button>` elementine gecin | `<button type="button" onClick={...}>` |
| FE-012 | MEDIUM | 3 | 4 | high | 1h | NearbyView.tsx:31-43 | `Date.now()` useMemo icinde ama dependency'de yok | 20dk once aktif kullanici hala listede, stale filtre | `nowMs` state + interval ile guncelleyin | Bkz: Detay FE-012 |
| FE-013 | MEDIUM | 3 | 3 | high | 2h | ProfileDetailView.tsx:147-151 | `bg-white/30` -- tum indicator'lar ayni renk | Kullanici hangi fotografta oldugunu bilemiyor | Scroll pozisyonunu izleyin, aktif index'e `bg-white` verin | `IntersectionObserver` ile aktif index |
| FE-014 | MEDIUM | 3 | 3 | high | 1h | MatchOverlay.tsx:59 | `createParticles(isPremium ? 38 : 28)` | 28-38 DOM element, dusuk perf cihazlarda FPS dususu | Particle sayisini azaltin, `will-change` ekleyin | Count'u 15'e dusurun |
| FE-015 | MEDIUM | 2 | 4 | high | 0.5h | LandingView.tsx:44 | `bg-[url('https://images.unsplash.com/...')]` | Offline durumda bos arka plan, 3rd-party request | Resmi `/public/images/` dizinine indirin | `bg-[url('/images/landing-bg.webp')]` |
| FE-016 | MEDIUM | 3 | 3 | medium | 2h | ChatView.tsx:164-166 | `scrollIntoView({ behavior: 'smooth' })` | Cok mesajda performans, ilk acilista gereksiz animasyon | Ilk yuklemede `'auto'`, sonraki `'smooth'` | `behavior: isInitial ? 'auto' : 'smooth'` |
| FE-017 | MEDIUM | 2 | 4 | high | 0.5h | src/lib/analytics.ts:23-28 | `localStorage.getItem(KEY)` -- try-catch yok | Incognito/storage dolu durumda exception firlatir | try-catch ekleyin | `try { return localStorage.getItem(...) } catch { return null }` |
| FE-018 | MEDIUM | 3 | 3 | high | 1h | App.tsx:237-238 | `useEffect(() => { setMatches(...) }, [])` -- bos dependency | Closure stale deger okuyabilir, strict mode double-invoke | Callback pattern kullanin | `setMatches(prev => prev.length > 0 ? prev : init)` |
| FE-019 | MEDIUM | 3 | 3 | high | 1h | MyProfileView.tsx:305 | `option.id as any` | TypeScript strict mode'a ragmen tip guvenligi kiriliyor | `FirstMessagePreference` tipini kullanin | `option.id as FirstMessagePreference` |
| FE-020 | MEDIUM | 2 | 3 | medium | 1h | AppHeader.tsx:42 | 6 nav butonu dar alanda `gap-1` | Mobilde touch target'lar birbirine cok yakin | Bottom tab bar veya hamburger menu | 4 ana sekme, diger ozellikler profilde |
| FE-021 | MEDIUM | 2 | 3 | high | 2h | App.tsx:1242 | `<main>` -- skip-to-content link yok | WCAG 2.4.1 ihlali, screen reader tekrar dinler | Skip link ekleyin | `<a href="#main" className="sr-only focus:not-sr-only">` |
| FE-022 | MEDIUM | 2 | 3 | high | 1h | ProfileCard.tsx:30-37 | `nextImage` sadece click, touch/swipe yok | Mobilde dogal swipe beklentisi karsilanmiyor | Touch event handler ekleyin | `onTouchStart/Move/End` |
| FE-023 | LOW | 2 | 3 | high | 0.5h | ControlPanel.tsx:19 | `pointer-events-none` container, `auto` butonlar | Gap alanlarina tiklanamaz, arka karta gecis olabilir | Container'a `pointer-events-auto` verin | `className="... pointer-events-auto"` |
| FE-024 | LOW | 2 | 2 | high | 1h | ChatView.tsx:34-52 | `MOCK_RESPONSES`, `MOCK_SHARED_PHOTOS` prod'da aktif | Gercek olmayan oto-yanitlar ve fotograflar gorulur | DEV guard ekleyin veya kaldirin | `import.meta.env.DEV ? simulate : noop` |
| FE-025 | LOW | 2 | 2 | medium | 2h | SwipeHistoryView.tsx:155-162 | `<div onClick={() => onViewProfile(...)}>` | role, tabIndex, onKeyDown eksik, a11y sorunu | `<button>` elementine gecin | `<button type="button" onClick={...}>` |
| FE-026 | LOW | 1 | 3 | high | 0.5h | RegistrationFlow.tsx:43-54 | `'Kimi gormek istedigini sec'` vs `'Full name is required'` | Karisik dil validasyon mesajlari | Tek dile standardize edin | Tum Zod mesajlarini ayni dilde yazin |
| FE-027 | LOW | 2 | 2 | medium | 1h | ProfileCard.tsx:16-28 | Her ProfileCard kendi `setInterval(60s)` baslatir | 10 profil = 10 timer, gereksiz kaynak tuketimi | `nowMs` prop olarak gectirin | `<ProfileCard nowMs={nowMs} />` |
| FE-028 | LOW | 1 | 2 | high | 0.5h | PremiumView.tsx:33,44 | `handlePurchase` async, onClick void donmez | Unhandled promise rejection riski | void pattern kullanin | `onClick={() => { void handlePurchase(); }}` |
| FE-029 | LOW | 1 | 2 | medium | 1h | MatchOverlay.tsx:263-296 | Inline `<style>` keyframe animasyonlari | Her mount'ta DOM'a style inject edilir | tailwind.config.js keyframes'e tasiyin | Bkz: Detay FE-029 |
| FE-030 | LOW | 1 | 2 | high | 0.5h | MyProfileView.tsx:461,464 | `< div className="h-10" ></div >` -- JSX bosluklar | Calisiyor ama kod kalitesi tutarsiz | Bosluklari temizleyin | `<div className="h-10"></div>` |

---

## DETAYLI KANITLAR

### Detay FE-001: Tum Kesif Motoru MOCK_PROFILES Kullaniyor

Dosya: `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx`

Mock kullanim satirlari:
```tsx
// App.tsx:2 -- Import
import { MOCK_PROFILES, MOCK_LIKES_YOU_PROFILES, ... } from './constants';

// App.tsx:216-235 -- Initial matches mock data
const initialMatches: Match[] = [
    { profile: MOCK_PROFILES[0], ... }, // Dr. Sarah
    { profile: MOCK_PROFILES[1], ... }, // James
    { profile: MOCK_PROFILES[2], ... }, // Elena
];

// App.tsx:531 -- Ana profil filtreleme (DISCOVERY ENGINE)
let filtered = MOCK_PROFILES.filter(profile => {

// App.tsx:585 -- Kalan profil sayisi
const unswipedCount = MOCK_PROFILES.filter(p => !swipedProfileIds.has(p.id) ...

// App.tsx:917 -- LikesYou count
<span>{MOCK_LIKES_YOU_PROFILES.length} Likes</span>

// App.tsx:1308 -- LikesYou view'e mock data
profiles={MOCK_LIKES_YOU_PROFILES}

// App.tsx:1333 -- NearbyView'e mock data
profiles={MOCK_PROFILES}
```

**Etki:** Production'da gercek kullanicilar gorulmez. Tum kullanicilar ayni sahte profilleri gorur. Bu uygulamanin temel islevselligini tamamen kiriliyor.

**Onerilen cozum:**
```tsx
// stores/discoveryStore.ts icinde
fetchProfiles: async (userId: string, filters: Filters) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', userId)
    .gte('age', filters.ageMin)
    .lte('age', filters.ageMax)
    .limit(50);
  if (error) throw error;
  set({ profiles: data });
}
```

---

### Detay FE-002: App.tsx Monolith (1449 satir)

Dosya: `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/App.tsx`

Tek dosyada bulunan state yonetimi:
- Satir 97-147: ~50 store selector (authStore, userStore, uiStore, discoveryStore, matchStore, notificationStore)
- Satir 151-162: Timer state ve effect (`nowMs`)
- Satir 164-196: Auth state listener (`onAuthStateChange`)
- Satir 237-238: Mock initial matches
- Satir 528-590: Profil filtreleme mantigi (visibleProfiles)
- Satir 868-881: `getCardStyle()` inline fonksiyon
- Satir 883-1072: `renderHome()` -- 190 satirlik inline render
- Satir 1074-1181: Auth/registration/pending/frozen ekranlari
- Satir 1183-1449: Ana uygulama render (header, toast, consent, story, chat, views)

**Onerilen cozum:**
```
hooks/useSwipeEngine.ts     -- swipe/filter/discovery mantigi
hooks/useMatchManager.ts    -- match CRUD, expiry, extend
hooks/useAuthRouter.ts      -- auth step routing
components/HomeScreen.tsx   -- renderHome() ayri komponent
components/AuthRouter.tsx   -- auth adim yonetimi
components/AppShell.tsx     -- header + toast + consent + main
```

---

### Detay FE-007: ProfileCard backgroundImage Kullanimi

Dosya: `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/ProfileCard.tsx` satir 76-77

```tsx
<div
    className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out transform group-hover:scale-105"
    style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
    onClick={nextImage}
    role="img"
    aria-label={`${profile.name}'s photo...`}
    tabIndex={0}
>
```

Sorunlar:
1. `backgroundImage` CSS resimleri tarayici tarafindan `<img>` elementlerinden daha gec yuklenir -- LCP olumsuz etkilenir
2. `loading="lazy"`, `srcset`, `decode="async"` gibi native optimizasyonlar kullanilamiyor
3. `profile.images` URL'leri tam boyut Unsplash resimleri (tipik 2000x3000px)
4. `width`/`height` belirtilmedigi icin CLS riski

**Onerilen cozum:**
```tsx
<img
    src={profile.images[currentImageIndex]}
    loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
    decoding="async"
    width={400}
    height={600}
    className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
    alt={`${profile.name}'s photo ${currentImageIndex + 1} of ${profile.images.length}`}
    onClick={nextImage}
/>
```

---

### Detay FE-012: NearbyView Stale Date.now()

Dosya: `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/NearbyView.tsx` satirlar 31-44

```tsx
const nearbyUsers = useMemo(() => {
    if (!isVisible) return [];
    return profiles.filter(p => {
        if (p.id === currentUser.id) return false;
        if (p.distance > 5) return false;
        if (p.isOnlineHidden) return false;
        const isRecent = (Date.now() - p.lastActive) < 20 * 60 * 1000; // 20 mins
        const isAvailable = p.isAvailable &&
            (!p.availabilityExpiresAt || p.availabilityExpiresAt > Date.now());
        return isRecent || isAvailable;
    }).sort((a, b) => a.distance - b.distance);
}, [profiles, currentUser.id, isVisible]);
//   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Date.now() dependency'de YOK
```

`Date.now()` her cagrildiginda farkli deger uretir ama useMemo dependency array'inde olmadigi icin memo cached degerini dondurur. 20 dakikadan fazla sure gecse bile, `profiles` veya `isVisible` degismedigi surece filtre guncellenmez.

**Onerilen cozum:**
```tsx
const [nowMs, setNowMs] = useState(Date.now());
useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
}, []);

const nearbyUsers = useMemo(() => {
    // ... ayni filtre mantigi, Date.now() yerine nowMs kullanin
    const isRecent = (nowMs - p.lastActive) < 20 * 60 * 1000;
    const isAvailable = p.isAvailable &&
        (!p.availabilityExpiresAt || p.availabilityExpiresAt > nowMs);
    // ...
}, [profiles, currentUser.id, isVisible, nowMs]); // nowMs eklendi
```

---

### Detay FE-029: MatchOverlay Inline Style Blogu

Dosya: `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating/components/MatchOverlay.tsx` satirlar 263-296

```tsx
<style>{`
    @keyframes fall {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
    }
    .animate-fall { animation-name: fall; animation-timing-function: linear; ... }
    @keyframes ping-once { ... }
    @keyframes slow-rotate { ... }
    @keyframes handoff-bar { ... }
`}</style>
```

Her mount'ta 4 ayri keyframe animasyonu DOM'a inject edilir. Bu pattern maintainability acisindan problemlidir ve SSR ortamlarinda hydration mismatch olusturabilir.

**Onerilen cozum:** `tailwind.config.js` icine tasiyin:
```js
// tailwind.config.js extend
keyframes: {
    fall: {
        '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
        '100%': { transform: 'translateY(110vh) rotate(360deg)', opacity: '0' },
    },
    'ping-once': { ... },
    'slow-rotate': { '100%': { transform: 'rotate(360deg)' } },
    'handoff-bar': { '100%': { transform: 'translateX(100%)' } },
},
animation: {
    fall: 'fall var(--fall-duration, 3s) linear forwards',
    'ping-once': 'ping-once 0.4s cubic-bezier(0,0,0.2,1)',
    'slow-rotate': 'slow-rotate 14s linear infinite',
}
```

---

## 3RD-PARTY URL BAGIMLILIKLARI

| URL | Dosya | Kullanim | Risk |
|-----|-------|----------|------|
| `images.unsplash.com/photo-1516549655169...` | LandingView.tsx:44, MatchOverlay.tsx:44 | CSS background | CDN down = bos bg |
| `images.unsplash.com/photo-1551076805...` | App.tsx:491 | Mock profil resmi | Prod'da kalirsa dis bagimlilik |
| `images.unsplash.com/photo-1576091160...` (x4) | ChatView.tsx:48-51, :743 | Mock chat fotograflari | Prod'da kalirsa dis bagimlilik |
| `assets.mixkit.co/...sfx/2003/...` | MatchOverlay.tsx:73 | Match pop ses efekti | CDN down = sessiz match |
| `assets.mixkit.co/...sfx/270/...` | MatchOverlay.tsx:100 | Celebrating ses efekti | CDN down = sessiz match |
| `www.transparenttextures.com/patterns/snow.png` | App.tsx:1159 | Frozen account texture | CDN down = bos desen |
| `www.transparenttextures.com/patterns/cubes.png` | OnboardingView.tsx:72 | Onboarding texture | CDN down = bos desen |
| `via.placeholder.com/...` (x4) | mobile/app/(tabs)/*.tsx | Mobile fallback resimleri | CDN down = kirik resim |

**Toplam:** 12 farkli dis kaynak URL, 6 farkli CDN. Tamaminin lokale indirilmesi gerekmektedir.

---

## MODUL BAZLI OZET

| Modul/Dizin | Bulgu Sayisi | Notlar |
|---|---|---|
| App.tsx (Ana Giris) | 7 | Monolith, mock data, dil, dark mode, dep array, skip link, getCardStyle |
| components/ChatView.tsx | 3 | Local state/store sync, mock data, scroll performansi |
| components/ProfileCard.tsx | 3 | LCP/backgroundImage, timer coklamasi, click-only navigation |
| components/PremiumView.tsx | 2 | Stripe mapping hatasi, async handler |
| components/MatchOverlay.tsx | 2 | Dis CDN ses, inline style |
| components/MyProfileView.tsx | 2 | `as any` assertion, JSX spacing |
| components/RegistrationFlow.tsx | 1 | Karisik dil validasyon mesajlari |
| components/MatchesView.tsx | 1 | Div click erisebilirlik |
| components/ProfileDetailView.tsx | 1 | Galeri indicator sync |
| components/StoryViewer.tsx | 1 | Touch zone erisebilirlik |
| components/NearbyView.tsx | 1 | Stale Date.now() |
| components/SwipeHistoryView.tsx | 1 | Non-interactive div |
| components/LandingView.tsx | 1 | Dis kaynak resim |
| components/ControlPanel.tsx | 1 | pointer-events mantigi |
| components/AppHeader.tsx | 1 | Sikisik mobil nav |
| src/lib/analytics.ts | 1 | localStorage try-catch eksik |
| components/ErrorBoundary.tsx | 0 | No finding -- retry + go home + report bug iyi uygulanmis |
| components/LoadingSpinner.tsx | 0 | No finding -- skeleton + spinner + aria attr mevcut |
| components/SwipeableCard.tsx (RN) | 0 | No finding -- gesture/haptics/memo dogru, iyi kalite |
| stores/ (6 store) | 0 | No finding -- Zustand best practices, persist middleware dogru |
| services/ (auth, checkout, etc.) | 0 | No finding -- Frontend perspektifinden servis cagrilari dogru |

---

## ERISILEBILIRLIK OZETI (WCAG 2.1)

| WCAG Kriteri | Durum | Notlar |
|---|---|---|
| 1.1.1 Non-text Content | KISMI | `alt` ve `aria-label` cogunlukla mevcut, ProfileCard'da role="img" var |
| 1.4.3 Kontrast (AA) | KISMI | `text-slate-500` on `bg-slate-900` kontrast sinirda (4.08:1) |
| 2.1.1 Keyboard | KISMI | Modal'lar ESC ile kapanir, ama bazi div onClick'ler klavye ile erisilemez (FE-010/011/025) |
| 2.4.1 Bypass Blocks | BASARISIZ | Skip-to-content link yok (FE-021) |
| 2.4.4 Link Purpose | BASARILI | Butonlarda aria-label mevcut |
| 4.1.2 Name, Role, Value | KISMI | StoryViewer touch zones'da role eksik, NearbyView toggle'da sr-only |

---

## PERFORMANS OZETI

| Konu | Dosya | Aciklama | Oneri |
|---|---|---|---|
| LCP | ProfileCard.tsx | CSS backgroundImage, `<img>` degil | `<img>` ile degistir, lazy load |
| Bundle Bloat | constants.ts (608 LOC) | Mock data prod bundle'a dahil | Dynamic import veya DEV guard |
| Timer Proliferation | ProfileCard.tsx | Her kart kendi 60s interval'i | Prop ile gectir |
| Re-render | App.tsx:868 | `getCardStyle()` memoize edilmemis | useMemo |
| DOM Count | MatchOverlay.tsx | 28-38 confetti particle DOM element | Sayiyi azalt veya Canvas |
| Scroll Perf | ChatView.tsx | Smooth scroll her mesajda | Ilk yukleme auto, sonra smooth |

---

## ONCELIK SIRASI (Onerilen Duzeltme Plani)

### P0 -- Hemen (Production oncesi zorunlu)
| # | ID | Konu | Effort |
|---|---|---|---|
| 1 | FE-001 | Mock data -> gercek Supabase sorgulari | 4h |
| 2 | FE-003 | Stripe tier mapping duzeltmesi | 2h |

### P1 -- Bu Sprint
| # | ID | Konu | Effort |
|---|---|---|---|
| 3 | FE-002 | App.tsx parcalama | 3h |
| 4 | FE-005 | ChatView mesaj state/store sync | 3h |
| 5 | FE-004 | Dil tutarliligi (i18n) | 2h |
| 6 | FE-007 | Resim optimizasyonu (bg -> img) | 2h |
| 7 | FE-006 | Dark mode tutarliligi | 2h |

### P2 -- Sonraki Sprint
| # | ID | Konu | Effort |
|---|---|---|---|
| 8 | FE-008 | Dis CDN ses dosyalarini lokale al | 1h |
| 9 | FE-010 | StoryViewer touch zone a11y | 1h |
| 10 | FE-011 | MatchesView div->button a11y | 1h |
| 11 | FE-012 | NearbyView stale time fix | 1h |
| 12 | FE-013 | Galeri indicator sync | 2h |
| 13 | FE-016 | Chat scroll optimizasyonu | 2h |
| 14 | FE-021 | Skip-to-content link | 2h |
| 15 | FE-015 | Dis kaynak resimleri lokale indir | 0.5h |

### P3 -- Backlog
| # | ID'ler | Konu | Effort |
|---|---|---|---|
| 16+ | FE-009,014,017-020,022-030 | Diger MEDIUM ve LOW bulgular | ~12h toplam |

**Toplam tahmini duzeltme suresi:** ~40h

---

## NOTLAR

1. **Onceki Duzeltmeler Dogrulandi:** v1 raporundaki FE-001 (Dev Bypass), FE-002 (Error Boundary), FE-003 (Loading Screen), FE-006 (ControlPanel disabled state) basariyla duzeltilmis. ChatView regex injection da `escapeRegExp()` ile giderilmis.

2. **ESLint Eksik:** Proje `eslint.config.js` dosyasina sahip degil. ESLint v9 flat config migrasyon yapilmali. Kod kalitesi sorunlarinin otomatik tespiti engelleniyor.

3. **TypeScript Temiz:** `tsc --noEmit` 0 hata rapor eder. Tip guvenligi iyi uygulanmis (FE-019 `as any` disinda).

4. **Lazy Loading Iyi:** `React.lazy()` ve `Suspense` ile MatchesView, ChatView, ProfileDetailView, OnboardingView, RegistrationFlow, PremiumView dogru lazy load ediliyor.

5. **Erisebilirlik Temeli Iyi:** 81 `aria-label/role` kullanimi 18 dosyada tespit edildi. `aria-modal`, `aria-live`, `aria-expanded`, `aria-haspopup` dogru kullanilmis. Eksikler: bazi div onClick'ler, skip link, touch zones.

6. **React.memo Kullanimi:** `MatchesView`, `SwipeHistoryView`, `SwipeableCard (RN)` dogru `React.memo` ile sarmalanmis. `useMemo` ve `useCallback` toplam 31 kullanim 13 dosyada.

7. **Error Boundary Iyi:** `ErrorBoundary` class component retry, go home, report bug islevselligine sahip. `withErrorBoundary` HOC da mevcut. App en ust seviyede sarmalanmis.

8. **Mobil RN Iyi:** `SwipeableCard.tsx` -- Reanimated, GestureHandler, Haptics, `memo` dogru uygulanmis.

---

**END OF FRONTEND AUDIT REPORT v2**
