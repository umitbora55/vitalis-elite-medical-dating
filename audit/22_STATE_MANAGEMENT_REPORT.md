# STATE MANAGEMENT AUDIT REPORT

**Agent:** 22 - State Management Auditor
**Date:** 2026-02-17
**Scope:** Zustand stores, persistence, performance, data flow patterns
**Verdict:** NEEDS IMPROVEMENT (Multiple Critical Issues)

---

## EXECUTIVE SUMMARY

The Vitalis Dating App uses Zustand v5.0.11 for state management across 6 stores. While the architecture demonstrates good separation of concerns, several critical performance and architectural issues were identified that require immediate attention.

### Critical Findings Summary

| Severity | Issue | Impact |
|----------|-------|--------|
| CRITICAL | No state persistence | Data loss on refresh |
| CRITICAL | Massive re-render pattern in App.tsx | Performance degradation |
| HIGH | No devtools integration | Poor debugging experience |
| HIGH | Missing state reset on logout | Security/data leakage |
| MEDIUM | Set objects in state without shallow comparison | Subtle re-render issues |
| MEDIUM | Async actions lack error handling in stores | Silent failures |
| LOW | Hardcoded mock data initialization | Testing difficulties |

---

## STATE ARCHITECTURE DIAGRAM

```
+------------------+     +------------------+     +------------------+
|   authStore      |     |   userStore      |     |   uiStore        |
|------------------|     |------------------|     |------------------|
| - authStep       |     | - profile        |     | - currentView    |
| - setAuthStep    |     | - isPremium      |     | - isFilterOpen   |
| - resetAuth      |     | - premiumTier    |     | - viewingProfile |
+--------+---------+     | - setProfile     |     | - setCurrentView |
         |               | - updateProfile  |     +--------+---------+
         |               | - setPremium     |              |
         v               +--------+---------+              v
+------------------+              |               +------------------+
| discoveryStore   |              v               | notificationStore|
|------------------|     +------------------+     |------------------|
| - swipedProfileIds|    |   matchStore     |     | - notifications  |
| - blockedProfileIds|   |------------------|     | - setNotifications|
| - dailySwipesRemaining | - matches       |     | - addNotification |
| - superLikesCount |    | - currentMatch   |     | - markAllRead    |
| - swipeDirection  |    | - activeChatMatch|     | - clearNotifications|
| - filters         |    | - swipeHistory   |     +------------------+
| - decrementSwipe  |    | - dailyExtensions|
| - addSwipedProfile|    | - setMatches     |
| - resetSwipes     |    | - addMatch       |
+------------------+     | - expireMatches  |
                         | - extendMatch    |
                         +------------------+

                    DATA FLOW
         User Actions --> Stores --> Components
                              ^
                              |
                    (No Persistence Layer)
```

---

## EVIDENCE DOSSIER

### 1. Store Separation of Concerns

**Status:** PASS (with notes)

The codebase properly separates state into domain-specific stores:

| Store | Purpose | Lines |
|-------|---------|-------|
| `authStore.ts` | Authentication flow state | 15 |
| `userStore.ts` | User profile & premium status | 24 |
| `discoveryStore.ts` | Discovery/swipe mechanics | 80 |
| `matchStore.ts` | Match management & chat | 76 |
| `uiStore.ts` | UI navigation state | 34 |
| `notificationStore.ts` | Notification management | 23 |

**Evidence:**

```typescript
// stores/authStore.ts - Clean separation
export const useAuthStore = create<AuthState>((set) => ({
  authStep: 'LANDING',
  setAuthStep: (authStep) => set({ authStep }),
  resetAuth: () => set({ authStep: 'LANDING' }),
}));
```

**Finding:** Good domain separation, but no cross-store coordination patterns (e.g., combined selectors).

---

### 2. State Persistence Strategy

**Status:** CRITICAL FAIL

**Evidence:** No persistence middleware found in any store.

```typescript
// stores/userStore.ts - No persist middleware
export const useUserStore = create<UserState>((set) => ({
  profile: INITIAL_USER_PROFILE,
  // ... no persist configuration
}));
```

**Impact:**
- All user data lost on page refresh
- Premium status lost on refresh
- Swipe history lost
- Filter preferences lost
- Match data lost

**Required Fix:**

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // ... state
    }),
    {
      name: 'vitalis-user-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        isPremium: state.isPremium,
        premiumTier: state.premiumTier,
      }),
    }
  )
);
```

---

### 3. Unnecessary Re-renders (CRITICAL)

**Status:** CRITICAL FAIL

**Evidence (App.tsx lines 95-144):**

```typescript
const App: React.FC = () => {
    // PROBLEM: 50+ individual selector calls cause separate subscriptions
    const authStep = useAuthStore((state) => state.authStep);
    const setAuthStep = useAuthStore((state) => state.setAuthStep);
    const userProfile = useUserStore((state) => state.profile);
    const setUserProfile = useUserStore((state) => state.setProfile);
    const updateUserProfile = useUserStore((state) => state.updateProfile);
    const isPremium = useUserStore((state) => state.isPremium);
    const premiumTier = useUserStore((state) => state.premiumTier);
    const setIsPremium = useUserStore((state) => state.setPremium);
    // ... 42 more individual selectors
```

**Impact:**
- Each selector creates a subscription
- Any state change in any store triggers subscription checks
- App component re-renders excessively
- Performance degrades with app complexity

**Evidence of Pattern Across Stores:**

```typescript
// All 50 individual calls from App.tsx:
// authStore: 2 values + 1 action
// userStore: 3 values + 3 actions
// uiStore: 4 values + 4 actions
// discoveryStore: 7 values + 10 actions
// matchStore: 8 values + 9 actions
// notificationStore: 1 value + 1 action

// Total: 25 state values + 28 actions = 53 subscriptions
```

**Recommended Fix:**

```typescript
// Create combined selectors for related state
const useAppState = () => {
  const auth = useAuthStore(useShallow((s) => ({
    authStep: s.authStep,
    setAuthStep: s.setAuthStep,
  })));

  const user = useUserStore(useShallow((s) => ({
    profile: s.profile,
    isPremium: s.isPremium,
    premiumTier: s.premiumTier,
    setProfile: s.setProfile,
    updateProfile: s.updateProfile,
    setPremium: s.setPremium,
  })));

  // ... combine related state
  return { ...auth, ...user };
};
```

---

### 4. Selector Patterns

**Status:** PARTIALLY IMPLEMENTED

**Good Pattern Found:**

```typescript
// Memoized computed values
const visibleProfiles = useMemo(() => {
  // Complex filtering logic
}, [authStep, blockedProfileIds, currentView, filters, nowMs, swipedProfileIds, ...]);

const unreadNotificationsCount = useMemo(() => {
  return notifications.filter(n => !n.isRead).length;
}, [notifications]);
```

**Missing Pattern:**

No `useShallow` import or usage detected for object selectors:

```typescript
// Current problematic pattern:
const filters = useDiscoveryStore((state) => state.filters);
// Returns new reference each time even if filters hasn't changed

// Should use:
import { useShallow } from 'zustand/shallow';
const filters = useDiscoveryStore(useShallow((state) => state.filters));
```

---

### 5. State Normalization

**Status:** NEEDS IMPROVEMENT

**Evidence (discoveryStore.ts):**

```typescript
interface DiscoveryState {
  swipedProfileIds: Set<string>;    // Using Set
  blockedProfileIds: Set<string>;   // Using Set
  // ...
}

// Set mutation pattern:
addSwipedProfile: (profileId) =>
  set((state) => {
    const next = new Set(state.swipedProfileIds);  // Creates new Set every time
    next.add(profileId);
    return { swipedProfileIds: next };
  }),
```

**Issues:**
1. Set objects cannot be serialized for persistence
2. JSON.stringify(Set) returns `{}`
3. No normalization of complex objects like `Profile`

**Evidence (matchStore.ts):**

```typescript
// Nested Profile objects in matches - not normalized
matches: Match[];  // Each Match contains full Profile object
swipeHistory: SwipeHistoryItem[];  // Contains full Profile objects
```

**Impact:**
- Duplicate profile data across stores
- Updates to profile not reflected in matches
- Memory inefficiency

---

### 6. Async Action Handling

**Status:** FAIL

**Evidence:** Stores contain no async actions - all async logic is in App.tsx:

```typescript
// App.tsx - Async logic outside stores
const handleRegistrationComplete = useCallback(async (data, verification) => {
  const { error } = await signUpWithEmail(email, password, {...});
  if (error) {
    showToast(error.message);
    return;
  }
  // ...
  const { error: profileError } = await upsertProfile(nextProfile);
  if (profileError) {
    showToast('Profile saved locally. Cloud sync failed.');
  }
}, [...]);
```

**Issues:**
1. No loading states in stores
2. No error states in stores
3. All error handling scattered in components
4. No retry mechanisms

**Recommended Pattern:**

```typescript
interface MatchState {
  matches: Match[];
  isLoading: boolean;
  error: string | null;

  fetchMatches: () => Promise<void>;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matches: [],
  isLoading: false,
  error: null,

  fetchMatches: async () => {
    set({ isLoading: true, error: null });
    try {
      const matches = await matchService.getMatches();
      set({ matches, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

---

### 7. State Reset on Logout

**Status:** CRITICAL FAIL

**Evidence (index.tsx):**

```typescript
onAuthStateChange((_event, session) => {
  if (!session) {
    useAuthStore.getState().setAuthStep('LANDING');
    // NO OTHER STORE RESET
    return Promise.resolve();
  }
  // ...
});
```

**Missing Resets:**

```typescript
// Should reset ALL stores on logout:
// - useUserStore: profile, isPremium, premiumTier
// - useDiscoveryStore: swipedProfileIds, filters, dailySwipesRemaining
// - useMatchStore: matches, swipeHistory, activeChatMatch
// - useNotificationStore: notifications
// - useUiStore: currentView, viewingProfile
```

**Security Impact:**
- Previous user's data persists in memory
- Next user could see previous user's matches
- Privacy violation

**Required Fix:**

```typescript
// Create reset actions in each store
export const useUserStore = create<UserState>((set) => ({
  // ...
  resetStore: () => set({
    profile: INITIAL_USER_PROFILE,
    isPremium: false,
    premiumTier: 'FREE',
  }),
}));

// index.tsx - Reset all stores on logout
onAuthStateChange((_event, session) => {
  if (!session) {
    useAuthStore.getState().resetAuth();
    useUserStore.getState().resetStore();
    useDiscoveryStore.getState().resetSwipes();
    useMatchStore.getState().setMatches([]);
    useNotificationStore.getState().clearNotifications();
    // ...
  }
});
```

---

### 8. Devtools Integration

**Status:** FAIL

**Evidence:** No devtools middleware in any store:

```typescript
// Current pattern (all stores):
export const useAuthStore = create<AuthState>((set) => ({...}));

// Missing devtools:
import { devtools } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({...}),
    { name: 'auth-store' }
  )
);
```

**Impact:**
- Cannot debug state changes in Redux DevTools
- No time-travel debugging
- No action logging
- Difficult to track state mutations

---

## ADDITIONAL FINDINGS

### Mock Data Initialization Anti-Pattern

**Evidence (matchStore.ts):**

```typescript
// Hardcoded mock data at store level
swipeHistory: MOCK_SWIPE_HISTORY,  // Always initializes with mock data
```

**Evidence (notificationStore.ts):**

```typescript
notifications: MOCK_NOTIFICATIONS,  // Always starts with mock notifications
```

**Issue:** Production builds will include mock data if environment check is not properly configured.

---

### Custom Hook State Management Issues

**Evidence (useBoost.ts, useSwipeLimit.ts):**

These hooks manage state with `useState` instead of Zustand, causing:
1. State not shareable across components
2. State lost on component unmount
3. Inconsistent patterns with rest of app

```typescript
// useBoost.ts - Local state, not in store
const [boostCount, setBoostCount] = useState(initialCount);
const [boostEndTime, setBoostEndTime] = useState<number | null>(null);
```

---

## RECOMMENDATIONS

### Priority 1 (Critical - Fix Before Launch)

1. **Add State Persistence**
   - Implement `persist` middleware for userStore, discoveryStore, matchStore
   - Use `partialize` to exclude sensitive data
   - Add migration strategy for store version changes

2. **Implement Store Reset on Logout**
   - Add `resetStore` action to all stores
   - Call all resets in auth state change handler

3. **Fix Re-render Performance**
   - Replace individual selectors with combined selectors using `useShallow`
   - Consider splitting App.tsx into smaller components

### Priority 2 (High - Fix in Next Sprint)

4. **Add Devtools Integration**
   - Wrap all stores with `devtools` middleware
   - Configure for development only

5. **Move Async Logic to Stores**
   - Add loading/error states
   - Move service calls into store actions
   - Implement consistent error handling

### Priority 3 (Medium - Technical Debt)

6. **Normalize State Structure**
   - Consider using profile IDs instead of full Profile objects
   - Add a profileCache store for deduplication

7. **Convert Custom Hooks to Store Actions**
   - Move boost state to discoveryStore or new boostStore
   - Move swipe limit logic to discoveryStore

8. **Replace Set with Array for Persistence Compatibility**
   - Or implement custom serialization

---

## VERIFICATION COMMANDS

```bash
# Check for persist middleware usage
grep -r "persist" stores/

# Check for devtools usage
grep -r "devtools" stores/

# Check for useShallow usage
grep -r "useShallow" .

# Check for resetStore patterns
grep -r "resetStore\|reset" stores/
```

---

## COMPLIANCE STATUS

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Store separation | PASS | 6 domain-specific stores |
| State persistence | FAIL | No persist middleware |
| Performance optimization | FAIL | 53 individual subscriptions |
| Selector patterns | PARTIAL | Some memoization, no useShallow |
| State normalization | PARTIAL | Nested objects, Sets |
| Async handling | FAIL | No store-level async |
| Logout reset | FAIL | Only authStore reset |
| Devtools | FAIL | No integration |

**Overall Score: 2/8 Requirements Met (25%)**

---

## APPENDIX: FILES AUDITED

| File | Path | Lines |
|------|------|-------|
| authStore.ts | `/stores/authStore.ts` | 15 |
| userStore.ts | `/stores/userStore.ts` | 24 |
| discoveryStore.ts | `/stores/discoveryStore.ts` | 80 |
| matchStore.ts | `/stores/matchStore.ts` | 76 |
| uiStore.ts | `/stores/uiStore.ts` | 34 |
| notificationStore.ts | `/stores/notificationStore.ts` | 23 |
| App.tsx | `/App.tsx` | 1426 |
| index.tsx | `/index.tsx` | 98 |
| useBoost.ts | `/hooks/useBoost.ts` | 62 |
| useSwipeLimit.ts | `/hooks/useSwipeLimit.ts` | 57 |
| useTheme.ts | `/hooks/useTheme.ts` | 52 |

---

*Report generated by Agent 22: State Management Auditor*
