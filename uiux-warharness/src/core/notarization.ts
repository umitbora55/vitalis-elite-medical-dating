/**
 * notarization.ts — NOTARIZATION_SPEC@1.0
 *
 * Two modes:
 *   NOTARIZATION_MODE_TSA  — RFC 3161 Time-Stamp Authority
 *   NOTARIZATION_MODE_TLOG — Transparency log (e.g. Rekor)
 *
 * Stub implementations — real TSA/tlog clients are external.
 */

import { hHex, hJcsHex } from "./canonicalJson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotarizationMode = "NOTARIZATION_MODE_TSA" | "NOTARIZATION_MODE_TLOG";

export interface NotarizationResult {
  mode:       NotarizationMode;
  tokenHash:  string;    // hex — sha256 of the raw token bytes
  ref:        string;    // opaque reference (TSA URL, tlog entry ID, etc.)
  verifiedAt: string;    // RFC3339
  ok:         boolean;
  reason?:    string;
}

export interface NotarizationOpts {
  /** TSA endpoint URL (for MODE_TSA) */
  tsaUrl?:        string;
  /** Transparency log endpoint URL (for MODE_TLOG) */
  tlogUrl?:       string;
  /** Optional timeout in ms */
  timeoutMs?:     number;
  /** Accepted notarization policies (e.g. OID for TSA policy) */
  policyOid?:     string;
}

/** Stored notarization token (for anchor row) */
export interface NotarizationToken {
  mode:        NotarizationMode;
  token_b64:   string;   // base64-encoded raw token
  ref:         string;
  verified_at: string;   // RFC3339
}

// Domain tag for token hashing
const NOTARIZATION_TOKEN_TAG = "UIUX_NOTARIZATION_TOKEN_V1" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Token hash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute tokenHash = H("UIUX_NOTARIZATION_TOKEN_V1", raw_token_bytes)
 */
export function computeTokenHash(rawTokenBytes: Buffer): string {
  return hHex(NOTARIZATION_TOKEN_TAG, rawTokenBytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit notarization (STUB)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a content hash for notarization.
 *
 * STUB: real implementation calls TSA (RFC 3161) or Rekor (tlog).
 *
 * @param anchorContentHash  Hex hash of the anchor content to notarize
 * @param mode               Notarization mode
 * @param opts               Notarization options (endpoint URLs, etc.)
 */
export async function submitNotarization(
  anchorContentHash: string,
  mode: NotarizationMode,
  opts: NotarizationOpts,
): Promise<NotarizationResult> {
  void opts;

  // STUB: production calls TSA or tlog API
  const verifiedAt = new Date().toISOString();

  switch (mode) {
    case "NOTARIZATION_MODE_TSA":
      return {
        mode,
        tokenHash:  "",
        ref:        `tsa-stub:${anchorContentHash}`,
        verifiedAt,
        ok:         false,
        reason:     "NOTARIZATION_TSA_STUB: TSA client not implemented",
      };

    case "NOTARIZATION_MODE_TLOG":
      return {
        mode,
        tokenHash:  "",
        ref:        `tlog-stub:${anchorContentHash}`,
        verifiedAt,
        ok:         false,
        reason:     "NOTARIZATION_TLOG_STUB: tlog client not implemented",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify notarization token (STUB)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a notarization token against an expected content hash.
 *
 * STUB: production parses TSA response (RFC 3161 TimeStampResp) or
 * fetches tlog entry and validates inclusion proof.
 *
 * @param tokenB64      Base64-encoded notarization token
 * @param expectedHash  Hex hash that was submitted for notarization
 */
export function verifyNotarizationToken(
  tokenB64: string,
  expectedHash: string,
): boolean {
  // STUB: always returns false — real implementation parses token
  void tokenB64;
  void expectedHash;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notarization payload hash (for anchor_set)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a stable hash of notarization metadata (for inclusion in anchor payload).
 */
export function computeNotarizationMetaHash(meta: {
  mode:       NotarizationMode;
  token_hash: string;
  ref:        string;
}): string {
  return hJcsHex(NOTARIZATION_TOKEN_TAG, meta);
}
