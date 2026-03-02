/**
 * vectors.ts — Test vectors runner CLI
 *
 * Runs all test vectors and exits 0 on success, 2 on failure.
 * CI MUST run this before any gate PASS.
 */

import { runAllVectors } from "../core/testVectors.js";

function main(): void {
  console.log("WAR Harness — Test Vectors Runner (TEST_VECTORS@1.0)");
  console.log("─".repeat(60));

  let result: { passed: number; failed: number; failures: string[] };

  try {
    result = runAllVectors(false /* don't throw on first fail — collect all */);
  } catch (e) {
    // Unexpected error in runner itself
    console.error("VECTOR RUNNER ERROR:", e instanceof Error ? e.message : String(e));
    process.exit(2);
  }

  const { passed, failed, failures } = result;

  if (failed > 0) {
    console.error(`\nFAILED ${failed}/${passed + failed} vectors:`);
    for (const f of failures) {
      console.error(`  ✗ ${f}`);
    }
    console.error(`\nEXIT 2 — test vectors FAILED`);
    process.exit(2);
  }

  console.log(`\nPASSED ${passed}/${passed + failed} vectors`);
  console.log("EXIT 0 — all test vectors PASSED");
  process.exit(0);
}

main();
