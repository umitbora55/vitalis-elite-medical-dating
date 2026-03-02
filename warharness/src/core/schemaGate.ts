/**
 * schemaGate.ts
 *
 * Validates that the DB schema_version matches the expected harness version
 * before any run proceeds.  Hard-fails if the version is wrong or missing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const EXPECTED_VERSION = "warharness@3.5";

export async function assertSchemaVersion(
  sb: SupabaseClient,
  expected: string = EXPECTED_VERSION,
): Promise<void> {
  const { data, error } = await sb
    .from("schema_version")
    .select("version")
    .eq("id", true)
    .limit(1)
    .single();

  if (error) {
    throw new Error(
      `schemaGate: cannot read schema_version — ${error.message}`,
    );
  }

  const actual = String(data?.version ?? "").trim();
  if (actual !== expected) {
    throw new Error(
      `schemaGate: version mismatch — expected="${expected}" got="${actual}". ` +
        "Apply all warharness migrations before running the harness.",
    );
  }
}
