/**
 * quorum.ts — Quorum logic (VERIFICATION_SPEC@6.4)
 *
 * P0: 2/2 verifiers must pass.
 * Degraded (1/2): P1 incident.
 * 0/2: P0 fail.
 *
 * Reads from war_verify.uiux_verifications.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkFreshness } from "./timeModel.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QuorumResult {
  ok:                boolean;
  quorum:            string;   // e.g. "2/2" or "1/2"
  verifierCount:     number;
  required:          number;
  degraded:          boolean;
  freshnessFailures: string[];
}

export interface VerificationRow {
  id:                      number;
  run_id:                  string;
  suite:                   string;
  verifier_id:             string;
  created_at:              string;    // verified_at_observed
  freshness_ok:            boolean;
  freshness_reason:        string | null;
  producer_sig_ok:         boolean;
  audit_root_ok:           boolean;
  artifact_index_ok:       boolean;
  manifest_hash_ok:        boolean;
  chain_ok:                boolean;
  anti_fork_ok:            boolean;
  redaction_ok:            boolean;
  storage_immutability_ok: boolean;
  attestation_ok:          boolean;
  notarization_checked:    boolean;
  notarization_ok:         boolean | null;
  verification_root:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quorum check
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_VERIFIERS = 2;

/**
 * Check quorum for a run+suite by reading all verification records.
 * A verification counts toward quorum only if ALL checks pass (ok = true).
 */
export async function checkQuorum(
  runId:   string,
  suite:   string,
  sbAdmin: SupabaseClient,
): Promise<QuorumResult> {
  const { data, error } = await sbAdmin
    .schema("war_verify")
    .from("uiux_verifications")
    .select(
      "id, run_id, suite, verifier_id, created_at, freshness_ok, freshness_reason, " +
      "producer_sig_ok, audit_root_ok, artifact_index_ok, manifest_hash_ok, " +
      "chain_ok, anti_fork_ok, redaction_ok, storage_immutability_ok, " +
      "attestation_ok, notarization_checked, notarization_ok, verification_root",
    )
    .eq("run_id", runId)
    .eq("suite", suite);

  if (error) {
    throw new Error(`quorum: DB error: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as VerificationRow[];
  const freshnessFailures: string[] = [];
  let passingCount = 0;

  for (const row of rows) {
    // A verification passes quorum if all P0 checks are true
    const allChecksPass =
      row.freshness_ok &&
      row.producer_sig_ok &&
      row.audit_root_ok &&
      row.artifact_index_ok &&
      row.manifest_hash_ok &&
      row.chain_ok &&
      row.anti_fork_ok &&
      row.redaction_ok &&
      row.storage_immutability_ok &&
      row.attestation_ok;

    if (!row.freshness_ok && row.freshness_reason) {
      freshnessFailures.push(`verifier=${row.verifier_id}: ${row.freshness_reason}`);
    }

    if (allChecksPass) {
      passingCount++;
    }
  }

  const degraded = passingCount === 1 && rows.length >= 1;
  const ok       = passingCount >= REQUIRED_VERIFIERS;

  return {
    ok,
    quorum:            `${passingCount}/${REQUIRED_VERIFIERS}`,
    verifierCount:     rows.length,
    required:          REQUIRED_VERIFIERS,
    degraded,
    freshnessFailures,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quorum incident severity
// ─────────────────────────────────────────────────────────────────────────────

export type QuorumIncidentSeverity = "P0" | "P1" | "OK";

/**
 * Classify quorum result into incident severity.
 *   OK:     passing >= required
 *   P1:     degraded (1/2)
 *   P0:     0/2 or error
 */
export function classifyQuorumSeverity(result: QuorumResult): QuorumIncidentSeverity {
  if (result.ok) return "OK";
  if (result.degraded) return "P1";
  return "P0";
}
