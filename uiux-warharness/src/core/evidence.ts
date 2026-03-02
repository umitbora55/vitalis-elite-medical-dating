/**
 * evidence.ts — Write evidence rows to war_evidence.uiux_artifacts (SIGNED_ROOT_SPEC@6.4)
 *
 * EvidenceWriteArgs maps to all required DB columns.
 * Returns { id, artifactHash, chainRoot, ingestedAt }.
 */

import { hJcsHex, c14nHash, TAGS } from "./canonicalJson.js";
import { buildChainNode } from "./chain.js";
import type { ChainNodePayload } from "./chain.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RunManifest } from "./manifest.js";
import type { ArtifactIndexPayload } from "./artifactIndex.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SignedRootPayload {
  readonly spec:               "SIGNED_ROOT_SPEC@6.4";
  readonly run_id:             string;
  readonly suite:              string;
  readonly artifact_hash:      string;      // hex
  readonly audit_root_hash:    string;      // hex
  readonly artifact_index_hash: string;     // hex
  readonly manifest_hash:      string;      // hex
  readonly policy_pin_hash:    string;      // hex
  readonly chain_root:         string;      // hex
  readonly redaction_report_hash: string;   // hex
  readonly attestation_hash:   string;      // hex
  readonly created_at_claimed: string;      // RFC3339
}

export interface EvidenceWriteArgs {
  // Identity
  runId:                     string;
  suite:                     string;
  idempotencyKey:            string;

  // Time
  createdAtClaimed:          string;   // RFC3339

  // Status
  status:                    "completed" | "failed" | "aborted";
  ok:                        boolean;

  // Payloads
  summaryJson:               Record<string, unknown>;
  metricsJson:               Record<string, unknown>;

  // Policy
  policyPinHash:             string;

  // Artifact hashes
  artifactIndexHash:         string;
  auditRootHash:             string;

  // Spec versions
  auditSpecVersion:          string;    // e.g. "AUDIT_ROOT_SPEC@6.4"
  artifactIndexSpecVersion:  string;    // e.g. "ARTIFACT_INDEX_SPEC@6.4"
  normalizationSpecVersion:  string;    // e.g. "ARTIFACT_NORMALIZATION_SPEC@1.0"
  pathSpecVersion:           string;    // e.g. "PATH_CANON_SPEC@1.0"
  globSpecVersion:           string;    // e.g. "GLOB_SPEC@1.0"

  // Manifest
  manifest:                  RunManifest;
  manifestHash:              string;

  // Environment
  envFingerprint:            Record<string, unknown>;
  provenanceJson:            Record<string, unknown>;

  // Attestation
  attestationSpecVersion:    string;    // e.g. "ATTESTATION_SPEC@1.0"
  attestationRef:            string;
  attestationHash:           string;

  // PII redaction
  redactionPolicyVersion:    string;    // e.g. "PII_REDACTION_SPEC@1.0"
  redactionState:            "none" | "partial" | "full";
  redactionReportHash:       string;

  // Sentinel & code version
  sentinelSnapshot:          Record<string, unknown>;
  codeVersion:               Record<string, unknown>;

  // Chain (for anti-fork)
  prevChainRoot:             string | null;
  expectedPrevChainRoot:     string | null;

  // Artifact index (full payload, for signed root)
  artifactIndex:             ArtifactIndexPayload;

  // Producer signature
  producerKid:               string;
  producerSig:               string;   // base64
  producerAlg:               "ed25519";
  producerClaims:            Record<string, unknown>;

  // Signed root hash (computed before calling writeEvidence)
  signedRootHash:            string;
  signedRootPayload:         SignedRootPayload;
}

export interface EvidenceWriteResult {
  id:           number;
  artifactHash: string;
  chainRoot:    string;
  ingestedAt:   string;  // RFC3339
}

// ─────────────────────────────────────────────────────────────────────────────
// Build artifact payload hash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * artifact_payload = signed_root_payload (the canonical payload that is hashed + signed)
 * artifact_hash = H("UIUX_SIGNED_ROOT_V1", JCS(signed_root_payload))
 */
export function computeArtifactHash(signedRootPayload: SignedRootPayload): string {
  return hJcsHex(TAGS.SIGNED_ROOT, signedRootPayload);
}

// ─────────────────────────────────────────────────────────────────────────────
// Write evidence to DB
// ─────────────────────────────────────────────────────────────────────────────

export async function writeEvidence(
  args: EvidenceWriteArgs,
  sbAdmin: SupabaseClient,
): Promise<EvidenceWriteResult> {
  // 1. Compute artifact_hash from signed_root_payload
  const artifactHash = computeArtifactHash(args.signedRootPayload);

  // 2. Build chain node (client-side anti-fork validation)
  const chainResult = buildChainNode({
    runId:                args.runId,
    suite:                args.suite,
    artifactHash,
    prevChainRoot:        args.prevChainRoot,
    expectedPrevChainRoot: args.expectedPrevChainRoot,
    policyPinHash:        args.policyPinHash,
    createdAtClaimed:     args.createdAtClaimed,
  });

  // 3. Build canonical hashes for forensic fields
  const manifestC14nHash         = c14nHash(args.manifest);
  const artifactPayloadC14nHash  = c14nHash(args.signedRootPayload);
  const signedRootC14nHash       = c14nHash(args.signedRootPayload);
  const chainNodeC14nHash        = chainResult.c14nHashHex;

  // 4. Insert row
  const row = {
    run_id:                     args.runId,
    suite:                      args.suite,
    created_at_claimed:         args.createdAtClaimed,
    status:                     args.status,
    ok:                         args.ok,
    summary_json:               args.summaryJson,
    metrics_json:               args.metricsJson,
    policy_pin_hash:            args.policyPinHash,
    artifact_index_hash:        args.artifactIndexHash,
    audit_root_hash:            args.auditRootHash,
    audit_spec_version:         args.auditSpecVersion,
    artifact_index_spec_version: args.artifactIndexSpecVersion,
    normalization_spec_version: args.normalizationSpecVersion,
    path_spec_version:          args.pathSpecVersion,
    glob_spec_version:          args.globSpecVersion,
    canonicalization:           "JCS_RFC8785",
    manifest_json:              args.manifest as unknown as Record<string, unknown>,
    manifest_hash:              args.manifestHash,
    manifest_c14n_hash:         manifestC14nHash,
    env_fingerprint:            args.envFingerprint,
    provenance_json:            args.provenanceJson,
    attestation_spec_version:   args.attestationSpecVersion,
    attestation_ref:            args.attestationRef,
    attestation_hash:           args.attestationHash,
    redaction_policy_version:   args.redactionPolicyVersion,
    redaction_state:            args.redactionState,
    redaction_report_hash:      args.redactionReportHash,
    sentinel_snapshot:          args.sentinelSnapshot,
    code_version:               args.codeVersion,
    idempotency_key:            args.idempotencyKey,
    // Chain fields (prev_artifact_hash set by DB trigger)
    expected_prev_chain_root:   args.expectedPrevChainRoot,
    chain_root:                 chainResult.chainRoot,
    chain_node:                 chainResult.node as unknown as Record<string, unknown>,
    chain_node_c14n_hash:       chainNodeC14nHash,
    // Artifact payload
    artifact_hash:              artifactHash,
    artifact_payload:           args.signedRootPayload as unknown as Record<string, unknown>,
    artifact_payload_c14n_hash: artifactPayloadC14nHash,
    // Signed root
    signed_root_payload:        args.signedRootPayload as unknown as Record<string, unknown>,
    signed_root_hash:           args.signedRootHash,
    signed_root_c14n_hash:      signedRootC14nHash,
    // Producer auth
    producer_kid:               args.producerKid,
    producer_sig:               args.producerSig,
    producer_alg:               args.producerAlg,
    producer_claims:            args.producerClaims,
  };

  const { data, error } = await sbAdmin
    .schema("war_evidence")
    .from("uiux_artifacts")
    .insert(row)
    .select("id, artifact_hash, chain_root, ingested_at")
    .single();

  if (error) {
    throw new Error(`writeEvidence DB error: ${error.message} (code=${error.code})`);
  }

  const rec = data as {
    id:            number;
    artifact_hash: string;
    chain_root:    string;
    ingested_at:   string;
  };

  return {
    id:           rec.id,
    artifactHash: rec.artifact_hash,
    chainRoot:    rec.chain_root,
    ingestedAt:   rec.ingested_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export ChainNodePayload for downstream use
// ─────────────────────────────────────────────────────────────────────────────
export type { ChainNodePayload };
