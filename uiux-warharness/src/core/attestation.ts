/**
 * attestation.ts — ATTESTATION_SPEC@1.0 verification
 *
 * AttestedPayload carries CI provenance fields.
 * attestation_hash = H("UIUX_ATTESTATION_V1", JCS(attestation))
 *
 * verifyAttestation checks that repo/workflow/ref/runner_image_digest
 * are in the policy allowlists (by matching hashes from policyPin provenance_pin).
 */

import { hJcsHex, hHex } from "./canonicalJson.js";
import type { PolicySnapshot } from "./policyPin.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AttestedPayload {
  readonly spec:                  "ATTESTATION_SPEC@1.0";
  readonly repo:                  string;
  readonly commit_sha:            string;
  readonly workflow:              string;
  readonly ref:                   string;
  readonly runner_image_digest:   string;
  readonly build_started_at:      string;   // RFC3339
  readonly subject_hash:          string;   // hex — hash of the attested artifact
}

export type AttestationStatus = "PASS" | "FAIL";

export interface AttestationResult {
  ok:                   boolean;
  status:               AttestationStatus;
  attestation_hash:     string;
  failures:             string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain tag for attestation hash
// ─────────────────────────────────────────────────────────────────────────────

const ATTESTATION_TAG = "UIUX_ATTESTATION_V1" as const;

// ─────────────────────────────────────────────────────────────────────────────
// Hash computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute attestation_hash = H("UIUX_ATTESTATION_V1", JCS(attestation))
 */
export function computeAttestationHash(att: AttestedPayload): string {
  return hJcsHex(ATTESTATION_TAG, att);
}

// ─────────────────────────────────────────────────────────────────────────────
// Allowlist matching helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash a string value for allowlist comparison.
 * H("UIUX_ATTESTATION_V1", utf8_bytes(value))
 */
function hashAllowlistValue(value: string): string {
  return hHex(ATTESTATION_TAG, Buffer.from(value, "utf-8"));
}

/**
 * Check if a value's hash matches any hash in an allowlist hash array.
 * Allowlist hashes are H(tag, utf8(value)) for each allowed value.
 */
function isInAllowlist(value: string, allowlistHash: string): boolean {
  const valueHash = hashAllowlistValue(value);
  // allowlistHash is a single hash representing the set of allowed values.
  // In production, this is checked via the policy's provenance_pin hashes.
  // For MVP: we compare the value hash against the stored allowlist hash directly.
  // This is a simplified model — production would verify against a merkle set.
  return valueHash === allowlistHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify an ATTESTATION_SPEC@1.0 payload against the active policy.
 *
 * Checks that:
 *   1. spec field is exactly "ATTESTATION_SPEC@1.0"
 *   2. repo hash matches policy.provenance_pin.repo_allowlist_hash
 *   3. workflow hash matches policy.provenance_pin.workflow_allowlist_hash
 *   4. ref hash matches policy.provenance_pin.ref_allowlist_hash
 *   5. runner_image_digest hash matches policy.provenance_pin.runner_image_digest_allowlist_hash
 *
 * Note: For environments where allowlist hashes are set to zero/placeholder,
 * the check will fail with ATTESTATION_NOT_IN_ALLOWLIST. Production deployments
 * must populate the provenance_pin with actual hashes.
 */
export function verifyAttestation(
  att: AttestedPayload,
  policy: PolicySnapshot,
): AttestationResult {
  const failures: string[] = [];

  // Spec version check
  if (att.spec !== "ATTESTATION_SPEC@1.0") {
    failures.push(`ATTESTATION_WRONG_SPEC: got "${att.spec}", expected "ATTESTATION_SPEC@1.0"`);
  }

  // Allowlist checks via provenance_pin hashes
  const pin = policy.provenance_pin;

  if (!isInAllowlist(att.repo, pin.repo_allowlist_hash)) {
    failures.push(
      `ATTESTATION_NOT_IN_ALLOWLIST: repo "${att.repo}" hash not in repo_allowlist`,
    );
  }

  if (!isInAllowlist(att.workflow, pin.workflow_allowlist_hash)) {
    failures.push(
      `ATTESTATION_NOT_IN_ALLOWLIST: workflow "${att.workflow}" hash not in workflow_allowlist`,
    );
  }

  if (!isInAllowlist(att.ref, pin.ref_allowlist_hash)) {
    failures.push(
      `ATTESTATION_NOT_IN_ALLOWLIST: ref "${att.ref}" hash not in ref_allowlist`,
    );
  }

  if (!isInAllowlist(att.runner_image_digest, pin.runner_image_digest_allowlist_hash)) {
    failures.push(
      `ATTESTATION_NOT_IN_ALLOWLIST: runner_image_digest "${att.runner_image_digest}" hash not in allowlist`,
    );
  }

  const ok             = failures.length === 0;
  const attestationHash = computeAttestationHash(att);

  return {
    ok,
    status:           ok ? "PASS" : "FAIL",
    attestation_hash: attestationHash,
    failures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build allowlist hash helpers (for populating provenance_pin in policy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the allowlist hash for a single string value.
 * Use this to populate provenance_pin fields.
 *
 * Example:
 *   repo_allowlist_hash = computeAllowlistHash("github.com/vitalis/app")
 */
export function computeAllowlistHash(value: string): string {
  return hashAllowlistValue(value);
}
