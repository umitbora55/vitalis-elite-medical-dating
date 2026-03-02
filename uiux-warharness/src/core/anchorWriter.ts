/**
 * anchorWriter.ts — ANCHOR_SPEC@6.4 anchor builder and writer
 *
 * Anchor payload:
 *   { spec, run_id, suite, head_artifact_hash, audit_root_hash, verification_roots,
 *     quorum, created_at_observed, policy_pin_hash, notarization: { mode, token_hash, ref } }
 *
 * Hashes:
 *   anchor_content_hash  = H("UIUX_ANCHOR_CONTENT_V1", JCS(payload))
 *   anchor_pointer_hash  = H("UIUX_ANCHOR_POINTER_V1", Buffer.from(pointer, "utf-8"))
 *   anchor_set_hash      = H("UIUX_ANCHOR_SET_V1", JCS({run_id, suite, anchor_content_hash,
 *                                                        anchor_pointer_hash, policy_pin_hash}))
 */

import { hJcsHex, hHex, TAGS } from "./canonicalJson.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotarizationMode } from "./notarization.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnchorNotarization {
  readonly mode:       NotarizationMode;
  readonly token_hash: string;   // hex
  readonly ref:        string;
}

export interface AnchorPayload {
  readonly spec:                "ANCHOR_SPEC@6.4";
  readonly run_id:              string;
  readonly suite:               string;
  readonly head_artifact_hash:  string;     // hex
  readonly audit_root_hash:     string;     // hex
  readonly verification_roots:  string[];   // array of hex verification_root strings
  readonly quorum:              string;     // e.g. "2/2"
  readonly created_at_observed: string;     // RFC3339
  readonly policy_pin_hash:     string;     // hex
  readonly notarization:        AnchorNotarization;
}

export interface AnchorArgs {
  runId:              string;
  suite:              string;
  headArtifactHash:   string;
  auditRootHash:      string;
  verificationRoots:  string[];
  quorum:             string;
  createdAtObserved:  string;   // RFC3339
  policyPinHash:      string;
  notarization:       AnchorNotarization;
}

export interface AnchorHashSet {
  payload:            AnchorPayload;
  anchorContentHash:  string;   // H(ANCHOR_CONTENT, JCS(payload))
  anchorPointerHash:  string;   // H(ANCHOR_POINTER, bytes(pointer))
  anchorSetHash:      string;   // H(ANCHOR_SET, JCS({run_id,suite,...}))
}

export interface WriteAnchorArgs extends AnchorArgs {
  /** Opaque UTF-8 pointer to external immutable store (WORM, tlog, etc.) */
  anchorPointer:   string;
  /** Anchor type for DB field */
  anchorType:      "EXTERNAL_WORM" | "TLOG" | "TSA";
  /** Anchor writer identity */
  anchorWriterId:  string;
  /** Notarization mode for DB (may differ from anchor payload if not notarized) */
  notarizationMode?:      NotarizationMode;
  notarizationRef?:       string;
  notarizationTokenHash?: string;
}

export interface AnchorWriteResult {
  id:               number;
  anchorContentHash: string;
  anchorPointerHash: string;
  anchorSetHash:     string;
  createdAt:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload builder + hash computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build anchor payload and compute all three hashes.
 *
 * anchor_content_hash = H("UIUX_ANCHOR_CONTENT_V1", JCS(payload))
 * anchor_pointer_hash = H("UIUX_ANCHOR_POINTER_V1", Buffer.from(pointer, "utf-8"))
 * anchor_set_hash     = H("UIUX_ANCHOR_SET_V1",     JCS({run_id, suite, anchor_content_hash,
 *                                                         anchor_pointer_hash, policy_pin_hash}))
 */
export function buildAnchorPayload(
  args:    AnchorArgs,
  pointer: string,
): AnchorHashSet {
  const payload: AnchorPayload = {
    spec:                "ANCHOR_SPEC@6.4",
    run_id:              args.runId,
    suite:               args.suite,
    head_artifact_hash:  args.headArtifactHash,
    audit_root_hash:     args.auditRootHash,
    verification_roots:  args.verificationRoots,
    quorum:              args.quorum,
    created_at_observed: args.createdAtObserved,
    policy_pin_hash:     args.policyPinHash,
    notarization:        args.notarization,
  };

  // anchor_content_hash = H("UIUX_ANCHOR_CONTENT_V1", JCS(payload))
  const anchorContentHash = hJcsHex(TAGS.ANCHOR_CONTENT, payload);

  // anchor_pointer_hash = H("UIUX_ANCHOR_POINTER_V1", Buffer.from(pointer, "utf-8"))
  // Note: pointer is opaque UTF-8 — NO URL normalization
  const anchorPointerHash = hHex(TAGS.ANCHOR_POINTER, Buffer.from(pointer, "utf-8"));

  // anchor_set_hash = H("UIUX_ANCHOR_SET_V1", JCS({run_id, suite, anchor_content_hash, anchor_pointer_hash, policy_pin_hash}))
  const anchorSetHash = hJcsHex(TAGS.ANCHOR_SET, {
    run_id:               args.runId,
    suite:                args.suite,
    anchor_content_hash:  anchorContentHash,
    anchor_pointer_hash:  anchorPointerHash,
    policy_pin_hash:      args.policyPinHash,
  });

  return { payload, anchorContentHash, anchorPointerHash, anchorSetHash };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB writer
// ─────────────────────────────────────────────────────────────────────────────

export async function writeAnchor(
  args:    WriteAnchorArgs,
  sbAdmin: SupabaseClient,
): Promise<AnchorWriteResult> {
  const { payload, anchorContentHash, anchorPointerHash, anchorSetHash } =
    buildAnchorPayload(args, args.anchorPointer);

  const row: Record<string, unknown> = {
    run_id:              args.runId,
    suite:               args.suite,
    head_artifact_hash:  args.headArtifactHash,
    audit_root_hash:     args.auditRootHash,
    verification_roots:  args.verificationRoots,
    quorum:              args.quorum,
    policy_pin_hash:     args.policyPinHash,
    anchor_type:         args.anchorType,
    anchor_pointer:      args.anchorPointer,
    anchor_payload:      payload as unknown as Record<string, unknown>,
    anchor_content_hash: anchorContentHash,
    anchor_pointer_hash: anchorPointerHash,
    anchor_set_hash:     anchorSetHash,
    anchor_writer_id:    args.anchorWriterId,
  };

  // Notarization fields (optional in DB schema)
  if (args.notarizationMode !== undefined) {
    row["notarization_mode"] = args.notarizationMode;
  }
  if (args.notarizationRef !== undefined) {
    row["notarization_ref"] = args.notarizationRef;
  }
  if (args.notarizationTokenHash !== undefined) {
    row["notarization_token_hash"] = args.notarizationTokenHash;
  }

  const { data, error } = await sbAdmin
    .schema("war_anchor")
    .from("uiux_anchors")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error) {
    throw new Error(`writeAnchor DB error: ${error.message} (code=${error.code})`);
  }

  const rec = data as { id: number; created_at: string };

  return {
    id:               rec.id,
    anchorContentHash,
    anchorPointerHash,
    anchorSetHash,
    createdAt:        rec.created_at,
  };
}
