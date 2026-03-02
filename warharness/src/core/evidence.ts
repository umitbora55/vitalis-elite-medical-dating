/**
 * evidence.ts  — FINAL++++
 *
 * Writes an evidence bundle (one row) to war_evidence.war_artifacts.
 *
 * Producer flow (caller's responsibility before calling this):
 *   1. Build manifest + manifestHash   (manifest.ts)
 *   2. Compute auditRootHash           (merkle / sha256 of all assertion hashes)
 *   3. Build idempotencyKey            (idempotency.ts buildIdempotencyKey)
 *   4. Build signed_root               (anchors.ts buildSignedRoot)
 *   5. Sign signed_root with Ed25519   (signatures.ts signPayloadEd25519)
 *   6. Call writeEvidenceBundle()      ← THIS FUNCTION
 *   7. Call writeAnchor()              (anchors.ts writeAnchor) — required by gate
 *
 * The DB trigger:
 *   - Acquires pg_advisory_xact_lock per (run_id, tag) — anti-fork
 *   - Sets prev_artifact_hash          — deterministic chain
 *   - Validates manifest_hash          — tamper detection
 *   - Builds canonical payload_json    — DB is source of truth for hashing
 *   - Computes authoritative artifact_hash
 *   - Recomputes signed_root and rejects mismatch — anti-forgery
 *
 * After insert, this function reads back the DB-authoritative values
 * (artifact_hash, signed_root, prev_artifact_hash) for use in anchor writing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProducerSignature } from "./signatures.js";

const DEFAULT_SCHEMA = "war_evidence";
const DEFAULT_TABLE  = "war_artifacts";

export interface EvidenceBundleArgs {
  sbAdmin: SupabaseClient;

  runId:  string;
  tag:    string;
  status: "completed" | "failed" | "aborted";
  ok:     boolean;

  summary:  Record<string, unknown>;
  metrics:  Record<string, unknown>;

  auditRootHash:   string;
  sentinelSnapshot: Record<string, unknown>;
  codeVersion:     { git_sha: string; harness_version: string };

  manifest:     Record<string, unknown>;
  manifestHash: string;

  idempotencyKey: string;

  /**
   * signed_root — computed by anchors.buildSignedRoot() before insert.
   * DB trigger verifies it matches the formula independently.
   */
  signedRoot: string;

  /** Producer signature over signed_root (from signatures.ts). */
  producer: ProducerSignature;

  /** Override defaults for custom schema/table names. */
  schema?: string;
  table?:  string;
}

export interface EvidenceBundleResult {
  /** DB-assigned row id. */
  id: number;
  /** DB-authoritative artifact_hash (computed by trigger over payload_json). */
  artifactHash: string;
  /** Hash of the previous row in the chain; null for the first row. */
  prevArtifactHash: string | null;
  /** DB-verified signed_root (trigger rejected insert if formula mismatched). */
  signedRoot: string;
  /** DB-assigned created_at timestamp. */
  createdAt: string;
}

export async function writeEvidenceBundle(
  args: EvidenceBundleArgs,
): Promise<EvidenceBundleResult> {
  const schema = args.schema ?? DEFAULT_SCHEMA;
  const table  = args.table  ?? DEFAULT_TABLE;
  const fq     = `${schema}.${table}`;

  const row = {
    run_id:           args.runId,
    tag:              args.tag,
    status:           args.status,
    ok:               args.ok,
    summary_json:     args.summary,
    metrics_json:     args.metrics,
    audit_root_hash:  args.auditRootHash,
    manifest_json:    args.manifest,
    manifest_hash:    args.manifestHash,
    sentinel_snapshot: args.sentinelSnapshot,
    code_version:     args.codeVersion,
    idempotency_key:  args.idempotencyKey,
    signed_root:      args.signedRoot,
    producer_alg:     args.producer.alg,
    producer_kid:     args.producer.kid,
    producer_sig:     args.producer.sigB64,
    producer_claims:  args.producer.claims,
    // placeholder values overwritten by DB trigger:
    prev_artifact_hash: null,
    artifact_hash:      "PENDING",
    payload_json:       {},
  };

  // Upsert — idempotency_key unique index prevents double-writes.
  const { error: upsertErr } = await args.sbAdmin
    .from(fq)
    .upsert(row, { onConflict: "idempotency_key", ignoreDuplicates: true });

  if (upsertErr) {
    throw new Error(`writeEvidenceBundle: upsert failed — ${upsertErr.message}`);
  }

  // Read back DB-authoritative values set by the trigger.
  const { data, error: selErr } = await args.sbAdmin
    .from(fq)
    .select("id, artifact_hash, prev_artifact_hash, signed_root, created_at")
    .eq("idempotency_key", args.idempotencyKey)
    .limit(1)
    .single();

  if (selErr || !data) {
    throw new Error(
      `writeEvidenceBundle: readback failed — ${selErr?.message ?? "no row for idempotency_key"}`,
    );
  }

  return {
    id:               data.id as number,
    artifactHash:     data.artifact_hash as string,
    prevArtifactHash: (data.prev_artifact_hash as string | null) ?? null,
    signedRoot:       data.signed_root as string,
    createdAt:        data.created_at as string,
  };
}
