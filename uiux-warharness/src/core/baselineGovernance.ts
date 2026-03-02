/**
 * baselineGovernance.ts — Baseline governance
 *
 * Captures baseline change metadata with PR ref, merge commit,
 * codeowner review IDs, CI attestation, and optional signature.
 */

import { hJcsHex } from "./canonicalJson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BaselineChangeRecord {
  readonly pr_ref:                string;    // e.g. "refs/pull/123/merge"
  readonly merge_commit:          string;    // 40-char git SHA
  readonly codeowner_review_ids:  string[];  // GitHub review IDs
  readonly ci_attestation_hash:   string;    // hex — hash of CI attestation payload
  readonly changed_at:            string;    // RFC3339
  readonly signature?:            string;    // optional base64 Ed25519 signature
}

export interface BaselineChangeArgs {
  prRef:               string;
  mergeCommit:         string;
  codeownerReviewIds:  string[];
  ciAttestationHash:   string;
  changedAt:           string;    // RFC3339
  signature?:          string;    // base64 Ed25519 over the record hash
}

export interface BaselineChangeResult {
  record:      BaselineChangeRecord;
  recordHash:  string;   // hex
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain tag
// ─────────────────────────────────────────────────────────────────────────────

const BASELINE_TAG = "UIUX_BASELINE_CHANGE_V1" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a BaselineChangeRecord.
 * Returns the record and its hash for signing or storage.
 */
export function buildBaselineChangeRecord(args: BaselineChangeArgs): BaselineChangeResult {
  // Build record without optional signature first (for hash computation)
  const baseRecord = {
    pr_ref:               args.prRef,
    merge_commit:         args.mergeCommit,
    codeowner_review_ids: args.codeownerReviewIds,
    ci_attestation_hash:  args.ciAttestationHash,
    changed_at:           args.changedAt,
  };

  const recordHash = hJcsHex(BASELINE_TAG, baseRecord);

  // Add signature if provided
  const record: BaselineChangeRecord = args.signature !== undefined
    ? { ...baseRecord, signature: args.signature }
    : baseRecord;

  return { record, recordHash };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a BaselineChangeRecord has all required fields.
 * Throws if any required field is missing or empty.
 */
export function validateBaselineChangeRecord(record: BaselineChangeRecord): void {
  if (!record.pr_ref) {
    throw new Error("BASELINE_INVALID: pr_ref is required");
  }
  if (!record.merge_commit || record.merge_commit.length !== 40) {
    throw new Error("BASELINE_INVALID: merge_commit must be 40-char git SHA");
  }
  if (record.codeowner_review_ids.length === 0) {
    throw new Error("BASELINE_INVALID: at least one codeowner_review_id is required");
  }
  if (!record.ci_attestation_hash) {
    throw new Error("BASELINE_INVALID: ci_attestation_hash is required");
  }
  if (!record.changed_at) {
    throw new Error("BASELINE_INVALID: changed_at is required");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Env reader (for CI baseline step)
// ─────────────────────────────────────────────────────────────────────────────

export interface BaselineEnvArgs {
  prRef:               string;
  mergeCommit:         string;
  codeownerReviewIds:  string[];
  ciAttestationHash:   string;
}

/**
 * Read baseline args from environment variables.
 *
 * Expected env vars:
 *   GITHUB_REF              → prRef (e.g. refs/pull/123/merge)
 *   GITHUB_SHA              → mergeCommit
 *   WAR_CODEOWNER_REVIEWS   → comma-separated review IDs
 *   WAR_CI_ATTESTATION_HASH → hex hash of CI attestation
 */
export function baselineArgsFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): BaselineEnvArgs {
  function req(key: string): string {
    const v = env[key];
    if (!v) throw new Error(`baseline: missing required env var ${key}`);
    return v;
  }

  const reviewsRaw = env["WAR_CODEOWNER_REVIEWS"] ?? "";
  const codeownerReviewIds = reviewsRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return {
    prRef:              req("GITHUB_REF"),
    mergeCommit:        req("GITHUB_SHA"),
    codeownerReviewIds,
    ciAttestationHash:  req("WAR_CI_ATTESTATION_HASH"),
  };
}
