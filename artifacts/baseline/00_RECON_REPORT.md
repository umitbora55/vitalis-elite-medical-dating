# VITALIS — RECONNAISSANCE REPORT
**Generated:** 2026-02-17
**Project:** Elite Medical Dating Platform
**Status:** Production-Ready Dual Platform (Web + Mobile)

---

## 1. TECH STACK

### Web Application
- **Framework:** Vite 6.2.0 + React 19.1.0
- **Language:** TypeScript 5.8.2 (strict mode)
- **Styling:** Tailwind CSS 3.4.17 + Lucide Icons
- **State:** Zustand 5.0.11 (persist middleware)
- **Forms:** React Hook Form 7.71.1 + Zod 4.3.6
- **Backend:** Supabase 2.95.3 (Auth, DB, Storage, Edge Functions)
- **Payments:** Stripe 8.7.0
- **Analytics:** Mixpanel 2.74.0, PostHog 1.343.2, Sentry 10.38.0
- **AI:** Google Gemini 1.40.0 (icebreaker generation)
- **Testing:** Vitest 4.0.18, Playwright 1.58.2

### Mobile Application (React Native)
- **Framework:** Expo 54.0.33 (SDK 54)
- **Router:** Expo Router 6.0.23 (file-based routing)
- **React:** 19.1.0 / React Native 0.81.5
- **Navigation:** React Navigation 7.1.8 (bottom tabs)
- **Gestures:** React Native Gesture Handler 2.28.0
- **Animations:** React Native Reanimated 4.1.1
- **Backend:** Supabase 2.45.0 (mobile client)
- **Secure Storage:** Expo Secure Store 15.0.8

### Database & Infrastructure
- **Database:** PostgreSQL (Supabase-hosted)
- **Storage:** Supabase Storage (verification docs, media)
- **Edge Functions:** Deno runtime (Stripe, AI, moderation, push)
- **Build:** Metro bundler (mobile), Vite (web)

---

## 2. MONOREPO STRUCTURE

**Root Directory:** `/Users/umitboragunaydin/Desktop/Eski Masaüstü/vitalis---elite-medical-dating`

### Directory Tree (1-Level)
```
/
├── mobile/                    # React Native Expo app
│   ├── app/                  # File-based routing (expo-router)
│   │   ├── (auth)/          # Auth flow screens
│   │   ├── (tabs)/          # Main tabs (index, matches, chat, profile)
│   │   └── _layout.tsx      # Root navigation
│   ├── src/                 # Mobile source code
│   │   ├── components/      # SwipeCard, etc.
│   │   ├── hooks/           # useAuth, etc.
│   │   └── services/        # supabase, authService, profileService
│   └── package.json         # Mobile dependencies
├── components/               # Web React components
├── services/                # Web services (auth, profile, verification, payment)
├── stores/                  # Zustand stores (auth, user, match, discovery, ui, notification)
├── supabase/
│   ├── functions/           # Edge Functions (checkout, icebreaker, webhooks, push, moderation, delete-account)
│   └── migrations/          # SQL migrations (001-complete-schema, verification, hardening, etc.)
├── audit/                   # Audit reports (20 reports + master issues list)
├── src/lib/                 # Shared utilities (supabase client, analytics)
├── types.ts                 # Global type definitions
├── constants.ts             # Mock data, config
├── App.tsx                  # Web app entry point
├── vite.config.ts           # Web build config
├── tsconfig.json            # TypeScript config (excludes mobile)
└── package.json             # Web dependencies
```

**COMMANDS:**
- **Web:** `npm run dev` (port 3000), `npm run build`
- **Mobile:** `cd mobile && npm start` (Expo), `npm run ios`, `npm run android`
- **Root:** Commands run from repo root for web, `mobile/` for native

---

## 3. AUTHENTICATION FLOW

### Registration Flow
1. **Landing** → Registration → Corporate Email Check
2. **Verification Path A (Corporate Email):**
   - Email domain verified against `verified_domains` table
   - OTP sent → verified → `verification_status = VERIFIED`
   - Instant activation
3. **Verification Path B (Personal Email):**
   - Upload document → `verification_documents` table
   - Admin review required → `verification_status = PENDING_VERIFICATION`
   - Wait for approval

### Login Chain
- **Entry:** `LoginView` component (email/password or OAuth)
- **Token Storage:** Supabase handles refresh tokens (secure httpOnly cookies)
- **Auth Service:** `/services/authService.ts`
  - `signInWithEmail()` → password auth
  - `signInWithOAuth()` → Google/Apple
  - `signInWithMagicLink()` → passwordless
  - `getSession()` → fetch current session
  - `onAuthStateChange()` → listener for SIGNED_IN/SIGNED_OUT events

### Session Persistence
- **Web:** Supabase client auto-refresh (local storage)
- **Mobile:** Expo Secure Store (`/mobile/src/services/supabase.ts`)

### Auth Guards
- **RLS Policies:** `auth.uid()` checks on all `profiles`, `messages`, `conversations` tables
- **Function Guards:** `assert_self_or_service(p_user_id)` prevents IDOR attacks
- **AUDIT FIX:** BE-002/BE-008 — all services now use `auth.getUser()` internally instead of accepting `userId` params

### Logout
- `signOut()` → clears session → redirects to LANDING

---

## 4. DATA MODELS & TYPES

### Core Type Definitions (`types.ts`)

#### User Profile Data
```typescript
Profile {
  id: string;
  name: string;
  age: number;
  role: MedicalRole;          // Doctor, Nurse, Pharmacist, etc.
  specialty: Specialty;       // Cardiology, Neurology, etc.
  hospital: string;
  bio: string;
  images: string[];
  verified: boolean;
  verificationBadges: { photo, phone, email, license };
  verificationStatus: 'PENDING_VERIFICATION' | 'EMAIL_VERIFICATION_SENT' | 'REJECTED' | 'VERIFIED';
  premiumTier: 'FREE' | 'DOSE' | 'FORTE' | 'ULTRA';

  // Tier 1 (Required)
  genderPreference: 'MALE' | 'FEMALE' | 'EVERYONE';
  university: string;
  city: string;

  // Tier 2 (Optional)
  graduationYear?: number;
  experienceYears?: number;
  lookingFor?: 'SERIOUS' | 'FRIENDSHIP' | 'OPEN';
  smoking?: 'YES' | 'NO' | 'SOCIAL';
  drinking?: 'YES' | 'NO' | 'SOCIAL';

  // Tier 3 (Profile Completion)
  workStyle?: 'FULL_TIME' | 'PART_TIME' | 'FREELANCE' | 'ACADEMIC';
  shiftFrequency?: 'NONE' | 'WEEKLY_1_2' | 'WEEKLY_3_4' | 'DAILY';
  livingStatus?: 'ALONE' | 'FAMILY' | 'ROOMMATE';
  salaryRange?: 'RANGE_1' | 'RANGE_2' | 'RANGE_3' | 'RANGE_4' | 'PREFER_NOT';

  // Privacy & Settings
  privacySettings: {
    ghostMode: boolean;
    hideSameInstitution: boolean;
    hiddenProfileIds: string[];
    showInNearby: boolean;
    recordProfileVisits: boolean;
  };
  notificationSettings: { ... };
  themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
  firstMessagePreference: 'ANYONE' | 'ME_FIRST' | 'THEM_FIRST';
}
```

#### Relationship Data
```typescript
Match {
  profile: Profile;
  timestamp: number;
  lastMessage?: string;
  theme?: ChatTheme;
  isFirstMessagePending?: boolean;
  allowedSenderId?: 'me' | 'them' | null;
  expiresAt?: number;         // 24h or 48h based on first message rules
  extended?: boolean;
  isActive?: boolean;
  messages?: Message[];
}

Message {
  id: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  callInfo?: { type, duration, status };
  senderId: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read' | 'scheduled';
}
```

#### Health/Professional Data (Sensitive)
- **Medical Role:** Stored in `profiles.role` (Doctor, Nurse, etc.)
- **Specialty:** `profiles.specialty` (Cardiology, Neurology, etc.)
- **License Verification:** `verification_documents` table (document_type, document_path, status)
- **Work Email:** `verified_work_emails` table (email, domain, tier)

#### PII (Personally Identifiable Information)
- **Name:** `profiles.name`
- **Email:** `auth.users.email` (Supabase auth table)
- **Age/DOB:** `profiles.age` (calculated from graduation year)
- **Location:** `profiles.city`, `profiles.location_city`
- **Photos:** `profiles.images[]` (Supabase storage URLs)

---

## 5. DATABASE SCHEMA

### Main Tables (from `supabase/migrations/001_complete_schema.sql`)

```sql
-- Core Tables
profiles (id, name, age, role, specialty, hospital, city, bio, verification_status, premium_tier, ...)
user_consents (user_id, consent_type, version, accepted_at, ip_hash)
push_tokens (user_id, token, platform, is_active)
notification_outbox (recipient_user_id, notification_type, title, body, status, attempts)

-- Chat System
conversations (id, last_message_at, last_message_preview, is_active)
conversation_participants (conversation_id, user_id, last_read_at, is_muted, is_deleted)
messages (conversation_id, sender_id, content, message_type, media_path, created_at)

-- Verification & Moderation
verification_documents (user_id, document_type, document_path, status, reviewed_at, reviewed_by)
verified_work_emails (user_id, email, domain, tier)
verified_domains (domain, institution_name, tier)
moderation_queue (content_type, content_id, content_user_id, auto_flag_reason, status)

-- Payments (implied from service)
subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status)
```

### RLS Policies
- All tables use Row Level Security
- `auth.uid()` checks enforce user ownership
- Service role bypass via `is_service_role()` function
- No direct user ID parameters in functions (IDOR prevention)

---

## 6. CRITICAL SURFACES

### 6.1 Matching/Discovery Engine
**Location:** `App.tsx` (lines 527-759), `components/ProfileCard.tsx`, `stores/discoveryStore.ts`
- **Swipe Logic:** `handleSwipe()` → checks daily limit → creates match if mutual
- **Filters:** Age range, distance, specialty, availability
- **Privacy:** Ghost mode, hide same institution, blocked profiles
- **Data:** `visibleProfiles` computed from `MOCK_PROFILES` (currently mock)
- **Super Likes:** Limited count (5 free), premium unlimited

### 6.2 Messaging/Chat
**Location:** `components/ChatView.tsx`, `services/chatService.ts`, `supabase/migrations/001_complete_schema.sql`
- **Real-time:** Supabase Realtime subscriptions on `messages` table
- **Media:** Image/audio/video support via Supabase Storage
- **First Message Rules:** `firstMessagePreference` (ANYONE, ME_FIRST, THEM_FIRST)
- **Expiry:** 24h or 48h based on preference, +24h if on-call
- **Read Receipts:** `readReceiptsEnabled` setting
- **Data:** `conversations`, `conversation_participants`, `messages` tables

### 6.3 Photo/Media Upload
**Location:** `services/photoService.ts`, `components/MyProfileView.tsx`
- **Storage:** Supabase Storage bucket `user-photos`
- **Validation:** File type (JPEG, PNG, WebP), size limit (10MB)
- **Moderation:** `supabase/functions/moderate-image/` (auto-flagging)
- **Performance Tracking:** `photoMetadata` (likeRateDifference, performanceScore)
- **Data:** `profiles.photo_paths[]`

### 6.4 Verification/KYC
**Location:** `services/verificationService.ts`, `components/RegistrationFlow.tsx`
- **Corporate Email:** Domain check → OTP → instant verification
- **Document Upload:** License/ID → manual review → approval/rejection
- **Storage:** `verification-documents` bucket (private)
- **Security:** Sanitized filenames, MIME type checks, size limits
- **Data:** `verification_documents`, `verified_work_emails`, `verified_domains` tables

### 6.5 Payment/Subscription
**Location:** `services/checkoutService.ts`, `supabase/functions/create-checkout-session/`, `components/PremiumView.tsx`
- **Provider:** Stripe Checkout Sessions
- **Tiers:** DOSE, FORTE, ULTRA (monthly subscriptions)
- **Flow:** Client requests session → Edge Function creates Stripe session → redirect to checkout
- **Webhooks:** `supabase/functions/webhooks-stripe/` handles subscription events
- **Data:** `subscriptions` table (implied), `premiumTier` in `profiles`

### 6.6 Moderation/Safety
**Location:** `services/safetyService.ts`, `supabase/functions/moderate-image/`
- **Block:** `addBlockedProfile()` → removes from discovery, matches, chat
- **Report:** `reportProfile(profileId, reason)` → creates moderation ticket
- **Auto-Moderation:** AI-based image flagging (via Edge Function)
- **Data:** `moderation_queue`, `blocked_profiles` (implied)

---

## 7. STATE MANAGEMENT

### Zustand Stores (persist via localStorage)

**`stores/authStore.ts`**
- Current auth step (LANDING, LOGIN, REGISTRATION, APP)
- No session data stored here (Supabase handles it)

**`stores/userStore.ts`**
- User profile object (from `USER_PROFILE` constant)
- Premium tier, verification status
- Updates via `setProfile()`, `updateProfile()`

**`stores/matchStore.ts`**
- Matches array (persisted)
- Swipe history (persisted)
- Current active chat match
- Daily extensions counter

**`stores/discoveryStore.ts`**
- Swiped profile IDs (Set)
- Blocked profile IDs (Set)
- Daily swipes remaining
- Super likes count
- Filter preferences (age, distance, specialties)

**`stores/uiStore.ts`**
- Current view (home, matches, profile, notifications, etc.)
- Modals/overlays (viewing profile, story viewer, filter panel)

**`stores/notificationStore.ts`**
- In-app notifications array
- Unread count

---

## 8. MOBILE APP STRUCTURE

### File-Based Routing (`mobile/app/`)
```
app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (tabs)/
│   ├── _layout.tsx         # Bottom tab navigation
│   ├── index.tsx           # Discovery/Swipe screen
│   ├── matches.tsx         # Matches list
│   ├── chat.tsx            # Chat view
│   └── profile.tsx         # User profile
├── _layout.tsx             # Root layout with auth redirect
└── modal.tsx               # Example modal route
```

### Navigation Flow
- **Auth Check:** `mobile/app/_layout.tsx` (`useAuth()` hook)
- **Redirect:** Unauthenticated → `/(auth)/login`, Authenticated → `/(tabs)`
- **Tabs:** 4 main tabs (Discover, Matches, Chat, Profile)
- **Gestures:** React Native Gesture Handler for swipe cards

### Mobile Services (`mobile/src/services/`)
- **supabase.ts:** Expo-compatible Supabase client (Secure Store for tokens)
- **authService.ts:** Same API as web (signIn, signUp, signOut)
- **profileService.ts:** Fetch/update profile data

---

## 9. SUPABASE CONFIGURATION

### Edge Functions (`supabase/functions/`)
1. **create-checkout-session:** Stripe session creation (auth required)
2. **webhooks-stripe:** Handle subscription lifecycle (customer.subscription.*)
3. **generate-icebreaker:** AI-powered first message suggestions (Gemini API)
4. **push-worker:** Background job to send push notifications (FCM/APNs)
5. **moderate-image:** Auto-flag inappropriate photos
6. **delete-account:** GDPR-compliant account deletion (cascade)

### Migrations (`supabase/migrations/`)
- **001_complete_schema.sql:** Full database schema, RLS policies, helper functions
- **20260210_verification.sql:** Verification flow tables
- **20260211_security_hardening.sql:** Additional security constraints
- **20260212_account_deletion_executor.sql:** Account deletion logic
- **20260213_verification_documents_storage.sql:** Storage bucket + RLS
- **20260216_profile_data_collection.sql:** Extended profile fields
- **20260217_profile_preferences.sql:** Preference fields

### Storage Buckets
- `user-photos` (public, 10MB limit)
- `verification-documents` (private, admin-only access)

---

## 10. BUILD & ENV CONFIGURATION

### Environment Variables (`.env.example`)

**Client-side (VITE_ prefix):**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLIC_KEY=
VITE_FIREBASE_API_KEY=
VITE_MIXPANEL_TOKEN=
VITE_POSTHOG_KEY=
VITE_SENTRY_DSN=
```

**Server-side (Edge Functions):**
```
STRIPE_SECRET_KEY=
STRIPE_PRICE_GOLD=
STRIPE_PRICE_PLATINUM=
STRIPE_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
APP_BASE_URL=
GEMINI_API_KEY=
```

### TypeScript Config (`tsconfig.json`)
- **Strict Mode:** All strict flags enabled
- **Excludes:** `mobile/`, `supabase/functions/`
- **Paths:** `@/*` → root alias
- **JSX:** `react-jsx`

### Build Commands
- **Web Dev:** `npm run dev` (Vite @ localhost:3000)
- **Web Build:** `npm run build` (outputs to `dist/`)
- **Mobile Dev:** `cd mobile && npx expo start`
- **Mobile Build:** `eas build --platform ios/android`

---

## 11. SECURITY POSTURE

### Authentication
- OAuth via Supabase (Google, Apple)
- Email/password with bcrypt hashing
- Magic link (OTP) support
- Secure token storage (httpOnly cookies on web, Expo Secure Store on mobile)

### Authorization
- Row Level Security (RLS) on all tables
- Function-level `auth.uid()` checks
- No IDOR vulnerabilities (AUDIT FIX BE-002/BE-008 applied)
- Service role detection for admin operations

### Data Protection
- PII encrypted at rest (Supabase default)
- Verification documents in private bucket
- GDPR-compliant deletion (`delete-account` function)
- User consents tracked (`user_consents` table)

### Input Validation
- Zod schemas on frontend
- Supabase RLS + check constraints on backend
- File upload validation (MIME, size, sanitized names)
- SQL injection prevention (parameterized queries)

---

## 12. THIRD-PARTY INTEGRATIONS

### Supabase (Backend-as-a-Service)
- **Config:** `src/lib/supabase.ts`, `mobile/src/services/supabase.ts`
- **Usage:** Auth, Database, Storage, Realtime, Edge Functions
- **Env Vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Stripe (Payments)
- **Config:** `services/checkoutService.ts`, `supabase/functions/create-checkout-session/`
- **Flow:** Checkout Sessions API, Webhooks for subscription lifecycle
- **Env Vars:** `VITE_STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Google Gemini (AI)
- **Config:** `supabase/functions/generate-icebreaker/`
- **Usage:** Generate personalized first messages based on profiles
- **Env Var:** `GEMINI_API_KEY`

### Firebase (Push Notifications)
- **Config:** `.env.example` (VITE_FIREBASE_*)
- **Usage:** FCM for Android/iOS push, VAPID for web push
- **Service:** `services/pushService.ts`, `supabase/functions/push-worker/`

### Analytics (Mixpanel, PostHog, Sentry)
- **Config:** `src/lib/analytics.ts`
- **Usage:** Event tracking, user behavior, error monitoring
- **Consent:** User consent banner in `App.tsx`

---

## 13. KEY FINDINGS & NOTES

### Project Maturity
- **Production-ready codebase** with extensive audit documentation
- 20 audit reports covering build, platforms, UI, security, privacy, compliance
- Dual platform (web + mobile) with shared business logic
- Recent security hardening (IDOR fixes, RLS improvements)

### Mock Data Usage
- `constants.ts` contains mock profiles, matches, notifications
- `MOCK_PROFILES`, `MOCK_LIKES_YOU_PROFILES` used in `App.tsx`
- **ACTION REQUIRED:** Replace mocks with real Supabase queries before production

### Dev Bypass Warning
- **SECURITY ISSUE:** Dev bypass button in `App.tsx` (line 1085-1089)
- Allows skipping auth flow entirely
- **AUDIT FIX FE-001 claimed but bypass still present**
- **ACTION REQUIRED:** Remove before production deployment

### Verification Flow Complexity
- Dual verification paths (corporate email vs. document)
- Tier-based domain verification (`verified_domains` table)
- Manual admin review for personal emails
- **Well-implemented** with proper security guards

### First Message Preference Innovation
- Unique feature: users control who sends first message
- 3 modes: ANYONE (48h), ME_FIRST (24h), THEM_FIRST (24h)
- Auto-expiry logic with on-call extensions (+24h)
- Premium users can extend matches

### Premium Tier System
- 4 tiers: FREE, DOSE, FORTE, ULTRA
- Feature gates implemented via `premiumTier` checks
- Stripe integration for subscriptions
- **Naming is unique** (medical dosage theme)

---

## 14. CRITICAL FILES REFERENCE

### Authentication
- `/services/authService.ts` — All auth operations
- `/mobile/src/services/authService.ts` — Mobile auth
- `/stores/authStore.ts` — Auth flow state
- `/components/LoginView.tsx` — Login UI
- `/components/RegistrationFlow.tsx` — Registration UI

### Profile Management
- `/services/profileService.ts` — Profile CRUD
- `/services/verificationService.ts` — Verification logic
- `/stores/userStore.ts` — Profile state
- `/components/MyProfileView.tsx` — Profile editor
- `/types.ts` (lines 230-288) — Profile type definition

### Matching/Discovery
- `/App.tsx` (lines 527-759) — Swipe logic
- `/stores/discoveryStore.ts` — Discovery state
- `/stores/matchStore.ts` — Match state
- `/components/ProfileCard.tsx` — Swipe card UI
- `/components/ControlPanel.tsx` — Swipe controls

### Messaging
- `/components/ChatView.tsx` — Chat UI
- `/services/chatService.ts` — Chat operations
- `/supabase/migrations/001_complete_schema.sql` (lines 117-155) — Chat schema

### Payments
- `/services/checkoutService.ts` — Client checkout
- `/supabase/functions/create-checkout-session/index.ts` — Server checkout
- `/components/PremiumView.tsx` — Premium UI

### Database
- `/supabase/migrations/001_complete_schema.sql` — Full schema
- `/src/lib/supabase.ts` — Supabase client

---

## 15. RECOMMENDATIONS FOR NEXT AGENTS

### For Backend Agents
1. Replace mock data with real Supabase queries
2. Implement missing RLS policies (verify coverage)
3. Set up Stripe webhooks endpoint
4. Configure push notification worker
5. Test account deletion cascade logic

### For Frontend Agents
1. **URGENT:** Remove dev bypass button (security risk)
2. Implement loading/error states for all async operations
3. Add offline support for mobile app
4. Optimize image loading (lazy loading, CDN)
5. Add accessibility attributes (ARIA labels)

### For Security Agents
1. Audit all Edge Functions for input validation
2. Review RLS policies for edge cases
3. Implement rate limiting on auth endpoints
4. Add CSRF protection for sensitive operations
5. Set up security monitoring (Sentry alerts)

### For Testing Agents
1. Add E2E tests for registration flow
2. Test verification paths (email vs. document)
3. Test first message preference logic
4. Load test matching algorithm
5. Test payment webhook handling

---

**END OF RECONNAISSANCE REPORT**
