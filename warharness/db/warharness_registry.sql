-- warharness_registry.sql
-- Registry of tables the cleanup RPC is allowed to touch.
-- IMPORTANT: TRUNCATE on this table must be restricted at the role level.

begin;

create table if not exists public.war_table_registry (
  id              bigserial   primary key,
  table_name      text        not null unique,
  run_id_column   text        not null default 'run_id',
  enabled         boolean     not null default true,
  added_at        timestamptz not null default now(),
  description     text
);

-- Seed known tables that belong to a war run.
-- Add app-specific tables here as the harness grows.
insert into public.war_table_registry(table_name, run_id_column, description)
values
  ('war_runs',            'run_id', 'Run lifecycle tracking'),
  ('war_sentinels',       'run_id', 'Sentinel snapshots')
on conflict (table_name) do nothing;

-- NOTE: war_evidence.war_artifacts is append-only and managed separately.
-- Do NOT register it here; the cleanup RPC cannot delete from it.

commit;
