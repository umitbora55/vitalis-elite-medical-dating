/**
 * anchors.ts  — FINAL++++
 *
 * Two responsibilities:
 *   1. buildSignedRoot()  — constructs the string the producer signs (and DB verifies).
 *   2. writeAnchor()      — inserts a row into war_audit_anchors (required by gate).
 *
 * signed_root formula (FINAL++++ canonical — no artifact_hash dependency):
 *   sha256(run_id | tag | idempotency_key | manifest_hash | audit_root_hash)
 *
 * This formula is intentionally free of artifact_hash so the producer can compute
 * it BEFORE the DB insert (artifact_hash is determined by the DB trigger).
 *
 * The DB trigger recomputes the same formula and rejects the INSERT if it doesn't
 * match the supplied signed_root.  The gate script (parse_outcome.mjs) also
 * recomputes and verifies both the formula AND the Ed25519 signature.
 *
 * External WORM anchor (production):
 *   After writeAnchor() succeeds, push artifact_hash to your external WORM store
 *   (S3 Object Lock key, RFC 3161 timestamp, Rekor transparency log entry, …).
 *   The gate script only checks the DB anchor; external anchoring is an ops concern.
 */

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Hex-encoded SHA-256 of a UTF-8 string. */
export function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Compute the canonical signed_root.
 *
 * MUST match the DB trigger formula in warharness_evidence.sql exactly:
 *   war_evidence.sha256_hex(run_id||'|'||tag||'|'||idempotency_key||'|'||manifest_hash||'|'||audit_root_hash)
 */
export function buildSignedRoot(args: {
  runId: string;
  tag: string;
  idempotencyKey: string;
  manifestHash: string;
  auditRootHash: string;
}): string {
  return sha256Hex(
    `${args.runId}|${args.tag}|${args.idempotencyKey}|${args.manifestHash}|${args.auditRootHash}`,
  );
}

export interface AnchorWriteResult {
  id: number;
  run_id: string;
  artifact_hash: string;
  created_at: string;
}

/**
 * Write a DB anchor row for the completed run.
 * Idempotent via the unique index on run_id (duplicate inserts are ignored).
 *
 * FINAL++++ contract: gate script will reject any run that lacks an anchor.
 *
 * @param sbAdmin       - Service-role Supabase client.
 * @param tag           - Run family tag.
 * @param runId         - Run identifier.
 * @param artifactHash  - The artifact_hash returned from writeEvidenceBundle().
 */
export async function writeAnchor(args: {
  sbAdmin: SupabaseClient;
  tag: string;
  runId: string;
  artifactHash: string;
}): Promise<AnchorWriteResult> {
  // upsert with ignoreDuplicates: true — safe to call multiple times.
  const { error: upsertErr } = await args.sbAdmin
    .from("war_audit_anchors")
    .upsert(
      {
        tag:           args.tag,
        run_id:        args.runId,
        artifact_hash: args.artifactHash,
      },
      { onConflict: "run_id", ignoreDuplicates: true },
    );

  if (upsertErr) {
    throw new Error(`writeAnchor: upsert failed — ${upsertErr.message}`);
  }

  const { data, error: selErr } = await args.sbAdmin
    .from("war_audit_anchors")
    .select("id, run_id, artifact_hash, created_at")
    .eq("run_id", args.runId)
    .limit(1)
    .single();

  if (selErr || !data) {
    throw new Error(
      `writeAnchor: readback failed — ${selErr?.message ?? "no row"}`,
    );
  }

  return data as AnchorWriteResult;
}
