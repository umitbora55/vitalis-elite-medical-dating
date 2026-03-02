-- warharness_rpc.sql  FINAL++++
-- Cleanup RPC: SECURITY DEFINER + fixed search_path + pre-count cap.
--
-- SECURITY:
--   * search_path = public (prevents search_path hijack)
--   * Only deletes from tables listed in public.war_table_registry
--   * Pre-count cap (default 500 000) prevents accidental mass-delete
--   * run_id format-checked before any DML
--   * war_evidence.war_artifacts is append-only — NOT registered, NOT deletable

begin;

create or replace function public.rpc_cleanup_war_run(
  p_run_id text,
  p_tag    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public          -- fixed: prevents search_path injection
as $$
declare
  total bigint := 0;
  c     bigint := 0;
  cap   bigint := 500000;
  r     record;
  q     text;
begin
  -- 1) Validate run_id format
  if p_run_id !~ '^war_[a-zA-Z0-9_-]+_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}_[0-9]+$' then
    raise exception 'cleanup blocked: invalid run_id format — %', p_run_id;
  end if;

  -- 2) Validate tag alignment (optional arg)
  if p_tag is not null then
    if p_run_id not like ('war_' || p_tag || '_%') then
      raise exception 'cleanup blocked: run_id does not match tag — run_id=% tag=%',
        p_run_id, p_tag;
    end if;
  end if;

  -- 3) Pre-count rows across all registered tables
  for r in
    select table_name, run_id_column
      from public.war_table_registry
     where enabled = true
  loop
    q := format(
      'select count(*) from public.%I where %I = $1',
      r.table_name,
      r.run_id_column
    );
    execute q into c using p_run_id;
    total := total + c;
  end loop;

  if total > cap then
    raise exception 'cleanup blocked: pre-count % exceeds cap %', total, cap;
  end if;

  -- 4) Delete from registered tables
  for r in
    select table_name, run_id_column
      from public.war_table_registry
     where enabled = true
  loop
    q := format(
      'delete from public.%I where %I = $1',
      r.table_name,
      r.run_id_column
    );
    execute q using p_run_id;
  end loop;

  return jsonb_build_object(
    'ok',       true,
    'run_id',   p_run_id,
    'precount', total,
    'cap',      cap
  );
end;
$$;

commit;
