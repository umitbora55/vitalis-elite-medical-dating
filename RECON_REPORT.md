# VITALIS ELITE MEDICAL DATING - RECONNAISSANCE REPORT

**Generated:** 2026-02-15
**Codebase Status:** Main branch (00fee4b)
**Purpose:** Security audit baseline for frontend, backend, security, and privacy auditors

---

## EXECUTIVE SUMMARY

Vitalis is a **dating application for medical professionals** built as a **monorepo-hybrid** with a web frontend and partial mobile foundation. The application handles **highly sensitive PII and health data** including medical licenses, institutional affiliations, and professional verification documents. Current state includes **critical authentication bypasses** and **incomplete security hardening**.

---

## 1. REPOSITORY STRUCTURE

### Monorepo Status: PARTIAL HYBRID
- **Root:** Vite-based React web application (primary)
- **`/mobile`:** Expo React Native shell (minimal - boilerplate only, no integration)
- **`/supabase`:** Database migrations + Edge Functions (Deno)
- **Commands run from:** Project root (web app)

### Directory Layout (1-level depth)

```
/
├── App.tsx                    # Main app (1267 LOC - god component)
├── components/                # UI components (chat, profile, onboarding)
├── services/                  # API wrappers (auth, profile, payment, safety)
├── stores/                    # Zustand state management (auth, user, discovery, match, UI, notification)
├── src/lib/                   # Third-party integrations (Supabase, Firebase, Stripe, Sentry, analytics)
├── supabase/
│   ├── migrations/            # PostgreSQL schema (init, verification, security hardening)
│   └── functions/             # Edge functions (Stripe checkout, webhooks, Gemini icebreaker)
├── hooks/                     # React hooks (theme, boost, swipe limit)
├── types.ts                   # TypeScript definitions (Profile, Match, Message, Verification)
├── constants.ts               # Mock data + config (608 LOC - bloats prod bundle)
├── mobile/                    # Expo shell (NOT INTEGRATED - separate package.json)
├── audit/                     # Pre-launch checklists (security, compliance, deployment)
└── .claude/                   # Agent directives (security-auditor, backend-auditor)
```

**Critical Finding:** No `/api` or `/pages` directory - API logic lives in Supabase Edge Functions + RLS policies.

---

## 2. TECH STACK

### Frontend (Web)
- **Framework:** React 19.2.4 + Vite 6.2.0
- **Language:** TypeScript 5.8.2 (strict mode implied)
- **Routing:** Client-side view switching (no routing library)
- **State:** Zustand 5.0.11
- **UI:** Tailwind CSS 3.4.17 (CDN in dev, postcss in build)
- **Forms:** React Hook Form 7.71.1 + Zod 4.3.6 validation
- **Icons:** Lucide React 0.563.0

### Backend (BaaS)
- **Database:** Supabase (PostgreSQL + PostGIS for geolocation)
- **Auth:** Supabase Auth (`@supabase/supabase-js` 2.95.3)
- **Storage:** Supabase Storage (verification documents)
- **Functions:** Supabase Edge Functions (Deno runtime)
  - `create-checkout-session` (Stripe integration)
  - `webhooks-stripe` (subscription lifecycle)
  - `generate-icebreaker` (Gemini AI integration)

### Third-Party Services
- **Payments:** Stripe (`@stripe/stripe-js` 8.7.0)
- **Analytics:** Mixpanel 2.74.0, PostHog 1.343.2
- **Monitoring:** Sentry 10.38.0 (**sendDefaultPii: true** - HIGH RISK)
- **Push:** Firebase 12.9.0 (incomplete - token not persisted)
- **AI:** Google Gemini (`@google/genai` 1.40.0 - unused in frontend)

### Mobile (Dormant)
- **Framework:** Expo SDK 54.0.33 (React Native 0.81.5)
- **Routing:** Expo Router 6.0.23
- **State:** No shared stores with web (separate app)
- **Status:** Boilerplate only - NOT connected to backend

### DevOps & Testing
- **Bundler:** Vite 6.2.0
- **Tests:** Vitest 4.0.18 (BROKEN - runs node_modules tests)
- **E2E:** Playwright 1.58.2
- **CI:** Husky 9.1.7 pre-commit hooks (BLOCKED by failing tests)
- **Linting:** ESLint 9.39.2 (BROKEN - v9/flat config mismatch)

---

## 3. AUTHENTICATION FLOW

### Registration Flow (CRITICAL SECURITY GAPS)

**Path:** `LandingView` → `RegistrationFlow` → `PendingVerificationView` → `OnboardingView` → `App`

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LANDING (authStep: 'LANDING')                               │
│    ├─ "Get Started" → RegistrationFlow                         │
│    ├─ "Login" → LoginView                                      │
│    └─ [DEV ONLY] "Skip to App" → BYPASS ALL ❌ (CRITICAL)     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. REGISTRATION (authStep: 'REGISTRATION')                     │
│    Component: /components/RegistrationFlow.tsx                 │
│    Steps:                                                       │
│      1. Personal Info (name, age, role, specialty, hospital)   │
│      2. Credentials (email, password)                          │
│      3. Verification Method:                                   │
│         A. EMAIL → Domain validation (tier 1/2/3)             │
│            - Domain checked against verified_domains table     │
│            - Email saved to verified_work_emails               │
│            - verificationStatus = 'VERIFIED'                   │
│         B. DOCUMENT → Upload license/ID                        │
│            - File → Supabase Storage (verification_documents)  │
│            - verification_requests.status = 'PENDING'          │
│            - verificationStatus = 'PENDING_VERIFICATION'       │
│    [DEV BYPASS] "Simulate Admin Approval" → SKIP ❌ (CRITICAL)│
│    Calls: signUpWithEmail() → supabase.auth.signUp()          │
│    Profile: upsertProfile() → profiles table                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3A. PENDING VERIFICATION (if status != 'VERIFIED')             │
│     Component: /components/PendingVerificationView.tsx         │
│     - Document review: Manual admin approval required          │
│     - Cannot access app until status = 'VERIFIED'              │
│     - Options: Retry verification | Logout                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3B. ONBOARDING (authStep: 'ONBOARDING') - First-time only      │
│     Component: lazy(() => import('./components/OnboardingView'))│
│     - Add photos (min 2 required)                              │
│     - Select interests, personality tags                       │
│     - Answer profile questions                                 │
│     - Set localStorage('vitalis_onboarding_seen', 'true')      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. MAIN APP (authStep: 'APP')                                  │
│    - Home (swipe/match)                                        │
│    - Matches/Chat                                              │
│    - Profile                                                   │
│    - Premium upgrade                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Login Flow

**Path:** `LoginView` → `App`

```
LoginView
  ├─ signInWithEmail(email, password)
  │   └─ supabase.auth.signInWithPassword()
  ├─ Success → getSession() → load user profile
  └─ Failure → show error toast
```

### Session Management

- **Token Storage:** Supabase localStorage (auth.token)
- **Refresh:** Automatic via `@supabase/supabase-js`
- **Logout:** `signOut()` → `supabase.auth.signOut()` → redirect to LANDING
- **State Listener:** `onAuthStateChange()` in services/authService.ts

### Critical Vulnerabilities

1. **DEV BYPASS IN PRODUCTION:** App.tsx:1057-1071 - "Skip to App" button not env-guarded
2. **ADMIN APPROVAL SIMULATION:** RegistrationFlow.tsx:501 - Verification bypass in prod
3. **NO SERVER-SIDE AUTH CHECKS:** Edge functions validate token but app logic trusts client state
4. **RLS NOT ENFORCED ON ALL TABLES:** Only profiles + messages have RLS policies

---

## 4. DATA CLASSES & SENSITIVE DATA

### PII (Personally Identifiable Information)

| Field | Table | Type | Protection |
|-------|-------|------|------------|
| **Name** | `profiles.name` | VARCHAR(100) | RLS: auth.uid() = id |
| **Age** | `profiles.age` | INTEGER | Public (match visibility) |
| **Email** | `auth.users.email` | VARCHAR | Supabase Auth (encrypted) |
| **Phone** | `profiles.phone` | VARCHAR(50) | RLS + UNIQUE constraint |
| **Location (Geo)** | `profiles.location` | GEOGRAPHY(POINT) | RLS + hideable via `is_location_hidden` |
| **Location City** | `profiles.location_city` | VARCHAR(100) | Fuzzy visibility |
| **Hospital/Institution** | `profiles.hospital` | VARCHAR(200) | Hideable via `institution_hidden` |

### Health/Professional Data (HIPAA-adjacent)

| Field | Table | Type | Sensitivity | Storage Location |
|-------|-------|------|-------------|------------------|
| **Medical Role** | `profiles.role` | VARCHAR(50) | Medium | Database (RLS) |
| **Specialty** | `profiles.specialty` | VARCHAR(100) | Medium | Database (indexed) |
| **Sub-Specialty** | `profiles.sub_specialty` | VARCHAR(100) | Medium | Database |
| **Education** | `profiles.education` | VARCHAR(200) | Low | Database |
| **Verification Documents** | `verification_requests.document_url` | TEXT | **CRITICAL** | Supabase Storage (RLS?) |
| **Work Email** | `verified_work_emails.email` | TEXT | High | Database (domain-tier mapping) |
| **License Badge** | `profiles.verification_badges` | JSONB | Medium | Database (boolean flags) |

### Relationship/Behavioral Data

| Data Class | Storage | Type | Privacy Controls |
|------------|---------|------|------------------|
| **Swipes** | `swipes` table | LEFT/RIGHT/SUPER | UNIQUE(swiper_id, swiped_id) |
| **Matches** | `matches` table | profile_1_id ↔ profile_2_id | RLS on participants |
| **Messages** | `messages` table | TEXT/audio/video/image | RLS: match participants only |
| **Photos** | `profile_photos.url` | TEXT (Supabase Storage URL) | Ordered, scored (performance_score) |
| **Stories** | `profiles.stories` (App state) | JSONB-like | Not persisted in DB (in-memory) |
| **Blocks** | `blocks` table | blocker_id → blocked_id | RLS on blocker |
| **Reports** | `reports` table | reporter_id → reported_id + reason | Admin-only review |

### Financial Data

| Field | Table | Type | Protection |
|-------|-------|------|------------|
| **Stripe Subscription ID** | `subscriptions.store_transaction_id` | TEXT | No UNIQUE constraint ❌ (duplicate risk) |
| **Plan** | `subscriptions.plan` | VARCHAR(20) | DOSE/FORTE/ULTRA |
| **Expiry** | `subscriptions.expires_at` | TIMESTAMPTZ | Checked client-side + DB |
| **Platform** | `subscriptions.platform` | VARCHAR(20) | web/ios/android |

### Compliance Notes

- **GDPR:** No explicit consent tracking for analytics (analytics.ts checks localStorage)
- **CCPA:** No "Do Not Sell" mechanism
- **HIPAA:** Not HIPAA-compliant (no BAA, no audit logs, no encryption-at-rest verification)
- **Data Retention:** No TTL policies on messages/swipes/photos

---

## 5. CRITICAL SURFACES (Attack Vectors)

### A. Supabase Edge Functions (API Endpoints)

| Function | Path | Auth | Inputs | Risks |
|----------|------|------|--------|-------|
| **create-checkout-session** | `/functions/v1/create-checkout-session` | Bearer token | `{ plan: "GOLD"\|"PLATINUM" }` | ❌ Origin header used for redirect URLs (open redirect risk) |
| **webhooks-stripe** | `/functions/v1/webhooks-stripe` | Stripe signature | Webhook payload | ❌ No idempotency (duplicate subscriptions) |
| **generate-icebreaker** | `/functions/v1/generate-icebreaker` | Bearer token | Profile data → Gemini API | ⚠️ PII sent to third-party AI |

**Common Vulnerabilities:**
- CORS: `create-checkout-session` validates origin, `webhooks-stripe` allows `*`
- Input Validation: Minimal (plan enum check only)
- Rate Limiting: None visible
- Error Disclosure: Generic messages (good)

### B. Frontend Forms (User Input)

| Form | Component | Validation | Sanitization | Risks |
|------|-----------|------------|--------------|-------|
| **Registration** | `RegistrationFlow.tsx` | Zod schema | None | XSS in bio/name if rendered unsafely |
| **Chat Input** | `ChatView.tsx` | Length check only | None | ❌ Regex injection (line 58) |
| **Search/Highlight** | `ChatView.tsx` | None | None | ❌ Unescaped RegExp (runtime crash) |
| **Report Reason** | `ProfileDetailView.tsx` | Enum dropdown | N/A | Low risk |
| **Bio/Question Answers** | `MyProfileView.tsx` | Length limits | None | XSS if server renders |

**Critical Finding:** ChatView.tsx:58 - User search input directly in `new RegExp(highlight)` without escaping.

### C. File Uploads

| Upload Type | Destination | Validation | Risks |
|-------------|-------------|------------|-------|
| **Verification Documents** | Supabase Storage (`verification_documents` bucket) | File type check (client-side only) | ❌ No server-side MIME validation, ❌ No malware scan, ❌ RLS policy unclear |
| **Profile Photos** | Supabase Storage (`profile_photos` bucket) | Assumed (not shown in code) | Same as above |
| **Story Images** | Not persisted (in-memory only) | N/A | Low risk (ephemeral) |

### D. Third-Party Integrations

| Service | Integration Point | Data Shared | Risks |
|---------|-------------------|-------------|-------|
| **Stripe** | `checkoutService.ts` → Edge function | User ID, email, plan selection | ⚠️ Webhook replay (no idempotency table) |
| **Gemini AI** | `geminiService.ts` → Edge function | Profile bio, specialty, interests | ⚠️ PII to Google (no anonymization) |
| **Sentry** | `sentry.ts` (init on error) | `sendDefaultPii: true` | ❌ IP addresses, user agents sent by default |
| **Mixpanel/PostHog** | `analytics.ts` (event tracking) | Profile ID, actions, timestamps | ⚠️ No consent banner (relies on localStorage check) |
| **Firebase** | `pushNotifications.ts` (FCM token) | Device token | ⚠️ Token not persisted in DB (incomplete) |

### E. Database RLS (Row-Level Security)

**PROTECTED:**
- `profiles`: Users see/update own profile only
- `messages`: Match participants only

**UNPROTECTED (Missing RLS):**
- `subscriptions` ❌
- `verification_requests` ❌
- `verified_work_emails` ❌
- `swipes` ❌
- `matches` (has RLS but policy not shown in init.sql)
- `blocks` ❌
- `reports` ❌
- `notifications` ❌

**Impact:** Any authenticated user with direct database access (bypassing client app) can read/modify these tables.

### F. Client-Side State (Zustand Stores)

| Store | File | Sensitive Data | Persistence |
|-------|------|----------------|-------------|
| **authStore** | `stores/authStore.ts` | authStep (LANDING/LOGIN/REGISTRATION/APP) | None (memory only) |
| **userStore** | `stores/userStore.ts` | Full profile object (name, age, hospital, photos) | Assumed localStorage |
| **discoveryStore** | `stores/discoveryStore.ts` | swipedProfileIds, blockedProfileIds, dailySwipesRemaining | localStorage |
| **matchStore** | `stores/matchStore.ts` | matches[], swipeHistory[] | Assumed localStorage |

**Risk:** Sensitive data in localStorage = XSS → full profile dump.

---

## 6. MONOREPO STATUS & BUILD COMMANDS

### Monorepo Type: PARTIAL HYBRID

**Web App (Primary)**
```bash
# From root directory
npm install           # Installs web dependencies
npm run dev           # Vite dev server (port 3000)
npm run build         # Production build → /dist
npm run preview       # Preview production build
npm test              # Vitest (BROKEN - fails on node_modules tests)
npm run test:ci       # CI tests (BLOCKED by failures)
npm run type-check    # TypeScript validation
```

**Mobile App (Separate)**
```bash
cd mobile
npm install           # Separate node_modules
npm start             # Expo dev server
npm run ios           # iOS simulator
npm run android       # Android emulator
```

**Database (Supabase CLI)**
```bash
# Migrations
supabase migration new <name>
supabase db push

# Functions
supabase functions deploy create-checkout-session
supabase functions deploy webhooks-stripe
```

**Status:** Mobile and web are **ISOLATED** - no shared code, state, or API integration. Mobile contains only Expo boilerplate.

### Environment Variables

**Client-side (Vite):**
```
VITE_SUPABASE_URL           # Supabase project URL
VITE_SUPABASE_ANON_KEY      # Public anon key
VITE_STRIPE_PUBLIC_KEY      # Stripe publishable key
VITE_FIREBASE_*             # FCM config (7 vars)
VITE_MIXPANEL_TOKEN
VITE_POSTHOG_KEY
VITE_SENTRY_DSN
```

**Server-side (Edge Functions):**
```
STRIPE_SECRET_KEY           # Stripe API key
STRIPE_PRICE_GOLD           # Price ID for Gold tier
STRIPE_PRICE_PLATINUM       # Price ID for Platinum tier
STRIPE_WEBHOOK_SECRET       # Webhook signing secret
SUPABASE_SERVICE_ROLE_KEY   # Admin key for RLS bypass
APP_BASE_URL                # Used in checkout redirects
ALLOWED_ORIGINS             # CORS allowlist
GEMINI_API_KEY              # Google AI API key
```

---

## 7. KEY FILES FOR AUDITORS

### Frontend Security Review
```
/App.tsx                                    # Main app (1267 LOC - auth flow, god component)
/components/RegistrationFlow.tsx            # Registration + verification bypass
/components/ChatView.tsx                    # 1000+ LOC - regex injection (line 58)
/components/ProfileDetailView.tsx           # Block/report handlers
/components/MyProfileView.tsx               # Profile editing + privacy settings
/services/authService.ts                    # Auth wrappers (minimal)
/services/safetyService.ts                  # Block/report persistence
/src/lib/supabase.ts                        # Supabase client init
/src/lib/sentry.ts                          # PII leakage (sendDefaultPii: true)
/src/lib/analytics.ts                       # Tracking consent (localStorage-based)
```

### Backend Security Review
```
/supabase/migrations/20260209_init.sql      # Schema + RLS policies (incomplete)
/supabase/migrations/20260209_verification.sql  # Verification tables
/supabase/migrations/20260211_security_hardening.sql  # Security improvements
/supabase/functions/create-checkout-session/index.ts  # Stripe integration
/supabase/functions/webhooks-stripe/index.ts          # Webhook handler (no idempotency)
/supabase/functions/generate-icebreaker/index.ts      # Gemini AI integration
/services/checkoutService.ts                # Client-side checkout flow
/services/subscriptionService.ts            # Subscription state
/services/verificationService.ts            # Document upload + status updates
```

### Data Privacy Review
```
/types.ts                                   # Data models (Profile, Message, Match)
/constants.ts                               # Mock data (remove from production)
/services/profileService.ts                 # Profile CRUD
/services/geminiService.ts                  # AI integration (PII exposure)
/src/lib/pushNotifications.ts               # FCM token handling (incomplete)
/stores/userStore.ts                        # Client-side profile storage
/supabase/migrations/20260209_verification.sql  # Verified email/domain storage
```

### Configuration & Infrastructure
```
/package.json                               # Dependencies (audit for CVEs)
/vite.config.ts                             # Build config
/.env.example                               # Environment template
/.env.local                                 # Actual secrets (DO NOT COMMIT)
/.husky/pre-commit                          # Git hooks (blocked by failing tests)
/vitest.config.ts                           # Test config (broken exclude pattern)
/audit/SECURITY_CHECKLIST.md                # Pre-launch security tasks
/SECURITY_URGENT.md                         # Known critical issues
/MASTER_ISSUES.md                           # Verified bug list
```

### Documentation
```
/README.md                                  # Setup instructions
/DESIGN_OVERHAUL.md                         # Design system notes
/TECH_DEBT.md                               # Technical debt backlog
/REFACTOR_PLAN.md                           # Planned refactors
/.claude/agents/security-auditor.md         # Security audit agent directives
/.claude/agents/backend-auditor.md          # Backend audit agent directives
```

---

## 8. KNOWN CRITICAL ISSUES (from SECURITY_URGENT.md & MASTER_ISSUES.md)

### P0 - PRODUCTION BLOCKERS

1. **Auth Bypass (App.tsx:1057):** "Skip to App" button not env-guarded → anyone can skip verification
2. **Admin Approval Simulation (RegistrationFlow.tsx:501):** Dev bypass button in production
3. **Regex Injection (ChatView.tsx:58):** User input in RegExp constructor → DoS crash
4. **FK Mismatch (init.sql:18):** profiles.id references `public.users` but app uses `auth.users` → FK violations
5. **Test CI Broken (vitest.config.ts):** Tests run node_modules → all commits blocked by pre-commit hook

### P1 - HIGH PRIORITY

1. **Stripe Webhook Replay:** No idempotency table → duplicate subscriptions on retry
2. **Missing RLS:** 8+ tables without row-level security (subscriptions, verifications, reports, etc.)
3. **Sentry PII Leakage:** `sendDefaultPii: true` → IP addresses sent to third party
4. **Push Token Not Persisted:** Firebase token fetched but not saved to database
5. **Verification Badge Always Shown:** UI doesn't check `verificationStatus` before rendering badge

### P2 - MEDIUM PRIORITY

1. **God Components:** App.tsx (1267 LOC), ChatView.tsx (1000+ LOC) → unmaintainable
2. **Tailwind CDN in Production:** Runtime CSS → performance penalty
3. **Mock Data in Bundle:** constants.ts (608 LOC) → bloats production build
4. **ESLint v9/Flat Config Mismatch:** Linter doesn't run

---

## 9. DEPLOYMENT CONTEXT

- **Hosting:** Assumed Vercel/Netlify (Vite build output)
- **Database:** Supabase Cloud
- **Storage:** Supabase Storage (verification docs, photos)
- **Functions:** Supabase Edge Functions (Deno)
- **CDN:** Assumed (for Supabase Storage URLs)
- **CI/CD:** Git hooks via Husky (currently BLOCKED)

---

## END OF RECONNAISSANCE REPORT

**Next Steps for Auditors:**

1. **Frontend Auditor:** Focus on App.tsx, RegistrationFlow, ChatView regex injection, XSS vectors
2. **Backend Auditor:** RLS policy completeness, Edge Function auth, Stripe idempotency, FK integrity
3. **Security Auditor:** Auth bypasses (P0), third-party PII leakage (Sentry/Gemini), file upload validation
4. **Privacy Auditor:** GDPR consent flows, data retention policies, PII minimization in analytics

**Critical Action Required:** Fix P0 issues before ANY production deployment.
