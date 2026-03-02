/**
 * License Verification Policy
 * Vitalis Elite Medical Dating — Governance v2.6.2
 *
 * Defines: evidence types, document classes, quality thresholds,
 * SLA rules, and annual re-verify schedules for healthcare license checks.
 */

// ── Evidence & document taxonomy ──────────────────────────────────────────────

export const EVIDENCE_TYPES = [
  'document_upload',
  'registry_lookup',
  'manual_review',
] as const;

export const DOCUMENT_CLASSES = [
  'diploma',
  'license',
  'chamber',
  'employment_doc',
] as const;

export type EvidenceType = typeof EVIDENCE_TYPES[number];
export type DocumentClass = typeof DOCUMENT_CLASSES[number];

// ── Quality thresholds ─────────────────────────────────────────────────────────

/** Minimum OCR/image quality score (0–1) required to process a document. */
export const DOCUMENT_QUALITY_THRESHOLD = 0.7;

// ── SLA definitions ───────────────────────────────────────────────────────────

/**
 * Maximum hours to first moderator action per priority tier.
 *
 * P0_HIGH_RISK  — risk_score > 70 or fraud flags present  → 1 h
 * P1_NORMAL     — routine license / diploma review         → 24 h
 * P2_NEED_INFO  — awaiting additional user documents       → 72 h
 */
export const SLA_HOURS = {
  P0_HIGH_RISK: 1,
  P1_NORMAL: 24,
  P2_NEED_INFO: 72,
} as const;

export type SlaPriority = keyof typeof SLA_HOURS;

/**
 * Compute SLA deadline from a submission timestamp.
 *
 * @param submittedAt  ISO-8601 string of submission time
 * @param priority     Which SLA bucket applies
 * @returns            ISO-8601 deadline string
 */
export function computeSlaDueAt(submittedAt: string, priority: SlaPriority): string {
  const base = new Date(submittedAt);
  if (isNaN(base.getTime())) {
    throw new Error(`Invalid submittedAt timestamp: ${submittedAt}`);
  }
  base.setHours(base.getHours() + SLA_HOURS[priority]);
  return base.toISOString();
}

// ── Re-verify schedule ─────────────────────────────────────────────────────────

/**
 * Document classes that expire and require annual re-verification.
 * 'diploma' and 'employment_doc' do not expire.
 */
export const EXPIRING_DOC_CLASSES: DocumentClass[] = ['license', 'chamber'];

/** Number of days after which an expiring document must be re-verified. */
export const RE_VERIFY_DAYS = 365;

/**
 * Returns true if the given document class requires annual re-verification.
 */
export function requiresAnnualReVerify(docClass: DocumentClass): boolean {
  return EXPIRING_DOC_CLASSES.includes(docClass);
}

/**
 * Compute the re-verify deadline for a verified document.
 *
 * @param verifiedAt  ISO-8601 string of the verification approval date
 * @returns           ISO-8601 expiry string, or null if the class never expires
 */
export function computeReVerifyExpiresAt(
  verifiedAt: string,
  docClass: DocumentClass,
): string | null {
  if (!requiresAnnualReVerify(docClass)) return null;
  const base = new Date(verifiedAt);
  if (isNaN(base.getTime())) {
    throw new Error(`Invalid verifiedAt timestamp: ${verifiedAt}`);
  }
  base.setDate(base.getDate() + RE_VERIFY_DAYS);
  return base.toISOString();
}

// ── Reviewer decision rules ───────────────────────────────────────────────────

/**
 * Returns true if the given reviewer decision requires a reason code.
 * Approved decisions do not require a reason; rejections and info requests do.
 */
export function requiresReasonCode(decision: string): boolean {
  return decision === 'reject' || decision === 'need_more_info';
}

// ── Reason code catalog ───────────────────────────────────────────────────────

export const REASON_CODES = [
  'unreadable',
  'expired',
  'suspected_fake',
  'name_mismatch',
  'wrong_doc_type',
  'not_active',
  'other',
] as const;

export type ReasonCode = typeof REASON_CODES[number];

/**
 * Human-readable Turkish labels for reason codes (displayed to user in
 * rejection notifications).
 */
export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  unreadable:      'Belge okunamıyor — lütfen daha net bir fotoğraf yükleyin',
  expired:         'Belge süresi dolmuş — güncel belge gereklidir',
  suspected_fake:  'Belge orijinalliği doğrulanamadı',
  name_mismatch:   'Belgedeki isim profil ismiyle eşleşmiyor',
  wrong_doc_type:  'Yanlış belge türü yüklenmiş',
  not_active:      'Lisans/üyelik aktif değil',
  other:           'Diğer — moderatör notuna bakınız',
};
