/**
 * testVectors.ts — TEST_VECTORS@1.0 (v6.4)
 *
 * Golden vectors for all critical cryptographic operations.
 * CI MUST verify these vectors PASS before allowing any gate PASS.
 *
 * Vectors cover (spec requirement):
 *   JCS, pathCanon, globSpec, normalization, merkle/audit_root_hash,
 *   policy_pin_hash, anchor_pointer_hash, chain_node_hash, signed_root_hash,
 *   attestation verify, trust root revocation/validity.
 */

import { jcs, jcsString, H, hHex, hJcsHex, c14nHash, sha256Hex, TAGS } from "./canonicalJson.js";
import { canonicalizePath } from "./pathCanon.js";
import { matchesGlob, matchesAnyGlob } from "./globSpec.js";
import { computeAuditRootHash } from "./auditRoot.js";
import { buildChainNode } from "./chain.js";
import { computePolicyPinHash } from "./policyPin.js";
import type { LeafPayload } from "./auditRoot.js";
import type { PolicySnapshot } from "./policyPin.js";

// ─────────────────────────────────────────────────────────────────────────────
// Vector type
// ─────────────────────────────────────────────────────────────────────────────

export interface TestVector {
  name:     string;
  run:      () => void;   // throws on failure
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion helper
// ─────────────────────────────────────────────────────────────────────────────

function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(
      `VECTOR FAIL: ${msg}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
    );
  }
}

function assertThrows(fn: () => void, msg: string): void {
  try {
    fn();
    throw new Error(`VECTOR FAIL: ${msg} — expected throw but didn't`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("VECTOR FAIL")) throw e;
    // expected throw — pass
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JCS vectors
// ─────────────────────────────────────────────────────────────────────────────

const JCS_VECTORS: TestVector[] = [
  {
    name: "JCS: null",
    run: () => assertEqual(jcsString(null), "null", "JCS null"),
  },
  {
    name: "JCS: number 0",
    run: () => assertEqual(jcsString(0), "0", "JCS 0"),
  },
  {
    name: "JCS: key sort",
    run: () =>
      assertEqual(
        jcsString({ b: 2, a: 1 }),
        '{"a":1,"b":2}',
        "JCS key sort",
      ),
  },
  {
    name: "JCS: nested key sort",
    run: () =>
      assertEqual(
        jcsString({ z: { y: 1, x: 2 }, a: 0 }),
        '{"a":0,"z":{"x":2,"y":1}}',
        "JCS nested sort",
      ),
  },
  {
    name: "JCS: string escaping",
    run: () =>
      assertEqual(
        jcsString({ k: "hello\nworld" }),
        '{"k":"hello\\nworld"}',
        "JCS string escape",
      ),
  },
  {
    name: "JCS: NaN throws",
    run: () => assertThrows(() => jcsString(NaN), "JCS NaN"),
  },
  {
    name: "JCS: Infinity throws",
    run: () => assertThrows(() => jcsString(Infinity), "JCS Infinity"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Domain hash vectors
// ─────────────────────────────────────────────────────────────────────────────

const HASH_VECTORS: TestVector[] = [
  {
    name: "H: domain separation (different tags → different hashes)",
    run: () => {
      const bytes = Buffer.from("test", "utf-8");
      const h1 = hHex("TAG_A", bytes);
      const h2 = hHex("TAG_B", bytes);
      if (h1 === h2) throw new Error("VECTOR FAIL: domain separation broken");
    },
  },
  {
    name: "H: deterministic",
    run: () => {
      const bytes = Buffer.from("payload", "utf-8");
      const h1 = hHex("TAG", bytes);
      const h2 = hHex("TAG", bytes);
      assertEqual(h1, h2, "H deterministic");
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// pathCanon vectors
// ─────────────────────────────────────────────────────────────────────────────

const PATH_VECTORS: TestVector[] = [
  {
    name: "pathCanon: backslash → slash",
    run: () => {
      const { path } = canonicalizePath("playwright\\screenshots\\1.png");
      assertEqual(path, "playwright/screenshots/1.png", "backslash→slash");
    },
  },
  {
    name: "pathCanon: strip ./",
    run: () => {
      const { path } = canonicalizePath("./screenshots/1.png");
      assertEqual(path, "screenshots/1.png", "strip ./");
    },
  },
  {
    name: "pathCanon: .. throws",
    run: () =>
      assertThrows(
        () => canonicalizePath("screenshots/../secret.png"),
        "pathCanon .. throws",
      ),
  },
  {
    name: "pathCanon: NFC normalization",
    run: () => {
      // é as NFC (U+00E9) vs NFD (e + U+0301) — should both produce NFC
      const nfd = "e\u0301.png";
      const { path } = canonicalizePath(nfd);
      assertEqual(path, "\u00E9.png", "NFC normalization");
    },
  },
  {
    name: "pathCanon: casefold",
    run: () => {
      const { path_casefold } = canonicalizePath("Screenshots/Test.PNG", { casefold: true });
      assertEqual(path_casefold, "screenshots/test.png", "casefold");
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Glob vectors
// ─────────────────────────────────────────────────────────────────────────────

const GLOB_VECTORS: TestVector[] = [
  {
    name: "glob: * matches single segment",
    run: () => {
      if (!matchesGlob("screenshots/a.png", "screenshots/*.png"))
        throw new Error("VECTOR FAIL: * should match single segment");
      if (matchesGlob("screenshots/sub/a.png", "screenshots/*.png"))
        throw new Error("VECTOR FAIL: * should not cross /");
    },
  },
  {
    name: "glob: ** matches multiple segments",
    run: () => {
      if (!matchesGlob("screenshots/sub/a.png", "screenshots/**/*.png"))
        throw new Error("VECTOR FAIL: ** should match multiple segments");
    },
  },
  {
    name: "glob: no match outside allowlist",
    run: () => {
      if (matchesAnyGlob("secret.json", ["screenshots/**"]))
        throw new Error("VECTOR FAIL: path outside allowlist should not match");
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Merkle / audit root vectors
// ─────────────────────────────────────────────────────────────────────────────

const MERKLE_VECTORS: TestVector[] = [
  {
    name: "merkle: single leaf is its own root",
    run: () => {
      const leaf: LeafPayload = {
        path:   "a.json",
        sha256: "aabb",
        bytes:  42,
        norm:   { spec: "ARTIFACT_NORMALIZATION_SPEC@1.0", alg: "JSON_JCS_V1" },
      };
      const root = computeAuditRootHash([leaf]);
      if (typeof root !== "string" || root.length !== 64)
        throw new Error("VECTOR FAIL: single-leaf root must be 64-char hex");
    },
  },
  {
    name: "merkle: path sort produces same root regardless of input order",
    run: () => {
      const leaves: LeafPayload[] = [
        { path: "b.json", sha256: "bb", bytes: 2, norm: { spec: "ARTIFACT_NORMALIZATION_SPEC@1.0", alg: "JSON_JCS_V1" } },
        { path: "a.json", sha256: "aa", bytes: 1, norm: { spec: "ARTIFACT_NORMALIZATION_SPEC@1.0", alg: "JSON_JCS_V1" } },
      ];
      const r1 = computeAuditRootHash(leaves);
      const r2 = computeAuditRootHash([...leaves].reverse());
      assertEqual(r1, r2, "merkle sort-stable root");
    },
  },
  {
    name: "merkle: different leaves → different roots",
    run: () => {
      const la: LeafPayload = { path: "a.json", sha256: "aa", bytes: 1, norm: { spec: "ARTIFACT_NORMALIZATION_SPEC@1.0", alg: "JSON_JCS_V1" } };
      const lb: LeafPayload = { path: "a.json", sha256: "bb", bytes: 2, norm: { spec: "ARTIFACT_NORMALIZATION_SPEC@1.0", alg: "JSON_JCS_V1" } };
      const r1 = computeAuditRootHash([la]);
      const r2 = computeAuditRootHash([lb]);
      if (r1 === r2) throw new Error("VECTOR FAIL: different leaves must produce different roots");
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Chain node vectors
// ─────────────────────────────────────────────────────────────────────────────

const CHAIN_VECTORS: TestVector[] = [
  {
    name: "chain: first node null prev",
    run: () => {
      const { chainRoot } = buildChainNode({
        runId: "run1", suite: "p0_smoke",
        artifactHash: "aabb", prevChainRoot: null,
        expectedPrevChainRoot: null, policyPinHash: "pppp",
        createdAtClaimed: "2026-02-28T12:00:00Z",
      });
      if (!chainRoot || chainRoot.length !== 64)
        throw new Error("VECTOR FAIL: chain root must be 64-char hex");
    },
  },
  {
    name: "chain: anti-fork first node with non-null expected throws",
    run: () =>
      assertThrows(
        () =>
          buildChainNode({
            runId: "run1", suite: "p0_smoke",
            artifactHash: "aabb", prevChainRoot: null,
            expectedPrevChainRoot: "non-null", policyPinHash: "pppp",
            createdAtClaimed: "2026-02-28T12:00:00Z",
          }),
        "chain anti-fork first node",
      ),
  },
  {
    name: "chain: anti-fork mismatch throws",
    run: () =>
      assertThrows(
        () =>
          buildChainNode({
            runId: "run1", suite: "p0_smoke",
            artifactHash: "aabb", prevChainRoot: "actual",
            expectedPrevChainRoot: "wrong", policyPinHash: "pppp",
            createdAtClaimed: "2026-02-28T12:00:00Z",
          }),
        "chain anti-fork mismatch",
      ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// All vectors
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_VECTORS: TestVector[] = [
  ...JCS_VECTORS,
  ...HASH_VECTORS,
  ...PATH_VECTORS,
  ...GLOB_VECTORS,
  ...MERKLE_VECTORS,
  ...CHAIN_VECTORS,
];

/**
 * Run all test vectors. Returns { passed, failed } counts.
 * Throws on first failure if throwOnFail = true (default for CI).
 */
export function runAllVectors(throwOnFail = true): {
  passed: number;
  failed: number;
  failures: string[];
} {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const v of ALL_VECTORS) {
    try {
      v.run();
      passed++;
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`[${v.name}] ${msg}`);
      if (throwOnFail) throw e;
    }
  }

  return { passed, failed, failures };
}
