-- verifier.sql — uiux-warharness@6.4
-- Append-only verifier records (VERIFICATION_SPEC@6.4).
--
-- PRIVILEGE NOTES:
--   GRANT INSERT, SELECT ON war_verify.uiux_verifications TO verifier_writer;
--   REVOKE UPDATE, DELETE, TRUNCATE ON war_verify.uiux_verifications FROM PUBLIC;

begin;

create schema if not exists war_verify;

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only verifications table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists war_verify.uiux_verifications (
  id                         bigserial    primary key,
  run_id                     text         not null,
  suite                      text         not null,
  artifact_id                bigint       not null
    references war_evidence.uiux_artifacts(id),

  created_at                 timestamptz  not null default now(),  -- verified_at_observed

  policy_pin_hash            text         not null,

  trust_root_type            text         not null
    check (trust_root_type in ('SIGSTORE', 'SIGNED_KEYRING', 'KMS_ATTEST')),
  trust_root_ref             text         not null,
  trust_root_hash            text         not null,

  verified_at_claimed        timestamptz  not null,
  freshness_window_seconds   int          not null,
  drift_budget_seconds       int          not null,
  freshness_ok               boolean      not null,
  freshness_reason           text,

  -- Check results (all P0 unless noted)
  producer_sig_ok            boolean      not null,
  audit_root_ok              boolean      not null,
  artifact_index_ok          boolean      not null,
  manifest_hash_ok           boolean      not null,
  chain_ok                   boolean      not null,
  anti_fork_ok               boolean      not null,
  redaction_ok               boolean      not null,
  storage_immutability_ok    boolean      not null,
  attestation_ok             boolean      not null,

  notarization_checked       boolean      not null default false,
  notarization_ok            boolean,

  notes                      jsonb        not null default '{}'::jsonb,

  -- Verifier payload (VERIFICATION_SPEC@6.4 canonical JSON)
  checks_summary_hash        text         not null,
  verification_payload       jsonb        not null,
  verification_root          text         not null,    -- H("UIUX_VERIFICATION_ROOT_V1", JCS(payload))

  verifier_id                text         not null,
  verifier_kid               text         not null,
  verifier_sig               text         not null,   -- base64 Ed25519 over verification_root hex
  verifier_alg               text         not null
    check (verifier_alg in ('ed25519'))
);

create index if not exists uiux_verify_run_suite_idx
  on war_verify.uiux_verifications(run_id, suite);

-- One verification record per (artifact_id, verifier_id) — prevents duplicate submissions.
create unique index if not exists uiux_verify_unique
  on war_verify.uiux_verifications(artifact_id, verifier_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only enforcement
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_verify.block_update_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'uiux_verifications is append-only (UPDATE/DELETE blocked)';
end;
$$;

drop trigger if exists trg_verify_block_update on war_verify.uiux_verifications;
create trigger trg_verify_block_update
  before update on war_verify.uiux_verifications
  for each row execute function war_verify.block_update_delete();

drop trigger if exists trg_verify_block_delete on war_verify.uiux_verifications;
create trigger trg_verify_block_delete
  before delete on war_verify.uiux_verifications
  for each row execute function war_verify.block_update_delete();

commit;
