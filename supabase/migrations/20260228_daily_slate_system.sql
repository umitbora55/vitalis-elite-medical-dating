-- ============================================================
-- VITALIS: Sınırlı Günlük Öneri Sistemi (Özellik 3)
-- Migration: 20260228_daily_slate_system.sql
-- Date-conversion optimized, fairness-first recommendation slate
-- ============================================================

-- ── 1. EXTEND daily_picks WITH SLATE METADATA ─────────────────────────────────
ALTER TABLE daily_picks
  ADD COLUMN IF NOT EXISTS slate_category    TEXT DEFAULT 'high_compatibility'
    CHECK (slate_category IN ('high_compatibility','exploration','serendipity','fresh_verified')),
  ADD COLUMN IF NOT EXISTS slate_position    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS date_score        NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_score    NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score       NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freshness_score   NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_score       NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS is_bonus          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carried_over      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS same_hospital     BOOLEAN NOT NULL DEFAULT false;

-- ── 2. DAILY SLATE CONTAINER ───────────────────────────────────────────────────
-- One row per user per day; tracks aggregate slate progress
CREATE TABLE IF NOT EXISTS user_daily_slates (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slate_date                  DATE NOT NULL,
  slate_size                  INTEGER NOT NULL DEFAULT 7,
  seen_count                  INTEGER NOT NULL DEFAULT 0,
  liked_count                 INTEGER NOT NULL DEFAULT 0,
  passed_count                INTEGER NOT NULL DEFAULT 0,
  match_count                 INTEGER NOT NULL DEFAULT 0,
  bonus_used                  BOOLEAN NOT NULL DEFAULT false,
  pending_matches_at_creation INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  expires_at                  TIMESTAMPTZ,
  UNIQUE (user_id, slate_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_slates_user_date
  ON user_daily_slates (user_id, slate_date DESC);

-- ── 3. USER MATCH STATUS (Pending / Active / Dead aggregates) ─────────────────
CREATE TABLE IF NOT EXISTS user_match_status (
  user_id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  active_matches_count     INTEGER NOT NULL DEFAULT 0,
  pending_matches_count    INTEGER NOT NULL DEFAULT 0,
  dead_matches_count       INTEGER NOT NULL DEFAULT 0,
  last_message_sent_at     TIMESTAMPTZ,
  last_message_received_at TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. USER EXPOSURE TRACKING (Fairness / Anti-popularity-bias) ───────────────
CREATE TABLE IF NOT EXISTS user_exposure_tracking (
  target_user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  likes_received    INTEGER NOT NULL DEFAULT 0,
  passes_received   INTEGER NOT NULL DEFAULT 0,
  last_shown_at     TIMESTAMPTZ,
  weekly_impressions INTEGER NOT NULL DEFAULT 0,
  week_start        DATE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exposure_last_shown
  ON user_exposure_tracking (last_shown_at DESC);

-- ── 5. SLATE METRICS (Date-conversion-first dashboard) ────────────────────────
CREATE TABLE IF NOT EXISTS slate_metrics_daily (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date                  DATE NOT NULL UNIQUE,
  total_slates_generated       INTEGER NOT NULL DEFAULT 0,
  total_slates_completed       INTEGER NOT NULL DEFAULT 0,
  total_likes                  INTEGER NOT NULL DEFAULT 0,
  total_passes                 INTEGER NOT NULL DEFAULT 0,
  total_matches                INTEGER NOT NULL DEFAULT 0,
  total_conversations_started  INTEGER NOT NULL DEFAULT 0,
  avg_slate_completion_rate    NUMERIC(5,2) DEFAULT 0,
  avg_like_rate                NUMERIC(5,2) DEFAULT 0,
  avg_match_rate               NUMERIC(5,2) DEFAULT 0,
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. EXTEND profiles FOR SLATE PREFERENCES & SCORING ────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS response_rate           NUMERIC(5,4) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS date_conversion_rate    NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_slate_impressions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_slated_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS slate_show_same_hospital BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slate_specialty_preference TEXT NOT NULL DEFAULT 'any'
    CHECK (slate_specialty_preference IN ('same','different','any'));

-- ── 7. RPC: RECORD SLATE INTERACTION (atomically updates 3 tables) ─────────────
CREATE OR REPLACE FUNCTION record_slate_interaction(
  p_slate_id       UUID,
  p_target_user_id UUID,
  p_action         TEXT,   -- 'seen' | 'liked' | 'passed'
  p_time_spent     INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today   DATE := CURRENT_DATE;
BEGIN
  -- 1. Update daily_picks row
  UPDATE daily_picks
  SET
    is_viewed = true,
    is_liked  = CASE WHEN p_action = 'liked'  THEN true
                     WHEN p_action = 'passed' THEN false
                     ELSE is_liked  END,
    is_passed = CASE WHEN p_action = 'passed' THEN true
                     WHEN p_action = 'liked'  THEN false
                     ELSE is_passed END,
    time_spent_seconds = COALESCE(p_time_spent, time_spent_seconds)
  WHERE user_id         = v_user_id
    AND picked_user_id  = p_target_user_id
    AND pick_date       = v_today;

  -- 2. Update slate container counters
  IF p_slate_id IS NOT NULL THEN
    UPDATE user_daily_slates
    SET
      seen_count   = seen_count   + CASE WHEN p_action IN ('seen','liked','passed') THEN 1 ELSE 0 END,
      liked_count  = liked_count  + CASE WHEN p_action = 'liked'  THEN 1 ELSE 0 END,
      passed_count = passed_count + CASE WHEN p_action = 'passed' THEN 1 ELSE 0 END
    WHERE id = p_slate_id;
  END IF;

  -- 3. Update fairness exposure tracking for the target profile
  INSERT INTO user_exposure_tracking
    (target_user_id, impressions_count, likes_received, passes_received, last_shown_at, week_start)
  VALUES (
    p_target_user_id,
    1,
    CASE WHEN p_action = 'liked'  THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'passed' THEN 1 ELSE 0 END,
    NOW(),
    DATE_TRUNC('week', CURRENT_DATE)::DATE
  )
  ON CONFLICT (target_user_id) DO UPDATE SET
    impressions_count  = user_exposure_tracking.impressions_count + 1,
    likes_received     = user_exposure_tracking.likes_received
                         + CASE WHEN p_action = 'liked'  THEN 1 ELSE 0 END,
    passes_received    = user_exposure_tracking.passes_received
                         + CASE WHEN p_action = 'passed' THEN 1 ELSE 0 END,
    last_shown_at      = NOW(),
    weekly_impressions = CASE
      WHEN user_exposure_tracking.week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE
        THEN user_exposure_tracking.weekly_impressions + 1
      ELSE 1
    END,
    week_start         = DATE_TRUNC('week', CURRENT_DATE)::DATE,
    updated_at         = NOW();

  -- 4. Bump total_slate_impressions on target profile
  UPDATE profiles
  SET
    total_slate_impressions = COALESCE(total_slate_impressions, 0) + 1,
    last_slated_at          = NOW()
  WHERE id = p_target_user_id;
END;
$$;

-- ── 8. RPC: GET OR CREATE SLATE METADATA ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_daily_slate(
  p_user_id       UUID,
  p_pending_count INTEGER DEFAULT 0,
  p_slate_size    INTEGER DEFAULT 7
)
RETURNS TABLE (
  slate_id    UUID,
  slate_date  DATE,
  bonus_used  BOOLEAN,
  seen_count  INTEGER,
  liked_count INTEGER,
  match_count INTEGER,
  expires_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today        DATE := CURRENT_DATE;
  -- Next 06:00 Turkish time = UTC+3 → 03:00 UTC next day
  v_next_refresh TIMESTAMPTZ := (v_today + 1)::TIMESTAMPTZ + INTERVAL '3 hours';
BEGIN
  INSERT INTO user_daily_slates
    (user_id, slate_date, slate_size, pending_matches_at_creation, expires_at)
  VALUES
    (p_user_id, v_today, p_slate_size, p_pending_count, v_next_refresh)
  ON CONFLICT (user_id, slate_date) DO NOTHING;

  RETURN QUERY
  SELECT
    s.id,
    s.slate_date,
    s.bonus_used,
    s.seen_count,
    s.liked_count,
    s.match_count,
    s.expires_at
  FROM user_daily_slates s
  WHERE s.user_id = p_user_id AND s.slate_date = v_today;
END;
$$;

-- ── 9. RPC: CONSUME BONUS (idempotent) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION consume_daily_bonus(p_user_id UUID)
RETURNS BOOLEAN   -- true = bonus granted, false = already used
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today    DATE := CURRENT_DATE;
  v_already  BOOLEAN;
BEGIN
  SELECT bonus_used INTO v_already
  FROM user_daily_slates
  WHERE user_id = p_user_id AND slate_date = v_today;

  IF v_already IS NOT DISTINCT FROM true THEN
    RETURN false;
  END IF;

  UPDATE user_daily_slates
  SET bonus_used = true
  WHERE user_id = p_user_id AND slate_date = v_today;

  RETURN true;
END;
$$;

-- ── 10. RPC: UPSERT USER MATCH STATUS (called from client after match changes) ─
CREATE OR REPLACE FUNCTION upsert_match_status(
  p_user_id             UUID,
  p_active_count        INTEGER,
  p_pending_count       INTEGER,
  p_dead_count          INTEGER,
  p_last_sent_at        TIMESTAMPTZ DEFAULT NULL,
  p_last_received_at    TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_match_status
    (user_id, active_matches_count, pending_matches_count, dead_matches_count,
     last_message_sent_at, last_message_received_at, updated_at)
  VALUES
    (p_user_id, p_active_count, p_pending_count, p_dead_count,
     p_last_sent_at, p_last_received_at, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    active_matches_count     = p_active_count,
    pending_matches_count    = p_pending_count,
    dead_matches_count       = p_dead_count,
    last_message_sent_at     = COALESCE(p_last_sent_at, user_match_status.last_message_sent_at),
    last_message_received_at = COALESCE(p_last_received_at, user_match_status.last_message_received_at),
    updated_at               = NOW();
END;
$$;

-- ── 11. RLS ────────────────────────────────────────────────────────────────────

-- user_daily_slates
ALTER TABLE user_daily_slates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own daily slates"    ON user_daily_slates;
CREATE POLICY "Users own daily slates"
  ON user_daily_slates FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_match_status
ALTER TABLE user_match_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own match status"    ON user_match_status;
CREATE POLICY "Users own match status"
  ON user_match_status FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_exposure_tracking – all auth users can read (used for fairness scoring)
ALTER TABLE user_exposure_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read exposure"  ON user_exposure_tracking;
CREATE POLICY "Auth users read exposure"
  ON user_exposure_tracking FOR SELECT TO authenticated
  USING (true);

-- slate_metrics_daily – moderators only
ALTER TABLE slate_metrics_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators read metrics"   ON slate_metrics_daily;
CREATE POLICY "Moderators read metrics"
  ON slate_metrics_daily FOR SELECT TO authenticated
  USING (public.auth_has_moderation_access());

-- ── 12. COMMENTS (DSA / Documentation) ───────────────────────────────────────
COMMENT ON TABLE user_daily_slates        IS 'Özellik 3: Günlük sınırlı öneri paketi. Max 7 profil/gün, bekleyen match sayısına göre azaltılır.';
COMMENT ON TABLE user_match_status        IS 'Özellik 3: Kullanıcı match durumu özeti. Pending sayısı slate boyutunu etkiler.';
COMMENT ON TABLE user_exposure_tracking   IS 'Özellik 3: Adil görünürlük takibi. Popularity bias önleme (Gini < 0.3 hedefi).';
COMMENT ON TABLE slate_metrics_daily      IS 'Özellik 3: Günlük metrik toplama. Date conversion odaklı ölçüm.';
COMMENT ON COLUMN profiles.response_rate  IS 'Özellik 3: Tahmin edilen mesaj cevap oranı (0–1). Response probability hesabında kullanılır.';
COMMENT ON COLUMN profiles.date_conversion_rate IS 'Özellik 3: Match → date dönüşüm oranı. Ranking skoru bileşeni.';
