/**
 * timeModel.ts — TIME_MODEL_SPEC@1.1
 *
 * Fields:
 *   created_at_claimed      (producer payload, UTC RFC3339)
 *   ingested_at             (DB insert time, UTC)
 *   verified_at_claimed     (verifier payload, UTC RFC3339)
 *   verified_at_observed    (verification row created_at, UTC)
 *   anchor_written_at_observed (anchor row created_at, UTC)
 *   notarized_at            (optional; TSA/log-verified)
 *
 * Freshness rule (P0):
 *   verified_at_observed MUST be in [ingested_at, ingested_at + freshness_window + drift_budget]
 *   If not → STALE_VERIFICATION → quorum fail (P0)
 *
 * effective_time (for trust root revocation):
 *   Default: evidence.ingested_at
 *   If notarized: notarized_at (preferred — externallyattested)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants (POLICY_PIN_SPEC@1.2 defaults)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_FRESHNESS_WINDOW_SECONDS = 1800; // 30 min
export const DEFAULT_DRIFT_BUDGET_SECONDS     = 300;  // 5 min

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FreshnessResult {
  ok:                         boolean;
  reason:                     string | null;
  freshness_window_seconds:   number;
  drift_budget_seconds:       number;
  verified_at_observed_ms:    number;
  ingested_at_ms:             number;
  window_end_ms:              number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Freshness check (P0)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify that verified_at_observed falls within the allowed freshness window.
 *
 * Rule:
 *   verified_at_observed IN [ingested_at, ingested_at + freshness_window + drift_budget]
 */
export function checkFreshness(args: {
  ingestedAt:             Date | string;
  verifiedAtObserved:     Date | string;
  freshnessWindowSeconds?: number;
  driftBudgetSeconds?:    number;
}): FreshnessResult {
  const window = args.freshnessWindowSeconds ?? DEFAULT_FRESHNESS_WINDOW_SECONDS;
  const drift  = args.driftBudgetSeconds     ?? DEFAULT_DRIFT_BUDGET_SECONDS;

  const ingestedMs  = toMs(args.ingestedAt);
  const observedMs  = toMs(args.verifiedAtObserved);
  const windowEndMs = ingestedMs + (window + drift) * 1000;

  const tooEarly = observedMs < ingestedMs;
  const tooLate  = observedMs > windowEndMs;

  let reason: string | null = null;
  if (tooEarly) {
    reason = `STALE_VERIFICATION: verified_at_observed (${observedMs}) < ingested_at (${ingestedMs})`;
  } else if (tooLate) {
    reason =
      `STALE_VERIFICATION: verified_at_observed (${observedMs}) > ` +
      `ingested_at + window + drift (${windowEndMs})`;
  }

  return {
    ok:                       !tooEarly && !tooLate,
    reason,
    freshness_window_seconds: window,
    drift_budget_seconds:     drift,
    verified_at_observed_ms:  observedMs,
    ingested_at_ms:           ingestedMs,
    window_end_ms:            windowEndMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// effective_time (for trust root revocation checks)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the effective_time for revocation checking.
 *   - If notarized_at is available (externally attested): prefer it.
 *   - Otherwise: use ingested_at.
 */
export function effectiveTime(args: {
  ingestedAt:   Date | string;
  notarizedAt?: Date | string | null;
}): Date {
  if (args.notarizedAt != null) {
    return new Date(args.notarizedAt);
  }
  return new Date(args.ingestedAt);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toMs(d: Date | string): number {
  return (typeof d === "string" ? new Date(d) : d).getTime();
}

/** Format a Date as RFC3339 UTC string (e.g. "2026-02-28T12:00:00.000Z"). */
export function toRfc3339(d: Date = new Date()): string {
  return d.toISOString();
}
