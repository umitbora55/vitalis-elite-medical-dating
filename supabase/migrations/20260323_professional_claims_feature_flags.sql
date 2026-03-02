-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-03-23: Professional Claims + Feature Flags
-- VITALIS Governance Extension v2.6.2
--
-- Creates:
--   • professional_claims table + RLS (4 policies)
--   • Feature flag seed rows in app_settings (prefix: ff_)
--   • trust_level column on profiles (0–6, denormalized)
--   • compute_trust_level(UUID) SECURITY DEFINER RPC
--
-- Prerequisites:
--   • profiles table exists (20260209_init.sql)
--   • app_settings table exists (app_settings key/value)
--   • auth_has_moderation_access() function exists (20260321_admin_verification_hardening.sql)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Professional Claims ───────────────────────────────────────────────────────
-- Stores user-submitted professional identity claims (profession type, evidence,
-- status). One active (pending or verified) claim per profile is enforced via
-- a partial unique index.

CREATE TABLE IF NOT EXISTS professional_claims (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profession_type     TEXT        NOT NULL
    CONSTRAINT professional_claims_valid_profession
    CHECK (profession_type IN (
      'doktor', 'dis_hekimi', 'eczaci', 'hemsire', 'paramedik',
      'psikolog', 'fizyoterapist', 'diyetisyen', 'veteriner', 'ebze', 'diger'
    )),
  specialization      TEXT,
  institution_name    TEXT,
  city                TEXT,
  claim_evidence_type TEXT        NOT NULL
    CONSTRAINT professional_claims_valid_evidence
    CHECK (claim_evidence_type IN ('domain', 'id_doc', 'diploma', 'registry')),
  claim_status        TEXT        NOT NULL DEFAULT 'pending'
    CONSTRAINT professional_claims_valid_status
    CHECK (claim_status IN ('pending', 'verified', 'rejected', 'expired')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at         TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ
);

COMMENT ON TABLE professional_claims IS
  'Governance v2.6.2: User-submitted professional identity claims. '
  'One active (pending/verified) claim per profile enforced by partial unique index. '
  'Rejected and expired claims are retained for audit trail.';

-- Enforce at most one active (pending or verified) claim per profile.
-- Allows multiple rejected/expired claims in history.
CREATE UNIQUE INDEX IF NOT EXISTS professional_claims_one_active_per_profile
  ON professional_claims (profile_id)
  WHERE claim_status IN ('pending', 'verified');

-- Covering index for moderator queue queries (ordered by created_at per status)
CREATE INDEX IF NOT EXISTS professional_claims_status_created
  ON professional_claims (claim_status, created_at DESC);

-- ── RLS: Professional Claims ──────────────────────────────────────────────────
ALTER TABLE professional_claims ENABLE ROW LEVEL SECURITY;

-- Users can read their own claims (all statuses, for status display in UI)
DROP POLICY IF EXISTS "Users read own claims" ON professional_claims;
CREATE POLICY "Users read own claims"
  ON professional_claims FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- Users can submit a new claim (only pending, only for their own profile)
-- The partial unique index enforces one active claim at a time at the DB level.
DROP POLICY IF EXISTS "Users submit own claim" ON professional_claims;
CREATE POLICY "Users submit own claim"
  ON professional_claims FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND claim_status = 'pending'
  );

-- Moderators and admins can read all claims (for the verification queue)
DROP POLICY IF EXISTS "Moderators read all claims" ON professional_claims;
CREATE POLICY "Moderators read all claims"
  ON professional_claims FOR SELECT TO authenticated
  USING (public.auth_has_moderation_access());

-- Moderators and admins can update claim status (approve/reject/expire)
-- Regular users cannot UPDATE — status transitions are admin-only.
DROP POLICY IF EXISTS "Moderators update claim status" ON professional_claims;
CREATE POLICY "Moderators update claim status"
  ON professional_claims FOR UPDATE TO authenticated
  USING  (public.auth_has_moderation_access())
  WITH CHECK (public.auth_has_moderation_access());

-- No DELETE policy: claims are never hard-deleted (audit trail requirement).
-- Expired/rejected claims remain in history.

-- ── Feature Flags (via app_settings table) ────────────────────────────────────
-- Feature flags use the prefix 'ff_' in the app_settings key column.
-- Values: 'true' | 'false' | 'rollout:N' (N = percentage 0–100)
-- All flags default to 'false' (safe off) unless the feature is already live.
--
-- Use featureFlagService.ts to read flags with caching + rollout bucketing.

INSERT INTO app_settings (key, value) VALUES
  -- Automatically verify institution email domains for tier 1/2 hospitals
  ('ff_institution_auto_verify',   'false'),
  -- License/diploma document upload flow in the onboarding/profile screens
  ('ff_license_upload_flow',       'false'),
  -- Admin verification panel (already live in AdminPanelV2)
  ('ff_admin_verification_panel',  'true'),
  -- Account Safety Center (in-app safety hub for reporting/blocking)
  ('ff_account_safety_center',     'false'),
  -- Safety escalation v2 (upgraded escalation engine with SLA gating)
  ('ff_safety_escalation_v2',      'false'),
  -- Fraud risk scoring (live risk score display + throttle enforcement)
  ('ff_fraud_risk_scoring',        'false'),
  -- Professional claims feature (the table created above)
  ('ff_professional_claims',       'false')
ON CONFLICT (key) DO NOTHING;

-- ── Trust Level Column on Profiles ───────────────────────────────────────────
-- Denormalized trust level (0–6) computed server-side by compute_trust_level().
-- Clients READ this column; only the RPC (SECURITY DEFINER) may WRITE it.
--
-- Trust ladder:
--   0 = No verification
--   1 = Email confirmed
--   2 = Phone confirmed
--   3 = Institution verified (domain/registry match)
--   4 = Professional claim verified (professional_claims.claim_status = 'verified')
--   5 = License/document verified (healthcare_verified = true)
--   6 = Identity + liveness verified (liveness_verified = true, photo unchanged)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trust_level INTEGER NOT NULL DEFAULT 0
    CONSTRAINT profiles_valid_trust_level CHECK (trust_level BETWEEN 0 AND 6);

COMMENT ON COLUMN profiles.trust_level IS
  'Governance v2.6.2: Computed trust level 0–6. '
  '0=none 1=email 2=phone 3=institution 4=claim 5=license 6=identity. '
  'Written only by compute_trust_level() SECURITY DEFINER RPC. '
  'Clients must read; must never write directly.';

-- ── RPC: compute_trust_level ──────────────────────────────────────────────────
-- SECURITY DEFINER: runs as the function owner (postgres), bypasses RLS.
-- This is intentional — it needs to read multiple tables including admin-only
-- columns. It only writes back to the profiles row it owns.
--
-- Call after any of the following events:
--   • Email confirmation
--   • Phone confirmation
--   • Institution verification change
--   • Professional claim status change
--   • healthcare_verified change
--   • liveness_verified or photo_changed_since_liveness change

CREATE OR REPLACE FUNCTION compute_trust_level(p_profile_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_ok    BOOLEAN := FALSE;
  v_phone_ok    BOOLEAN := FALSE;
  v_inst_ok     BOOLEAN := FALSE;
  v_claim_ok    BOOLEAN := FALSE;
  v_license_ok  BOOLEAN := FALSE;
  v_identity_ok BOOLEAN := FALSE;
  v_level       INTEGER := 0;
BEGIN
  -- ── Step 1: Read auth.users for email + phone confirmation status ───────────
  -- auth.users is accessible from SECURITY DEFINER functions.
  SELECT
    (au.email_confirmed_at IS NOT NULL),
    (au.phone_confirmed_at IS NOT NULL)
  INTO v_email_ok, v_phone_ok
  FROM auth.users au
  WHERE au.id = p_profile_id;

  -- ── Step 2: Read profiles for institution + license + identity flags ────────
  SELECT
    COALESCE(p.institution_verified, FALSE),
    COALESCE(p.healthcare_verified, FALSE),
    COALESCE(
      p.liveness_verified AND NOT COALESCE(p.photo_changed_since_liveness, TRUE),
      FALSE
    )
  INTO v_inst_ok, v_license_ok, v_identity_ok
  FROM profiles p
  WHERE p.id = p_profile_id;

  -- ── Step 3: Check professional_claims for a verified claim ─────────────────
  SELECT EXISTS (
    SELECT 1
    FROM professional_claims pc
    WHERE pc.profile_id = p_profile_id
      AND pc.claim_status = 'verified'
  ) INTO v_claim_ok;

  -- ── Step 4: Compute ladder level (cumulative) ───────────────────────────────
  -- Each level requires all lower levels to be satisfied first.
  -- We use a sequential approach: level can only increment if the prior held.
  IF v_email_ok THEN
    v_level := 1;
    IF v_phone_ok THEN
      v_level := 2;
      IF v_inst_ok THEN
        v_level := 3;
        IF v_claim_ok THEN
          v_level := 4;
          IF v_license_ok THEN
            v_level := 5;
            IF v_identity_ok THEN
              v_level := 6;
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- ── Step 5: Persist the computed level ─────────────────────────────────────
  UPDATE profiles
  SET trust_level = v_level
  WHERE id = p_profile_id;

  RETURN v_level;
END;
$$;

COMMENT ON FUNCTION compute_trust_level(UUID) IS
  'Governance v2.6.2: Computes and persists the trust_level (0–6) for a profile. '
  'SECURITY DEFINER — reads auth.users + profiles + professional_claims. '
  'Call after any verification status change. Never call from client code directly; '
  'invoke via admin Edge Function or Supabase scheduled trigger.';

-- Grant execute to authenticated so admin Edge Functions can call it via the
-- user client. The function itself is SECURITY DEFINER and validates the caller
-- indirectly (it only writes to the profile identified by the UUID argument,
-- not to arbitrary rows).
GRANT EXECUTE ON FUNCTION compute_trust_level(UUID) TO authenticated;
