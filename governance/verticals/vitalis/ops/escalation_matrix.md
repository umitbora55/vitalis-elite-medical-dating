# Escalation Matrix — Vitalis Elite Medical Dating

**Version:** 2.6.2
**Owner:** Trust & Safety Team
**Last Updated:** 2026-03-23
**Related policies:** `safety_clinical.policy.ts`, `reputation.policy.ts`

---

## 1. Overview

This matrix defines the escalation path for every case type in the Vitalis moderation system. Escalation is hierarchical: Moderator → Admin → Superadmin → External Authority. Each tier has a defined SLA and documentation requirement.

The source of truth for escalation triggers is `safety_clinical.policy.ts` — `requiresImmediateEscalation()`.

---

## 2. Case Types and Severity Levels

### 2.1 Severity Definition

| Level | Description | Examples |
|-------|-------------|---------|
| **Low** | User experience issue; no immediate safety risk | Spam messages, mild rudeness, minor ToS violation |
| **Medium** | Feature misuse or moderate harm potential | Repeated low-severity violations, fake interests, misleading bio |
| **High** | Significant harm potential or professional ethics concern | Harassment pattern, fake credentials (unconfirmed), explicit content |
| **Critical** | Immediate safety risk or confirmed serious violation | Stalking, doxxing, confirmed impersonation, ATO in progress, child safety |

---

## 3. Escalation Matrix

| Case Type | Severity | First Responder | Escalation L1 | Escalation L2 | Escalation L3 | SLA (first action) |
|-----------|----------|-----------------|---------------|---------------|---------------|-------------------|
| Verification — routine | Low | Moderator | Admin (SLA breach only) | — | — | 24 h |
| Verification — fraud flags | High | Moderator | Admin (30 min) | Superadmin (60 min) | — | 1 h |
| Harassment (single report) | Low–Medium | Moderator | Admin (on pattern) | — | — | 24 h |
| Harassment (pattern: 3+ reports same reporter-target pair) | High | Admin | Superadmin | — | — | 4 h |
| Stalking / Doxxing | Critical | Admin | Superadmin (immediate) | Law enforcement (if requested) | — | 1 h |
| Hierarchy Abuse | High | Admin | Superadmin | TTB referral (if confirmed) | — | 1 h |
| Fake Credentials — unconfirmed | High | Moderator | Admin (cannot decide) | — | — | 8 h |
| Fake Credentials — confirmed | Critical | Admin | Superadmin | Regulatory referral (optional) | — | 1 h |
| Impersonation | Critical | Admin | Superadmin | Law enforcement (if subject requests) | — | 1 h |
| Ethics Violation | High | Admin | Superadmin | TTB / professional body referral | — | 4 h |
| ATO (Account Takeover) | Critical | Admin | Superadmin | — | — | 1 h |
| Fraud — risk_score spike | High | Moderator (auto-flag) | Admin (risk > 70) | — | — | 1 h |
| Mass Report Brigading | High | Admin | Superadmin | — | — | 4 h |
| Child Safety (any signal) | Critical | Superadmin | Law enforcement (mandatory) | — | — | Immediate |
| Appeal (standard) | Low | Moderator | Admin (if original decision was Admin) | Superadmin (if original decision was Admin) | — | 48 h |
| Appeal (safety-related) | High | Admin | Superadmin | — | — | 8 h |
| Data Subject Request (KVKK/GDPR) | Medium | Admin | Superadmin (if deletion) | DPA (if unresolved in 30 days) | — | 30 days |

---

## 4. Escalation Paths in Detail

### 4.1 Moderator → Admin

**When:** Moderator cannot reach a decision independently, or:
- Case type is in the "High" or "Critical" severity row
- Original Moderator decision is being appealed
- SLA breach has occurred (auto-reassign at +30 min)
- Legal demand received

**How:** Click **Escalate → Admin** in the case detail view. Select escalation reason from the dropdown. Case is reassigned and Admin is notified via push.

**Required documentation:**
- Summary of moderator review so far
- Evidence reviewed (document URLs, flagged screenshots)
- Reason for escalation

---

### 4.2 Admin → Superadmin

**When:**
- Case involves potential law enforcement contact
- Case involves regulatory body referral (TTB, TEB, etc.)
- Case involves confirmed ATO or critical safety risk
- Admin is uncertain about the correct resolution
- Two or more Admins disagree on a resolution

**How:** Click **Escalate → Superadmin** in the case detail view. Superadmin is paged immediately for Critical severity cases.

**Required documentation:**
- Full case timeline
- All evidence reviewed
- Admin's recommended resolution and reasoning
- Legal/regulatory concern if applicable

---

### 4.3 Superadmin → External Authority

**When:**
- Law enforcement requests (subpoena, court order, police request)
- Suspected child safety violation (mandatory reporting)
- Regulatory body investigation
- User explicitly requests law enforcement contact for stalking/doxxing

**How:** Superadmin coordinates with legal counsel before responding to any external authority. All external communications must be documented in the case record.

**Required documentation:**
- Case ID and full timeline
- Evidence package (requires legal review before sharing)
- Legal counsel sign-off (for law enforcement requests)
- Record of what data was disclosed, to whom, and on what legal basis

---

## 5. SLA Per Escalation Level

| Escalation Level | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) |
|------------------|---------------|-----------|-------------|----------|
| Moderator first action | 1 h | 8 h | 24 h | 48 h |
| Admin escalation response | 30 min | 4 h | 8 h | 24 h |
| Superadmin escalation response | Immediate | 1 h | 4 h | 8 h |
| External authority contact | Same day | 3 business days | 30 days | — |

---

## 6. Required Documentation Per Escalation

| Escalation To | Minimum Required Documentation |
|---------------|-------------------------------|
| Admin | Review summary, evidence links, reason code, SLA status |
| Superadmin | All of the above + recommended resolution + legal concern assessment |
| External Authority | All of the above + legal counsel sign-off + data disclosure record |

All documentation is recorded in `admin_audit_logs` (action: `escalate_case`) with the full metadata payload. No verbal-only escalations are accepted.

---

## 7. Post-Escalation Ownership

Once a case is escalated, the escalating party remains a **collaborator** on the case but is no longer the primary owner. The new owner is responsible for SLA compliance. The original moderator/admin may be asked for additional context but should not take further independent actions on the case.

---

## 8. De-escalation

A case may be de-escalated (returned to a lower tier) only if:
- New evidence shows the severity was overstated
- The triggering condition was resolved (e.g., ATO reversed, fake account confirmed and banned)
- Superadmin explicitly approves de-escalation

De-escalation is logged in `admin_audit_logs` (action: `deescalate_case`) with the approving Superadmin's ID.
