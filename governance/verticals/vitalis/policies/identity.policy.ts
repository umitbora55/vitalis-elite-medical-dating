/**
 * Identity & ATO (Account Takeover) Policy
 * Vitalis Elite Medical Dating — Governance v2.6.2
 *
 * Defines: session management limits, OTP brute-force protection,
 * liveness re-verification triggers, and ATO signal taxonomy.
 */

// ── OTP protection ─────────────────────────────────────────────────────────────

/** Maximum number of failed OTP attempts before the account is locked. */
export const MAX_OTP_ATTEMPTS = 5;

/** Duration of OTP lockout in minutes after exceeding MAX_OTP_ATTEMPTS. */
export const OTP_LOCKOUT_MINUTES = 30;

// ── Session management ────────────────────────────────────────────────────────

/**
 * Maximum session age in days.
 * Sessions older than this must be re-authenticated regardless of activity.
 * This corresponds to Supabase JWT expiry; enforce at application level too.
 */
export const SESSION_MAX_AGE_DAYS = 30;

/**
 * When true, a push/email alert is sent to the user when a sign-in
 * is detected from a device not previously seen on their account.
 */
export const NEW_DEVICE_ALERT = true;

// ── Liveness re-verification triggers ────────────────────────────────────────

/**
 * Events that require the user to complete liveness re-verification.
 *
 * photo_changed          — user replaced their profile photo
 * risk_score_spike       — daily risk score delta exceeded RISK_SCORE_SPIKE_THRESHOLD
 * admin_flag             — a moderator manually flagged the account
 * annual_renewal         — annual re-verify cadence for expiring badges
 */
export const LIVENESS_RE_VERIFY_TRIGGERS = [
  'photo_changed',
  'risk_score_spike',
  'admin_flag',
  'annual_renewal',
] as const;

export type LivenessReTrigger = typeof LIVENESS_RE_VERIFY_TRIGGERS[number];

/**
 * Returns true if the given event is a valid liveness re-verify trigger.
 */
export function isLivenessReTrigger(value: string): value is LivenessReTrigger {
  return (LIVENESS_RE_VERIFY_TRIGGERS as readonly string[]).includes(value);
}

// ── Risk scoring thresholds ───────────────────────────────────────────────────

/**
 * Maximum allowed increase in risk score within a 24-hour window.
 * Exceeding this threshold triggers the 'risk_score_spike' liveness re-check.
 */
export const RISK_SCORE_SPIKE_THRESHOLD = 40;

/**
 * Absolute risk score above which an account is automatically restricted
 * from discovery and messaging until manual review.
 */
export const AUTO_RESTRICT_RISK_THRESHOLD = 70;

// ── ATO signal taxonomy ───────────────────────────────────────────────────────

/**
 * Known Account Takeover (ATO) behavioral signals.
 * When two or more signals are present simultaneously, the account is flagged
 * for immediate moderator review.
 */
export const ATO_SIGNALS = [
  'impossible_travel',
  'new_device',
  'credential_stuffing_pattern',
  'mass_report_target',
  'unusual_velocity',
] as const;

export type AtoSignal = typeof ATO_SIGNALS[number];

/**
 * Returns true if the given string is a recognized ATO signal.
 */
export function isAtoSignal(value: string): value is AtoSignal {
  return (ATO_SIGNALS as readonly string[]).includes(value);
}

// ── Multi-signal escalation ───────────────────────────────────────────────────

/**
 * Number of concurrent ATO signals required to escalate to P0 (1-hour SLA).
 * A single signal alone triggers P1 (24-hour SLA).
 */
export const ATO_ESCALATION_SIGNAL_COUNT = 2;

/**
 * Evaluate whether a set of active ATO signals warrants immediate escalation.
 *
 * @param activeSignals  Array of currently active ATO signals for the account
 * @returns              'P0' if immediate escalation needed, 'P1' otherwise
 */
export function evaluateAtoSeverity(activeSignals: AtoSignal[]): 'P0' | 'P1' | 'none' {
  if (activeSignals.length === 0) return 'none';
  if (activeSignals.length >= ATO_ESCALATION_SIGNAL_COUNT) return 'P0';
  return 'P1';
}

// ── Password policy ───────────────────────────────────────────────────────────

/** Minimum password length enforced at the application layer. */
export const PASSWORD_MIN_LENGTH = 12;

/** Whether passwords must contain at least one uppercase letter. */
export const PASSWORD_REQUIRE_UPPERCASE = true;

/** Whether passwords must contain at least one digit. */
export const PASSWORD_REQUIRE_DIGIT = true;

/** Whether passwords must contain at least one special character. */
export const PASSWORD_REQUIRE_SPECIAL = true;

/**
 * Validates a plaintext password against the policy rules.
 * Returns an array of human-readable violation messages (empty = valid).
 */
export function validatePassword(password: string): string[] {
  const violations: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    violations.push(`En az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`);
  }
  if (PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    violations.push('En az bir büyük harf içermelidir');
  }
  if (PASSWORD_REQUIRE_DIGIT && !/\d/.test(password)) {
    violations.push('En az bir rakam içermelidir');
  }
  if (PASSWORD_REQUIRE_SPECIAL && !/[^A-Za-z0-9]/.test(password)) {
    violations.push('En az bir özel karakter içermelidir (!, @, #, vb.)');
  }
  return violations;
}
