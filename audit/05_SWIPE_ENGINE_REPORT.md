# AGENT 5: SWIPE & MATCHING ENGINE AUDIT REPORT

**Audit Date:** 2026-02-17
**Auditor:** Agent 5 - Swipe & Matching Engine Specialist
**Scope:** Swipe gesture implementation, card stack rendering, match flow, super like functionality

---

## EXECUTIVE SUMMARY

| SLO | Target | Current Status | Risk Level |
|-----|--------|----------------|------------|
| SLO-04 | Swipe FPS p95 >= 58 | **AT RISK** | HIGH |
| SLO-09 | Match event < 500ms | **PASSING** | LOW |

**Critical Finding:** The application lacks native gesture/swipe handling entirely. All swipe interactions are button-based only, with no touch/drag gesture support. This is a fundamental gap for a dating app targeting mobile-first users.

---

## EVIDENCE DOSSIER

### 1. SWIPE GESTURE IMPLEMENTATION

#### Finding: NO GESTURE LIBRARY INSTALLED

**Evidence Location:** `/package.json`

```json
"dependencies": {
    "@google/genai": "^1.40.0",
    "@hookform/resolvers": "^5.2.2",
    "@sentry/react": "^10.38.0",
    "@stripe/stripe-js": "^8.7.0",
    "@supabase/supabase-js": "^2.95.3",
    // ... NO react-use-gesture, framer-motion, react-swipeable, etc.
}
```

**Impact:** SLO-04 (Swipe FPS p95 >= 58) - CRITICAL MISS

**Analysis:**
- No gesture library (react-use-gesture, framer-motion, @use-gesture/react) is installed
- No native touch event handlers found in ProfileCard.tsx
- Swipe actions are ONLY triggered via button clicks (ControlPanel.tsx)

---

### 2. CARD STACK RENDERING

#### Finding: CSS-ONLY TRANSITIONS WITHOUT GPU OPTIMIZATION

**Evidence Location:** `/App.tsx` (lines 842-855)

```tsx
const getCardStyle = () => {
    if (!swipeDirection) return {};

    switch (swipeDirection) {
        case SwipeDirection.LEFT:
            return { transform: 'translateX(-150%) rotate(-20deg)', opacity: 0 };
        case SwipeDirection.RIGHT:
            return { transform: 'translateX(150%) rotate(20deg)', opacity: 0 };
        case SwipeDirection.SUPER:
            return { transform: 'translateY(-150%) scale(1.1)', opacity: 0 };
        default:
            return {};
    }
};
```

**Evidence Location:** `/App.tsx` (lines 964-995)

```tsx
{/* Next Card (Background) */}
{nextProfile && (
    <div className="absolute inset-0 transform scale-95 translate-y-4 opacity-50 z-0 pointer-events-none transition-all duration-500 mx-4">
        <ProfileCard ... />
    </div>
)}

{/* Current Card (Foreground) */}
<div
    className="absolute inset-0 z-10 transition-all duration-500 ease-out origin-bottom mx-4"
    style={getCardStyle()}
>
```

**Issues Identified:**
1. No `will-change` property for GPU layer promotion
2. No `translate3d` or `translateZ(0)` for GPU acceleration
3. No `touch-action: none` to prevent scroll interference
4. 500ms transition duration - adequate but could be optimized to 300-400ms for snappier feel

**Impact:** SLO-04 - May cause frame drops on lower-end devices

---

### 3. MATCH EVENT TIMING

#### Finding: MATCH EVENT WITHIN SLO TARGET

**Evidence Location:** `/App.tsx` (lines 676-732)

```tsx
// Wait for animation to finish before updating logic
setTimeout(() => {
    // Save ID for Rewind Feature
    setLastSwipedId(currentProfile.id);

    // Mark as swiped
    addSwipedProfile(currentProfile.id);

    // ... match logic ...

    if (direction === SwipeDirection.RIGHT || direction === SwipeDirection.SUPER) {
        if (currentProfile.hasLikedUser) {
            // Match created immediately (sync)
            const newMatch: Match = {
                profile: currentProfile,
                timestamp: Date.now(),
                // ...
            };
            addMatch(newMatch);
            setCurrentMatch(newMatch); // Triggers the overlay
            trackEvent('match', { profileId: currentProfile.id });
        }
    }

    setSwipeDirection(null);
}, 400); // Matches transition duration
```

**Analysis:**
- Swipe animation: 400ms
- Match detection: Synchronous (immediate after animation)
- Match overlay trigger: Immediate via `setCurrentMatch(newMatch)`
- **Total latency:** ~400ms (within 500ms SLO)

**Impact:** SLO-09 (Match event < 500ms) - PASSING

---

### 4. SUPER LIKE FUNCTIONALITY

#### Finding: PROPERLY IMPLEMENTED WITH GUARDS

**Evidence Location:** `/App.tsx` (lines 659-665)

```tsx
// Super Like Logic
if (direction === SwipeDirection.SUPER) {
    if (superLikesCount <= 0) {
        // Guard clause if triggered by gesture when count is 0
        return;
    }
    decrementSuperLike();
}
```

**Evidence Location:** `/stores/discoveryStore.ts` (lines 51-54)

```tsx
decrementSuperLike: () =>
    set((state) => ({
        superLikesCount: Math.max(0, state.superLikesCount - 1),
    })),
```

**Evidence Location:** `/components/ControlPanel.tsx` (lines 44-64)

```tsx
{/* Super Like Button */}
<div className="relative pointer-events-auto">
    <button
        onClick={() => !isSuperLikeDisabled && onSwipe(SwipeDirection.SUPER)}
        disabled={isSuperLikeDisabled}
        className={`... ${
            isSuperLikeDisabled
                ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900/80 border-blue-500/50 text-blue-400 ...'
        }`}
    >
```

**Analysis:**
- Count guard prevents negative super likes
- Visual feedback on disabled state
- Animation overlay on super like (line 988-994 in App.tsx)

**Status:** PASSING

---

### 5. SWIPE ANIMATION SMOOTHNESS

#### Finding: TRANSITION-BASED ONLY, NO SPRING PHYSICS

**Evidence Location:** `/tailwind.config.cjs` (lines 126-131)

```javascript
transitionTimingFunction: {
    'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
    'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    'snap': 'cubic-bezier(0.22, 1, 0.36, 1)',
    'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
},
```

**Issues:**
1. No spring-based animations (would require framer-motion or similar)
2. No velocity-based throw animations
3. No gesture momentum handling
4. Card position updates are discrete, not continuous

**Impact:** SLO-04 - User experience inferior to Tinder-level smoothness

---

### 6. EDGE CASES HANDLING

#### Finding: PARTIAL COVERAGE

**6.1 Last Card Scenario - HANDLED**

**Evidence Location:** `/App.tsx` (lines 1005-1043)

```tsx
) : (
    <div className="text-center p-8 bg-slate-900 rounded-3xl ...">
        {hasHiddenProfiles ? (
            <>
                {/* Filter adjustment UI */}
            </>
        ) : (
            <>
                {/* "That's everyone" UI */}
            </>
        )}
    </div>
)}
```

**6.2 Network Failure - NOT HANDLED**

- No offline detection
- No retry mechanism for swipe actions
- No optimistic updates with rollback

**6.3 Rapid Swiping - PARTIALLY HANDLED**

**Evidence Location:** `/App.tsx` (line 656)

```tsx
if (!currentProfile || swipeDirection) return;
```

Analysis: Prevents overlapping swipes but no queue management for rapid actions.

---

### 7. DAILY SWIPE LIMIT ENFORCEMENT

#### Finding: PROPERLY IMPLEMENTED

**Evidence Location:** `/constants.ts` (line 13)

```typescript
export const DAILY_SWIPE_LIMIT = 50;
```

**Evidence Location:** `/App.tsx` (lines 649-655)

```tsx
const handleSwipe = useCallback((direction: SwipeDirection) => {
    // 0. Check daily limit if not premium
    if (!isPremium && dailySwipesRemaining <= 0) {
        setShowPremiumAlert(true);
        return;
    }
    // ...
```

**Evidence Location:** `/hooks/useSwipeLimit.ts`

```tsx
export const useSwipeLimit = ({ dailyLimit, onReset }: UseSwipeLimitOptions): UseSwipeLimitResult => {
    // ... midnight reset logic
    const scheduleReset = (): void => {
        const diffMs = Math.max(0, getNextMidnight().getTime() - Date.now());
        resetTimer = setTimeout(() => {
            onResetRef.current();
            // ...
        }, diffMs + 50);
    };
```

**Status:** PASSING - Limit enforced with premium bypass and midnight reset

---

### 8. MATCH POPUP TIMING

#### Finding: MULTI-STAGE ANIMATION SYSTEM

**Evidence Location:** `/components/MatchOverlay.tsx` (lines 55-94)

```tsx
type AnimationStage = 'ENTERING' | 'IMPACT' | 'CELEBRATING' | 'INTERACTIVE' | 'HANDOFF';

useEffect(() => {
    // Stage 1: Entering (0ms) -> Impact (100ms triggers CSS transition)
    const t1 = setTimeout(() => {
        setStage('IMPACT');
        // Play sound
    }, 100);

    // Stage 2: Impact -> Celebrating (600ms)
    const t2 = setTimeout(() => {
        setStage('CELEBRATING');
    }, 700);

    // Stage 3: Celebrating -> Interactive (2500ms)
    const t3 = setTimeout(() => {
        setStage('INTERACTIVE');
    }, 2500);
```

**Analysis:**
- Match overlay appears within 400ms of swipe (animation timeout)
- Interactive state reached at 2500ms
- Handoff timing: 850ms (standard) / 1200ms (premium)

**Total Match Event Time:** ~400ms from swipe to overlay - **WITHIN SLO**

---

## COMPATIBILITY CALCULATION ANALYSIS

**Evidence Location:** `/utils/compatibility.ts`

| Factor | Max Points | Implementation |
|--------|------------|----------------|
| Shared Interests | 20% | 7 pts per interest, cap 20 |
| Age Gap | 15% | <= 3 years: 15, <= 7: 10, <= 12: 5 |
| Medical Role | 10% | Same role match |
| Distance | 15% | < 10km: 15, < 30: 10, < 80: 5 |
| Activity/Shift | 10% | Both available or similar patterns |
| Profile Completeness | 10% | Bio > 20 chars + 3+ images |
| AI Prediction | 20% | Deterministic ID-based hash |

**Score Range:** 45-99 (floor at 45 for UX)

**Status:** Well-implemented algorithm with reasonable factors

---

## RISK ASSESSMENT SUMMARY

### CRITICAL ISSUES

| ID | Issue | SLO Impact | Priority |
|----|-------|------------|----------|
| SE-001 | No gesture/swipe handling | SLO-04 CRITICAL | P0 |
| SE-002 | No GPU acceleration hints | SLO-04 | P1 |
| SE-003 | No touch-action CSS | SLO-04 | P1 |

### MODERATE ISSUES

| ID | Issue | SLO Impact | Priority |
|----|-------|------------|----------|
| SE-004 | No spring physics animations | UX Quality | P2 |
| SE-005 | No offline handling | Reliability | P2 |
| SE-006 | No swipe action queue | Rapid input edge case | P3 |

### PASSING ITEMS

| ID | Item | Status |
|----|------|--------|
| SE-P01 | Match event timing | PASSING (< 500ms) |
| SE-P02 | Super like enforcement | PASSING |
| SE-P03 | Daily limit enforcement | PASSING |
| SE-P04 | Last card handling | PASSING |
| SE-P05 | Compatibility calculation | PASSING |
| SE-P06 | Match overlay animation | PASSING |
| SE-P07 | Rewind functionality | PASSING |

---

## RECOMMENDATIONS

### P0 - CRITICAL (Required for SLO-04)

1. **Install gesture library**
   ```bash
   npm install @use-gesture/react framer-motion
   ```

2. **Implement drag-to-swipe gesture** in ProfileCard wrapper:
   ```tsx
   import { useDrag } from '@use-gesture/react';
   import { useSpring, animated } from 'framer-motion';

   // Bind drag handlers with velocity-based throw
   ```

### P1 - HIGH (Performance Optimization)

3. **Add GPU acceleration CSS**:
   ```css
   .swipe-card {
     will-change: transform, opacity;
     transform: translateZ(0);
     touch-action: none;
   }
   ```

4. **Reduce transition duration** from 500ms to 350ms for snappier feel

### P2 - MEDIUM (UX Enhancement)

5. **Add spring physics** for natural card movement
6. **Implement offline queue** for swipe actions
7. **Add haptic feedback** on swipe complete (mobile)

---

## TEST COVERAGE ASSESSMENT

**Current Tests Found:**
- `/components/ProfileCard.test.tsx` - Basic render tests (3 tests)
- `/utils/compatibility.test.ts` - Algorithm validation (4 tests)
- `/hooks/useSwipeLimit.test.ts` - Limit reset logic (2 tests)

**Missing Tests:**
- No gesture/swipe interaction tests
- No match event timing tests
- No rapid swipe stress tests
- No edge case tests (network failure, last card)

---

## CONCLUSION

The Vitalis swipe engine has a solid foundation for match logic, super likes, and daily limits. However, **the complete absence of gesture-based swiping is a critical gap** that prevents achieving SLO-04 (Swipe FPS p95 >= 58). The current button-only interaction model is fundamentally incompatible with a "Tinder-level smooth swipe" experience.

**Immediate action required:** Install a gesture library (@use-gesture/react or framer-motion) and implement drag-to-swipe functionality with spring physics.

---

*Report generated by Agent 5 - Swipe & Matching Engine Specialist*
