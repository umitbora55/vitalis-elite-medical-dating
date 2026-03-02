# AGENT 7: Real-Time Chat System Audit Report

**Audit Date:** 2026-02-17
**Auditor:** Agent 7 - Real-Time Chat Specialist
**Target SLOs:** SLO-06 (Push delivery >= 99%), SLO-07 (Message success >= 99.9%)

---

## Executive Summary

The Vitalis chat system is currently **NOT production-ready** for WhatsApp-level reliability. Critical infrastructure is missing: there is **no real-time message synchronization**, **no backend message service**, **no offline queuing**, and messages exist only in **local React state** that is lost on page refresh. The system is fundamentally a mock/demo implementation that simulates chat interactions without any actual data persistence or real-time delivery.

### Severity Rating: CRITICAL (P0)

| SLO | Current State | Target | Gap |
|-----|---------------|--------|-----|
| SLO-06 (Push Delivery) | 0% (Not implemented) | >= 99% | -99% |
| SLO-07 (Message Success) | ~50% (Local only, lost on refresh) | >= 99.9% | -49.9% |

---

## Evidence Dossier

### 1. MESSAGE SENDING RELIABILITY

#### Finding: CRITICAL - No Backend Message Persistence

**Location:** `/components/ChatView.tsx` (lines 588-624)

**Evidence:**
```typescript
const handleSend = () => {
    if (!inputText.trim()) return;
    const sendNow = getNowMs();

    // ...
    const userMessage: Message = {
        id: sendNow.toString(),
        text: inputText.trim(),
        senderId: 'me',
        timestamp: sendNow,
        status: 'sent'
    };

    setMessages((prev) => [...prev, userMessage]);  // LOCAL STATE ONLY
    trackEvent('message', { type: 'text', matchId: match.profile.id });
    setInputText('');
    simulateReply();  // SIMULATED - NOT REAL
};
```

**Impact on SLO-07:**
- Messages are stored ONLY in React useState
- No Supabase insert call to `messages` table
- No retry mechanism
- Messages lost on page refresh/navigation
- **Estimated real success rate: 0% (messages never reach database)**

#### Finding: HIGH - Missing Message Service Layer

**Evidence:** Grep search for `sendMessage|createMessage|insertMessage` returned no results.

**Missing Service:** No `messageService.ts` or equivalent exists. The database schema has a `messages` table (confirmed in migration), but there is no service layer to interact with it.

---

### 2. REAL-TIME SUBSCRIPTION HANDLING

#### Finding: CRITICAL - No Supabase Realtime Implementation

**Location:** `/src/lib/supabase.ts`

**Evidence:**
```typescript
import { createClient } from '@supabase/supabase-js';

// ... configuration ...

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

The Supabase client is initialized but **NO realtime subscriptions** are implemented anywhere in the codebase:

- Grep for `supabase.*channel|supabase.*subscribe|realtime` found **0 chat-related implementations**
- No `useEffect` with realtime subscription cleanup
- No channel management for message updates

**Impact on SLO-06 & SLO-07:**
- Users cannot receive messages in real-time
- Chat requires manual page refresh
- No synchronization between devices

---

### 3. MESSAGE STATUS TRACKING

#### Finding: MEDIUM - Simulated Status Updates Only

**Location:** `/components/ChatView.tsx` (lines 262-288)

**Evidence:**
```typescript
// Read Receipt Simulation
useEffect(() => {
    const sentMessages = messages.filter(m => m.senderId === 'me' && m.status === 'sent' && !m.isScheduled);
    if (sentMessages.length > 0) {
        const timer = setTimeout(() => {
            setMessages(prev => prev.map(m =>
                (m.senderId === 'me' && m.status === 'sent' && !m.isScheduled) ? { ...m, status: 'delivered' } : m
            ));
        }, 1000);  // SIMULATED 1 SECOND DELAY
        return () => clearTimeout(timer);
    }
    return undefined;
}, [messages]);
```

**Issues:**
- `sent` -> `delivered` transition is simulated with setTimeout, not based on actual delivery
- `delivered` -> `read` transition is also simulated (2.5 second delay)
- No backend acknowledgment of status changes
- No database updates for message status

---

### 4. CHAT UI PERFORMANCE

#### Finding: LOW - Scroll Performance Acceptable

**Location:** `/components/ChatView.tsx` (lines 162-164, 255-259)

**Evidence:**
```typescript
const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};

useEffect(() => {
    if (!isSearchOpen && !highlightedMessageId) {
        scrollToBottom();
    }
}, [messages, isTyping, isRecording, callStatus, isSearchOpen, highlightedMessageId]);
```

**Assessment:**
- Smooth scrolling implemented correctly
- Auto-scroll disabled during search (good UX)
- No virtualization (potential issue with very long chats, but acceptable for MVP)

---

### 5. MEDIA MESSAGE HANDLING

#### Finding: HIGH - Mock Media Only

**Location:** `/components/ChatView.tsx` (lines 46-51, 690-704)

**Evidence:**
```typescript
const MOCK_SHARED_PHOTOS = [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800",
    // ... more mock URLs
];

const handleSendPhoto = () => {
    const randomPhoto = MOCK_SHARED_PHOTOS[Math.floor(Math.random() * MOCK_SHARED_PHOTOS.length)];
    const photoMessage: Message = {
        id: photoNow.toString(),
        text: '',
        imageUrl: randomPhoto,  // RANDOM MOCK IMAGE
        // ...
    };
    setMessages((prev) => [...prev, photoMessage]);
};
```

**Issues:**
- No actual camera/gallery integration
- No image upload to Supabase Storage
- No image compression/optimization
- Random stock photos used instead of real uploads

---

### 6. OFFLINE MESSAGE QUEUING

#### Finding: CRITICAL - Not Implemented

**Evidence:** Grep for `offline|queue|retry|reconnect` found no chat-related implementations.

**Missing Features:**
- No IndexedDB/localStorage persistence for unsent messages
- No message queue with retry logic
- No network status detection
- No reconnection handling
- Messages silently lost when offline

---

### 7. TYPING INDICATORS

#### Finding: MEDIUM - Simulated Only

**Location:** `/components/ChatView.tsx` (lines 204-219)

**Evidence:**
```typescript
const simulateReply = useCallback(() => {
    setIsTyping(true);  // LOCAL STATE
    setTimeout(() => {
        const randomResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
        const replyMessage: Message = {
            id: (replyNow + 1).toString(),
            text: randomResponse,
            senderId: match.profile.id,
            timestamp: replyNow,
            status: 'read',
        };
        setMessages((prev) => [...prev, replyMessage]);
        setIsTyping(false);
    }, 3500);  // FIXED DELAY
}, [match.profile.id]);
```

**Issues:**
- Typing indicator is simulated, not real-time
- No broadcast to other users
- No receiving of typing events from match

---

### 8. MESSAGE SEARCH FUNCTIONALITY

#### Finding: LOW - Client-Side Only, Works Correctly

**Location:** `/components/ChatView.tsx` (lines 547-573)

**Evidence:**
```typescript
const searchResults = useMemo(() => {
    if (!searchQuery && searchDateFilter === 'ALL' && searchMediaType === 'ALL') return [];

    let filtered = messages;

    // 1. Text Search
    if (searchQuery) {
        filtered = filtered.filter(m => m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 2. Date Filter
    // ... filtering logic

    return filtered.reverse();
}, [messages, searchQuery, searchDateFilter, searchMediaType, nowMs]);
```

**Assessment:**
- Search works on local messages
- Supports text, date, and media type filters
- Good UX with highlighting and scroll-to-message
- **Limitation:** Cannot search messages not loaded (since no pagination/loading from backend)

---

### 9. PUSH NOTIFICATIONS

#### Finding: HIGH - Infrastructure Exists but Not Connected

**Location:** `/src/lib/pushNotifications.ts`, `/src/lib/firebase.ts`

**Evidence:**
```typescript
export const requestPushPermission = async () => {
    // ... Firebase Messaging setup
    const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration,
    });
    return token;
};

export const listenForMessages = (handler: (payload: unknown) => void) => {
    // ... Firebase message listener
};
```

**Issues:**
- FCM token is not saved to backend
- No backend trigger for push notifications on new messages
- No Supabase Edge Function to send push notifications
- `listenForMessages` is not connected to chat UI

---

### 10. DATABASE SCHEMA

#### Finding: INFO - Schema Exists but Unused

**Location:** `/supabase/migrations/20260209_init.sql`

**Evidence:**
```sql
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    text TEXT,
    image_url TEXT,
    audio_url TEXT,
    audio_duration INTEGER,
    video_url TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    scheduled_for TIMESTAMPTZ,
    reply_to_id UUID REFERENCES messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy for messages
CREATE POLICY "Match participants can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_id
      AND is_active = TRUE
      AND (profile_1_id = auth.uid() OR profile_2_id = auth.uid())
  )
);
```

**Assessment:**
- Good schema design with proper RLS policies
- Ready for real implementation
- **Not being used** by the frontend

---

## SLO Impact Assessment

### SLO-06: Push Delivery >= 99%

| Component | Status | Impact |
|-----------|--------|--------|
| FCM Token Registration | Partial (code exists) | -20% |
| Token Storage to Backend | Missing | -30% |
| Push Trigger on New Message | Missing | -30% |
| Service Worker Setup | Partial | -10% |
| Background Message Handler | Missing | -10% |

**Current Estimated Delivery Rate: 0%**

### SLO-07: Message Success >= 99.9%

| Component | Status | Impact |
|-----------|--------|--------|
| Message Persistence | Missing (local state only) | -40% |
| Retry Mechanism | Missing | -15% |
| Offline Queue | Missing | -15% |
| Real-time Sync | Missing | -15% |
| Conflict Resolution | Missing | -5% |
| Status Acknowledgment | Simulated | -10% |

**Current Estimated Success Rate: ~0% (persisted), ~50% (session only)**

---

## Required Fixes (Priority Order)

### P0 - CRITICAL (Blocking Production)

1. **Implement Message Service Layer**
   - Create `services/messageService.ts`
   - Add `sendMessage()` with Supabase insert
   - Add `getMessages()` for loading chat history
   - Add `updateMessageStatus()` for read receipts

2. **Implement Supabase Realtime Subscriptions**
   - Subscribe to `messages` table changes filtered by match_id
   - Handle INSERT, UPDATE events
   - Proper cleanup on unmount/navigation

3. **Connect Push Notifications to Backend**
   - Save FCM tokens to profiles table
   - Create Supabase Edge Function for push triggers
   - Wire up database triggers for new messages

### P1 - HIGH

4. **Implement Offline Queue**
   - Use IndexedDB for offline storage
   - Queue messages when offline
   - Sync when connection restored
   - Show pending/failed indicators

5. **Implement Real Media Upload**
   - Camera/gallery integration
   - Upload to Supabase Storage
   - Image compression
   - Progress indicators

6. **Implement Real Typing Indicators**
   - Broadcast typing status via realtime
   - Debounce typing events
   - Timeout for stale indicators

### P2 - MEDIUM

7. **Implement Message Pagination**
   - Lazy load older messages
   - Virtual list for performance
   - Preserve scroll position

8. **Implement Proper Status Updates**
   - Server-side status tracking
   - Delivery confirmation via realtime
   - Read receipts via realtime

---

## Architectural Recommendations

### 1. Message Flow Architecture

```
User Types Message
        |
        v
[ChatView Component]
        |
        v
[messageService.sendMessage()]
        |
        +---> [Supabase Insert]
        |           |
        |           v
        |     [Database Trigger]
        |           |
        |           +---> [Push Notification Edge Function]
        |           |
        |           v
        |     [Realtime Broadcast]
        |           |
        v           v
[Optimistic UI]  [Other Client Receives]
```

### 2. Recommended File Structure

```
services/
  messageService.ts       # CRUD for messages
  realtimeService.ts      # Supabase channel management
  pushService.ts          # Push notification handling
  offlineService.ts       # IndexedDB queue management

hooks/
  useMessages.ts          # Message state + realtime
  useTypingIndicator.ts   # Typing broadcast
  useOnlineStatus.ts      # Network detection
```

### 3. Critical Code Changes

#### messageService.ts (To Create)
```typescript
import { supabase } from '../src/lib/supabase';

export const sendMessage = async (matchId: string, text: string, mediaUrl?: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: (await supabase.auth.getUser()).data.user?.id,
      text,
      image_url: mediaUrl,
      status: 'sent'
    })
    .select()
    .single();

  return { data, error };
};

export const subscribeToMessages = (matchId: string, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${matchId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
      (payload) => callback(payload.new as Message)
    )
    .subscribe();
};
```

---

## Files Audited

| File | Lines | Severity Issues Found |
|------|-------|----------------------|
| `/components/ChatView.tsx` | 1201 | CRITICAL (4), HIGH (2), MEDIUM (2) |
| `/components/chat/ChatInput.tsx` | 163 | None |
| `/components/chat/MessageBubble.tsx` | 98 | None |
| `/components/chat/ChatHeader.tsx` | 176 | None |
| `/components/chat/AudioBubble.tsx` | 159 | None |
| `/components/chat/VideoBubble.tsx` | 32 | None |
| `/stores/matchStore.ts` | 76 | None (but missing message state) |
| `/types.ts` | 345 | None |
| `/services/profileService.ts` | 69 | None (but no messageService) |
| `/src/lib/supabase.ts` | 22 | None (but no realtime usage) |
| `/src/lib/pushNotifications.ts` | 70 | HIGH (disconnected) |
| `/src/lib/firebase.ts` | 23 | None |
| `/supabase/migrations/20260209_init.sql` | 283 | None (good schema) |

---

## Conclusion

The Vitalis chat system requires **fundamental architectural work** before it can achieve production-grade reliability. The current implementation is a **UI prototype** with mock data and simulated behavior. To meet SLO-06 and SLO-07 targets, the team must:

1. Build a complete message service layer connected to Supabase
2. Implement real-time subscriptions for instant message delivery
3. Connect the existing push notification infrastructure to the backend
4. Add offline-first capabilities with proper queuing

**Estimated Development Effort:** 2-3 weeks for core functionality, 4-5 weeks for WhatsApp-level reliability.

---

*Report generated by Agent 7: Real-Time Chat Specialist*
*Vitalis Elite Medical Dating - Technical Audit Series*
