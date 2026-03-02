/**
 * policyPin.ts — POLICY_PIN_SPEC@1.2
 *
 * The policy snapshot captures the version allowlist, freshness windows,
 * storage/notarization policies, provenance pins, and revocation list hashes.
 *
 * policy_pin_hash = H("UIUX_POLICY_PIN_V1", JCS(policy_snapshot))
 *
 * Key properties:
 *   - Producer MUST include policy_pin_hash in signed_root_payload.
 *   - Verifier MUST reject if DB evidence policy_pin_hash ≠ expected.
 *   - Downgrade: if evidence references a disallowed spec version → P0 fail.
 *   - Policy snapshot itself is signed externally (trust root).
 */

import { hJcsHex, jcs, c14nHash, TAGS } from "./canonicalJson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProvEnancePin {
  repo_allowlist_hash:           string;
  workflow_allowlist_hash:       string;
  ref_allowlist_hash:            string;
  runner_image_digest_allowlist_hash: string;
}

export interface NotarizationPolicy {
  required_for_rc: boolean;
  mode:            "NOTARIZATION_MODE_TSA" | "NOTARIZATION_MODE_TLOG";
}

/** POLICY_PIN_SPEC@1.2 canonical snapshot. */
export interface PolicySnapshot {
  readonly spec:  "POLICY_PIN_SPEC@1.2";
  readonly allowed: {
    SIGNED_ROOT_SPEC:           string[];
    VERIFICATION_SPEC:          string[];
    AUDIT_ROOT_SPEC:            string[];
    ARTIFACT_INDEX_SPEC:        string[];
    PATH_CANON_SPEC:            string[];
    GLOB_SPEC:                  string[];
    ARTIFACT_NORMALIZATION_SPEC: string[];
    ATTESTATION_SPEC:           string[];
  };
  readonly freshness_window_seconds:    number;
  readonly drift_budget_seconds:        number;
  readonly storage_policy_ref:          string;
  readonly provenance_pin:              ProvEnancePin;
  readonly notarization_policy:         NotarizationPolicy;
  readonly trusted_identities_allowlist_hash: string;
  readonly trusted_issuers_allowlist_hash:    string;
  readonly revocation_list_hash:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical v6.4 policy (embed in CI; override with env for rotation)
// ─────────────────────────────────────────────────────────────────────────────

export const POLICY_V64: Omit<PolicySnapshot, "provenance_pin" | "trusted_identities_allowlist_hash" | "trusted_issuers_allowlist_hash" | "revocation_list_hash"> = {
  spec: "POLICY_PIN_SPEC@1.2",
  allowed: {
    SIGNED_ROOT_SPEC:            ["6.4"],
    VERIFICATION_SPEC:           ["6.4"],
    AUDIT_ROOT_SPEC:             ["6.4"],
    ARTIFACT_INDEX_SPEC:         ["6.4"],
    PATH_CANON_SPEC:             ["1.0"],
    GLOB_SPEC:                   ["1.0"],
    ARTIFACT_NORMALIZATION_SPEC: ["1.0"],
    ATTESTATION_SPEC:            ["1.0"],
  },
  freshness_window_seconds: 1800,
  drift_budget_seconds:     300,
  storage_policy_ref:       "STORAGE_IMMUTABILITY_SPEC@1.0",
  notarization_policy: {
    required_for_rc: true,
    mode:            "NOTARIZATION_MODE_TSA",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Hash computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute policy_pin_hash from a PolicySnapshot.
 * policy_pin_hash = H("UIUX_POLICY_PIN_V1", JCS(policy))
 */
export function computePolicyPinHash(policy: PolicySnapshot): string {
  return hJcsHex(TAGS.POLICY_PIN, policy);
}

/**
 * Verify that a claimed policy_pin_hash matches the provided snapshot.
 */
export function verifyPolicyPinHash(
  policy: PolicySnapshot,
  claimedHash: string,
): boolean {
  return computePolicyPinHash(policy) === claimedHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spec version allowlist check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a given spec name@version string is allowed by the policy.
 * Throws (P0) if version is disallowed (downgrade detection).
 *
 * @param policy  Active policy snapshot.
 * @param specKey Key in policy.allowed (e.g. "SIGNED_ROOT_SPEC")
 * @param version Version string (e.g. "6.4")
 */
export function assertSpecVersionAllowed(
  policy: PolicySnapshot,
  specKey: keyof PolicySnapshot["allowed"],
  version: string,
): void {
  const allowed = policy.allowed[specKey] as string[];
  if (!allowed.includes(version)) {
    throw new Error(
      `POLICY_DOWNGRADE: spec ${specKey} version "${version}" not in allowlist [${allowed.join(",")}]`,
    );
  }
}
