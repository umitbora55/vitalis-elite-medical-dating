-- schema_version.sql — uiux-warharness@6.4
begin;

create extension if not exists pgcrypto;

create table if not exists public.schema_version (
  id         boolean      primary key,
  version    text         not null,
  applied_at timestamptz  not null default now()
);

insert into public.schema_version(id, version)
values (true, 'uiux-warharness@6.4')
on conflict (id) do update
  set version    = excluded.version,
      applied_at = now();

commit;
