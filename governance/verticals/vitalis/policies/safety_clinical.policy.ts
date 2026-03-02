/**
 * Clinical / Professional Safety Policy
 * Vitalis Elite Medical Dating — Governance v2.6.2
 *
 * Defines: location privacy defaults, professional report reason taxonomy,
 * escalation triggers, and SLA tiers for safety cases.
 */

// ── Location privacy defaults ─────────────────────────────────────────────────

/**
 * Default visibility settings for location-related profile fields.
 * All fields are private by default; users must opt-in to share.
 *
 * city         — city-level location display
 * institution  — hospital / clinic / university name
 * specialty    — medical specialty (can narrow down workplace)
 */
export const LOCATION_DEFAULTS = {
  city: false,
  institution: false,
  specialty: false,
} as const;

export type LocationField = keyof typeof LOCATION_DEFAULTS;

/**
 * Returns whether a given location field is visible by default.
 */
export function isLocationVisibleByDefault(field: LocationField): boolean {
  return LOCATION_DEFAULTS[field];
}

// ── Professional report reasons ───────────────────────────────────────────────

/**
 * Curated list of report reasons for a healthcare professional dating context.
 * Includes both standard dating-app reasons and profession-specific ones.
 *
 * escalate: true  → Immediate P0 moderation (1-hour SLA)
 * escalate: false → Standard P1 queue (24-hour SLA)
 */
export const PROFESSIONAL_REPORT_REASONS = [
  {
    code: 'harassment',
    label: 'Taciz / Rahatsız Edici Davranış',
    escalate: false,
    description: 'Unwanted contact, offensive messages, or intimidating behaviour.',
  },
  {
    code: 'stalking',
    label: 'Takip / Doxxing',
    escalate: true,
    description: 'Persistent unwanted contact, physical following, or sharing personal info without consent.',
  },
  {
    code: 'hierarchy_abuse',
    label: 'Mesleki Hiyerarşi İstismarı',
    escalate: true,
    description: 'Using seniority (attending vs. resident, etc.) to coerce or pressure.',
  },
  {
    code: 'impersonation',
    label: 'Kimlik Taklidi',
    escalate: true,
    description: 'Pretending to be another specific person (colleague, public figure).',
  },
  {
    code: 'fake_credentials',
    label: 'Sahte Mesleki Bilgiler',
    escalate: true,
    description: 'Falsified diplomas, license numbers, or institutional affiliation.',
  },
  {
    code: 'ethics_violation',
    label: 'Mesleki Etik İhlali',
    escalate: true,
    description: 'Conduct that would violate the Turkish Medical Association (TTB) or relevant professional body ethics codes.',
  },
  {
    code: 'explicit_content',
    label: 'Müstehcen İçerik',
    escalate: false,
    description: 'Unsolicited explicit photos, videos, or messages.',
  },
  {
    code: 'other',
    label: 'Diğer',
    escalate: false,
    description: 'Any other violation not covered by the above categories.',
  },
] as const;

export type ReportReasonCode = typeof PROFESSIONAL_REPORT_REASONS[number]['code'];

/**
 * Returns the full reason object for a given report reason code,
 * or undefined if the code is not recognized.
 */
export function getReportReason(
  code: ReportReasonCode,
): typeof PROFESSIONAL_REPORT_REASONS[number] | undefined {
  return PROFESSIONAL_REPORT_REASONS.find((r) => r.code === code);
}

/**
 * Returns true if the report reason requires immediate escalation to P0.
 * Returns false for unrecognized codes (fail-safe).
 */
export function requiresImmediateEscalation(code: ReportReasonCode): boolean {
  return PROFESSIONAL_REPORT_REASONS.find((r) => r.code === code)?.escalate ?? false;
}

// ── Escalation SLA ────────────────────────────────────────────────────────────

/**
 * Maximum hours to first moderator action per escalation tier.
 *
 * immediate — requires_immediate_escalation = true (P0)
 * standard  — default report queue           (P1)
 */
export const ESCALATION_SLA_HOURS = {
  immediate: 1,
  standard: 24,
} as const;

export type EscalationTier = keyof typeof ESCALATION_SLA_HOURS;

/**
 * Determine the escalation tier for a report based on its reason code.
 */
export function getEscalationTier(code: ReportReasonCode): EscalationTier {
  return requiresImmediateEscalation(code) ? 'immediate' : 'standard';
}

/**
 * Compute the SLA deadline (ISO-8601) for a report.
 *
 * @param reportedAt  ISO-8601 string when the report was submitted
 * @param code        Report reason code
 */
export function computeReportSlaAt(reportedAt: string, code: ReportReasonCode): string {
  const base = new Date(reportedAt);
  if (isNaN(base.getTime())) {
    throw new Error(`Invalid reportedAt timestamp: ${reportedAt}`);
  }
  const tier = getEscalationTier(code);
  base.setHours(base.getHours() + ESCALATION_SLA_HOURS[tier]);
  return base.toISOString();
}

// ── Safety escalation guards ──────────────────────────────────────────────────

/**
 * Minimum trust level (0–6) required to send a date invitation.
 * Prevents unverified accounts from initiating real-world meetups.
 *
 * Level 3 = institution verified
 */
export const MIN_TRUST_LEVEL_FOR_DATE_INVITE = 3;

/**
 * Returns true if the user's trust level is sufficient to send a date invitation.
 */
export function canSendDateInvitation(trustLevel: number): boolean {
  return trustLevel >= MIN_TRUST_LEVEL_FOR_DATE_INVITE;
}
