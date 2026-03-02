-- evidence.sql — uiux-warharness@6.4
-- Append-only evidence table with anti-fork enforcement.
--
-- PRIVILEGE NOTES (apply at deployment):
--   GRANT INSERT, SELECT ON war_evidence.uiux_artifacts TO harness_writer;
--   REVOKE UPDATE, DELETE, TRUNCATE ON war_evidence.uiux_artifacts FROM PUBLIC;
--   Do NOT grant TRIGGER-disable or ALTER TABLE to harness_writer.
--   Owner role must be isolated (break-glass only).

begin;

create extension if not exists pgcrypto;
create schema if not exists war_evidence;

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only evidence table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists war_evidence.uiux_artifacts (
  id                            bigserial     primary key,
  run_id                        text          not null,
  suite                         text          not null,

  created_at_claimed            timestamptz   not null,
  ingested_at                   timestamptz   not null default now(),

  status                        text          not null
    check (status in ('completed', 'failed', 'aborted')),
  ok                            boolean       not null,

  summary_json                  jsonb         not null,
  metrics_json                  jsonb         not null,

  policy_pin_hash               text          not null,

  artifact_index_hash           text          not null,
  audit_root_hash               text          not null,

  -- Spec version pins (forensic traceability)
  audit_spec_version            text          not null,   -- AUDIT_ROOT_SPEC@6.4
  artifact_index_spec_version   text          not null,   -- ARTIFACT_INDEX_SPEC@6.4
  normalization_spec_version    text          not null,   -- ARTIFACT_NORMALIZATION_SPEC@1.0
  path_spec_version             text          not null,   -- PATH_CANON_SPEC@1.0
  glob_spec_version             text          not null,   -- GLOB_SPEC@1.0
  canonicalization              text          not null
    check (canonicalization in ('JCS_RFC8785')),

  manifest_json                 jsonb         not null,
  manifest_hash                 text          not null,
  manifest_c14n_hash            text          not null,

  env_fingerprint               jsonb         not null,
  provenance_json               jsonb         not null,

  attestation_spec_version      text          not null,   -- ATTESTATION_SPEC@1.0
  attestation_ref               text          not null,
  attestation_hash              text          not null,

  redaction_policy_version      text          not null,   -- PII_REDACTION_SPEC@1.0
  redaction_state               text          not null
    check (redaction_state in ('none', 'partial', 'full')),
  redaction_report_hash         text          not null,

  sentinel_snapshot             jsonb         not null,
  code_version                  jsonb         not null,

  idempotency_key               text          not null,

  -- Tamper-evident chain
  prev_artifact_hash            text,
  artifact_hash                 text          not null,
  artifact_payload              jsonb         not null,
  artifact_payload_c14n_hash    text          not null,

  -- CHAIN_NODE_SPEC@1.1 anti-fork fields
  prev_chain_root               text,
  expected_prev_chain_root      text,
  chain_root                    text          not null,
  chain_node                    jsonb         not null,
  chain_node_c14n_hash          text          not null,

  -- Producer signed root (SIGNED_ROOT_SPEC@6.4)
  signed_root_payload           jsonb         not null,
  signed_root_hash              text          not null,
  signed_root_c14n_hash         text          not null,

  -- Producer authenticity
  producer_kid                  text          not null,
  producer_sig                  text          not null,   -- base64 Ed25519 over signed_root_hash hex
  producer_alg                  text          not null
    check (producer_alg in ('ed25519')),
  producer_claims               jsonb         not null
);

create index if not exists uiux_run_id_idx
  on war_evidence.uiux_artifacts(run_id);
create index if not exists uiux_suite_idx
  on war_evidence.uiux_artifacts(suite);
create unique index if not exists uiux_idem_uk
  on war_evidence.uiux_artifacts(idempotency_key);
create index if not exists uiux_run_suite_id_desc_idx
  on war_evidence.uiux_artifacts(run_id, suite, id desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only enforcement: block UPDATE / DELETE
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_evidence.block_update_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'uiux_artifacts is append-only (UPDATE/DELETE blocked)';
end;
$$;

drop trigger if exists trg_uiux_block_update on war_evidence.uiux_artifacts;
create trigger trg_uiux_block_update
  before update on war_evidence.uiux_artifacts
  for each row execute function war_evidence.block_update_delete();

drop trigger if exists trg_uiux_block_delete on war_evidence.uiux_artifacts;
create trigger trg_uiux_block_delete
  before delete on war_evidence.uiux_artifacts
  for each row execute function war_evidence.block_update_delete();

-- ─────────────────────────────────────────────────────────────────────────────
-- BEFORE INSERT trigger: anti-fork + P0 field validation
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_evidence.uiux_before_insert()
returns trigger language plpgsql as $$
declare
  prev_hash  text;
  prev_chain text;
  lock_key   bigint;
  is_first   boolean;
begin
  -- 1) Anti-fork lock: serialize concurrent inserts for same (run_id, suite)
  lock_key := hashtextextended(new.run_id || '|' || new.suite, 0);
  perform pg_advisory_xact_lock(lock_key);

  -- 2) Deterministic prev: latest row by id in same run+suite chain
  select artifact_hash, chain_root
    into prev_hash, prev_chain
    from war_evidence.uiux_artifacts
   where run_id = new.run_id
     and suite  = new.suite
   order by id desc
   limit 1;

  is_first := (prev_chain is null);

  new.prev_artifact_hash := prev_hash;
  new.prev_chain_root    := prev_chain;

  -- 3) v6.4 anti-fork strict rules (CHAIN_SPEC@1.1)
  if is_first then
    -- First node: expected_prev_chain_root MUST be null
    if new.expected_prev_chain_root is not null then
      raise exception 'ANTI_FORK_FAIL: first node must have null expected_prev_chain_root';
    end if;
  else
    -- Non-first node: expected_prev_chain_root MUST be non-null
    if new.expected_prev_chain_root is null then
      raise exception 'ANTI_FORK_FAIL: expected_prev_chain_root required for non-first node';
    end if;
    -- And must match DB's canonical head
    if prev_chain <> new.expected_prev_chain_root then
      raise exception 'ANTI_FORK_FAIL: expected_prev_chain_root mismatch expected=% db=%',
        new.expected_prev_chain_root, prev_chain;
    end if;
  end if;

  -- 4) P0 field presence checks
  if coalesce(new.policy_pin_hash, '') = '' then
    raise exception 'P0_MISSING: policy_pin_hash';
  end if;
  if coalesce(new.signed_root_hash, '') = '' then
    raise exception 'P0_MISSING: signed_root_hash';
  end if;
  if coalesce(new.chain_root, '') = '' then
    raise exception 'P0_MISSING: chain_root';
  end if;
  if coalesce(new.redaction_state, '') = '' then
    raise exception 'P0_MISSING: redaction_state';
  end if;
  if coalesce(new.attestation_hash, '') = '' then
    raise exception 'P0_MISSING: attestation_hash';
  end if;
  if coalesce(new.producer_sig, '') = '' then
    raise exception 'P0_MISSING: producer_sig';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_uiux_before_insert on war_evidence.uiux_artifacts;
create trigger trg_uiux_before_insert
  before insert on war_evidence.uiux_artifacts
  for each row execute function war_evidence.uiux_before_insert();

commit;
