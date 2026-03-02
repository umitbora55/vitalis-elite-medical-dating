# Fraud Response Playbook — Vitalis Elite Medical Dating

**Version:** 2.6.2
**Owner:** Trust & Safety Team
**Last Updated:** 2026-03-23
**Related policies:** `reputation.policy.ts`, `identity.policy.ts`

---

## 0. Guiding Principles

1. **Punitive silence is forbidden.** Every action taken against an account must include a user-visible explanation and resolution path.
2. **Err toward caution, not punishment.** Throttle visibility before banning; warn before restricting.
3. **All actions are reversible except permanent bans.** Permanent bans require Superadmin sign-off.
4. **False positives are a trust liability.** A wrongly restricted account of a legitimate healthcare professional causes reputational harm.

---

## 1. Fraud Signal Taxonomy

The following eight signals are produced by the server-side risk scoring engine and stored in `fraud_signals` table. The risk weight for each is defined in `reputation.policy.ts` — `FRAUD_SIGNAL_WEIGHTS`.

| Signal | Weight | Description |
|--------|--------|-------------|
| `device_fingerprint_mismatch` | 20 | Device fingerprint does not match any previously seen device for this account |
| `swipe_velocity` | 10 | Swipe rate exceeds human maximum (> 300 swipes/hour) |
| `message_velocity` | 10 | Message send rate exceeds human maximum (> 60 messages/hour to different recipients) |
| `doc_upload_abuse` | 25 | More than 5 failed document uploads in 24 hours, or same document rejected 3+ times |
| `chargeback_pattern` | 30 | Payment chargeback filed after subscription or in-app purchase |
| `mass_report_targeting` | 15 | Account has been reported by >= 5 unique users within 24 hours |
| `impossible_travel` | 20 | Login from a location that is physically impossible to reach from the previous login location within the elapsed time |
| `disposable_email` | 15 | Account email domain matches known disposable email provider list |

**Risk score computation:** Signals are additive, capped at 100. Score >= 70 → visibility throttled + P0 verification queue.

---

## 2. Detection Workflow

### 2.1 Automated Detection

Fraud signals are raised automatically by:
- `healthcareVerificationService.ts` — `recordFraudSignal()` (server-enforced: only self-writes)
- `deviceAbuseService.ts` — device fingerprint + velocity checks
- `autoRestrictionService.ts` — threshold monitoring
- Supabase scheduled job — impossible travel calculation on each auth event

When a signal is raised:
1. Signal is written to `fraud_signals` table (Admin-only RLS).
2. `compute_profile_risk()` RPC is called to recompute `risk_score`.
3. If new `risk_score` >= `AUTO_RESTRICT_RISK_THRESHOLD` (70): account visibility is throttled immediately.
4. A moderation case is opened automatically with priority based on the new score.

### 2.2 Manual Detection

Moderators may manually flag a fraud signal via:
- **Admin Panel → User Profile → Fraud Signals → Add Signal**
- Requires Admin role minimum; Moderators cannot add signals manually.
- All manual additions are logged in `admin_audit_logs`.

---

## 3. Immediate Actions Per Signal Type

### `device_fingerprint_mismatch`

**Immediate actions:**
1. Send in-app alert: "Yeni bir cihazdan giriş yapıldı. Bu siz değilseniz hesabınızı güvence altına alın."
2. Require re-authentication on the suspicious device (session invalidated for that device).
3. If combined with `impossible_travel` or `credential_stuffing_pattern` → ATO protocol (Section 6).

**Resolution path for user:** Cihaz doğrulama adımını tamamla — Ayarlar → Güvenlik → Cihazlarım.

---

### `swipe_velocity`

**Immediate actions:**
1. Rate-limit swipe actions to 60/hour for 24 hours.
2. Discovery queue is paused for the account (they cannot receive new profile suggestions).
3. No ban; no notification beyond "Günlük swipe limitine ulaştınız."

**Resolution path:** Otomatik olarak 24 saat sonra kaldırılır.

---

### `message_velocity`

**Immediate actions:**
1. Throttle outbound messages to 5 per hour for 24 hours.
2. Existing conversations are not affected (users can still receive messages).
3. If the high-velocity messages contain spam content → content moderation escalation.

**Resolution path:** 24 saat sonra otomatik kaldırılır.

---

### `doc_upload_abuse`

**Immediate actions:**
1. Block further document uploads for 24 hours.
2. Open a P1 moderation case for manual review of the uploaded documents.
3. If more than 3 rejections of the same document type → P0 case (suspected document fabrication).

**Resolution path:** Geçerli ve okunabilir belgeler yükle — Hesabım → Doğrulama.

---

### `chargeback_pattern`

**Immediate actions:**
1. Suspend premium features immediately (subscription treated as unpaid).
2. Block new subscription purchases until payment method is updated.
3. Open a P1 moderation case.
4. If chargeback is for a high-value transaction (> 3 months) → Superadmin notification.

**Resolution path:** Ödeme yöntemini güncelle — Ayarlar → Abonelik → Ödeme Bilgileri.

---

### `mass_report_targeting`

**Immediate actions:**
1. Do **not** automatically restrict the account — mass reports may be brigading.
2. Apply `isBrigading()` check (>= 5 unique reporters within 24 h).
3. If brigading detected → open a separate moderation case against the reporter cluster.
4. If not brigading → review each report individually with P1 SLA.
5. User is **not** notified they are being reported (KVKK: investigative confidentiality).

**Resolution path for users who are wrongly mass-reported:** İtiraz formunu doldur — Yardım → İtiraz Et.

---

### `impossible_travel`

**Immediate actions:**
1. Send alert to the account owner: "Hesabınıza farklı bir konumdan erişildi."
2. Require re-authentication on the "traveled" session.
3. If user does not re-authenticate within 1 hour → session invalidated.

**Legitimate use case:** User is traveling internationally. Trip Mode should be recommended.

**Resolution path:** Farklı şehirde/ülkedeysen Trip Modunu aktifleştir — Keşfet → Trip Modu.

---

### `disposable_email`

**Immediate actions:**
1. Send in-app banner: "Geçici e-posta adresleri Vitalis'te kullanılamaz."
2. Block verification submission until email is updated.
3. Trust level capped at 1 (email verified) — cannot reach level 2+ without a permanent email.

**Resolution path:** Kurumsal veya kalıcı e-posta adresi ekle — Hesabım → E-posta Değiştir.

---

## 4. Visibility Throttle — How and When to Apply

Visibility throttle means the account is hidden from new discovery results while still being able to:
- Receive and send messages to existing matches
- View their own profile
- Submit a verification request or appeal

### Automatic Throttle (system-enforced)

Applied when `risk_score >= 70` OR `active_fraud_signals >= 3`.

The `discoveryService.fetchDiscoveryProfiles()` RLS policy excludes throttled accounts from result sets automatically.

### Manual Throttle (moderator action)

Available via **Admin Panel → User Profile → Restrict → Throttle Discovery**.

- Requires **Moderator** role minimum.
- Must document reason in the audit log.
- Duration: 24 hours (default), 72 hours, or 7 days.
- After duration expires, throttle is lifted automatically.
- User receives an in-app message with the reason and how to appeal.

### Throttle Removal

Automatic: `risk_score` drops below 60 (with 10-point hysteresis buffer).
Manual: Admin clicks **Remove Throttle** — logged in `admin_audit_logs`.

---

## 5. Mass-Report Brigading Detection

Brigading occurs when a coordinated group files multiple reports against a single target to get them unfairly restricted.

### Detection algorithm

1. When the `mass_report_targeting` signal is raised, run `isBrigading()`:
   ```
   unique_reporters_in_24h >= MASS_REPORT_UNIQUE_REPORTER_THRESHOLD (5)
   ```
2. Inspect the reporters: do they share device fingerprints, IP ranges, or registration dates?
3. Check if the reporters have existing blocks or profile interactions with the target.
4. If two or more reporters share a device or IP → escalate to Admin for brigading investigation.

### Response to confirmed brigading

1. Cancel all reports in the cluster — target account is cleared.
2. Issue warnings to the brigading accounts.
3. If the brigading was coordinated (same device/IP cluster) → temp ban (7 days) for organizers.
4. Permanent ban requires Superadmin sign-off and documented evidence.

---

## 6. Recovery / Appeal Process

All users subject to fraud-related restrictions have the right to appeal.

### User-initiated appeal

1. User navigates to **Hesabım → Destek → İtiraz Et** or **Yardım → İtiraz Et**.
2. User submits a free-text explanation and optional supporting evidence.
3. Appeal creates a moderation case (type: `appeal`, priority: P2 minimum).
4. Moderator reviews the appeal within 48 hours.

### Moderator appeal review checklist

- [ ] Is the fraud signal plausible given the user's history?
- [ ] Did the user provide evidence that clears the signal? (e.g., trip booking confirmation for `impossible_travel`)
- [ ] Is there a pattern of appeals from this account (gaming the system)?
- [ ] Is the restriction proportionate to the evidence?

### Appeal outcomes

| Outcome | Action |
|---------|--------|
| Appeal upheld | Restriction lifted; fraud signal removed; user notified with apology |
| Appeal denied | User notified of reason; restriction maintained; user may re-appeal after 7 days |
| Partial uphold | Some signals removed; reduced restriction applied |

All appeal decisions are logged in `admin_audit_logs`. Users cannot appeal permanent bans without Superadmin review.

---

## 7. Permanent Ban Protocol

Permanent bans are irreversible and require Superadmin sign-off.

**Valid grounds for permanent ban (non-exhaustive):**
- Confirmed child safety violation
- Confirmed impersonation of a specific real person
- Three or more confirmed instances of stalking/doxxing
- Confirmed document fraud (fabricated credentials submitted after warning)
- Chargeback fraud combined with identity fraud

**Process:**
1. Admin recommends permanent ban in the case detail.
2. Superadmin reviews and approves in writing (case comment).
3. Account is banned; all active sessions are terminated immediately.
4. User's email is added to a deny-list (prevents re-registration).
5. User is notified that their account has been permanently closed (no specific reason required if it poses a safety risk to reveal it).
6. Data retention: account data retained 1 year for legal compliance, then deleted.
