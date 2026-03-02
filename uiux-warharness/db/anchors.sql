-- anchors.sql — uiux-warharness@6.4
-- Append-only anchor table (ANCHOR_SPEC@6.4).
-- One row per (run_id, suite) — represents the final, quorum-sealed evidence anchor.
--
-- PRIVILEGE NOTES:
--   GRANT INSERT, SELECT ON war_anchor.uiux_anchors TO anchor_writer;
--   REVOKE UPDATE, DELETE, TRUNCATE ON war_anchor.uiux_anchors FROM PUBLIC;

begin;

create schema if not exists war_anchor;

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only anchors table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists war_anchor.uiux_anchors (
  id                     bigserial    primary key,
  run_id                 text         not null,
  suite                  text         not null,

  head_artifact_hash     text         not null,
  audit_root_hash        text         not null,
  verification_roots     jsonb        not null,   -- array of hex verification_root strings
  quorum                 text         not null,   -- e.g. "2/2"

  created_at             timestamptz  not null default now(),  -- anchor_written_at_observed

  policy_pin_hash        text         not null,

  anchor_type            text         not null,   -- "EXTERNAL_WORM" | "TLOG" | "TSA"
  anchor_pointer         text         not null,   -- opaque UTF-8 pointer to external store

  -- Notarization (policy: required_for_rc = true)
  notarization_mode      text,                   -- "NOTARIZATION_MODE_TSA" | "NOTARIZATION_MODE_TLOG"
  notarization_ref       text,
  notarization_token_hash text,

  -- Anchor hashes (ANCHOR_SPEC@6.4)
  anchor_payload         jsonb        not null,
  anchor_content_hash    text         not null,   -- H("UIUX_ANCHOR_CONTENT_V1", JCS(anchor_payload))
  anchor_pointer_hash    text         not null,   -- H("UIUX_ANCHOR_POINTER_V1", bytes(pointer))
  anchor_set_hash        text         not null,   -- H("UIUX_ANCHOR_SET_V1", JCS({run_id,suite,...}))

  anchor_writer_id       text         not null
);

-- One anchor per (run_id, suite) — prevents duplicate anchoring.
create unique index if not exists uiux_anchor_uk
  on war_anchor.uiux_anchors(run_id, suite);

create index if not exists uiux_anchor_run_idx
  on war_anchor.uiux_anchors(run_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Append-only enforcement
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function war_anchor.block_update_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'uiux_anchors is append-only (UPDATE/DELETE blocked)';
end;
$$;

drop trigger if exists trg_anchor_block_update on war_anchor.uiux_anchors;
create trigger trg_anchor_block_update
  before update on war_anchor.uiux_anchors
  for each row execute function war_anchor.block_update_delete();

drop trigger if exists trg_anchor_block_delete on war_anchor.uiux_anchors;
create trigger trg_anchor_block_delete
  before delete on war_anchor.uiux_anchors
  for each row execute function war_anchor.block_update_delete();

commit;
