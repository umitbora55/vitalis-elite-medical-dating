-- warharness_evidence.sql  FINAL++++  warharness@3.5
-- Immutable/append-only evidence table with:
--   * Anti-fork lock  (pg_advisory_xact_lock per run_id+tag)
--   * DB-canonical payload_json (trigger builds; not trusted from insert)
--   * signed_root verification  (prevents INSERT-only forgery)
--   * Producer authenticity fields (kid / alg / sig / claims)
--
-- PRIVILEGE NOTES (apply at deployment):
--   GRANT INSERT, SELECT ON war_evidence.war_artifacts TO harness_writer;
--   REVOKE UPDATE, DELETE, TRUNCATE ON war_evidence.war_artifacts FROM PUBLIC;
--   Do NOT grant TRIGGER-disable permissions to harness_writer.

begin;

create extension if not exists pgcrypto;

create schema if not exists war_evidence;

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only evidence table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists war_evidence.war_artifacts (
  id               bigserial    primary key,
  run_id           text         not null,
  tag              text         not null,
  created_at       timestamptz  not null default now(),

  status           text         not null
    check (status in ('completed', 'failed', 'aborted')),
  ok               boolean      not null,

  summary_json     jsonb        not null,
  metrics_json     jsonb        not null,

  audit_root_hash  text         not null,

  manifest_json    jsonb        not null,
  manifest_hash    text         not null,

  sentinel_snapshot jsonb       not null,
  code_version     jsonb        not null,   -- { git_sha, harness_version }

  idempotency_key  text         not null,

  -- Tamper-evident chain
  prev_artifact_hash text,                  -- NULL for first in chain
  artifact_hash    text         not null,

  -- DB-canonical payload (trigger builds this; input value is overwritten)
  payload_json     jsonb        not null,

  -- signed_root: sha256(run_id|tag|idempotency_key|manifest_hash|audit_root_hash)
  -- Producer computes locally; DB verifies on insert and canonicalises.
  signed_root      text         not null,

  -- Producer authenticity
  producer_kid     text         not null,   -- key id / attestation ref
  producer_sig     text         not null,   -- base64 Ed25519 sig over signed_root
  producer_alg     text         not null,   -- "ed25519"
  producer_claims  jsonb        not null    -- { issuer, subject, run_env, ci_run_id, … }
);

create index if not exists war_artifacts_run_id_idx
  on war_evidence.war_artifacts(run_id);
create index if not exists war_artifacts_tag_idx
  on war_evidence.war_artifacts(tag);
create unique index if not exists war_artifacts_idem_uk
  on war_evidence.war_artifacts(idempotency_key);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: stable SHA-256 hex
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_evidence.sha256_hex(p_text text)
returns text
language sql immutable
as $$
  select encode(digest(coalesce(p_text, ''), 'sha256'), 'hex');
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only enforcement: block UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_evidence.block_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'war_artifacts is append-only — UPDATE/DELETE are blocked';
end;
$$;

drop trigger if exists trg_block_update on war_evidence.war_artifacts;
create trigger trg_block_update
  before update on war_evidence.war_artifacts
  for each row execute function war_evidence.block_update_delete();

drop trigger if exists trg_block_delete on war_evidence.war_artifacts;
create trigger trg_block_delete
  before delete on war_evidence.war_artifacts
  for each row execute function war_evidence.block_update_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: artifact_hash from payload
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_evidence.compute_artifact_hash(p_payload jsonb)
returns text
language sql immutable
as $$
  select war_evidence.sha256_hex(p_payload::text);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- BEFORE INSERT trigger
--   1. Anti-fork: pg_advisory_xact_lock per (run_id, tag)
--   2. Deterministic prev: latest artifact_hash in same run+tag chain
--   3. Validate manifest_hash ≡ sha256(manifest_json::text)
--   4. Build DB-canonical payload_json (overwrites insert input)
--   5. Compute authoritative artifact_hash
--   6. Compute & verify signed_root
--      formula: sha256(run_id|tag|idempotency_key|manifest_hash|audit_root_hash)
--   7. Validate producer fields present
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_evidence.war_artifacts_before_insert()
returns trigger
language plpgsql
as $$
declare
  prev_hash     text;
  lock_key      bigint;
  payload       jsonb;
  expected_root text;
begin
  -- 1) Anti-fork: serialize concurrent inserts for the same (run_id, tag)
  lock_key := hashtextextended(new.run_id || '|' || new.tag, 0);
  perform pg_advisory_xact_lock(lock_key);

  -- 2) Deterministic prev: latest row by id in same run+tag chain
  select artifact_hash
    into prev_hash
    from war_evidence.war_artifacts
   where run_id = new.run_id
     and tag    = new.tag
   order by id desc
   limit 1;

  new.prev_artifact_hash := prev_hash;   -- NULL for first row

  -- 3) Validate manifest_hash matches manifest_json
  if war_evidence.sha256_hex(new.manifest_json::text) <> new.manifest_hash then
    raise exception 'manifest_hash mismatch — manifest_json has been tampered';
  end if;

  -- 4) Build DB-canonical payload_json (source of truth for hashing)
  payload := jsonb_build_object(
    'run_id',             new.run_id,
    'tag',                new.tag,
    'status',             new.status,
    'ok',                 new.ok,
    'summary_json',       new.summary_json,
    'metrics_json',       new.metrics_json,
    'audit_root_hash',    new.audit_root_hash,
    'manifest_json',      new.manifest_json,
    'manifest_hash',      new.manifest_hash,
    'sentinel_snapshot',  new.sentinel_snapshot,
    'code_version',       new.code_version,
    'idempotency_key',    new.idempotency_key,
    'prev_artifact_hash', new.prev_artifact_hash
  );
  new.payload_json := payload;

  -- 5) Compute authoritative artifact_hash over DB-canonical payload
  new.artifact_hash := war_evidence.compute_artifact_hash(new.payload_json);

  -- 6) Compute expected signed_root (FINAL++++ formula — no artifact_hash dependency)
  --    Matches src/core/anchors.ts buildSignedRoot() exactly.
  expected_root := war_evidence.sha256_hex(
    new.run_id        || '|' ||
    new.tag           || '|' ||
    new.idempotency_key || '|' ||
    new.manifest_hash || '|' ||
    new.audit_root_hash
  );

  if coalesce(new.signed_root, '') = '' then
    raise exception 'signed_root missing — producer must compute and supply it';
  end if;

  if new.signed_root <> expected_root then
    raise exception 'signed_root mismatch — computed=% supplied=%',
      expected_root, new.signed_root;
  end if;

  -- Canonicalise (idempotent; DB value is authoritative)
  new.signed_root := expected_root;

  -- 7) Validate producer authenticity fields
  if coalesce(new.producer_alg, '') = '' then
    raise exception 'producer_alg missing';
  end if;
  if coalesce(new.producer_kid, '') = '' then
    raise exception 'producer_kid missing';
  end if;
  if coalesce(new.producer_sig, '') = '' then
    raise exception 'producer_sig missing';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_war_artifacts_before_insert on war_evidence.war_artifacts;
create trigger trg_war_artifacts_before_insert
  before insert on war_evidence.war_artifacts
  for each row execute function war_evidence.war_artifacts_before_insert();

commit;
