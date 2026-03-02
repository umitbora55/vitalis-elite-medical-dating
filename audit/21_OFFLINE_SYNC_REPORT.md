# Agent 21: Offline & Sync Specialist - Evidence Dossier

**Audit Date:** 2026-02-17
**Agent:** 21 - OFFLINE & SYNC SPECIALIST
**Status:** CRITICAL GAPS IDENTIFIED

---

## Executive Summary

The Vitalis Dating App currently has **NO OFFLINE CAPABILITY IMPLEMENTATION**. The application relies entirely on live network connectivity for all operations. There is no offline detection, no data persistence layer, no message queuing system, no sync strategy, and no conflict resolution mechanism.

**Risk Level:** HIGH - Application will completely fail offline with no graceful degradation.

---

## Offline Capability Matrix

| Capability | Status | Implementation | Files |
|------------|--------|----------------|-------|
| Offline Detection | NOT IMPLEMENTED | No network state monitoring | - |
| Data Persistence | NOT IMPLEMENTED | In-memory state only (Zustand) | `stores/*.ts` |
| Message Queue | NOT IMPLEMENTED | No queue for offline messages | `components/ChatView.tsx` |
| Sync Strategy | NOT IMPLEMENTED | No sync mechanism | - |
| Reconnection Handling | NOT IMPLEMENTED | No reconnection logic | - |
| Conflict Resolution | NOT IMPLEMENTED | No conflict handling | - |
| Optimistic Updates | PARTIAL | UI updates without network | `stores/*.ts` |
| Network Error Handling | MINIMAL | Basic error toasts only | `App.tsx` |

---

## Evidence Dossier

### 1. Offline Detection - MISSING

**Finding:** No implementation of network state monitoring.

**Evidence:**
- No usage of `navigator.onLine` API in web codebase
- No `@react-native-community/netinfo` in mobile package.json
- No custom hook for network status
- No conditional rendering based on connectivity

**Searched locations:**
- `/hooks/` - No network-related hooks
- `/services/` - No network state service
- `/stores/` - No network state in any store
- `/mobile/hooks/` - No NetInfo integration

**Impact:** Users have no indication when offline. All operations will silently fail.

---

### 2. Data Persistence - MISSING

**Finding:** All stores use in-memory state with no persistence layer.

**Evidence from stores:**

```typescript
// stores/authStore.ts - Lines 11-15
export const useAuthStore = create<AuthState>((set) => ({
  authStep: 'LANDING',
  setAuthStep: (authStep) => set({ authStep }),
  resetAuth: () => set({ authStep: 'LANDING' }),
}));
```

```typescript
// stores/matchStore.ts - Lines 26-31
export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  currentMatch: null,
  activeChatMatch: null,
  swipeHistory: MOCK_SWIPE_HISTORY,
  ...
}));
```

```typescript
// stores/userStore.ts - Lines 14-24
export const useUserStore = create<UserState>((set) => ({
  profile: INITIAL_USER_PROFILE,
  isPremium: false,
  premiumTier: 'FREE',
  ...
}));
```

**Missing implementation:**
- No `zustand/middleware/persist`
- No `AsyncStorage` for React Native
- No `localStorage` persistence for stores
- No IndexedDB usage

**Single localStorage usage found:**
- `localStorage.getItem('vitalis_onboarding_seen')` - Onboarding flag only (App.tsx:407)
- `localStorage.getItem(CONSENT_STORAGE_KEY)` - Analytics consent only (analytics.ts:25)

**Impact:** All user data, matches, and messages are lost on app refresh or close.

---

### 3. Message Queue for Offline - MISSING

**Finding:** ChatView handles messages without any offline queuing mechanism.

**Evidence from ChatView.tsx:**

```typescript
// components/ChatView.tsx - Lines 586-624
const handleSend = () => {
    if (!inputText.trim()) return;
    const sendNow = getNowMs();

    // Direct local state update - no network call
    // No queue for offline messages
    const userMessage: Message = {
        id: sendNow.toString(),
        text: inputText.trim(),
        senderId: 'me',
        timestamp: sendNow,
        status: 'sent'
    };

    setMessages((prev) => [...prev, userMessage]);
    trackEvent('message', { type: 'text', matchId: match.profile.id });
    setInputText('');
    simulateReply();  // Mock reply - no actual network
};
```

**Missing implementation:**
- No message queue data structure
- No background sync worker
- No retry logic for failed messages
- No message status tracking (pending/synced/failed)
- No Supabase realtime subscription for messages

**Impact:** Messages sent offline will be lost. No indication of failed delivery.

---

### 4. Sync on Reconnection - MISSING

**Finding:** No sync mechanism exists for reconciling offline changes with server.

**Evidence:**
- No `SyncManager` or equivalent class
- No background sync registration
- No reconnection event listeners
- No delta sync logic

**Supabase client configuration (src/lib/supabase.ts):**
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// No realtime configuration
// No connection state handling
// No reconnection callbacks
```

**Impact:** Any data modified offline will conflict with or overwrite server state.

---

### 5. Conflict Resolution Strategy - MISSING

**Finding:** No conflict resolution mechanism for concurrent modifications.

**Evidence:**
- No version tracking or timestamps for conflict detection
- No last-writer-wins or merge strategies
- No user-facing conflict resolution UI
- Profile updates use direct `upsert` without conflict handling:

```typescript
// services/profileService.ts - Lines 47-58
export const upsertProfile = async (profile: Profile) => {
  return supabase
    .from('profiles')
    .upsert({ id: authData.user.id, ...mapProfileToRow(profile) })
    .select()
    .single();
  // No optimistic locking
  // No version field
  // No conflict handling
};
```

**Impact:** Data corruption possible when same user modifies data on multiple devices.

---

### 6. Optimistic Updates - PARTIAL

**Finding:** UI updates locally but without proper rollback on failure.

**Evidence from App.tsx:**

```typescript
// App.tsx - Lines 358-363
updateUserProfile(nextProfile);
const { error: profileError } = await upsertProfile(nextProfile);
if (profileError) {
    showToast('Profile saved locally. Cloud sync failed.');
    // No rollback of optimistic update!
}
```

```typescript
// App.tsx - Lines 679-732
// Swipe handling updates local state immediately
addSwipedProfile(currentProfile.id);
// But no network call to persist swipe
// No rollback on failure
```

**Issues:**
- State divergence between local and server
- No retry mechanism
- No eventual consistency guarantee

---

### 7. Network Error Handling - MINIMAL

**Finding:** Basic error handling with toast notifications only.

**Evidence:**
- Toast messages for errors (non-blocking)
- No retry buttons or automatic retry
- No offline state indication in UI
- Silent failures for critical operations

```typescript
// App.tsx - Line 361
showToast('Profile saved locally. Cloud sync failed.');
// Error dismissed after 2.5 seconds
// No user action possible
// No retry mechanism
```

---

### 8. Mobile App - UNDERDEVELOPED

**Finding:** Mobile app is a basic Expo template without Vitalis features.

**Evidence from mobile/app/_layout.tsx:**
- Basic navigation setup only
- No network state handling
- No offline storage
- No Supabase integration

**Missing from mobile/package.json:**
- `@react-native-async-storage/async-storage`
- `@react-native-community/netinfo`
- `@supabase/supabase-js`
- MMKV or similar for persistence

---

## Recommendations

### Priority 1: Immediate (Critical)

1. **Implement Network State Detection**
   - Add `useNetworkStatus` hook using `navigator.onLine` + online/offline events
   - Display offline banner when connectivity lost
   - Block destructive actions when offline

2. **Add Store Persistence**
   - Integrate `zustand/middleware/persist` with localStorage
   - Configure partialize for sensitive data exclusion
   - Add hydration state management

3. **Implement Message Queue**
   - Create `OfflineMessageQueue` class
   - Store pending messages in IndexedDB
   - Add visual indicator for unsent messages

### Priority 2: Short-term (High)

4. **Add Sync Manager**
   - Implement background sync for queued operations
   - Add reconnection handler for Supabase realtime
   - Implement exponential backoff for retries

5. **Add Conflict Resolution**
   - Add `updated_at` timestamps to all entities
   - Implement last-write-wins with user notification
   - Add optimistic lock version fields

6. **Improve Error Handling**
   - Add retry buttons to error toasts
   - Implement automatic retry with backoff
   - Add persistent error banner for sync failures

### Priority 3: Medium-term

7. **Mobile Offline Support**
   - Integrate `@react-native-community/netinfo`
   - Add AsyncStorage for persistence
   - Share offline logic with web via shared module

8. **Data Consistency**
   - Implement eventual consistency model
   - Add sync status indicators per entity
   - Create data integrity validation

---

## Files Requiring Changes

| File | Change Required |
|------|-----------------|
| `stores/authStore.ts` | Add persist middleware |
| `stores/userStore.ts` | Add persist middleware |
| `stores/matchStore.ts` | Add persist middleware, sync logic |
| `stores/discoveryStore.ts` | Add persist middleware |
| `stores/notificationStore.ts` | Add persist middleware |
| `components/ChatView.tsx` | Add message queue, offline indicator |
| `App.tsx` | Add network status provider, offline banner |
| `src/lib/supabase.ts` | Add realtime config, reconnection handling |
| `services/*.ts` | Add retry logic, queue integration |
| NEW: `hooks/useNetworkStatus.ts` | Network state detection |
| NEW: `services/syncService.ts` | Background sync manager |
| NEW: `services/offlineQueue.ts` | Message and action queue |

---

## Conclusion

The Vitalis Dating App has **ZERO offline capability**. This represents a critical gap for a mobile-first dating application where users frequently experience connectivity issues (elevators, subways, hospitals, etc.).

Given that the target audience is medical professionals who often work in environments with poor connectivity (hospital basements, on-call rooms, ORs), offline support should be considered a **core feature requirement**, not a nice-to-have.

**Estimated Effort:** 3-4 weeks for full implementation
**Recommended Approach:** Start with store persistence and network detection, then layer in sync capabilities.

---

*Report generated by Agent 21: Offline & Sync Specialist*
