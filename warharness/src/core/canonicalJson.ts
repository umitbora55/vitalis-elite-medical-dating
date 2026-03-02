/**
 * canonicalJson.ts
 *
 * Deterministic/canonical JSON serialisation.
 * Keys are sorted recursively so that sha256(canonicalJson(obj)) is
 * stable regardless of JavaScript engine insertion order.
 *
 * Note (FINAL++++): the gate script now verifies artifact_hash against
 * DB payload_json::text (not against a locally-rebuilt canonical string).
 * This helper is kept for manifest hashing and any local verification that
 * does NOT cross a DB boundary.
 */

/**
 * Recursively sort object keys, then JSON.stringify.
 * Arrays: elements are NOT reordered (order is semantic for arrays).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeys(obj[key]);
  }
  return sorted;
}
