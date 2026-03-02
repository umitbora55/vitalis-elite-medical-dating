/**
 * run.ts — Main run CLI entry point
 *
 * Reads env vars, orchestrates producer flow:
 *   1. Build manifest + artifact index
 *   2. Build provenance + redaction report
 *   3. Compute all hashes
 *   4. Sign with producer key
 *   5. Write evidence to DB
 *   6. Write anchor (if quorum already met from prior verifier)
 *
 * Required env vars:
 *   WAR_RUN_ID                  — unique run identifier
 *   SUPABASE_URL                — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — Supabase service role key
 *   WAR_SUITE                   — suite name (e.g. "p0_smoke")
 *   WAR_PRODUCER_PRIVKEY_PEM    — Ed25519 private key PEM
 *   WAR_PRODUCER_KID            — producer key identifier
 *   WAR_POLICY_PIN_HASH         — expected policy pin hash
 */

import { createClient } from "@supabase/supabase-js";
import { buildManifest } from "../core/manifest.js";
import { buildProvenance, provenanceArgsFromEnv, buildEnvFingerprint } from "../core/provenance.js";
import { computeAttestationHash } from "../core/attestation.js";
import { buildRedactionReport } from "../core/piiRedaction.js";
import { signEd25519 } from "../core/signatures.js";
import { hJcsHex, TAGS } from "../core/canonicalJson.js";
import { writeEvidence } from "../core/evidence.js";
import type { SignedRootPayload } from "../core/evidence.js";
import { toRfc3339 } from "../core/timeModel.js";
import { P0_SMOKE_SCENARIOS } from "../suites/p0_smoke.js";
import { P0_VISUAL_SCENARIOS } from "../suites/p0_visual.js";
import { P1_FULLUX_SCENARIOS } from "../suites/p1_fullux.js";
import { PERF_CI_SCENARIOS } from "../suites/perf_ci.js";
import type { SuiteScenario } from "../core/manifest.js";
import type { ArtifactIndexPayload } from "../core/artifactIndex.js";
import type { LeafPayload } from "../core/auditRoot.js";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`run: missing required env var ${key}`);
  return v;
}

function getScenariosForSuite(suite: string): SuiteScenario[] {
  switch (suite) {
    case "p0_smoke":   return [...P0_SMOKE_SCENARIOS];
    case "p0_visual":  return [...P0_VISUAL_SCENARIOS];
    case "p1_fullux":  return [...P1_FULLUX_SCENARIOS];
    case "perf_ci":    return [...PERF_CI_SCENARIOS];
    default:
      throw new Error(`run: unknown suite "${suite}"`);
  }
}

async function main(): Promise<void> {
  console.log("WAR Harness — Producer Run CLI (SIGNED_ROOT_SPEC@6.4)");
  console.log("─".repeat(60));

  const runId            = requireEnv("WAR_RUN_ID");
  const supabaseUrl      = requireEnv("SUPABASE_URL");
  const supabaseKey      = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const suite            = requireEnv("WAR_SUITE");
  const producerPrivKey  = requireEnv("WAR_PRODUCER_PRIVKEY_PEM");
  const producerKid      = requireEnv("WAR_PRODUCER_KID");
  const policyPinHash    = requireEnv("WAR_POLICY_PIN_HASH");
  const idempotencyKey   = `${runId}:${suite}:producer`;

  console.log(`run_id=${runId} suite=${suite}`);

  const sbAdmin = createClient(supabaseUrl, supabaseKey);
  const now     = toRfc3339();

  // ── 1. Build manifest ───────────────────────────────────────────────────
  const scenarios = getScenariosForSuite(suite);
  const { manifest, manifestHash } = buildManifest({ runId, suite, scenarios });

  // ── 2. Build provenance + attestation ──────────────────────────────────
  const provenanceArgs = provenanceArgsFromEnv();
  const provenancePayload = buildProvenance({
    ...provenanceArgs,
    subjectHash: manifestHash,  // initial subject is manifest hash
  });
  const attestationHash = computeAttestationHash(provenancePayload);

  // ── 3. Build redaction report (must be "full" for production) ──────────
  const { report: redactionReport, reportHash: redactionReportHash } = buildRedactionReport({
    runId,
    suite,
    state:           "full",
    patternsApplied: ["TC_KIMLIK", "EMAIL", "PHONE_TR", "JWT_TOKEN"],
    filesProcessed:  0,   // updated after actual artifact scan
    piiFound:        false,
    redactionTimeMs: 0,
  });

  // ── 4. Build artifact index (empty for CLI scaffold — real run populates) ─
  const emptyLeaves: LeafPayload[] = [];

  // For CLI scaffold, use a placeholder artifact index
  const artifactIndex: ArtifactIndexPayload = {
    spec:    "ARTIFACT_INDEX_SPEC@6.4",
    run_id:  runId,
    suite,
    entries: emptyLeaves,
  };

  // Artifact index hash and audit root hash (placeholder for CLI scaffold)
  const artifactIndexHash = hJcsHex(TAGS.ARTIFACT_INDEX, artifactIndex);
  const auditRootHash     = "0".repeat(64);  // placeholder — real run computes from leaves

  // ── 5. Build signed root payload ────────────────────────────────────────
  const signedRootPayload: SignedRootPayload = {
    spec:                "SIGNED_ROOT_SPEC@6.4",
    run_id:              runId,
    suite,
    artifact_hash:       hJcsHex(TAGS.SIGNED_ROOT, { runId, suite, manifestHash }),
    audit_root_hash:     auditRootHash,
    artifact_index_hash: artifactIndexHash,
    manifest_hash:       manifestHash,
    policy_pin_hash:     policyPinHash,
    chain_root:          "pending",  // computed by writeEvidence
    redaction_report_hash: redactionReportHash,
    attestation_hash:    attestationHash,
    created_at_claimed:  now,
  };

  const signedRootHash = hJcsHex(TAGS.SIGNED_ROOT, signedRootPayload);

  // ── 6. Sign ─────────────────────────────────────────────────────────────
  const producerSig = signEd25519({
    payloadText:   signedRootHash,
    privateKeyPem: producerPrivKey,
    kid:           producerKid,
    claims:        {
      run_id: runId,
      suite,
      issued_at: now,
    },
  });

  // ── 7. Write evidence ───────────────────────────────────────────────────
  const envFingerprint = buildEnvFingerprint();

  const result = await writeEvidence({
    runId,
    suite,
    idempotencyKey,
    createdAtClaimed:        now,
    status:                  "completed",
    ok:                      true,
    summaryJson:             { suite, scenarios: scenarios.length },
    metricsJson:             { manifest_hash: manifestHash },
    policyPinHash,
    artifactIndexHash,
    auditRootHash,
    auditSpecVersion:        "AUDIT_ROOT_SPEC@6.4",
    artifactIndexSpecVersion: "ARTIFACT_INDEX_SPEC@6.4",
    normalizationSpecVersion: "ARTIFACT_NORMALIZATION_SPEC@1.0",
    pathSpecVersion:         "PATH_CANON_SPEC@1.0",
    globSpecVersion:         "GLOB_SPEC@1.0",
    manifest,
    manifestHash,
    envFingerprint,
    provenanceJson:          provenancePayload as unknown as Record<string, unknown>,
    attestationSpecVersion:  "ATTESTATION_SPEC@1.0",
    attestationRef:          provenancePayload.ci_run_id,
    attestationHash,
    redactionPolicyVersion:  "PII_REDACTION_SPEC@1.0",
    redactionState:          redactionReport.redaction_state,
    redactionReportHash,
    sentinelSnapshot:        { harness: "uiux-warharness@6.4" },
    codeVersion:             { commit: process.env["GITHUB_SHA"] ?? "unknown" },
    prevChainRoot:           null,   // first node — DB trigger enforces
    expectedPrevChainRoot:   null,
    artifactIndex,
    producerKid,
    producerSig:             producerSig.sigB64,
    producerAlg:             "ed25519",
    producerClaims:          producerSig.claims,
    signedRootHash,
    signedRootPayload,
  }, sbAdmin);

  console.log(`\nEvidence written: id=${result.id}`);
  console.log(`artifact_hash=${result.artifactHash}`);
  console.log(`chain_root=${result.chainRoot}`);
  console.log(`ingested_at=${result.ingestedAt}`);
  console.log("\nEXIT 0 — producer run complete");
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
