/**
 * canonicalJson.ts — JCS (RFC 8785) + domain-separated hash function
 *
 * SECURITY INVARIANTS (spec section 1.2):
 *   1. All hash inputs for security-critical fields MUST use H(tag, bytes).
 *   2. String concatenation for hashing is FORBIDDEN.
 *   3. H(tag, bytes) = sha256(tag_ASCII || 0x00 || bytes)
 *      The 0x00 separator prevents tag-from-data confusion.
 *   4. JCS bytes (UTF-8) are always the "bytes" input for JSON payloads.
 *
 * Domain tags (spec): keep in sync with spec/SIGNED_ROOT_SPEC, AUDIT_ROOT_SPEC, etc.
 */

import { createHash } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// JCS — RFC 8785 JSON Canonicalization Scheme
// Implementation follows ES ECMAScript toString for numbers (IEEE 754),
// key ordering by Unicode code point (same as JS string comparison).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonicalize a JSON value to its RFC 8785 (JCS) byte representation.
 * Returns a Buffer containing the UTF-8 encoded canonical JSON string.
 */
export function jcs(value: unknown): Buffer {
  return Buffer.from(_jcsString(value), "utf-8");
}

/**
 * Return the JCS canonical string form of a value.
 * Use jcs() when you need the bytes; use this internally.
 */
export function jcsString(value: unknown): string {
  return _jcsString(value);
}

function _jcsString(value: unknown): string {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";

  if (typeof value === "number") {
    // RFC 8785 §3.2.2: NaN and Infinity are not valid JSON
    if (!Number.isFinite(value)) {
      throw new TypeError(`JCS: non-finite number not allowed: ${value}`);
    }
    // ECMAScript Number::toString — same as JSON.stringify for finite numbers
    return value.toString();
  }

  if (typeof value === "string") {
    return JSON.stringify(value); // standard string escaping
  }

  if (Array.isArray(value)) {
    return "[" + value.map(_jcsString).join(",") + "]";
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // RFC 8785 §3.2.3: keys sorted by Unicode code point (JS string comparison)
    const keys = Object.keys(obj).sort();
    const pairs = keys
      .filter((k) => obj[k] !== undefined) // skip undefined properties
      .map((k) => `${JSON.stringify(k)}:${_jcsString(obj[k])}`);
    return "{" + pairs.join(",") + "}";
  }

  throw new TypeError(`JCS: unsupported type: ${typeof value}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain-separated hash function (spec section 1.2)
// H(tag, bytes) = sha256(tag_ASCII_bytes || 0x00 || bytes)
// ─────────────────────────────────────────────────────────────────────────────

const DOMAIN_SEPARATOR = Buffer.from([0x00]);

/**
 * Domain-separated SHA-256 hash.
 * H(tag, bytes) = sha256(tag_ASCII || 0x00 || bytes)
 *
 * NEVER use string concatenation:  sha256("tag" + payload_string) is WRONG.
 *
 * @param tag   ASCII domain tag (e.g. "UIUX_SIGNED_ROOT_V1")
 * @param bytes Payload bytes (typically jcs(value))
 */
export function H(tag: string, bytes: Buffer | Uint8Array): Buffer {
  return createHash("sha256")
    .update(Buffer.from(tag, "ascii"))
    .update(DOMAIN_SEPARATOR)
    .update(bytes)
    .digest();
}

/**
 * Hex-encoded domain-separated hash.
 */
export function hHex(tag: string, bytes: Buffer | Uint8Array): string {
  return H(tag, bytes).toString("hex");
}

/**
 * Convenience: H(tag, JCS(value)) → hex.
 * Use for all structured payload hashes.
 */
export function hJcsHex(tag: string, value: unknown): string {
  return hHex(tag, jcs(value));
}

// ─────────────────────────────────────────────────────────────────────────────
// c14n hash (forensic fields) — spec section 1.4
// sha256(JCS(payload)) — NO domain separation (by spec design)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Forensic canonicalization hash: sha256(JCS(value)).
 * Used for *_c14n_hash fields. Not domain-separated (by spec).
 */
export function c14nHash(value: unknown): string {
  return createHash("sha256").update(jcs(value)).digest("hex");
}

/**
 * Plain SHA-256 hex of raw bytes.
 * Used for storage content addressing (not domain-separated).
 */
export function sha256Hex(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain tag constants (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────

export const TAGS = {
  SIGNED_ROOT:       "UIUX_SIGNED_ROOT_V1",
  VERIFICATION_ROOT: "UIUX_VERIFICATION_ROOT_V1",
  CHAIN_NODE:        "UIUX_CHAIN_NODE_V1",
  MERKLE_LEAF:       "UIUX_MERKLE_LEAF_V1",
  MERKLE_NODE:       "UIUX_MERKLE_NODE_V1",
  ARTIFACT_INDEX:    "UIUX_ARTIFACT_INDEX_V1",
  POLICY_PIN:        "UIUX_POLICY_PIN_V1",
  ANCHOR_CONTENT:    "UIUX_ANCHOR_CONTENT_V1",
  ANCHOR_POINTER:    "UIUX_ANCHOR_POINTER_V1",
  ANCHOR_SET:        "UIUX_ANCHOR_SET_V1",
  REDACTION_REPORT:  "UIUX_REDACTION_REPORT_V1",
} as const satisfies Record<string, string>;
