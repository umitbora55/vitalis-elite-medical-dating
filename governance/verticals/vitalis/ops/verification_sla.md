# Verification SLA — Vitalis Elite Medical Dating

**Version:** 2.6.2
**Owner:** Trust & Safety Team
**Last Updated:** 2026-03-23
**Applies to:** All healthcare professional verification requests

---

## 1. SLA Tiers

### P0 — 1 Hour (Critical)

**Triggers:**
- Account `risk_score` > 70 at time of verification submission
- One or more active `fraud_signals` present on the account
- ATO (account takeover) signal detected during verification session
- Subject of two or more pending escalation-level reports (`stalking`, `impersonation`, `fake_credentials`, `hierarchy_abuse`, `ethics_violation`)

**Expectation:** First moderator action (claim, review start, or escalation) within **60 minutes** of submission.

**Auto-actions on P0 open:** Account is placed in "soft hold" — visible to existing matches but hidden from new discovery — until the case is resolved.

---

### P1 — 24 Hours (Normal)

**Triggers:**
- Standard license/diploma/chamber document review
- Domain-based or registry-based professional claim verification
- Re-verification of expired credentials (annual renewal)
- Accounts with `risk_score` 0–70 and no active fraud signals

**Expectation:** First moderator action within **24 hours** of submission.

---

### P2 — 72 Hours (Awaiting User)

**Triggers:**
- Moderator issued a `need_more_info` decision; case is blocked waiting for the user to upload additional documents
- User has been notified via email/push but has not yet responded
- No action required from moderator until user re-submits

**Expectation:** Case re-enters P1 queue immediately upon user re-submission. If the user does not respond within 72 hours, the case auto-closes with status `expired` and the user is notified.

---

## 2. Priority Assignment Rules

Priority is computed automatically by the `compute_trust_level` RPC and case-creation logic:

| Condition | Priority |
|-----------|----------|
| `risk_score` > 70 OR `fraud_signals` count >= 1 | P0 |
| No risk flags, routine review | P1 |
| Decision = `need_more_info`, awaiting user | P2 |
| Low-stakes appeals (no safety concern) | P3 |

Manual priority override is permitted by **Admin** and **Superadmin** roles only.

---

## 3. SLA Breach Escalation

### Detection
A scheduled background job (`scheduled-retention-cleanup`) checks `sla_due_at` against `NOW()` every 15 minutes. Cases where `sla_due_at < NOW()` and `status IN ('open', 'in_progress')` are flagged as **SLA breached**.

### Notification Chain

| Breach Age | Action |
|------------|--------|
| 0 min (at deadline) | Push alert to the assigned moderator |
| + 15 min | Alert sent to on-call Admin |
| + 30 min | Alert sent to Superadmin; case auto-reassigned to on-call Admin |
| + 60 min (P0 only) | Page the Trust & Safety lead; executive notification |

### Auto-Reassign
If the assigned moderator has not taken any action 30 minutes after SLA breach, the case is automatically reassigned to the on-call Admin and the original assignee is removed from the queue for 2 hours.

---

## 4. SLA Breach Rate Dashboard Gate

The SLA breach rate is computed as:

```
breach_rate = (cases_breached_in_window / total_cases_in_window) * 100
```

Measurement window: rolling **24 hours**.

**Gate rule:** If `breach_rate > 5%`, the feature flag `ff_license_upload_flow` is automatically set to `rollout:0` (fully disabled) and the on-call engineer is paged. New verification submissions are blocked until the queue clears and breach rate drops below 2%.

This gate is enforced by the dashboard KPI widget in `AdminPanelV2` and the `scheduled-retention-cleanup` edge function.

---

## 5. Re-Verify Schedule

Documents that expire (license, chamber) are subject to annual re-verification.

| Event | Action |
|-------|--------|
| 30 days before `expires_at` | Email + in-app push: "Your license verification expires in 30 days. Please re-submit." |
| 7 days before | Second reminder email + push |
| On `expires_at` | `claim_status` set to `expired`; trust level drops from 5 → 4; discovery visibility maintained for 7-day grace period |
| 7 days after expiry (grace end) | Account hidden from discovery if still unverified; user notified |

Re-verify submissions follow the same SLA rules as initial submissions. If re-verify is approved before the grace period ends, the trust level is immediately restored with no gap.

---

## 6. Document Retention (KVKK / GDPR)

Verification documents (uploaded images/PDFs) are stored in the `verification-docs` private Supabase Storage bucket.

| Outcome | Retention |
|---------|-----------|
| Approved | Retained 1 year from `verified_at`, then auto-deleted by retention cleanup job |
| Rejected | Deleted within 30 days of `rejected_at` |
| Expired (no re-submit) | Deleted within 30 days of `expires_at` |
| User account deleted | Deleted immediately via `delete-account` edge function cascade |

Users may request immediate deletion of their verification documents via the in-app Privacy Center (KVKK Article 7 / GDPR Article 17).

---

## 7. Appendix: SLA Calculation Reference

```
SLA deadline = submission_timestamp + SLA_HOURS[priority]

P0: + 1h
P1: + 24h
P2: + 72h (reset on user re-submission)
```

Source of truth: `governance/verticals/vitalis/policies/license_verification.policy.ts` — `SLA_HOURS` constant.
