/**
 * rlsSelfTest.ts
 *
 * RLS self-test: verifies that Row Level Security is configured correctly
 * on critical tables before a war run begins.
 *
 * Checks:
 *   1. war_evidence.war_artifacts — anon cannot SELECT (RLS blocks it)
 *   2. war_audit_anchors          — anon cannot SELECT
 *   3. Triggers are still active  (UPDATE blocked on war_artifacts)
 *
 * Uses the service-role client for reference reads and the anon client for
 * the "must fail" probes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RlsSelfTestResult {
  ok: boolean;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
}

/**
 * Run RLS self-test.
 *
 * @param sbAdmin  - Service-role client (bypasses RLS — used as oracle)
 * @param sbAnon   - Anon / public-role client (must be blocked by RLS)
 */
export async function runRlsSelfTest(
  sbAdmin: SupabaseClient,
  sbAnon: SupabaseClient,
): Promise<RlsSelfTestResult> {
  const checks: RlsSelfTestResult["checks"] = [];

  // ── Check 1: anon cannot read war_artifacts ───────────────────────────────
  {
    const { data, error } = await sbAnon
      .from("war_evidence.war_artifacts")
      .select("id")
      .limit(1);

    const blocked = !!error || !data?.length;
    checks.push({
      name: "anon_cannot_read_war_artifacts",
      passed: blocked,
      ...(blocked
        ? {}
        : { detail: "WARN: anon client can read war_artifacts — check RLS policies" }),
    });
  }

  // ── Check 2: anon cannot read war_audit_anchors ───────────────────────────
  {
    const { data, error } = await sbAnon
      .from("war_audit_anchors")
      .select("id")
      .limit(1);

    const blocked = !!error || !data?.length;
    checks.push({
      name: "anon_cannot_read_war_audit_anchors",
      passed: blocked,
      ...(blocked
        ? {}
        : { detail: "WARN: anon client can read war_audit_anchors — check RLS policies" }),
    });
  }

  // ── Check 3: UPDATE is blocked by trigger (admin) ─────────────────────────
  {
    // Try to update a non-existent row — trigger fires before WHERE evaluation.
    const { error } = await sbAdmin
      .from("war_evidence.war_artifacts")
      .update({ ok: true })
      .eq("id", -1); // no row with id=-1 exists

    // Trigger raises exception → error expected
    const blocked =
      error?.message?.includes("append-only") ||
      error?.code === "P0001";
    checks.push({
      name: "update_blocked_by_trigger",
      passed: blocked,
      ...(blocked
        ? {}
        : { detail: `WARN: UPDATE trigger may not be active — ${error?.message ?? "no error raised"}` }),
    });
  }

  const allPassed = checks.every((c) => c.passed);
  return { ok: allPassed, checks };
}
