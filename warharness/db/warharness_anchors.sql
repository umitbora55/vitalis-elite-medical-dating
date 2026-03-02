-- warharness_anchors.sql  FINAL++++
-- Anchor table: one row per run_id.
-- In FINAL++++, a matching anchor row is REQUIRED before the gate passes.
-- The war_audit_anchors row acts as a secondary ledger entry; in production
-- you should also push artifact_hash to an external WORM store
-- (e.g. S3 Object Lock, Transparency Log, timestamping authority).
--
-- PRIVILEGE NOTES:
--   GRANT INSERT, SELECT ON public.war_audit_anchors TO harness_writer;
--   REVOKE UPDATE, DELETE, TRUNCATE ON public.war_audit_anchors FROM PUBLIC;

begin;

create table if not exists public.war_audit_anchors (
  id             bigserial    primary key,
  tag            text         not null,
  run_id         text         not null,
  artifact_hash  text         not null,
  created_at     timestamptz  not null default now()
);

-- One anchor per run_id (unique constraint prevents duplicate anchors).
create unique index if not exists war_audit_anchors_uk
  on public.war_audit_anchors(run_id);

create index if not exists war_audit_anchors_tag_idx
  on public.war_audit_anchors(tag);

commit;
