/**
 * auditRoot.ts — Merkle-based audit root (AUDIT_ROOT_SPEC@6.4)
 *
 * Leaf payload:
 *   { path: canonical_path, sha256: hex(normalized_bytes), bytes: N, norm: { spec, alg } }
 *
 * leaf_hash  = H("UIUX_MERKLE_LEAF_V1", JCS(leaf_payload))
 * Files sorted: lexicographic by path UTF-8 bytes (byte order, not locale).
 * Padding:      if leaf count is odd, duplicate the last leaf.
 * parent:       H("UIUX_MERKLE_NODE_V1", left_hash_bytes || right_hash_bytes)
 *               Note: "bytes" argument is the 64-byte raw concatenation of left||right hashes.
 * audit_root_hash = top-level Merkle root (hex).
 */

import { H, jcs, TAGS } from "./canonicalJson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NormMeta {
  spec: string;   // e.g. "ARTIFACT_NORMALIZATION_SPEC@1.0"
  alg:  string;   // e.g. "PNG_STRIP_META_V1" | "JSON_JCS_V1"
}

/** One entry in the artifact index (references normalized artifact). */
export interface LeafPayload {
  path:   string;   // canonical path (PATH_CANON_SPEC@1.0)
  sha256: string;   // hex SHA-256 of normalized bytes
  bytes:  number;   // byte count of normalized artifact
  norm:   NormMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaf hash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute leaf_hash for a single artifact.
 * leaf_hash = H("UIUX_MERKLE_LEAF_V1", JCS(leaf_payload))
 */
export function computeLeafHash(leaf: LeafPayload): Buffer {
  return H(TAGS.MERKLE_LEAF, jcs(leaf));
}

// ─────────────────────────────────────────────────────────────────────────────
// Merkle node hash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a Merkle parent node.
 * parent = H("UIUX_MERKLE_NODE_V1", left_hash_bytes || right_hash_bytes)
 *
 * The two 32-byte hashes are concatenated (raw, not JCS) because
 * the domain tag already separates this from leaf hashes.
 */
function merkleNode(left: Buffer, right: Buffer): Buffer {
  return H(TAGS.MERKLE_NODE, Buffer.concat([left, right]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Merkle root
// ─────────────────────────────────────────────────────────────────────────────

function buildMerkleRoot(hashes: Buffer[]): Buffer {
  if (hashes.length === 0) {
    throw new Error("auditRoot: cannot build Merkle root from empty leaf set");
  }
  let level = [...hashes];
  while (level.length > 1) {
    // Pad to even: duplicate last leaf if odd count
    if (level.length % 2 !== 0) {
      level.push(level[level.length - 1]!);
    }
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(merkleNode(level[i]!, level[i + 1]!));
    }
    level = next;
  }
  return level[0]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the audit_root_hash for a set of normalized artifacts.
 *
 * Sorting: lexicographic on path UTF-8 bytes (Buffer.compare — byte order, not locale).
 * Returns: hex string.
 */
export function computeAuditRootHash(leaves: LeafPayload[]): string {
  if (leaves.length === 0) {
    throw new Error("auditRoot: leaf set must not be empty");
  }

  // Sort by path byte order (spec: "lexicographic byte order")
  const sorted = [...leaves].sort((a, b) =>
    Buffer.from(a.path, "utf-8").compare(Buffer.from(b.path, "utf-8")),
  );

  // Verify no duplicate paths
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.path === sorted[i - 1]!.path) {
      throw new Error(`auditRoot: duplicate path in leaf set: ${sorted[i]!.path}`);
    }
  }

  const leafHashes = sorted.map(computeLeafHash);
  return buildMerkleRoot(leafHashes).toString("hex");
}

/**
 * Verify that a claimed audit_root_hash matches the computed value.
 */
export function verifyAuditRootHash(
  leaves: LeafPayload[],
  claimedHash: string,
): boolean {
  try {
    return computeAuditRootHash(leaves) === claimedHash;
  } catch {
    return false;
  }
}
