-- warharness_schema.sql
-- Base schema: enums, sentinel table, and war_runs tracking table.
-- Applied BEFORE warharness_evidence.sql and warharness_registry.sql.

begin;

create extension if not exists pgcrypto;

-- Schema for evidence artefacts (keep separate from public for privilege isolation).
create schema if not exists war_evidence;

-- ------------------------------------------------------------------
-- war_runs: lightweight tracking of run lifecycle.
-- Evidence artefacts live in war_evidence.war_artifacts.
-- ------------------------------------------------------------------
create table if not exists public.war_runs (
  run_id      text        primary key,
  tag         text        not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text        not null default 'running'
    check (status in ('running', 'completed', 'failed', 'aborted')),
  harness_version text    not null default 'warharness@3.5'
);

create index if not exists war_runs_tag_idx on public.war_runs(tag);
create index if not exists war_runs_started_idx on public.war_runs(started_at);

-- ------------------------------------------------------------------
-- war_sentinels: snapshot state captured at run end.
-- Used for "known-good" baseline comparison.
-- ------------------------------------------------------------------
create table if not exists public.war_sentinels (
  id         bigserial   primary key,
  run_id     text        not null references public.war_runs(run_id) on delete cascade,
  captured_at timestamptz not null default now(),
  snapshot   jsonb       not null
);

create index if not exists war_sentinels_run_id_idx on public.war_sentinels(run_id);

commit;
