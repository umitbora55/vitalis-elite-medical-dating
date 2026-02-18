# PRIVACY DATA INVENTORY

## Data inventory

| Data category | Source | Purpose | Sharing | Retention | Security controls |
| --- | --- | --- | --- | --- | --- |
| Authentication identifiers (`user.id`, session) | Supabase Auth | Account access, secure API calls | Supabase/Auth provider | Retained per provider/session policy | RLS, secure session handling, HTTPS |
| Profile identity (name, age, bio, specialty, photos, verification docs) | User profile forms + admin verification | Matching and user reputation workflows | Supabase DB; verification moderators/admin functions | While account active; removed on deletion request | RLS, storage access checks, secure storage rules |
| Location proximity fields | Profile/location capture, optional geodata flow | Nearby matching and distance ranking | Supabase DB + edge processing | While account active | Minimized fields, numeric validation/sanitization in UI |
| Messages/chats and matches | Chat/match services | Communication and match flow | Supabase DB | Active account lifetime; archive by product policy | Authenticated query filters, user scope checks |
| Activity/availability state (`lastActive`, `isAvailable`, `privacySettings`) | Client and app actions | Nearby visibility and active indicators | Supabase DB | Rolling operational state; user-controlled visibility | Input validation in UI, RLS patterns |
| Payment metadata (`subscriptionId`, plan, checkout references) | Stripe checkout/edge calls | Premium entitlement | Stripe and Supabase admin tables | As required by finance/legal retention policy | Server-side secret key handling, webhook signature checks |
| Push/service tokens | Firebase Messaging + device permission flow | Notifications and alerts | Firebase, push provider, user device | Rotated/removed on logout | Token storage via secure store on mobile; explicit permission gating |
| Analytics/error events (optional) | Mixpanel/PostHog/Sentry integrations | Product improvement and crash monitoring | Third-party analytics/monitoring vendors (consent-only) | Vendor retention policy | Consent check (`src/lib/analytics.ts`), minimal payload defaults |

## Apple App Privacy Details mapping

- **Contact Info / Identifiers**: Collected for account and app access, not sold. Shared internally with Supabase auth and payment providers for operational needs.
- **Health / Body related data**: Treated as professional/medical profile metadata; optional and purpose-limited to matching features.
- **Location**: Approximate location/proximity and distance matching; user-visible nearby status controls and visibility options.
- **Photos/Media**: User-uploaded profile media for identity/matching context.
- **Identifiers for advertising / diagnostics**: Only with explicit consent for analytics and crash reporting.

## Google Play Data Safety mapping

- **Data collection**: profile, account, communications, app activity, payment, location (if enabled), device messaging tokens.
- **Data sharing**: Supabase, Stripe, Firebase, AI/AI moderation, analytics and crash vendors as documented in `public/privacy.html`.
- **Security controls**: All production secrets are server-side; transport over HTTPS; explicit consent for optional tracking.

## Implementation evidence
- `public/privacy.html`
- `release/THREAT_MODEL.md`
- `release/EVIDENCE_INDEX.md`
