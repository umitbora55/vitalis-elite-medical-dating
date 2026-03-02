# AGENT 11: PERFORMANCE OPTIMIZER - EVIDENCE DOSSIER

**Date:** 2026-02-17
**Agent:** Performance Optimizer
**Status:** CRITICAL ISSUES IDENTIFIED
**Overall SLO Compliance:** PARTIAL - 2/5 SLOs at risk

---

## EXECUTIVE SUMMARY

The Vitalis Dating App has significant performance concerns that impact multiple SLOs. The primary issues are:
1. **Bundle size exceeds targets by ~2x** (580.89 KB main bundle vs 300 KB target)
2. **No list virtualization** in scrollable components
3. **Missing image optimization** (no lazy loading, no srcSet, no preloading)
4. **Multiple interval-based re-renders** causing potential FPS drops
5. **Vite config lacks production optimizations**

---

## SLO IMPACT ASSESSMENT

| SLO | Target | Current Status | Risk Level | Root Cause |
|-----|--------|----------------|------------|------------|
| SLO-03: Cold Start p95 | < 2.0s | AT RISK | HIGH | 580 KB main bundle, no preloading |
| SLO-04: Swipe FPS p95 | >= 58 | AT RISK | MEDIUM | No virtualization, interval renders |
| SLO-05: Chat FPS p95 | >= 58 | AT RISK | MEDIUM | Multiple timers, no virtualization |
| SLO-08: API Latency p95 | < 400ms | LIKELY OK | LOW | Simple Supabase calls |
| SLO-10: Image Load p95 | < 1.5s | AT RISK | HIGH | No lazy loading, no responsive images |

---

## EVIDENCE DOSSIER

### 1. BUNDLE SIZE ANALYSIS

**File:** `vite.config.ts`
**Finding:** CRITICAL - Minimal vite configuration with no bundle optimization

```typescript
// Current config - NO optimizations
export default defineConfig(() => {
    return {
      server: { port: 3000, host: '0.0.0.0' },
      plugins: [react()],
      resolve: { alias: { '@': path.resolve(__dirname, '.') } }
    };
});
```

**Build Output:**
```
dist/assets/index-BBsD73Ga.js       580.89 kB | gzip: 171.54 kB  << CRITICAL: 2x target
dist/assets/RegistrationFlow.js     118.97 kB | gzip:  33.02 kB
dist/assets/MyProfileView.js        133.25 kB | gzip:  28.39 kB
dist/assets/ChatView.js              55.57 kB | gzip:  14.27 kB
```

**SLO Impact:** SLO-03 (Cold Start) - Main bundle is 93% larger than the 300 KB gzip target.

**Recommended Fix:**
```typescript
// vite.config.ts - Add manual chunks
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-firebase': ['firebase'],
          'vendor-sentry': ['@sentry/react'],
          'vendor-stripe': ['@stripe/stripe-js'],
          'vendor-analytics': ['mixpanel-browser', 'posthog-js'],
        }
      }
    },
    chunkSizeWarningLimit: 300
  }
});
```

---

### 2. LAZY LOADING ANALYSIS

**File:** `App.tsx` (lines 46-56)
**Finding:** GOOD - Route-level code splitting is implemented

```typescript
const MatchesView = lazy(() => import('./components/MatchesView').then((m) => ({ default: m.MatchesView })));
const ChatView = lazy(() => import('./components/ChatView').then((m) => ({ default: m.ChatView })));
const ProfileDetailView = lazy(() => import('./components/ProfileDetailView').then((m) => ({ default: m.ProfileDetailView })));
// ... 8 more lazy-loaded components
```

**SLO Impact:** Positive impact on SLO-03. This is correctly implemented.

---

### 3. COMPONENT MEMOIZATION ANALYSIS

**Finding:** PARTIAL - Some components memoized, many missing

**Memoized (GOOD):**
- `MatchesView` - `React.memo(MatchesViewComponent)`
- `SwipeHistoryView` - `React.memo(SwipeHistoryViewComponent)`
- `LikesYouView` - `React.memo(LikesYouViewComponent)`
- `NotificationsView` - `React.memo(NotificationsViewComponent)`

**NOT Memoized (ISSUES):**
| Component | Size | Re-render Risk | Priority |
|-----------|------|----------------|----------|
| `ProfileCard.tsx` | 199 lines | HIGH (swipe target) | CRITICAL |
| `ChatView.tsx` | 1202 lines | HIGH (frequent updates) | HIGH |
| `StoryViewer.tsx` | 241 lines | MEDIUM | MEDIUM |
| `StoryRail.tsx` | 147 lines | MEDIUM | MEDIUM |
| `ControlPanel.tsx` | ~100 lines | HIGH (swipe actions) | HIGH |

**File:** `components/ProfileCard.tsx`
**Finding:** Not memoized despite being critical swipe component

```typescript
// Current - NO memo
export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onShowDetails, currentUser }) => {
  const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000); // Re-renders every minute
    // ...
  }, []);
```

**SLO Impact:** SLO-04 (Swipe FPS) - ProfileCard re-renders can cause frame drops during swipe animations.

---

### 4. LIST VIRTUALIZATION ANALYSIS

**Finding:** CRITICAL - No virtualization in any list component

**Affected Components:**
| Component | List Type | Item Count Risk | Priority |
|-----------|-----------|-----------------|----------|
| `MatchesView.tsx` | Match list | 50+ matches | HIGH |
| `ChatView.tsx` | Messages list | 100+ messages | CRITICAL |
| `LikesYouView.tsx` | Profiles grid | 100+ profiles | HIGH |
| `NotificationsView.tsx` | Notifications | 50+ items | MEDIUM |
| `SwipeHistoryView.tsx` | History list | 100+ items | MEDIUM |

**File:** `components/ChatView.tsx` (line 889-996)
**Finding:** Messages rendered with `.map()` without virtualization

```typescript
// Line 899-977 - Full DOM render of all messages
{messages.map((msg) => {
    // ... renders ALL messages to DOM
    return (
        <MessageBubble
            key={msg.id}
            msg={msg}
            // ...
        />
    );
})}
```

**SLO Impact:** SLO-05 (Chat FPS) - Large message lists cause jank.

**Recommended Fix:** Implement `@tanstack/react-virtual` or `react-window`:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
});
```

---

### 5. IMAGE OPTIMIZATION ANALYSIS

**Finding:** CRITICAL - No image optimization strategy

**Issues Identified:**

**A. No `loading="lazy"` attribute:**
```typescript
// components/ProfileCard.tsx line 76-79
<div
  className="absolute inset-0 bg-cover bg-center"
  style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
/>
// Uses background-image, cannot use native lazy loading

// components/MatchesView.tsx line 241
<img src={match.profile.images[0]} alt={match.profile.name} className="w-full h-full object-cover" />
// Missing loading="lazy"
```

**B. No responsive images (srcSet):**
- All image URLs are static: `https://picsum.photos/id/xxx/800/1200`
- No WebP fallbacks
- No size variants for different viewports

**C. No image preloading:**
- Next profile image not preloaded during swipe
- Match profile images not prefetched

**SLO Impact:** SLO-10 (Image Load) - Images load on demand without optimization.

**Recommended Fix:**
```typescript
// Add preloading for next profile
useEffect(() => {
  if (nextProfile) {
    const img = new Image();
    img.src = nextProfile.images[0];
  }
}, [nextProfile]);

// Add lazy loading
<img loading="lazy" src={url} srcSet={`${url}?w=400 400w, ${url}?w=800 800w`} />
```

---

### 6. INTERVAL/TIMER ANALYSIS

**Finding:** HIGH - Multiple components running concurrent intervals

**Active Intervals Summary:**
| Location | Interval | Purpose | Impact |
|----------|----------|---------|--------|
| `App.tsx:152` | 60,000ms | Update `nowMs` | LOW |
| `App.tsx:268` | 60,000ms | Expire matches | LOW |
| `ProfileCard.tsx:21` | 60,000ms | Update status | MEDIUM (per card) |
| `MatchesView.tsx:59` | 30,000ms | Force tick | MEDIUM |
| `ChatView.tsx:167` | 30,000ms | Update `nowMs` | MEDIUM |
| `ChatView.tsx:426` | 60,000ms | Countdown | LOW |
| `ChatView.tsx:467` | 1,000ms | Call timer | HIGH (during calls) |
| `StoryViewer.tsx:33` | 100ms | Progress bar | HIGH (during view) |

**Cumulative Impact:** Up to 8 intervals active simultaneously causing micro re-renders.

**SLO Impact:** SLO-04/05 (FPS) - Concurrent intervals can cause frame budget exhaustion.

---

### 7. ANIMATION PERFORMANCE ANALYSIS

**Finding:** GOOD - CSS transforms used correctly

**File:** `tailwind.config.cjs` (lines 132-190)
**Evidence:** Animations use transform and opacity (GPU-accelerated):
```typescript
keyframes: {
  'slide-up': {
    from: { opacity: '0', transform: 'translateY(16px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  'scale-in': {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
}
```

**File:** `App.tsx` (lines 843-855)
**Evidence:** Swipe animations use transform:
```typescript
case SwipeDirection.LEFT:
  return { transform: 'translateX(-150%) rotate(-20deg)', opacity: 0 };
case SwipeDirection.RIGHT:
  return { transform: 'translateX(150%) rotate(20deg)', opacity: 0 };
```

**Missing:** `will-change` hints for animated elements.

---

### 8. API BATCHING ANALYSIS

**Finding:** MEDIUM - No request deduplication or batching

**File:** `services/profileService.ts`
**Evidence:** Each profile operation is independent:
```typescript
export const upsertProfile = async (profile: Profile) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  // ... individual request per profile
};
```

**Missing:**
- Request deduplication (TanStack Query or SWR)
- Batch profile fetching
- Optimistic updates

**SLO Impact:** SLO-08 (API Latency) - Multiple sequential calls instead of batched.

---

### 9. MEMORY LEAK ANALYSIS

**Finding:** GOOD - Cleanup functions present in most effects

**File:** `components/ProfileCard.tsx` (lines 19-27)
**Evidence:** Proper cleanup:
```typescript
useEffect(() => {
  const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
  const immediateId = window.setTimeout(() => setNowMs(Date.now()), 0);

  return (): void => {
    window.clearInterval(intervalId);
    window.clearTimeout(immediateId);
  };
}, []);
```

**File:** `components/ChatView.tsx`
**Evidence:** All refs properly cleared in cleanup functions.

---

## PRIORITIZED RECOMMENDATIONS

### CRITICAL (SLO Blockers)

| # | Issue | SLO Impact | Effort | Fix |
|---|-------|------------|--------|-----|
| 1 | Bundle size 580KB | SLO-03 | Medium | Add manualChunks to vite.config.ts |
| 2 | No list virtualization | SLO-04/05 | High | Implement @tanstack/react-virtual |
| 3 | No image lazy loading | SLO-10 | Low | Add loading="lazy" to all `<img>` |

### HIGH PRIORITY

| # | Issue | SLO Impact | Effort | Fix |
|---|-------|------------|--------|-----|
| 4 | ProfileCard not memoized | SLO-04 | Low | Wrap with React.memo |
| 5 | No image preloading | SLO-10 | Low | Preload next profile images |
| 6 | ChatView not memoized | SLO-05 | Medium | Memo + useMemo for derived state |

### MEDIUM PRIORITY

| # | Issue | Impact | Effort | Fix |
|---|-------|--------|--------|-----|
| 7 | Multiple concurrent intervals | FPS | Medium | Consolidate into single tick manager |
| 8 | No API request caching | UX | Medium | Add TanStack Query |
| 9 | Missing will-change hints | Animation | Low | Add to animated elements |

---

## IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (1-2 days)
1. Add `loading="lazy"` to all `<img>` elements
2. Wrap `ProfileCard` with `React.memo`
3. Add image preloading for next profile
4. Update vite.config.ts with manualChunks

### Phase 2: Core Optimizations (3-5 days)
1. Implement list virtualization in ChatView
2. Implement list virtualization in MatchesView
3. Add request caching with TanStack Query
4. Consolidate intervals into tick manager

### Phase 3: Polish (2-3 days)
1. Add responsive image srcSet
2. Implement Service Worker caching
3. Add Web Vitals monitoring
4. Performance testing and validation

---

## METRICS TO TRACK

After implementing fixes, measure:
- **LCP (Largest Contentful Paint):** Target < 2.5s
- **INP (Interaction to Next Paint):** Target < 200ms
- **CLS (Cumulative Layout Shift):** Target < 0.1
- **FPS during swipe:** Target >= 58
- **FPS during chat scroll:** Target >= 58
- **Bundle size (gzip):** Target < 200KB main chunk

---

## CONCLUSION

The Vitalis app has solid foundations (lazy loading, proper cleanup, CSS animations) but requires critical optimizations to meet performance SLOs. The highest priority items are:

1. **Reduce bundle size** via code splitting - Direct impact on SLO-03
2. **Add list virtualization** - Direct impact on SLO-04/05
3. **Implement image optimization** - Direct impact on SLO-10

Estimated remediation effort: **6-10 development days** for full SLO compliance.

---

*Report generated by Agent 11: Performance Optimizer*
