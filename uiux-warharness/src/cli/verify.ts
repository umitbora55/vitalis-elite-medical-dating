/**
 * verify.ts — Verifier CLI
 *
 * Reads a run from DB, runs all checks, writes verification record.
 *
 * Required env vars:
 *   WAR_RUN_ID                  — run to verify
 *   WAR_SUITE                   — suite name
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   WAR_VERIFIER_PRIVKEY_PEM    — verifier Ed25519 private key
 *   WAR_VERIFIER_KID            — verifier key identifier
 *   WAR_VERIFIER_ID             — verifier identity (e.g. "verifier-1")
 *   WAR_TRUST_ROOT_TYPE         — "SIGSTORE" | "SIGNED_KEYRING" | "KMS_ATTEST"
 *   WAR_TRUST_ROOT_REF          — trust root reference
 *   WAR_POLICY_JSON             — JSON string of PolicySnapshot
 */

import { createClient } from "@supabase/supabase-js";
import { runVerification } from "../core/verifier.js";
import { InMemoryStorageClient } from "../core/storage.js";
import type { TrustRootType } from "../core/trustRoot.js";
import type { PolicySnapshot } from "../core/policyPin.js";
import type { ChainNodePayload } from "../core/chain.js";
import type { LeafPayload } from "../core/auditRoot.js";
import type { ArtifactIndexPayload } from "../core/artifactIndex.js";
import type { RunManifest } from "../core/manifest.js";
import type { AttestedPayload } from "../core/attestation.js";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`verify: missing required env var ${key}`);
  return v;
}

async function main(): Promise<void> {
  console.log("WAR Harness — Verifier CLI (VERIFICATION_SPEC@6.4)");
  console.log("─".repeat(60));

  const runId           = requireEnv("WAR_RUN_ID");
  const suite           = requireEnv("WAR_SUITE");
  const supabaseUrl     = requireEnv("SUPABASE_URL");
  const supabaseKey     = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const verifierPrivKey = requireEnv("WAR_VERIFIER_PRIVKEY_PEM");
  const verifierKid     = requireEnv("WAR_VERIFIER_KID");
  const verifierId      = requireEnv("WAR_VERIFIER_ID");
  const trustRootType   = requireEnv("WAR_TRUST_ROOT_TYPE") as TrustRootType;
  const trustRootRef    = requireEnv("WAR_TRUST_ROOT_REF");
  const policyJson      = requireEnv("WAR_POLICY_JSON");

  console.log(`run_id=${runId} suite=${suite} verifier_id=${verifierId}`);

  const sbAdmin = createClient(supabaseUrl, supabaseKey);
  const policy  = JSON.parse(policyJson) as PolicySnapshot;

  // ── Fetch latest evidence row for this run+suite ─────────────────────
  const { data: evidenceData, error: evidenceError } = await sbAdmin
    .schema("war_evidence")
    .from("uiux_artifacts")
    .select("*")
    .eq("run_id", runId)
    .eq("suite", suite)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (evidenceError) {
    console.error(`Failed to fetch evidence: ${evidenceError.message}`);
    process.exit(1);
  }

  const ev = evidenceData as Record<string, unknown>;

  // ── Extract required fields from evidence row ─────────────────────────
  const artifactId   = ev["id"] as number;
  const ingestedAt   = ev["ingested_at"] as string;
  const chainNode    = ev["chain_node"] as ChainNodePayload;
  const artifactIndex = ev["artifact_payload"] as ArtifactIndexPayload;
  const manifest     = ev["manifest_json"] as RunManifest;
  const attestedPayload = ev["provenance_json"] as AttestedPayload;

  // Leaves are empty in CLI scaffold — real implementation reads from storage
  const leaves: LeafPayload[] = [];

  const storage = new InMemoryStorageClient();

  // ── Run verification ──────────────────────────────────────────────────
  const result = await runVerification({
    artifactId,
    runId,
    suite,
    ingestedAt,
    signedRootHash:        ev["signed_root_hash"] as string,
    auditRootHash:         ev["audit_root_hash"] as string,
    artifactIndexHash:     ev["artifact_index_hash"] as string,
    manifestHash:          ev["manifest_hash"] as string,
    chainRoot:             ev["chain_root"] as string,
    chainNode,
    prevChainRoot:         (ev["prev_chain_root"] as string | null) ?? null,
    expectedPrevChainRoot: (ev["expected_prev_chain_root"] as string | null) ?? null,
    redactionState:        ev["redaction_state"] as "none" | "partial" | "full",
    redactionReportHash:   ev["redaction_report_hash"] as string,
    attestationHash:       ev["attestation_hash"] as string,
    policyPinHash:         ev["policy_pin_hash"] as string,
    leaves,
    artifactIndex,
    manifest,
    attestedPayload,
    producerSig:           ev["producer_sig"] as string,
    producerKid:           ev["producer_kid"] as string,
    producerAlg:           "ed25519",
    policy,
    trustRootType,
    trustRootRef,
    storage,
    notarizationChecked:   false,
    verifierId,
    verifierKid,
    verifierPrivKeyPem:    verifierPrivKey,
    verifierClaims:        { run_id: runId, suite, verifier_id: verifierId },
  }, sbAdmin);

  console.log(`\nVerification complete: ok=${result.ok}`);
  console.log(`verification_root=${result.verificationRoot}`);
  if (result.dbId !== undefined) {
    console.log(`db_id=${result.dbId}`);
  }

  if (!result.ok) {
    console.error("VERIFICATION FAILED — check notes in verification_payload");
    process.exit(1);
  }

  console.log("EXIT 0 — verification PASSED");
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
