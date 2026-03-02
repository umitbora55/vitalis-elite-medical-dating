/**
 * anchor.ts — Anchor writer CLI (ANCHOR_SPEC@6.4)
 *
 * Reads quorum state for a run+suite, builds the anchor payload,
 * optionally notarizes, and writes to war_anchor.uiux_anchors.
 *
 * Required env vars:
 *   WAR_RUN_ID
 *   WAR_SUITE
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   WAR_POLICY_PIN_HASH
 *   WAR_ANCHOR_WRITER_ID        — anchor writer identity
 *   WAR_ANCHOR_POINTER          — opaque UTF-8 pointer to external store
 *   WAR_ANCHOR_TYPE             — "EXTERNAL_WORM" | "TLOG" | "TSA"
 *
 * Optional:
 *   WAR_NOTARIZATION_MODE       — "NOTARIZATION_MODE_TSA" | "NOTARIZATION_MODE_TLOG"
 *   WAR_TSA_URL                 — TSA endpoint (for MODE_TSA)
 *   WAR_TLOG_URL                — tlog endpoint (for MODE_TLOG)
 */

import { createClient } from "@supabase/supabase-js";
import { checkQuorum, classifyQuorumSeverity } from "../core/quorum.js";
import { writeAnchor } from "../core/anchorWriter.js";
import { submitNotarization } from "../core/notarization.js";
import type { NotarizationMode } from "../core/notarization.js";
import { toRfc3339 } from "../core/timeModel.js";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`anchor: missing required env var ${key}`);
  return v;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

async function main(): Promise<void> {
  console.log("WAR Harness — Anchor Writer CLI (ANCHOR_SPEC@6.4)");
  console.log("─".repeat(60));

  const runId          = requireEnv("WAR_RUN_ID");
  const suite          = requireEnv("WAR_SUITE");
  const supabaseUrl    = requireEnv("SUPABASE_URL");
  const supabaseKey    = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const policyPinHash  = requireEnv("WAR_POLICY_PIN_HASH");
  const anchorWriterId = requireEnv("WAR_ANCHOR_WRITER_ID");
  const anchorPointer  = requireEnv("WAR_ANCHOR_POINTER");
  const anchorTypeRaw  = requireEnv("WAR_ANCHOR_TYPE") as "EXTERNAL_WORM" | "TLOG" | "TSA";
  const notarizationModeRaw = optionalEnv("WAR_NOTARIZATION_MODE") as NotarizationMode | undefined;

  console.log(`run_id=${runId} suite=${suite}`);

  const sbAdmin = createClient(supabaseUrl, supabaseKey);

  // ── 1. Check quorum ───────────────────────────────────────────────────
  const quorumResult = await checkQuorum(runId, suite, sbAdmin);
  const severity     = classifyQuorumSeverity(quorumResult);

  console.log(`quorum=${quorumResult.quorum} severity=${severity}`);

  if (severity === "P0") {
    console.error("P0: quorum not met — cannot anchor");
    process.exit(1);
  }

  if (severity === "P1") {
    console.warn("P1 WARNING: degraded quorum (1/2) — anchoring with degraded quorum");
  }

  // ── 2. Fetch evidence row (for hashes) ────────────────────────────────
  const { data: evidenceData, error: evidenceError } = await sbAdmin
    .schema("war_evidence")
    .from("uiux_artifacts")
    .select("artifact_hash, audit_root_hash")
    .eq("run_id", runId)
    .eq("suite", suite)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (evidenceError) {
    console.error(`Failed to fetch evidence: ${evidenceError.message}`);
    process.exit(1);
  }

  const ev              = evidenceData as { artifact_hash: string; audit_root_hash: string };
  const headArtifactHash = ev.artifact_hash;
  const auditRootHash   = ev.audit_root_hash;

  // ── 3. Fetch verification roots ───────────────────────────────────────
  const { data: verifyData } = await sbAdmin
    .schema("war_verify")
    .from("uiux_verifications")
    .select("verification_root")
    .eq("run_id", runId)
    .eq("suite", suite);

  const verificationRoots = ((verifyData ?? []) as Array<{ verification_root: string }>)
    .map((r) => r.verification_root);

  const now = toRfc3339();

  // ── 4. Notarize (if mode specified) ───────────────────────────────────
  let notarizationMode: NotarizationMode | undefined = notarizationModeRaw;
  let notarizationRef: string | undefined;
  let notarizationTokenHash: string | undefined;

  // Build anchor content hash placeholder (real hash computed in writeAnchor)
  const anchorContentHashPlaceholder = headArtifactHash;

  if (notarizationMode !== undefined) {
    const tsaUrl  = optionalEnv("WAR_TSA_URL");
    const tlogUrl = optionalEnv("WAR_TLOG_URL");

    const notarizationOpts: import("../core/notarization.js").NotarizationOpts = {};
    if (tsaUrl !== undefined) notarizationOpts.tsaUrl = tsaUrl;
    if (tlogUrl !== undefined) notarizationOpts.tlogUrl = tlogUrl;

    const notarizeResult = await submitNotarization(
      anchorContentHashPlaceholder,
      notarizationMode,
      notarizationOpts,
    );

    if (!notarizeResult.ok) {
      console.warn(`Notarization failed: ${notarizeResult.reason ?? "unknown"}`);
      notarizationMode   = undefined;  // don't record failed notarization
      notarizationRef    = undefined;
      notarizationTokenHash = undefined;
    } else {
      notarizationRef       = notarizeResult.ref;
      notarizationTokenHash = notarizeResult.tokenHash;
      console.log(`Notarized: mode=${notarizationMode} ref=${notarizationRef}`);
    }
  }

  // ── 5. Write anchor ───────────────────────────────────────────────────
  const defaultNotarization = {
    mode:       (notarizationMode ?? "NOTARIZATION_MODE_TSA") satisfies NotarizationMode,
    token_hash: notarizationTokenHash ?? "",
    ref:        notarizationRef ?? "",
  };

  const anchorResult = await writeAnchor({
    runId,
    suite,
    headArtifactHash,
    auditRootHash,
    verificationRoots,
    quorum:            quorumResult.quorum,
    createdAtObserved: now,
    policyPinHash,
    notarization:      defaultNotarization,
    anchorPointer,
    anchorType:        anchorTypeRaw,
    anchorWriterId,
    ...(notarizationMode !== undefined ? { notarizationMode } : {}),
    ...(notarizationRef !== undefined ? { notarizationRef } : {}),
    ...(notarizationTokenHash !== undefined ? { notarizationTokenHash } : {}),
  }, sbAdmin);

  console.log(`\nAnchor written: id=${anchorResult.id}`);
  console.log(`anchor_content_hash=${anchorResult.anchorContentHash}`);
  console.log(`anchor_set_hash=${anchorResult.anchorSetHash}`);
  console.log("EXIT 0 — anchor written");
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
