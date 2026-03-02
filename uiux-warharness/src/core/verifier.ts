/**
 * verifier.ts — VERIFICATION_SPEC@6.4 full verification run
 *
 * Runs all P0 checks and produces a verification_payload signed by the verifier key.
 * Writes verification record to war_verify.uiux_verifications.
 *
 * Checks:
 *   producer_sig, audit_root, artifact_index, manifest_hash, chain,
 *   anti_fork, redaction, storage_immutability, attestation, freshness,
 *   notarization (if policy requires it)
 */

import { hJcsHex, c14nHash, TAGS } from "./canonicalJson.js";
import { resolvePublicKey } from "./trustRoot.js";
import type { TrustRootType } from "./trustRoot.js";
import { checkFreshness, effectiveTime, toRfc3339 } from "./timeModel.js";
import { verifyEd25519 } from "./signatures.js";
import type { SignatureResult } from "./signatures.js";
import { signEd25519 } from "./signatures.js";
import { verifyPolicyPinHash } from "./policyPin.js";
import type { PolicySnapshot } from "./policyPin.js";
import { verifyChainRoot, verifyChainContinuity } from "./chain.js";
import type { ChainNodePayload } from "./chain.js";
import { verifyAuditRootHash } from "./auditRoot.js";
import type { LeafPayload } from "./auditRoot.js";
import { verifyArtifactIndexHash } from "./artifactIndex.js";
import type { ArtifactIndexPayload } from "./artifactIndex.js";
import { computeManifestHash } from "./manifest.js";
import type { RunManifest } from "./manifest.js";
import { verifyAttestation } from "./attestation.js";
import type { AttestedPayload } from "./attestation.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageClient } from "./storage.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifierArgs {
  // DB evidence row (fetched by run_id + artifact_id)
  artifactId:          number;
  runId:               string;
  suite:               string;
  ingestedAt:          string;       // RFC3339

  // Hashes from evidence row
  signedRootHash:      string;
  auditRootHash:       string;
  artifactIndexHash:   string;
  manifestHash:        string;
  chainRoot:           string;
  chainNode:           ChainNodePayload;
  prevChainRoot:       string | null;
  expectedPrevChainRoot: string | null;
  redactionState:      "none" | "partial" | "full";
  redactionReportHash: string;
  attestationHash:     string;
  policyPinHash:       string;

  // Payloads for re-verification
  leaves:              LeafPayload[];
  artifactIndex:       ArtifactIndexPayload;
  manifest:            RunManifest;
  attestedPayload:     AttestedPayload;

  // Producer signature fields (from evidence row)
  producerSig:         string;       // base64
  producerKid:         string;
  producerAlg:         "ed25519";

  // Policy snapshot (loaded by verifier, not from DB)
  policy:              PolicySnapshot;

  // Trust root for producer key
  trustRootType:       TrustRootType;
  trustRootRef:        string;

  // Storage client for immutability check
  storage:             StorageClient;

  // Notarization check (optional)
  notarizationChecked: boolean;
  notarizationOk?:     boolean;

  // Verifier identity
  verifierId:          string;
  verifierKid:         string;
  verifierPrivKeyPem:  string;
  verifierClaims:      Record<string, unknown>;
}

export interface CheckResults {
  producer_sig_ok:         boolean;
  audit_root_ok:           boolean;
  artifact_index_ok:       boolean;
  manifest_hash_ok:        boolean;
  chain_ok:                boolean;
  anti_fork_ok:            boolean;
  redaction_ok:            boolean;
  storage_immutability_ok: boolean;
  attestation_ok:          boolean;
  freshness_ok:            boolean;
  freshness_reason:        string | null;
  notarization_checked:    boolean;
  notarization_ok:         boolean | null;
  notes:                   Record<string, unknown>;
}

export interface VerificationPayload {
  readonly spec:             "VERIFICATION_SPEC@6.4";
  readonly run_id:           string;
  readonly suite:            string;
  readonly artifact_id:      number;
  readonly verified_at:      string;   // RFC3339
  readonly policy_pin_hash:  string;
  readonly checks:           CheckResults;
  readonly verifier_id:      string;
}

export interface VerificationResult {
  ok:                  boolean;
  verificationPayload: VerificationPayload;
  verificationRoot:    string;   // H("UIUX_VERIFICATION_ROOT_V1", JCS(payload))
  verifierSig:         SignatureResult;
  dbId?:               number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main verifier
// ─────────────────────────────────────────────────────────────────────────────

export async function runVerification(
  args:    VerifierArgs,
  sbAdmin: SupabaseClient,
): Promise<VerificationResult> {
  const now           = new Date();
  const verifiedAt    = toRfc3339(now);
  const notes: Record<string, unknown> = {};

  // ── 1. Policy pin check ─────────────────────────────────────────────────
  const policyPinOk = verifyPolicyPinHash(args.policy, args.policyPinHash);
  if (!policyPinOk) {
    notes["policy_pin"] = `FAIL: policy_pin_hash mismatch — claimed=${args.policyPinHash}`;
  }

  // ── 2. Freshness check ──────────────────────────────────────────────────
  const freshnessResult = checkFreshness({
    ingestedAt:            args.ingestedAt,
    verifiedAtObserved:    now,
    freshnessWindowSeconds: args.policy.freshness_window_seconds,
    driftBudgetSeconds:    args.policy.drift_budget_seconds,
  });

  // ── 3. Effective time for trust root revocation ─────────────────────────
  const effTime = effectiveTime({ ingestedAt: args.ingestedAt });

  // ── 4. Producer signature check ─────────────────────────────────────────
  let producerSigOk = false;
  try {
    const trustResult = await resolvePublicKey(
      args.producerKid,
      args.trustRootType,
      args.trustRootRef,
      effTime,
    );

    if (trustResult.valid) {
      producerSigOk = verifyEd25519({
        payloadText:  args.signedRootHash,
        sigB64:       args.producerSig,
        publicKeyPem: trustResult.publicKeyPem,
      });
    } else {
      notes["producer_trust"] = trustResult.reason ?? "TRUST_ROOT_INVALID";
    }
  } catch (e) {
    notes["producer_trust_error"] = e instanceof Error ? e.message : String(e);
  }

  // ── 5. Audit root check ─────────────────────────────────────────────────
  let auditRootOk = false;
  try {
    auditRootOk = verifyAuditRootHash(args.leaves, args.auditRootHash);
  } catch (e) {
    notes["audit_root_error"] = e instanceof Error ? e.message : String(e);
  }

  // ── 6. Artifact index check ─────────────────────────────────────────────
  const artifactIndexOk = verifyArtifactIndexHash(args.artifactIndex, args.artifactIndexHash);

  // ── 7. Manifest hash check ──────────────────────────────────────────────
  const computedManifestHash = computeManifestHash(args.manifest);
  const manifestHashOk       = computedManifestHash === args.manifestHash;

  // ── 8. Chain root check ─────────────────────────────────────────────────
  const chainOk = verifyChainRoot(args.chainNode, args.chainRoot);

  // ── 9. Anti-fork check ──────────────────────────────────────────────────
  // Verify chain node prev links
  const antiForkEntries = [
    { chain_root: args.chainRoot, prev_chain_root: args.prevChainRoot },
  ];
  const antiForkOk = verifyChainContinuity(antiForkEntries);

  // ── 10. Redaction check ─────────────────────────────────────────────────
  // P0: redaction_state must be "full" for production
  const redactionOk = args.redactionState === "full";
  if (!redactionOk) {
    notes["redaction"] = `FAIL: redaction_state="${args.redactionState}", must be "full"`;
  }

  // ── 11. Storage immutability check ──────────────────────────────────────
  let storageImmutabilityOk = false;
  try {
    const immCheck = await args.storage.verifyImmutability(args.artifactIndexHash);
    storageImmutabilityOk = immCheck.ok;
    if (!immCheck.ok) {
      notes["storage_immutability"] = immCheck.reason ?? "STORAGE_IMMUTABILITY_FAIL";
    }
  } catch (e) {
    notes["storage_immutability_error"] = e instanceof Error ? e.message : String(e);
  }

  // ── 12. Attestation check ───────────────────────────────────────────────
  const attestResult   = verifyAttestation(args.attestedPayload, args.policy);
  const attestationOk  = attestResult.ok;
  if (!attestResult.ok) {
    notes["attestation"] = attestResult.failures;
  }

  // ── 13. Notarization check ──────────────────────────────────────────────
  const notarizationChecked = args.notarizationChecked;
  const notarizationOk      = args.notarizationChecked
    ? (args.notarizationOk ?? false)
    : null;

  // ── 14. Overall ok ──────────────────────────────────────────────────────
  const allChecksOk =
    policyPinOk &&
    producerSigOk &&
    auditRootOk &&
    artifactIndexOk &&
    manifestHashOk &&
    chainOk &&
    antiForkOk &&
    redactionOk &&
    storageImmutabilityOk &&
    attestationOk &&
    freshnessResult.ok;

  const checks: CheckResults = {
    producer_sig_ok:         producerSigOk,
    audit_root_ok:           auditRootOk,
    artifact_index_ok:       artifactIndexOk,
    manifest_hash_ok:        manifestHashOk,
    chain_ok:                chainOk,
    anti_fork_ok:            antiForkOk,
    redaction_ok:            redactionOk,
    storage_immutability_ok: storageImmutabilityOk,
    attestation_ok:          attestationOk,
    freshness_ok:            freshnessResult.ok,
    freshness_reason:        freshnessResult.reason,
    notarization_checked:    notarizationChecked,
    notarization_ok:         notarizationOk,
    notes,
  };

  // ── 15. Build verification payload ──────────────────────────────────────
  const verificationPayload: VerificationPayload = {
    spec:            "VERIFICATION_SPEC@6.4",
    run_id:          args.runId,
    suite:           args.suite,
    artifact_id:     args.artifactId,
    verified_at:     verifiedAt,
    policy_pin_hash: args.policyPinHash,
    checks,
    verifier_id:     args.verifierId,
  };

  // ── 16. Verification root + verifier signature ───────────────────────────
  const verificationRoot = hJcsHex(TAGS.VERIFICATION_ROOT, verificationPayload);

  const verifierSig = signEd25519({
    payloadText:   verificationRoot,
    privateKeyPem: args.verifierPrivKeyPem,
    kid:           args.verifierKid,
    claims:        args.verifierClaims,
  });

  // ── 17. Compute checks_summary_hash ─────────────────────────────────────
  const checksSummaryHash = c14nHash(checks);

  // ── 18. Write to DB ─────────────────────────────────────────────────────
  const row: Record<string, unknown> = {
    run_id:                  args.runId,
    suite:                   args.suite,
    artifact_id:             args.artifactId,
    policy_pin_hash:         args.policyPinHash,
    trust_root_type:         args.trustRootType,
    trust_root_ref:          args.trustRootRef,
    trust_root_hash:         c14nHash({ type: args.trustRootType, ref: args.trustRootRef }),
    verified_at_claimed:     verifiedAt,
    freshness_window_seconds: args.policy.freshness_window_seconds,
    drift_budget_seconds:    args.policy.drift_budget_seconds,
    freshness_ok:            freshnessResult.ok,
    freshness_reason:        freshnessResult.reason,
    producer_sig_ok:         producerSigOk,
    audit_root_ok:           auditRootOk,
    artifact_index_ok:       artifactIndexOk,
    manifest_hash_ok:        manifestHashOk,
    chain_ok:                chainOk,
    anti_fork_ok:            antiForkOk,
    redaction_ok:            redactionOk,
    storage_immutability_ok: storageImmutabilityOk,
    attestation_ok:          attestationOk,
    notarization_checked:    notarizationChecked,
    notarization_ok:         notarizationOk,
    notes:                   notes,
    checks_summary_hash:     checksSummaryHash,
    verification_payload:    verificationPayload as unknown as Record<string, unknown>,
    verification_root:       verificationRoot,
    verifier_id:             args.verifierId,
    verifier_kid:            args.verifierKid,
    verifier_sig:            verifierSig.sigB64,
    verifier_alg:            "ed25519",
  };

  const { data, error } = await sbAdmin
    .schema("war_verify")
    .from("uiux_verifications")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    throw new Error(`verifier DB error: ${error.message} (code=${error.code})`);
  }

  const rec = data as { id: number };

  return {
    ok:                  allChecksOk,
    verificationPayload,
    verificationRoot,
    verifierSig,
    dbId:                rec.id,
  };
}
