# Agent 8: Push Notification Specialist - Evidence Dossier

**Audit Date:** 2026-02-17
**Target SLO:** SLO-06: Push delivery >= 99%
**Current Assessment:** CRITICAL GAPS - SLO AT RISK

---

## Executive Summary

The Vitalis push notification system is **incomplete and non-functional for production**. While basic Firebase Cloud Messaging (FCM) infrastructure exists for web, critical components are missing:

1. **No push token persistence** - Tokens are obtained but never stored server-side
2. **No mobile notification support** - Expo app lacks `expo-notifications` setup
3. **No server-side sending** - No Edge Function or backend to dispatch notifications
4. **No deep linking** - Notifications cannot navigate users to specific content
5. **Notification preferences exist in types but are not enforced**

**SLO Impact:** Cannot achieve 99% delivery rate with current implementation. Estimated delivery rate: **0%** (notifications cannot be sent from server).

---

## Evidence Inventory

### 1. FCM/APNs Configuration

#### Web (Firebase Cloud Messaging)

| File | Status | Evidence |
|------|--------|----------|
| `/src/lib/firebase.ts` | PARTIAL | Firebase app initialization present, but relies on env vars |
| `/src/lib/pushNotifications.ts` | INCOMPLETE | Token acquisition works, but token is not persisted |
| `/public/firebase-messaging-sw.js` | PRESENT | Service worker exists with `onBackgroundMessage` handler |

**Code Evidence - pushNotifications.ts:**
```typescript
// Line 35-58: Token is obtained but returned and never stored
export const requestPushPermission = async () => {
  assertFirebaseConfig();
  // ... permission request ...
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });
  return token;  // Token returned but not persisted!
};
```

**Critical Gap:** Token is returned to caller but there is no call to store it in Supabase.

#### Mobile (Expo/React Native)

| File | Status | Evidence |
|------|--------|----------|
| `/mobile/app.json` | MISSING CONFIG | No `expo-notifications` plugin configured |
| `/mobile/package.json` | MISSING | `expo-notifications` not in dependencies |
| `/mobile/app/_layout.tsx` | NO SETUP | No notification initialization or listeners |

**Code Evidence - mobile/app.json:**
```json
{
  "expo": {
    "plugins": [
      "expo-router",
      ["expo-splash-screen", {...}]
    ]
    // NO expo-notifications plugin!
  }
}
```

**Critical Gap:** Mobile app has no notification infrastructure.

### 2. Notification Registration Flow

#### Current Flow (Web Only)

```
User clicks "Enable Notifications" in MyProfileView
    |
    v
requestPushPermission() called (MyProfileView.tsx:114)
    |
    v
Firebase getToken() returns FCM token
    |
    v
Token discarded (not stored)
    |
    X  END - No server-side registration
```

**Code Evidence - MyProfileView.tsx:**
```typescript
// Lines 112-119
const handleEnablePush = async () => {
    try {
        await requestPushPermission();  // Token obtained but discarded
        setPushStatus('ENABLED');        // Only UI state updated
        showToast('Bildirimler acildi.');
    } catch (error) {
        setPushStatus('ERROR');
        showToast('Bildirim izni alinmadi.');
    }
};
```

#### Required Flow (Not Implemented)

```
1. User grants permission
2. FCM/APNs token obtained
3. Token sent to Supabase push_tokens table  <- MISSING
4. Token associated with user profile        <- MISSING
5. Backend uses token to send notifications  <- MISSING
```

### 3. Notification Payload Structure

#### Service Worker Handler (Web)

**File:** `/public/firebase-messaging-sw.js`

```javascript
// Lines 25-33
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Vitalis';
    const options = {
        body: payload.notification?.body || 'New notification',
        icon: '/favicon.ico',
    };
    self.registration.showNotification(title, options);
});
```

**Issues Identified:**
1. No `data` payload handling for deep linking
2. No `click_action` or navigation data
3. No notification ID for analytics tracking
4. Generic fallback icon (favicon.ico)

### 4. Deep Linking Implementation

**Status:** NOT IMPLEMENTED

| Platform | Deep Link Support | Evidence |
|----------|------------------|----------|
| Web | NO | Service worker shows notification but no click handler |
| iOS | NO | No APNs configuration in app.json |
| Android | NO | No notification channels configured |

**Required Implementation:**
```javascript
// Service worker needs notificationclick handler:
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const deepLink = event.notification.data?.deepLink;
    event.waitUntil(clients.openWindow(deepLink || '/'));
});
```

### 5. Notification Preferences Handling

#### Type Definitions (Exist)

**File:** `/types.ts` (Lines 166-179)
```typescript
export type NotificationSound = 'Vitalis' | 'Chime' | 'Pulse' | 'Soft';

export interface NotificationSettings {
  newMatches: boolean;
  messages: boolean;
  likes: boolean;
  stories: boolean;
  superLikes: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g., "23:00"
  quietHoursEnd: string;   // e.g., "07:00"
  onlyMatches: boolean;
  sound: NotificationSound;
  vibration: boolean;
}
```

#### Mock Data (Development Only)

**File:** `/constants.ts` (Lines 566-577)
```typescript
notificationSettings: {
    newMatches: true,
    messages: true,
    likes: true,
    stories: false,
    superLikes: true,
    quietHoursEnabled: false,
    quietHoursStart: "23:00",
    quietHoursEnd: "07:00",
    onlyMatches: false,
    sound: 'Vitalis',
    vibration: true
}
```

**Critical Gap:** These settings exist in mock data but:
- No database table to persist settings
- No API to update settings
- No server-side enforcement of preferences
- Quiet hours not checked before sending

### 6. Quiet Hours Implementation

**Status:** NOT IMPLEMENTED

**Required Logic (Missing):**
```typescript
function shouldSendNotification(userId: string, settings: NotificationSettings): boolean {
    if (!settings.quietHoursEnabled) return true;

    const now = new Date();
    const currentTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check if current time falls within quiet hours
    return !isTimeInRange(currentTime, settings.quietHoursStart, settings.quietHoursEnd);
}
```

### 7. iOS Notification Permissions

**Status:** NOT CONFIGURED

**Required app.json additions:**
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#D4AF37"
      }]
    ]
  }
}
```

### 8. Android Notification Channels

**Status:** NOT CONFIGURED

**Required Implementation:**
```typescript
import * as Notifications from 'expo-notifications';

Notifications.setNotificationChannelAsync('matches', {
    name: 'Matches',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'vitalis_match.wav',
});

Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'vitalis_message.wav',
});

Notifications.setNotificationChannelAsync('likes', {
    name: 'Likes',
    importance: Notifications.AndroidImportance.DEFAULT,
});
```

---

## Database Schema Gaps

### Current Schema

**File:** `/supabase/migrations/20260209_init.sql`

The `notifications` table exists (Lines 218-232) but is for **in-app notifications only**, not push:

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    sender_id UUID REFERENCES profiles(id),
    match_id UUID REFERENCES matches(id),
    message_id UUID REFERENCES messages(id),
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Missing Tables

**Required: `push_tokens` table**
```sql
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('WEB', 'IOS', 'ANDROID')),
    device_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_token UNIQUE (token)
);

CREATE INDEX idx_push_tokens_profile ON push_tokens(profile_id) WHERE is_active = TRUE;
```

**Required: `notification_preferences` table**
```sql
CREATE TABLE IF NOT EXISTS notification_preferences (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    new_matches BOOLEAN DEFAULT TRUE,
    messages BOOLEAN DEFAULT TRUE,
    likes BOOLEAN DEFAULT TRUE,
    stories BOOLEAN DEFAULT TRUE,
    super_likes BOOLEAN DEFAULT TRUE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '23:00',
    quiet_hours_end TIME DEFAULT '07:00',
    only_matches BOOLEAN DEFAULT FALSE,
    sound VARCHAR(20) DEFAULT 'Vitalis',
    vibration BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Server-Side Sending Infrastructure

### Current State: NON-EXISTENT

**Missing Components:**

1. **Edge Function for sending notifications**
   - No `/supabase/functions/send-notification/index.ts`

2. **Firebase Admin SDK setup**
   - No `firebase-admin` in any dependencies

3. **Notification triggers**
   - No database triggers for match/message/like events

4. **APNs credentials**
   - No iOS push certificate configuration

### Required Edge Function

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as admin from 'npm:firebase-admin';

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: Deno.env.get('FIREBASE_PROJECT_ID'),
        privateKey: Deno.env.get('FIREBASE_PRIVATE_KEY'),
        clientEmail: Deno.env.get('FIREBASE_CLIENT_EMAIL'),
    }),
});

serve(async (req) => {
    const { recipientId, title, body, data } = await req.json();

    // Get user's push tokens
    const supabase = createClient(...);
    const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('profile_id', recipientId)
        .eq('is_active', true);

    // Check notification preferences & quiet hours
    const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('profile_id', recipientId)
        .single();

    if (!shouldSendNotification(prefs)) {
        return new Response(JSON.stringify({ skipped: 'quiet_hours' }));
    }

    // Send via FCM
    const messages = tokens.map(t => ({
        token: t.token,
        notification: { title, body },
        data,
    }));

    const response = await admin.messaging().sendEach(messages);
    return new Response(JSON.stringify(response));
});
```

---

## SLO Impact Assessment

### SLO-06: Push Delivery >= 99%

| Metric | Current State | Required State | Gap |
|--------|--------------|----------------|-----|
| Token Collection | Partial (web only, not persisted) | All platforms, stored in DB | CRITICAL |
| Server-side Sending | None | Edge Function with FCM/APNs | CRITICAL |
| Delivery Tracking | None | Analytics per notification | HIGH |
| Retry Logic | None | Exponential backoff | MEDIUM |
| Token Refresh | None | Automatic on app launch | HIGH |
| Invalid Token Handling | None | Remove stale tokens | MEDIUM |

### Estimated Delivery Rate

| Scenario | Rate |
|----------|------|
| Current Implementation | 0% (cannot send) |
| With Token Persistence | 0% (no sending infra) |
| With Edge Function | ~70% (no retry/preferences) |
| With Full Implementation | 95-99% |

---

## Remediation Priority Matrix

### P0 - Launch Blockers (This Week)

| Task | Effort | Impact |
|------|--------|--------|
| Create `push_tokens` table migration | 2h | Critical |
| Store FCM token on web permission grant | 2h | Critical |
| Create send-notification Edge Function | 4h | Critical |
| Wire notification triggers (match, message, like) | 4h | Critical |

### P1 - Critical Improvements (Next Sprint)

| Task | Effort | Impact |
|------|--------|--------|
| Add `expo-notifications` to mobile app | 4h | High |
| Implement APNs certificate setup | 2h | High |
| Add Android notification channels | 2h | High |
| Deep linking from notifications | 4h | High |
| Notification preferences persistence | 4h | High |

### P2 - Optimization (Backlog)

| Task | Effort | Impact |
|------|--------|--------|
| Quiet hours enforcement | 3h | Medium |
| Delivery analytics dashboard | 6h | Medium |
| Token refresh on app launch | 2h | Medium |
| Retry logic for failed sends | 4h | Medium |
| Sound/vibration customization | 3h | Low |

---

## Files Audited

| File Path | Lines | Status |
|-----------|-------|--------|
| `/src/lib/pushNotifications.ts` | 71 | INCOMPLETE |
| `/src/lib/firebase.ts` | 24 | OK |
| `/public/firebase-messaging-sw.js` | 35 | INCOMPLETE |
| `/stores/notificationStore.ts` | 24 | Mock Only |
| `/mobile/app.json` | 51 | MISSING CONFIG |
| `/mobile/package.json` | 48 | MISSING DEPS |
| `/types.ts` (NotificationSettings) | ~15 | Types Only |
| `/constants.ts` (mock settings) | ~20 | Mock Only |
| `/supabase/migrations/20260209_init.sql` | 283 | Missing tables |

---

## Conclusion

The Vitalis push notification system requires significant development to meet the 99% delivery SLO. The core issues are:

1. **Architectural Gap:** No server-side notification infrastructure
2. **Mobile Gap:** Expo app completely lacks notification support
3. **Persistence Gap:** Tokens collected but not stored
4. **Preference Gap:** Settings defined but not enforced

**Recommendation:** Treat push notifications as a P0 launch blocker. The current implementation provides a false sense of progress (UI shows "notifications enabled") but no notifications can actually be delivered.

---

*Report generated by Agent 8: Push Notification Specialist*
*Vitalis Elite Medical Dating - Production Readiness Audit*
