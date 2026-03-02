/**
 * artifactIndex.ts — ARTIFACT_INDEX_SPEC@6.4
 *
 * Rules:
 *   - Exclude: none (spec: "Exclude yok")
 *   - Include: suite-scoped allowlist only
 *   - Allowlist-dışı path → P0 fail
 *   - Index entries reference normalized set only
 *   - artifact_index_hash = H("UIUX_ARTIFACT_INDEX_V1", JCS(index_payload))
 *
 * Index entry shape (per leaf):
 *   { path, sha256, bytes, norm: { spec, alg } }
 *
 * Full index payload (what is hashed):
 *   { spec, run_id, suite, entries: [...sorted by path] }
 */

import { hJcsHex, jcs, c14nHash, TAGS } from "./canonicalJson.js";
import type { LeafPayload } from "./auditRoot.js";
import { assertAllInAllowlist } from "./globSpec.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ArtifactIndexPayload {
  spec:    "ARTIFACT_INDEX_SPEC@6.4";
  run_id:  string;
  suite:   string;
  entries: LeafPayload[];  // sorted by path byte order
}

// ─────────────────────────────────────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the artifact index from normalized artifacts.
 * Validates allowlist compliance (P0).
 *
 * @param leaves      Normalized artifact leaves (from artifactNormalize.ts)
 * @param allowlist   Suite-scoped include glob patterns
 * @param runId       Run identifier
 * @param suite       Suite name
 */
export function buildArtifactIndex(args: {
  leaves:    LeafPayload[];
  allowlist: string[];
  runId:     string;
  suite:     string;
}): {
  index:              ArtifactIndexPayload;
  artifactIndexHash:  string;
  c14nHashHex:        string;
} {
  // P0: validate all paths are in allowlist
  const paths = args.leaves.map((l) => l.path);
  assertAllInAllowlist(paths, args.allowlist);

  // Sort by path byte order (consistent with audit root)
  const sorted = [...args.leaves].sort((a, b) =>
    Buffer.from(a.path, "utf-8").compare(Buffer.from(b.path, "utf-8")),
  );

  const index: ArtifactIndexPayload = {
    spec:    "ARTIFACT_INDEX_SPEC@6.4",
    run_id:  args.runId,
    suite:   args.suite,
    entries: sorted,
  };

  const artifactIndexHash = hJcsHex(TAGS.ARTIFACT_INDEX, index);
  const c14nHashHex       = c14nHash(index);

  return { index, artifactIndexHash, c14nHashHex };
}

/**
 * Verify an artifact index hash.
 */
export function verifyArtifactIndexHash(
  index: ArtifactIndexPayload,
  claimedHash: string,
): boolean {
  return hJcsHex(TAGS.ARTIFACT_INDEX, index) === claimedHash;
}
