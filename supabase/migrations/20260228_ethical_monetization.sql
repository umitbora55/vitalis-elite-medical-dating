-- ============================================================
-- Migration: Ethical Monetization System — Özellik 6
-- Created: 2026-02-28
--
-- Philosophy: Sell SERVICE, not ACCESS.
--   • Discovery, matching, messaging, date planning = always FREE
--   • Security features = always FREE
--   • Sold: Convenience, Privacy, Coaching, Concierge
--
-- New plans (ethical model):
--   CONVENIENCE    (49 TL/mo) — Trip + Filters + Read receipts
--   PRIVACY        (59 TL/mo) — Incognito + Visibility + Activity
--   PREMIUM_FULL   (79 TL/mo) — Convenience + Privacy + Priority support
--   PREMIUM_COACHING (149 TL/mo) — Full + Monthly coaching
--   TRIP_ADDON     (29 TL/mo) — Trip mode only
--   FILTERS_ADDON  (19 TL/mo) — Advanced filters only
--   INCOGNITO_ADDON(39 TL/mo) — Incognito only
--   COACHING_ONCE  (99 TL one-time) — Profile coaching session
--   CONCIERGE_ONCE (149 TL per-date) — Date planning service
--
-- Legacy plans (DOSE/FORTE/ULTRA) mapped to PREMIUM_FULL capability level
-- ============================================================

-- ── 1. ETHICAL PLAN METADATA TABLE ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ethical_plan_configs (
  plan_id               TEXT        PRIMARY KEY,
  name                  TEXT        NOT NULL,
  description           TEXT        NOT NULL,
  price_monthly         INTEGER     NOT NULL,  -- in Turkish Lira (TL)
  is_one_time           BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Capabilities granted
  can_use_trip_mode         BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_advanced_filters  BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_incognito         BOOLEAN NOT NULL DEFAULT FALSE,
  can_hide_activity         BOOLEAN NOT NULL DEFAULT FALSE,
  can_control_read_receipts BOOLEAN NOT NULL DEFAULT FALSE,
  can_get_coaching          BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_concierge         BOOLEAN NOT NULL DEFAULT FALSE,
  can_access_priority_support BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed ethical plan configs
INSERT INTO ethical_plan_configs VALUES
  ('CONVENIENCE',       'Kolaylık',          'Trip Modu + Gelişmiş Filtreler + Okuma bildirimi kontrolü', 49,  FALSE, TRUE,  TRUE,  FALSE, FALSE, TRUE,  FALSE, FALSE, FALSE, TRUE, NOW()),
  ('PRIVACY',           'Gizlilik',          'Gizli mod + Görünürlük kontrolü + Aktivite gizleme',        59,  FALSE, FALSE, FALSE, TRUE,  TRUE,  FALSE, FALSE, FALSE, FALSE, TRUE, NOW()),
  ('PREMIUM_FULL',      'Premium Tam',       'Kolaylık + Gizlilik paketi + Öncelikli destek',              79,  FALSE, TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  FALSE, FALSE, TRUE,  TRUE, NOW()),
  ('PREMIUM_COACHING',  'Premium + Koçluk',  'Premium Tam + Aylık profil incelemesi',                     149, FALSE, TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  FALSE, TRUE,  TRUE, NOW()),
  ('TRIP_ADDON',        'Trip Modu',         'Seyahat ederken farklı şehirde eşleşme',                    29,  FALSE, TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, NOW()),
  ('FILTERS_ADDON',     'Gelişmiş Filtreler','15+ ek filtre + Filtre seti kaydetme',                      19,  FALSE, FALSE, TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, NOW()),
  ('INCOGNITO_ADDON',   'Gizli Mod',         'Sadece beğendiğin kişiler seni görebilir',                  39,  FALSE, FALSE, FALSE, TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, NOW()),
  ('COACHING_ONCE',     'Profil Koçluğu',    'Tek seferlik profesyonel profil incelemesi',                99,  TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE, TRUE,  FALSE, FALSE, TRUE, NOW()),
  ('CONCIERGE_ONCE',    'Date Concierge',    'Kişisel date planlama hizmeti',                             149, TRUE,  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE,  FALSE, TRUE, NOW())
ON CONFLICT (plan_id) DO NOTHING;

-- ── 2. USER CAPABILITIES VIEW ──────────────────────────────────────────────────
-- Resolves what a user can do based on their active subscriptions.
-- Legacy plans (DOSE/FORTE/ULTRA) map to PREMIUM_FULL capabilities.

CREATE OR REPLACE VIEW user_capabilities AS
WITH active_subs AS (
  SELECT
    s.profile_id,
    s.plan,
    s.expires_at
  FROM subscriptions s
  WHERE s.is_active = TRUE
    AND s.expires_at > NOW()
),
resolved AS (
  SELECT
    as_.profile_id,
    -- Legacy plan mapping: DOSE/FORTE/ULTRA → PREMIUM_FULL level
    BOOL_OR(
      as_.plan IN ('PREMIUM_FULL','PREMIUM_COACHING','CONVENIENCE','TRIP_ADDON') OR
      as_.plan IN ('DOSE','FORTE','ULTRA') -- legacy
    ) AS can_use_trip_mode,
    BOOL_OR(
      as_.plan IN ('PREMIUM_FULL','PREMIUM_COACHING','CONVENIENCE','FILTERS_ADDON') OR
      as_.plan IN ('DOSE','FORTE','ULTRA') -- legacy
    ) AS can_use_advanced_filters,
    BOOL_OR(
      as_.plan IN ('PREMIUM_FULL','PREMIUM_COACHING','PRIVACY','INCOGNITO_ADDON') OR
      as_.plan IN ('FORTE','ULTRA') -- legacy FORTE+ had stealth
    ) AS can_use_incognito,
    BOOL_OR(
      as_.plan IN ('PREMIUM_FULL','PREMIUM_COACHING','PRIVACY') OR
      as_.plan IN ('FORTE','ULTRA')
    ) AS can_hide_activity,
    BOOL_OR(
      as_.plan IN ('PREMIUM_FULL','PREMIUM_COACHING','CONVENIENCE','PRIVACY') OR
      as_.plan IN ('DOSE','FORTE','ULTRA')
    ) AS can_control_read_receipts,
    BOOL_OR(
      as_.plan IN ('PREMIUM_COACHING','COACHING_ONCE')
    ) AS can_get_coaching,
    BOOL_OR(
      as_.plan IN ('CONCIERGE_ONCE')
    ) AS can_use_concierge,
    BOOL_OR(
      as_.plan IN ('PREMIUM_FULL','PREMIUM_COACHING') OR
      as_.plan IN ('ULTRA')
    ) AS can_access_priority_support
  FROM active_subs as_
  GROUP BY as_.profile_id
)
SELECT
  p.id AS user_id,
  COALESCE(r.can_use_trip_mode,          FALSE) AS can_use_trip_mode,
  COALESCE(r.can_use_advanced_filters,   FALSE) AS can_use_advanced_filters,
  COALESCE(r.can_use_incognito,          FALSE) AS can_use_incognito,
  COALESCE(r.can_hide_activity,          FALSE) AS can_hide_activity,
  COALESCE(r.can_control_read_receipts,  FALSE) AS can_control_read_receipts,
  COALESCE(r.can_get_coaching,           FALSE) AS can_get_coaching,
  COALESCE(r.can_use_concierge,          FALSE) AS can_use_concierge,
  COALESCE(r.can_access_priority_support,FALSE) AS can_access_priority_support
FROM profiles p
LEFT JOIN resolved r ON r.profile_id = p.id;

-- ── 3. TRIP MODE SESSIONS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_mode_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destination_city  TEXT        NOT NULL,
  destination_lat   FLOAT       NULL,
  destination_lng   FLOAT       NULL,
  start_date        DATE        NOT NULL,
  end_date          DATE        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','active','ended','cancelled')),
  accepts_travelers BOOLEAN     NOT NULL DEFAULT TRUE, -- local side setting
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_dates_check CHECK (end_date >= start_date),
  CONSTRAINT trip_max_duration CHECK (end_date - start_date <= 30)
);

-- Index for active trips in city
CREATE INDEX IF NOT EXISTS idx_trip_sessions_city_status
  ON trip_mode_sessions (destination_city, status, start_date, end_date)
  WHERE status IN ('planned', 'active');

-- User's current active trip
CREATE INDEX IF NOT EXISTS idx_trip_sessions_user
  ON trip_mode_sessions (user_id, status);

ALTER TABLE trip_mode_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY trip_sessions_own ON trip_mode_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Allow matched users to see each other's trip if active (for slate)
CREATE POLICY trip_sessions_read_matched ON trip_mode_sessions
  FOR SELECT USING (
    status IN ('planned','active')
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.profile_1_id = auth.uid() AND m.profile_2_id = user_id)
         OR (m.profile_2_id = auth.uid() AND m.profile_1_id = user_id)
    )
  );

-- ── 4. SAVED FILTER SETS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_filter_sets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  filters       JSONB       NOT NULL DEFAULT '{}'::JSONB,
  is_active     BOOLEAN     NOT NULL DEFAULT FALSE,  -- currently applied
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Max 10 filter sets per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_filter_sets_name_unique
  ON saved_filter_sets (user_id, name);

ALTER TABLE saved_filter_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY filter_sets_own ON saved_filter_sets
  FOR ALL USING (auth.uid() = user_id);

-- ── 5. PROFILE COACHING REQUESTS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_coaching_requests (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id       UUID        NULL REFERENCES subscriptions(id),
  status                TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_review','completed','refunded')),
  -- Report fields (filled by coach)
  photo_feedback        TEXT        NULL,
  bio_feedback          TEXT        NULL,
  preferences_feedback  TEXT        NULL,
  improved_bio          TEXT        NULL,   -- suggested bio text
  overall_score         FLOAT       NULL CHECK (overall_score BETWEEN 0 AND 10),
  coach_notes           TEXT        NULL,
  coach_id              UUID        NULL,   -- internal staff/freelancer id
  sla_deadline          TIMESTAMPTZ NULL,   -- 48h from assignment
  completed_at          TIMESTAMPTZ NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_user_status
  ON profile_coaching_requests (user_id, status);

ALTER TABLE profile_coaching_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaching_own ON profile_coaching_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY coaching_insert ON profile_coaching_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 6. DATE CONCIERGE REQUESTS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS date_concierge_requests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id   UUID        NULL REFERENCES subscriptions(id),
  match_id          UUID        NULL REFERENCES matches(id),
  -- Date preferences
  preferred_date    DATE        NOT NULL,
  time_range        TEXT        NOT NULL,  -- e.g. "18:00-22:00"
  date_type         TEXT        NOT NULL DEFAULT 'dinner',
  budget            TEXT        NOT NULL DEFAULT '200_500'
    CHECK (budget IN ('under_200','200_500','over_500')),
  special_requests  TEXT        NULL,
  -- Planning output
  status            TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','planning','ready','accepted','completed','cancelled')),
  plan_details      JSONB       NULL,   -- concierge's proposed plan
  concierge_id      UUID        NULL,   -- staff member
  -- Feedback
  rating            INT         NULL CHECK (rating BETWEEN 1 AND 5),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concierge_user_status
  ON date_concierge_requests (user_id, status);

ALTER TABLE date_concierge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY concierge_own ON date_concierge_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY concierge_insert ON date_concierge_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 7. MONETIZATION FEEDBACK ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monetization_feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_fair         TEXT        NOT NULL CHECK (is_fair IN ('yes','somewhat','no')),
  unfair_feature  TEXT        NULL,
  free_text       TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE monetization_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY monetization_feedback_own ON monetization_feedback
  FOR ALL USING (auth.uid() = user_id);

-- ── 8. TRANSPARENCY METRICS (admin-writable, public-readable summary) ─────────

CREATE TABLE IF NOT EXISTS transparency_metrics (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label            TEXT        NOT NULL UNIQUE,  -- e.g. "Q1 2026"
  total_users             INT         NOT NULL DEFAULT 0,
  premium_users           INT         NOT NULL DEFAULT 0,
  free_match_rate         FLOAT       NOT NULL DEFAULT 0,
  premium_match_rate      FLOAT       NOT NULL DEFAULT 0,
  free_date_rate          FLOAT       NOT NULL DEFAULT 0,
  premium_date_rate       FLOAT       NOT NULL DEFAULT 0,
  fairness_score          FLOAT       NOT NULL DEFAULT 0,  -- avg monetization_feedback
  published_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transparency_metrics ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY transparency_read ON transparency_metrics
  FOR SELECT USING (TRUE);

-- ── 9. PROFILES COLUMNS (Travel mode preferences) ─────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accepts_travelers       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS current_trip_city       TEXT    NULL,
  ADD COLUMN IF NOT EXISTS healthcare_verified_for_discount BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 10. RPCs ──────────────────────────────────────────────────────────────────

-- Get or build user capabilities
CREATE OR REPLACE FUNCTION get_user_capabilities(p_user_id UUID)
RETURNS TABLE (
  can_use_trip_mode          BOOLEAN,
  can_use_advanced_filters   BOOLEAN,
  can_use_incognito          BOOLEAN,
  can_hide_activity          BOOLEAN,
  can_control_read_receipts  BOOLEAN,
  can_get_coaching           BOOLEAN,
  can_use_concierge          BOOLEAN,
  can_access_priority_support BOOLEAN
)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT
    uc.can_use_trip_mode,
    uc.can_use_advanced_filters,
    uc.can_use_incognito,
    uc.can_hide_activity,
    uc.can_control_read_receipts,
    uc.can_get_coaching,
    uc.can_use_concierge,
    uc.can_access_priority_support
  FROM user_capabilities uc
  WHERE uc.user_id = p_user_id;
$$;

-- Activate trip mode session
CREATE OR REPLACE FUNCTION activate_trip_mode(
  p_user_id         UUID,
  p_city            TEXT,
  p_lat             FLOAT,
  p_lng             FLOAT,
  p_start_date      DATE,
  p_end_date        DATE
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session_id UUID;
  v_monthly_count INT;
BEGIN
  -- Verify user has trip mode capability
  IF NOT EXISTS (
    SELECT 1 FROM user_capabilities uc
    WHERE uc.user_id = p_user_id AND uc.can_use_trip_mode = TRUE
  ) THEN
    RAISE EXCEPTION 'TRIP_NOT_ALLOWED: User does not have trip mode capability';
  END IF;

  -- Check monthly limit (max 3 trips/month)
  SELECT COUNT(*) INTO v_monthly_count
  FROM trip_mode_sessions
  WHERE user_id = p_user_id
    AND status NOT IN ('cancelled')
    AND created_at >= date_trunc('month', NOW());

  IF v_monthly_count >= 3 THEN
    RAISE EXCEPTION 'TRIP_LIMIT_REACHED: Maximum 3 trips per month';
  END IF;

  -- Cancel any existing active trips
  UPDATE trip_mode_sessions
  SET status = 'cancelled', updated_at = NOW()
  WHERE user_id = p_user_id AND status IN ('planned','active');

  -- Insert new trip
  INSERT INTO trip_mode_sessions (
    user_id, destination_city, destination_lat, destination_lng,
    start_date, end_date, status
  )
  VALUES (p_user_id, p_city, p_lat, p_lng, p_start_date, p_end_date, 'planned')
  RETURNING id INTO v_session_id;

  -- Update profile current trip city
  UPDATE profiles SET current_trip_city = p_city WHERE id = p_user_id;

  RETURN v_session_id;
END;
$$;

-- Save a filter set
CREATE OR REPLACE FUNCTION save_filter_set(
  p_user_id UUID,
  p_name    TEXT,
  p_filters JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_set_id UUID;
  v_count  INT;
BEGIN
  -- Verify user has advanced filters
  IF NOT EXISTS (
    SELECT 1 FROM user_capabilities uc
    WHERE uc.user_id = p_user_id AND uc.can_use_advanced_filters = TRUE
  ) THEN
    RAISE EXCEPTION 'FILTERS_NOT_ALLOWED: User does not have advanced filters';
  END IF;

  -- Max 10 sets
  SELECT COUNT(*) INTO v_count FROM saved_filter_sets WHERE user_id = p_user_id;
  IF v_count >= 10 THEN
    RAISE EXCEPTION 'FILTER_LIMIT: Maximum 10 filter sets';
  END IF;

  INSERT INTO saved_filter_sets (user_id, name, filters)
  VALUES (p_user_id, p_name, p_filters)
  ON CONFLICT (user_id, name) DO UPDATE
    SET filters = EXCLUDED.filters, updated_at = NOW()
  RETURNING id INTO v_set_id;

  RETURN v_set_id;
END;
$$;

-- Create coaching request
CREATE OR REPLACE FUNCTION create_coaching_request(
  p_user_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_req_id UUID;
BEGIN
  INSERT INTO profile_coaching_requests (
    user_id, status, sla_deadline
  ) VALUES (
    p_user_id, 'pending', NOW() + INTERVAL '48 hours'
  )
  RETURNING id INTO v_req_id;
  RETURN v_req_id;
END;
$$;

-- Create concierge request
CREATE OR REPLACE FUNCTION create_concierge_request(
  p_user_id         UUID,
  p_match_id        UUID,
  p_preferred_date  DATE,
  p_time_range      TEXT,
  p_date_type       TEXT,
  p_budget          TEXT,
  p_special_requests TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_req_id UUID;
BEGIN
  INSERT INTO date_concierge_requests (
    user_id, match_id, preferred_date, time_range, date_type, budget, special_requests
  ) VALUES (
    p_user_id, p_match_id, p_preferred_date, p_time_range,
    p_date_type, p_budget, p_special_requests
  )
  RETURNING id INTO v_req_id;
  RETURN v_req_id;
END;
$$;

-- Submit monetization feedback
CREATE OR REPLACE FUNCTION submit_monetization_feedback(
  p_user_id       UUID,
  p_is_fair       TEXT,
  p_unfair_feature TEXT,
  p_free_text     TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO monetization_feedback (user_id, is_fair, unfair_feature, free_text)
  VALUES (p_user_id, p_is_fair, p_unfair_feature, p_free_text);
END;
$$;
