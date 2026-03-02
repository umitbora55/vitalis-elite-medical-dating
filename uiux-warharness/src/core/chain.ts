/**
 * chain.ts — CHAIN_NODE_SPEC@1.1 (anti-fork P0)
 *
 * Chain node canonical payload:
 *   {
 *     spec: "CHAIN_NODE_SPEC@1.1",
 *     run_id, suite, artifact_hash,
 *     prev_chain_root,          -- hex | null
 *     expected_prev_chain_root, -- hex | null
 *     policy_pin_hash, created_at_claimed
 *   }
 *
 * chain_root = H("UIUX_CHAIN_NODE_V1", JCS(chain_node))
 *
 * Anti-fork rules (P0) enforced BOTH here (client) AND in DB trigger:
 *   First node:     prev_chain_root = null, expected_prev_chain_root = null
 *   Non-first:      expected_prev_chain_root = DB's canonical head (must match)
 *   Fork detection: if expected ≠ DB head → ANTI_FORK_FAIL
 */

import { hHex, jcs, c14nHash, TAGS } from "./canonicalJson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChainNodePayload {
  readonly spec:                     "CHAIN_NODE_SPEC@1.1";
  readonly run_id:                   string;
  readonly suite:                    string;
  readonly artifact_hash:            string;  // hex
  readonly prev_chain_root:          string | null;
  readonly expected_prev_chain_root: string | null;
  readonly policy_pin_hash:          string;
  readonly created_at_claimed:       string;  // RFC3339
}

export interface ChainNodeResult {
  node:          ChainNodePayload;
  chainRoot:     string;  // hex — H("UIUX_CHAIN_NODE_V1", JCS(node))
  c14nHashHex:   string;  // hex — sha256(JCS(node)) forensic field
}

// ─────────────────────────────────────────────────────────────────────────────
// Build
// ─────────────────────────────────────────────────────────────────────────────

export function buildChainNode(args: {
  runId:                  string;
  suite:                  string;
  artifactHash:           string;
  prevChainRoot:          string | null;  // DB's current head; null if first
  expectedPrevChainRoot:  string | null;  // producer's claimed prev; must match
  policyPinHash:          string;
  createdAtClaimed:       string;
}): ChainNodeResult {
  // Client-side anti-fork validation (mirrors DB trigger)
  validateAntiFork({
    isFirst:               args.prevChainRoot === null,
    expectedPrevChainRoot: args.expectedPrevChainRoot,
    dbPrevChainRoot:       args.prevChainRoot,
  });

  const node: ChainNodePayload = {
    spec:                     "CHAIN_NODE_SPEC@1.1",
    run_id:                   args.runId,
    suite:                    args.suite,
    artifact_hash:            args.artifactHash,
    prev_chain_root:          args.prevChainRoot,
    expected_prev_chain_root: args.expectedPrevChainRoot,
    policy_pin_hash:          args.policyPinHash,
    created_at_claimed:       args.createdAtClaimed,
  };

  const nodeBytes   = jcs(node);
  const chainRoot   = hHex(TAGS.CHAIN_NODE, nodeBytes);
  const c14nHashHex = c14nHash(node);

  return { node, chainRoot, c14nHashHex };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation (double-enforced: client + DB trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate anti-fork rules (CHAIN_SPEC@1.1 P0).
 * Throws on any violation.
 */
export function validateAntiFork(args: {
  isFirst:               boolean;
  expectedPrevChainRoot: string | null;
  dbPrevChainRoot:       string | null;
}): void {
  if (args.isFirst) {
    // First node: both MUST be null
    if (args.expectedPrevChainRoot !== null) {
      throw new Error(
        "ANTI_FORK_FAIL: first chain node must have null expected_prev_chain_root",
      );
    }
  } else {
    // Non-first: expected_prev_chain_root MUST be non-null
    if (args.expectedPrevChainRoot === null) {
      throw new Error(
        "ANTI_FORK_FAIL: expected_prev_chain_root is required for non-first chain node",
      );
    }
    // And must match the DB's canonical head
    if (args.dbPrevChainRoot !== args.expectedPrevChainRoot) {
      throw new Error(
        `ANTI_FORK_FAIL: expected_prev_chain_root mismatch ` +
          `expected=${args.expectedPrevChainRoot} db_head=${args.dbPrevChainRoot}`,
      );
    }
  }
}

/**
 * Verify a chain root hash by recomputing from a chain node payload.
 */
export function verifyChainRoot(node: ChainNodePayload, claimedRoot: string): boolean {
  return hHex(TAGS.CHAIN_NODE, jcs(node)) === claimedRoot;
}

/**
 * Detect fork: verifies that each entry's prev_chain_root matches
 * the chain_root of the previous entry in a linear chain.
 * Returns true if the chain is valid (no fork detected).
 */
export function verifyChainContinuity(
  entries: Array<{ chain_root: string; prev_chain_root: string | null }>,
): boolean {
  for (let i = 1; i < entries.length; i++) {
    if (entries[i]!.prev_chain_root !== entries[i - 1]!.chain_root) {
      return false;
    }
  }
  return true;
}
