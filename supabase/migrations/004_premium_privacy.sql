-- ============================================================
-- Migration 004: Premium & Privacy Features
-- Features:
--   1. Stealth Mode (Premium)
--   2. Advanced Filters (intent/role/specialty/district)
--   3. Advanced Institution Privacy (Premium)
--   4. Reputation System (hidden)
-- ============================================================

-- ───────────────────────────────────────────────────────────
-- 1. STEALTH MODE
-- ───────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stealth_mode          BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stealth_enabled_at    TIMESTAMPTZ;

-- Index: discovery queries skip stealth users efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_stealth
  ON profiles (stealth_mode)
  WHERE stealth_mode = TRUE;

-- ───────────────────────────────────────────────────────────
-- 2. ADVANCED INSTITUTION PRIVACY
-- ───────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hide_from_same_institution  BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hide_from_same_department   BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hide_from_same_campus       BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hidden_institution_ids      UUID[]    NOT NULL DEFAULT '{}';

-- ───────────────────────────────────────────────────────────
-- 3. USER FILTERS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_filters (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  intent_filter     TEXT[]      NOT NULL DEFAULT '{}',
  profession_filter TEXT[]      NOT NULL DEFAULT '{}',
  specialty_filter  TEXT[]      NOT NULL DEFAULT '{}',
  district_filter   TEXT[]      NOT NULL DEFAULT '{}',
  age_min           INT         NOT NULL DEFAULT 22,
  age_max           INT         NOT NULL DEFAULT 45,
  distance_km       INT         NOT NULL DEFAULT 50,
  verified_only     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_update_user_filters_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_user_filters_ts ON user_filters;
CREATE TRIGGER trigger_user_filters_ts
  BEFORE UPDATE ON user_filters
  FOR EACH ROW EXECUTE FUNCTION fn_update_user_filters_ts();

-- RLS: users can only read/write their own filters
ALTER TABLE user_filters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_filters_select_own"  ON user_filters;
DROP POLICY IF EXISTS "user_filters_insert_own"  ON user_filters;
DROP POLICY IF EXISTS "user_filters_update_own"  ON user_filters;
DROP POLICY IF EXISTS "user_filters_delete_own"  ON user_filters;

CREATE POLICY "user_filters_select_own"
  ON user_filters FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_filters_insert_own"
  ON user_filters FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_filters_update_own"
  ON user_filters FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_filters_delete_own"
  ON user_filters FOR DELETE
  USING (user_id = auth.uid());

-- ───────────────────────────────────────────────────────────
-- 4. USER REPUTATION TABLE (HIDDEN FROM USERS)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_reputation (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID           NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  reliability_score       DECIMAL(3,2)   NOT NULL DEFAULT 1.00 CHECK (reliability_score BETWEEN 0.00 AND 1.00),
  plan_completion_rate    DECIMAL(3,2)   NOT NULL DEFAULT 1.00 CHECK (plan_completion_rate BETWEEN 0.00 AND 1.00),
  no_show_count           INT            NOT NULL DEFAULT 0,
  cancel_count            INT            NOT NULL DEFAULT 0,
  late_cancel_count       INT            NOT NULL DEFAULT 0,
  report_count            INT            NOT NULL DEFAULT 0,
  positive_feedback_count INT            NOT NULL DEFAULT 0,
  total_plans             INT            NOT NULL DEFAULT 0,
  completed_plans         INT            NOT NULL DEFAULT 0,
  last_calculated_at      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Auto-create reputation row when profile is created
CREATE OR REPLACE FUNCTION fn_init_user_reputation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_reputation (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_init_reputation ON profiles;
CREATE TRIGGER trigger_init_reputation
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_init_user_reputation();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_update_reputation_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reputation_ts ON user_reputation;
CREATE TRIGGER trigger_reputation_ts
  BEFORE UPDATE ON user_reputation
  FOR EACH ROW EXECUTE FUNCTION fn_update_reputation_ts();

-- RLS: users CANNOT see their own reputation (hidden system)
--      only service_role (server) and admin can access
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for authenticated role → users cannot read it
-- Admins use service_role which bypasses RLS

-- Admin read-only via superadmin role check
DROP POLICY IF EXISTS "reputation_admin_read" ON user_reputation;
CREATE POLICY "reputation_admin_read"
  ON user_reputation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('admin', 'superadmin')
    )
  );

-- ───────────────────────────────────────────────────────────
-- 5. SCORE RECALCULATION FUNCTION (called by reputationService)
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_recalculate_reputation(p_user_id UUID)
RETURNS DECIMAL(3,2) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_rep    user_reputation%ROWTYPE;
  v_score  DECIMAL(3,2);
BEGIN
  SELECT * INTO v_rep FROM user_reputation WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_reputation (user_id) VALUES (p_user_id);
    RETURN 1.00;
  END IF;

  -- Formula:
  -- Base 1.00
  -- - 0.05 per cancel
  -- - 0.10 per late cancel
  -- - 0.15 per no-show
  -- + 0.02 per completed plan
  -- + 0.03 per positive feedback
  v_score := 1.00
    - (v_rep.cancel_count      * 0.05)
    - (v_rep.late_cancel_count * 0.10)
    - (v_rep.no_show_count     * 0.15)
    + (v_rep.completed_plans   * 0.02)
    + (v_rep.positive_feedback_count * 0.03);

  -- Clamp to [0.00, 1.00]
  v_score := GREATEST(0.00, LEAST(1.00, v_score));

  -- Update plan_completion_rate
  UPDATE user_reputation SET
    reliability_score    = v_score,
    plan_completion_rate = CASE
      WHEN v_rep.total_plans = 0 THEN 1.00
      ELSE LEAST(1.00, v_rep.completed_plans::DECIMAL / v_rep.total_plans)
    END,
    last_calculated_at   = NOW()
  WHERE user_id = p_user_id;

  RETURN v_score;
END;
$$;

-- ───────────────────────────────────────────────────────────
-- 6. INDEXES FOR DISCOVERY PERFORMANCE
-- ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_hide_institution
  ON profiles (hide_from_same_institution)
  WHERE hide_from_same_institution = TRUE;

CREATE INDEX IF NOT EXISTS idx_reputation_score
  ON user_reputation (reliability_score);

CREATE INDEX IF NOT EXISTS idx_user_filters_user
  ON user_filters (user_id);

-- ───────────────────────────────────────────────────────────
-- DONE
-- ───────────────────────────────────────────────────────────
