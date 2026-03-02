/**
 * idempotency.ts
 *
 * Idempotency key construction for evidence inserts.
 * The key is deterministic: same inputs → same key.
 * DB has a UNIQUE index on idempotency_key (war_artifacts_idem_uk).
 */

import { createHash } from "crypto";

/**
 * Build a stable idempotency key for one evidence record.
 *
 * Formula:
 *   sha256(run_id + "|" + tag + "|" + attempt)
 *
 * @param runId   - The unique run identifier
 * @param tag     - The run family tag
 * @param attempt - Retry attempt (0-based). Use 0 for first/only write.
 */
export function buildIdempotencyKey(
  runId: string,
  tag: string,
  attempt: number = 0,
): string {
  const raw = `${runId}|${tag}|${attempt}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Build a run_id that conforms to the cleanup RPC's format gate:
 *   war_<tag>_<YYYY-MM-DD>_<8hex>_<counter>
 *
 * @param tag     - Run family tag (alphanumeric + _ + -)
 * @param counter - Monotonically increasing integer (e.g. CI build number)
 */
export function buildRunId(tag: string, counter: number): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const entropy = createHash("sha256")
    .update(`${tag}|${date}|${counter}|${Math.random()}`)
    .digest("hex")
    .slice(0, 8);
  return `war_${tag}_${date}_${entropy}_${counter}`;
}
