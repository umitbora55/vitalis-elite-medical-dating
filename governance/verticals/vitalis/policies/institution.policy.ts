/**
 * Institution Verification Policy
 * Vitalis Elite Medical Dating — Governance v2.6.2
 *
 * Defines: institution tier auto-verify rules, disposable email domain deny-list,
 * and typosquat detection via Levenshtein distance.
 */

// ── Auto-verify tiers ─────────────────────────────────────────────────────────

/**
 * Institution tiers eligible for automatic verification without manual review.
 * Tier 1 = top-tier hospitals / universities (e.g. Hacettepe, İstanbul Tıp)
 * Tier 2 = accredited regional hospitals / universities
 * Tier 3+ = require manual review
 */
export const AUTO_VERIFY_TIERS = [1, 2] as const;
export type AutoVerifyTier = typeof AUTO_VERIFY_TIERS[number];

// ── Disposable email deny-list ────────────────────────────────────────────────

/**
 * Known disposable / temporary email service domains.
 * Checked via substring match to catch subdomains.
 */
export const DISPOSABLE_EMAIL_DOMAINS: readonly string[] = [
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'dispostable.com',
  'fakeinbox.com',
  'maildrop.cc',
  'spam4.me',
  'spamgourmet.com',
  'getairmail.com',
  'discard.email',
];

/**
 * Returns true if the given email domain is a known disposable email provider.
 * Uses substring matching to handle subdomains.
 */
export function isDisposableEmail(domain: string): boolean {
  const normalized = domain.toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.some((d) => normalized.includes(d));
}

// ── Auto-verify decision ───────────────────────────────────────────────────────

/**
 * Returns true if an institution email can be auto-verified without
 * manual moderator review.
 *
 * Conditions:
 *  1. Email domain is NOT disposable
 *  2. Institution tier is 1 or 2
 */
export function canAutoVerify(
  emailDomain: string,
  institutionTier: number | null,
): boolean {
  if (isDisposableEmail(emailDomain)) return false;
  if (institutionTier === null) return false;
  return (AUTO_VERIFY_TIERS as readonly number[]).includes(institutionTier);
}

// ── Typosquat detection ───────────────────────────────────────────────────────

/**
 * Computes the Levenshtein edit distance between two strings.
 * Used to detect near-identical (typosquatted) domain names.
 *
 * @param a  First string
 * @param b  Second string
 * @returns  Edit distance (0 = identical)
 */
export function typosquatDistance(a: string, b: string): number {
  const dp: number[][] = Array.from(
    { length: a.length + 1 },
    (_row, i) =>
      Array.from({ length: b.length + 1 }, (_col, j) =>
        i === 0 ? j : j === 0 ? i : 0,
      ),
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[a.length][b.length];
}

/**
 * Returns true if the domain appears to be a typosquat of any known-good domain.
 *
 * A domain is a suspected typosquat when:
 *  - It is NOT identical to a known domain (distance > 0)
 *  - Its edit distance to a known domain is <= threshold (default: 2)
 *
 * @param domain       The email domain to check (e.g. "hacettepe.edu.tr")
 * @param knownDomains List of verified institution domains to compare against
 * @param threshold    Maximum edit distance to flag as typosquat (default: 2)
 */
export function isSuspectedTyposquat(
  domain: string,
  knownDomains: string[],
  threshold = 2,
): boolean {
  const normalized = domain.toLowerCase().trim();
  return knownDomains.some((known) => {
    const dist = typosquatDistance(normalized, known.toLowerCase().trim());
    return dist > 0 && dist <= threshold;
  });
}

// ── Domain normalization ──────────────────────────────────────────────────────

/**
 * Extract the domain portion from an email address.
 * Returns null if the email is malformed.
 *
 * @example extractEmailDomain("doktor@hacettepe.edu.tr") // "hacettepe.edu.tr"
 */
export function extractEmailDomain(email: string): string | null {
  const parts = email.trim().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1].toLowerCase();
}
