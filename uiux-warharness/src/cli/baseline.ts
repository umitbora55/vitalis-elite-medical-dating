/**
 * baseline.ts — Baseline governance CLI
 *
 * Captures baseline change metadata (PR, merge commit, codeowner reviews,
 * CI attestation) and optionally signs the record.
 *
 * Required env vars:
 *   GITHUB_REF                  → pr_ref
 *   GITHUB_SHA                  → merge_commit
 *   WAR_CODEOWNER_REVIEWS       → comma-separated review IDs
 *   WAR_CI_ATTESTATION_HASH     → hex hash of CI attestation
 *
 * Optional:
 *   WAR_BASELINE_PRIVKEY_PEM    → Ed25519 private key for signing baseline record
 *   WAR_BASELINE_KID            → key identifier
 */

import { buildBaselineChangeRecord, baselineArgsFromEnv, validateBaselineChangeRecord } from "../core/baselineGovernance.js";
import { signEd25519 } from "../core/signatures.js";
import { toRfc3339 } from "../core/timeModel.js";

function optionalEnv(key: string): string | undefined {
  return process.env[key];
}

async function main(): Promise<void> {
  console.log("WAR Harness — Baseline Governance CLI");
  console.log("─".repeat(60));

  const args    = baselineArgsFromEnv();
  const changedAt = toRfc3339();

  // ── Optional signing ─────────────────────────────────────────────────
  const privKey = optionalEnv("WAR_BASELINE_PRIVKEY_PEM");
  const kid     = optionalEnv("WAR_BASELINE_KID");

  let signature: string | undefined;

  if (privKey !== undefined && kid !== undefined) {
    // Build record without signature first to get the hash
    const { record, recordHash } = buildBaselineChangeRecord({
      ...args,
      changedAt,
    });

    validateBaselineChangeRecord(record);

    const sig = signEd25519({
      payloadText:   recordHash,
      privateKeyPem: privKey,
      kid,
      claims:        { pr_ref: args.prRef, merge_commit: args.mergeCommit },
    });
    signature = sig.sigB64;

    console.log(`Signed baseline record: kid=${kid}`);
  }

  // ── Build final record ────────────────────────────────────────────────
  const { record, recordHash } = buildBaselineChangeRecord({
    ...args,
    changedAt,
    ...(signature !== undefined ? { signature } : {}),
  });

  validateBaselineChangeRecord(record);

  console.log(`\nBaseline change record:`);
  console.log(`  pr_ref:             ${record.pr_ref}`);
  console.log(`  merge_commit:       ${record.merge_commit}`);
  console.log(`  codeowner_reviews:  ${record.codeowner_review_ids.join(", ")}`);
  console.log(`  ci_attestation:     ${record.ci_attestation_hash}`);
  console.log(`  changed_at:         ${record.changed_at}`);
  console.log(`  record_hash:        ${recordHash}`);
  if (record.signature !== undefined) {
    console.log(`  signature:          ${record.signature.substring(0, 16)}...`);
  }

  // Output as JSON for CI artifact capture
  console.log(`\nJSON output:`);
  console.log(JSON.stringify({ record, recordHash }, null, 2));

  console.log("\nEXIT 0 — baseline record complete");
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
