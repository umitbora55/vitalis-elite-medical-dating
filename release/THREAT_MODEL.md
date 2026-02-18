# THREAT MODEL

## Scope and assets
- Personal identity/professional profile: name, age, specialty, photos, verification status.
- Sensitive matching data: likes, matches, messages, location proximity, availability flags.
- Authentication/session materials: Supabase sessions and device tokens.
- Financial state: subscription status and checkout references.
- Device and telemetry: push token, analytics/error events.

## Trust boundaries
- Web/mobile UI -> Supabase web APIs (HTTPS).
- UI -> Supabase Edge Functions (server-side API calls).
- UI -> Firebase/Maps/Analytics vendors (tokenized SDK calls only).
- UI -> Stripe checkout flow (redirect/session URL).
- Vendor callbacks (Stripe webhook -> edge function).

## Primary data flows
1. Auth and profile reads/writes through `src/lib/supabase.ts` and edge-authenticated functions.
2. Nearby discovery reads profile/location fields and availability state.
3. Chat/match operations read/write `conversations`, `matches`, `messages`.
4. Checkout flow calls `create-checkout-session` then Stripe callback to webhook handler.
5. Optional analytics/error reporting gated by consent or minimal anonymous context.

## Top threats and mitigations

- **Threat:** Unauthorized data access via malformed auth/session context (IDOR).  
  **Mitigation:** Server-validated auth in edge functions, Supabase RLS policies and role-based checks where used.

- **Threat:** Sensitive location/proximity leakage from excessive processing.  
  **Mitigation:** Radius filtering is done in app logic with strict per-profile conditions and safe defaults; distance values sanitized.

- **Threat:** Secret/key leakage through logs or client code.  
  **Mitigation:** Secret values referenced only as env names and runtime variables, loaded server-side in edge functions for privileged operations.

- **Threat:** Transport attacks or script injection.  
  **Mitigation:** HTTPS/TLS on Supabase/API endpoints, CSP header tightening in `index.html`, user-input encoded handling in UI paths.

- **Threat:** Abuse of payment/webhook endpoints.  
  **Mitigation:** Stripe secret/webhook signature checks in function scope, idempotent handling, and event persistence.

- **Threat:** Compliance risk from data sharing ambiguity.  
  **Mitigation:** Explicit privacy policy coverage and data inventory mapping in release artifacts; consent gate for analytics.

## Monitoring / evidence
- CI artifacts, static scans, tests, and SBOM generation are captured as verification evidence in `release/EVIDENCE_INDEX.md`.
