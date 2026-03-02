/**
 * manifest.ts — Run manifest (static identity of a run)
 *
 * manifest_hash     = sha256(JCS(manifest))        [plain, for DB field]
 * manifest_c14n_hash = sha256(JCS(manifest))       [forensic field, same formula]
 *
 * Note: manifest hash does NOT use domain-separated H() by spec design
 * (it is carried inside signed_root_payload which is itself domain-separated).
 */

import { jcs, c14nHash } from "./canonicalJson.js";
import { createHash } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SuiteScenario {
  name:                 string;
  expectedAssertions:   number;
  include_allowlist:    string[];   // GLOB_SPEC@1.0 patterns
  version?:             string;
}

export interface RunManifest {
  harness_version:           string;   // "uiux-warharness@6.4"
  spec_version:              string;   // "MANIFEST_SPEC@6.4"
  run_id:                    string;
  suite:                     string;
  scenarios:                 SuiteScenario[];
  total_expected_assertions: number;
  normalization_spec:        string;   // "ARTIFACT_NORMALIZATION_SPEC@1.0"
  path_spec:                 string;   // "PATH_CANON_SPEC@1.0"
  glob_spec:                 string;   // "GLOB_SPEC@1.0"
  audit_spec:                string;   // "AUDIT_ROOT_SPEC@6.4"
  created_at:                string;   // RFC3339
  extra?:                    Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────────────────────────────────────

export function buildManifest(args: {
  runId:     string;
  suite:     string;
  scenarios: SuiteScenario[];
  extra?:    Record<string, unknown>;
}): { manifest: RunManifest; manifestHash: string } {
  const totalExpected = args.scenarios.reduce(
    (s, sc) => s + sc.expectedAssertions,
    0,
  );

  const manifest: RunManifest = {
    harness_version:           "uiux-warharness@6.4",
    spec_version:              "MANIFEST_SPEC@6.4",
    run_id:                    args.runId,
    suite:                     args.suite,
    scenarios:                 args.scenarios,
    total_expected_assertions: totalExpected,
    normalization_spec:        "ARTIFACT_NORMALIZATION_SPEC@1.0",
    path_spec:                 "PATH_CANON_SPEC@1.0",
    glob_spec:                 "GLOB_SPEC@1.0",
    audit_spec:                "AUDIT_ROOT_SPEC@6.4",
    created_at:                new Date().toISOString(),
    ...(args.extra ? { extra: args.extra } : {}),
  };

  // manifest_hash = sha256(JCS(manifest)) — no domain separation by spec
  const manifestHash = createHash("sha256").update(jcs(manifest)).digest("hex");

  return { manifest, manifestHash };
}

/**
 * Recompute manifest hash from a manifest object (for verification).
 */
export function computeManifestHash(manifest: RunManifest): string {
  return createHash("sha256").update(jcs(manifest)).digest("hex");
}
