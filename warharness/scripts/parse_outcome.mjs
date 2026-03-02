/**
 * parse_outcome.mjs  — FINAL++++  warharness@3.5
 *
 * CI Gate script: reads the evidence row from DB, verifies every security
 * invariant, and exits with code 0 (pass) or 2 (fail / tamper detected).
 *
 * Security invariants verified (in order):
 *   1. Schema version  — DB must be warharness@3.5
 *   2. Evidence row    — exactly one row for WAR_RUN_ID
 *   3. manifest_hash   — sha256(JSON.stringify(manifest_json)) must match
 *   4. artifact_hash   — sha256(JSON.stringify(payload_json)) must match
 *                        (DB payload_json is source of truth)
 *   5. signed_root     — formula: sha256(run_id|tag|idempotency_key|manifest_hash|audit_root_hash)
 *   6. producer_sig    — Ed25519 signature over signed_root verified with WAR_PRODUCER_PUBKEY_PEM
 *   7. anchor row      — war_audit_anchors must exist and artifact_hash must match
 *   8. p0_total        — must be 0 for a passing run
 *
 * Required environment variables:
 *   WAR_RUN_ID                  — the run identifier to verify
 *   SUPABASE_URL                — project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service-role key (bypasses RLS for read)
 *   WAR_PRODUCER_PUBKEY_PEM     — Ed25519 public key PEM (required; FINAL++++ hard gate)
 *
 * Optional:
 *   WAR_EXPECTED_SCHEMA_VERSION — default "warharness@3.5"
 */

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ─── helpers ─────────────────────────────────────────────────────────────────

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function verifyEd25519({ payloadText, sigB64, publicKeyPem }) {
  try {
    return crypto.verify(
      null,
      Buffer.from(payloadText, "utf8"),
      publicKeyPem,
      Buffer.from(sigB64, "base64"),
    );
  } catch {
    return false;
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// ─── env ─────────────────────────────────────────────────────────────────────

const runId         = requireEnv("WAR_RUN_ID");
const supabaseUrl   = requireEnv("SUPABASE_URL");
const serviceKey    = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const producerPubPem = requireEnv("WAR_PRODUCER_PUBKEY_PEM"); // FINAL++++ — mandatory

const expectedSchema =
  process.env.WAR_EXPECTED_SCHEMA_VERSION ?? "warharness@3.5";

// ─── client ──────────────────────────────────────────────────────────────────

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ─── 1. Schema version gate ───────────────────────────────────────────────────

{
  const { data, error } = await sb
    .from("schema_version")
    .select("version")
    .eq("id", true)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`schema_version read failed: ${error?.message ?? "no row"}`);
  }

  const actual = String(data.version).trim();
  if (actual !== expectedSchema) {
    throw new Error(
      `schema_version mismatch — expected="${expectedSchema}" got="${actual}"`,
    );
  }
  console.log(`[gate] schema_version OK: ${actual}`);
}

// ─── 2. Read evidence row ─────────────────────────────────────────────────────

const { data: rows, error: evidErr } = await sb
  .from("war_evidence.war_artifacts")
  .select(
    "id,run_id,tag,status,ok," +
    "summary_json,metrics_json,audit_root_hash," +
    "manifest_json,manifest_hash," +
    "sentinel_snapshot,code_version," +
    "idempotency_key,prev_artifact_hash,artifact_hash,payload_json," +
    "signed_root,producer_alg,producer_kid,producer_sig,producer_claims," +
    "created_at",
  )
  .eq("run_id", runId)
  .order("id", { ascending: false })
  .limit(1);

if (evidErr) throw new Error(`evidence read failed: ${evidErr.message}`);
if (!rows?.length) throw new Error(`No war_artifacts row for run_id=${runId}`);

const a = rows[0];
console.log(`[gate] Evidence row id=${a.id} status=${a.status} ok=${a.ok}`);

// ─── 3. manifest_hash ────────────────────────────────────────────────────────

{
  const computed = sha256Hex(JSON.stringify(a.manifest_json));
  if (computed !== a.manifest_hash) {
    throw new Error(
      `manifest_hash mismatch — computed=${computed} stored=${a.manifest_hash}`,
    );
  }
  console.log(`[gate] manifest_hash OK`);
}

// ─── 4. artifact_hash (DB payload_json is source of truth) ───────────────────

{
  // DB payload_json::text → JS JSON.stringify may differ in rare edge cases
  // (e.g. float precision, ordering differences).  If this becomes an issue,
  // use a rpc_get_artifact_payload_text(run_id) RPC to fetch the exact DB text.
  const computed = sha256Hex(JSON.stringify(a.payload_json));
  if (computed !== a.artifact_hash) {
    throw new Error(
      `artifact_hash mismatch — tamper detected! computed=${computed} stored=${a.artifact_hash}`,
    );
  }
  console.log(`[gate] artifact_hash OK`);
}

// ─── 5. signed_root formula ──────────────────────────────────────────────────

{
  // FINAL++++ formula (no artifact_hash dependency — producer can compute pre-insert):
  //   sha256(run_id|tag|idempotency_key|manifest_hash|audit_root_hash)
  const expected = sha256Hex(
    `${a.run_id}|${a.tag}|${a.idempotency_key}|${a.manifest_hash}|${a.audit_root_hash}`,
  );
  if (a.signed_root !== expected) {
    throw new Error(
      `signed_root mismatch — expected=${expected} stored=${a.signed_root}`,
    );
  }
  console.log(`[gate] signed_root formula OK`);
}

// ─── 6. Producer Ed25519 signature over signed_root ──────────────────────────

{
  if (String(a.producer_alg) !== "ed25519") {
    throw new Error(`producer_alg unsupported: ${a.producer_alg}`);
  }

  const sigOk = verifyEd25519({
    payloadText: a.signed_root,          // sign/verify the signed_root hex string
    sigB64:      a.producer_sig,
    publicKeyPem: producerPubPem,
  });

  if (!sigOk) {
    throw new Error(
      `producer_sig INVALID — INSERT-only forgery detected (kid=${a.producer_kid})`,
    );
  }
  console.log(`[gate] producer_sig Ed25519 OK (kid=${a.producer_kid})`);
}

// ─── 7. Anchor must exist with matching artifact_hash ────────────────────────

{
  const { data: ancRows, error: ancErr } = await sb
    .from("war_audit_anchors")
    .select("run_id,artifact_hash,created_at")
    .eq("run_id", a.run_id)
    .limit(1);

  if (ancErr) throw new Error(`anchor read failed: ${ancErr.message}`);
  if (!ancRows?.length) {
    throw new Error(
      `war_audit_anchors row MISSING for run_id=${a.run_id} — FINAL++++ requires anchor`,
    );
  }

  const anc = ancRows[0];
  if (anc.artifact_hash !== a.artifact_hash) {
    throw new Error(
      `anchor artifact_hash mismatch — anchor=${anc.artifact_hash} evidence=${a.artifact_hash}`,
    );
  }
  console.log(`[gate] anchor OK (created_at=${anc.created_at})`);
}

// ─── 8. P0 gate ──────────────────────────────────────────────────────────────

const summary   = a.summary_json;
const p0Total   = summary?.p0_total  ?? 0;
const gateOk    = a.ok === true && Number(p0Total) === 0;

console.log(
  `[gate] p0_total=${p0Total} ok=${a.ok} → gate=${gateOk ? "PASS" : "FAIL"}`,
);

// ─── Output ──────────────────────────────────────────────────────────────────

const output = {
  run_id:        runId,
  ok:            gateOk,
  status:        a.status,
  p0_total:      p0Total,
  artifact_hash: a.artifact_hash,
  signed_root:   a.signed_root,
  producer_kid:  a.producer_kid,
  created_at:    a.created_at,
  artifact:      a,
};

console.log(JSON.stringify(output, null, 2));

if (!gateOk) process.exit(2);
