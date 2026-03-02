-- rls.sql — uiux-warharness@6.4
-- Row Level Security policies for war_evidence, war_verify, war_anchor schemas.
--
-- DESIGN:
--   * service_role bypasses RLS (Supabase default) — used by harness_writer/verifier_writer
--   * authenticated / anon roles cannot access any harness table by default
--   * RLS is a defense-in-depth layer; privilege separation is primary control

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- war_evidence.uiux_artifacts
-- ─────────────────────────────────────────────────────────────────────────────
alter table war_evidence.uiux_artifacts enable row level security;

-- Allow harness_writer (service role) to INSERT — covered by service_role RLS bypass.
-- Explicit policy for audit: named policy that documents the intent.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'war_evidence'
      and tablename  = 'uiux_artifacts'
      and policyname = 'evidence_service_role_all'
  ) then
    execute $p$
      create policy evidence_service_role_all
        on war_evidence.uiux_artifacts
        for all
        to service_role
        using (true)
        with check (true)
    $p$;
  end if;
end;
$$;

-- Deny everything to anon / authenticated (default: no policy = deny in RLS)

-- ─────────────────────────────────────────────────────────────────────────────
-- war_verify.uiux_verifications
-- ─────────────────────────────────────────────────────────────────────────────
alter table war_verify.uiux_verifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'war_verify'
      and tablename  = 'uiux_verifications'
      and policyname = 'verify_service_role_all'
  ) then
    execute $p$
      create policy verify_service_role_all
        on war_verify.uiux_verifications
        for all
        to service_role
        using (true)
        with check (true)
    $p$;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- war_anchor.uiux_anchors
-- ─────────────────────────────────────────────────────────────────────────────
alter table war_anchor.uiux_anchors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'war_anchor'
      and tablename  = 'uiux_anchors'
      and policyname = 'anchor_service_role_all'
  ) then
    execute $p$
      create policy anchor_service_role_all
        on war_anchor.uiux_anchors
        for all
        to service_role
        using (true)
        with check (true)
    $p$;
  end if;
end;
$$;

commit;
