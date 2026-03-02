/**
 * manifest.ts
 *
 * Builds the run manifest and computes its hash.
 * The manifest captures the static identity of a run:
 * which scenarios were scheduled, their expected counts, harness version, etc.
 *
 * manifest_hash = sha256(JSON.stringify(manifest_json))
 * DB trigger validates manifest_hash on insert (canonical check).
 */

import { createHash } from "crypto";
import { canonicalJson } from "./canonicalJson.js";

export interface ScenarioMeta {
  name: string;
  /** Expected number of assertions in this scenario. */
  expectedAssertions: number;
  /** Optional: scenario version / revision tag. */
  version?: string;
}

export interface RunManifest {
  harness_version: string;       // e.g. "warharness@3.5"
  tag: string;                   // run family tag
  run_id: string;
  scenarios: ScenarioMeta[];
  total_expected_assertions: number;
  created_at: string;            // ISO timestamp (set at manifest creation)
  extra?: Record<string, unknown>;
}

export function buildManifest(args: {
  harnessVersion: string;
  tag: string;
  runId: string;
  scenarios: ScenarioMeta[];
  extra?: Record<string, unknown>;
}): { manifest: RunManifest; manifestHash: string } {
  const totalExpected = args.scenarios.reduce(
    (sum, s) => sum + s.expectedAssertions,
    0,
  );

  const manifest: RunManifest = {
    harness_version: args.harnessVersion,
    tag: args.tag,
    run_id: args.runId,
    scenarios: args.scenarios,
    total_expected_assertions: totalExpected,
    created_at: new Date().toISOString(),
    ...(args.extra ? { extra: args.extra } : {}),
  };

  // Use canonical JSON so that manifest_hash is deterministic.
  const manifestText = canonicalJson(manifest);
  const manifestHash = createHash("sha256")
    .update(manifestText)
    .digest("hex");

  return { manifest, manifestHash };
}

/**
 * Re-compute manifest_hash from a manifest object.
 * Used for local verification before DB insert.
 */
export function computeManifestHash(manifest: RunManifest): string {
  return createHash("sha256")
    .update(canonicalJson(manifest))
    .digest("hex");
}
