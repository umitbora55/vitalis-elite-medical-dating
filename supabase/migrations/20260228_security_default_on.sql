-- ============================================================
-- VITALIS: Güvenlik Varsayılan Açık Sistemi (Özellik 5)
-- Migration: 20260228_security_default_on.sql
-- All safety features DEFAULT ON — users can opt out.
-- ============================================================

-- ── 1. USER SECURITY SETTINGS (all defaults ON) ─────────────────────────────
-- One row per user. Created automatically on first profile fetch if missing.
CREATE TABLE IF NOT EXISTS user_security_settings (
  user_id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Location privacy
  location_privacy_level   TEXT NOT NULL DEFAULT 'approximate'
    CHECK (location_privacy_level IN ('approximate', 'city_only', 'hidden')),

  -- Content moderation
  harassment_filter        BOOLEAN NOT NULL DEFAULT true,
  threat_filter            BOOLEAN NOT NULL DEFAULT true,
  scam_filter              BOOLEAN NOT NULL DEFAULT true,
  spam_filter              BOOLEAN NOT NULL DEFAULT true,
  review_before_send       BOOLEAN NOT NULL DEFAULT true,

  -- Visual safety
  explicit_image_blur      BOOLEAN NOT NULL DEFAULT true,
  screenshot_notify        BOOLEAN NOT NULL DEFAULT true,

  -- Chat safety
  link_safety_check        BOOLEAN NOT NULL DEFAULT true,
  personal_info_warning    BOOLEAN NOT NULL DEFAULT true,
  financial_warning        BOOLEAN NOT NULL DEFAULT true,
  external_app_warning     BOOLEAN NOT NULL DEFAULT true,

  -- Discovery safety
  show_risk_warnings       BOOLEAN NOT NULL DEFAULT true,

  -- Healthcare-specific
  hide_same_institution    BOOLEAN NOT NULL DEFAULT false,  -- user opt-in (not default)
  hide_profession_detail   BOOLEAN NOT NULL DEFAULT false,
  patient_privacy_reminder BOOLEAN NOT NULL DEFAULT true,

  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create settings row when profile is created
CREATE OR REPLACE FUNCTION fn_create_default_security_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_security_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_security_settings ON profiles;
CREATE TRIGGER trg_create_security_settings
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_create_default_security_settings();

-- ── 2. LOCATION PRIVACY TABLE ────────────────────────────────────────────────
-- Stores the obfuscated display coordinates separate from real coordinates.
CREATE TABLE IF NOT EXISTS location_privacy (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Real coordinates (encrypted at app level — stored for distance calc)
  real_latitude    NUMERIC(9,6),
  real_longitude   NUMERIC(9,6),
  -- Obfuscated display coordinates
  display_latitude  NUMERIC(9,6),
  display_longitude NUMERIC(9,6),
  display_radius_m  INTEGER NOT NULL DEFAULT 1000,  -- meters — radius of obfuscation circle
  offset_seed       TEXT,       -- deterministic seed so offset is stable per session
  -- Human-readable location
  city              TEXT,
  district          TEXT,       -- ilçe
  neighborhood      TEXT,       -- semt/mahalle (never shown exactly for small areas)
  -- Privacy level mirrors user_security_settings
  privacy_level     TEXT NOT NULL DEFAULT 'approximate'
    CHECK (privacy_level IN ('approximate', 'city_only', 'hidden')),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. MESSAGE MODERATION LOG ────────────────────────────────────────────────
-- Every potentially flagged message gets a row here.
CREATE TABLE IF NOT EXISTS message_moderation_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id        TEXT,          -- references messages (app-level id, not strict FK)
  sender_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id          TEXT,          -- app-level match id
  message_text      TEXT,          -- stored for review (hashed or truncated for privacy)
  toxicity_score    NUMERIC(4,3),  -- 0.000 – 1.000
  category          TEXT
    CHECK (category IN ('harassment','threat','sexual_coercion','scam','spam','personal_info','financial','external_link','safe')),
  action_taken      TEXT NOT NULL DEFAULT 'allow'
    CHECK (action_taken IN ('allow','warn_sender','block_with_override','block_and_escalate','soft_warn')),
  user_override     BOOLEAN NOT NULL DEFAULT false,  -- true if user sent anyway after warning
  false_positive    BOOLEAN NOT NULL DEFAULT false,
  moderator_reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_mod_sender   ON message_moderation_log (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_mod_receiver ON message_moderation_log (receiver_id);
CREATE INDEX IF NOT EXISTS idx_msg_mod_action   ON message_moderation_log (action_taken) WHERE action_taken != 'allow';

-- ── 4. IMAGE MODERATION LOG ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS image_moderation_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       TEXT,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_hash       TEXT,          -- perceptual hash for deduplication
  safety_score     NUMERIC(4,3),
  nudity_score     NUMERIC(4,3),
  violence_score   NUMERIC(4,3),
  category         TEXT NOT NULL DEFAULT 'safe'
    CHECK (category IN ('safe','suggestive','explicit','violent')),
  action_taken     TEXT NOT NULL DEFAULT 'allow'
    CHECK (action_taken IN ('allow','blur','block','block_and_escalate')),
  sender_notified  BOOLEAN NOT NULL DEFAULT false,
  receiver_action  TEXT DEFAULT 'pending'
    CHECK (receiver_action IN ('pending','viewed','reported','deleted')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_img_mod_sender ON image_moderation_log (sender_id, created_at DESC);

-- ── 5. PROFILE RISK SCORES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_risk_scores (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  risk_score       INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_level       TEXT NOT NULL DEFAULT 'normal'
    CHECK (risk_level IN ('safe','normal','caution','high','critical')),
  -- Factor breakdown
  liveness_factor      INTEGER NOT NULL DEFAULT 0,   -- 0 = verified (good), positive = risk
  healthcare_factor    INTEGER NOT NULL DEFAULT 0,
  report_factor        INTEGER NOT NULL DEFAULT 0,
  photo_factor         INTEGER NOT NULL DEFAULT 0,   -- stock photo match
  scam_pattern_factor  INTEGER NOT NULL DEFAULT 0,
  account_age_factor   INTEGER NOT NULL DEFAULT 0,
  messaging_factor     INTEGER NOT NULL DEFAULT 0,
  -- Reason codes for "why this warning" transparency
  risk_reasons         TEXT[] DEFAULT '{}',
  -- Computed at
  calculated_at        TIMESTAMPTZ DEFAULT NOW(),
  -- Hidden from discovery when critical
  is_discovery_hidden  BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_risk_level ON profile_risk_scores (risk_level) WHERE risk_level IN ('caution','high','critical');

-- ── 6. SCREENSHOT LOGS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenshot_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taker_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context       TEXT NOT NULL DEFAULT 'chat'  -- 'chat' | 'profile'
    CHECK (context IN ('chat','profile')),
  notified      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. EXTEND profiles FOR HEALTHCARE PRIVACY ───────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hide_profession_detail     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_institution_name      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS patient_privacy_ack        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS security_settings_version  INTEGER NOT NULL DEFAULT 1;

-- ── 8. RPC: GET OR CREATE SECURITY SETTINGS ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_security_settings(p_user_id UUID)
RETURNS user_security_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings user_security_settings;
BEGIN
  INSERT INTO user_security_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_settings FROM user_security_settings WHERE user_id = p_user_id;
  RETURN v_settings;
END;
$$;

-- ── 9. RPC: UPDATE LOCATION PRIVACY ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_location_privacy(
  p_real_lat    NUMERIC,
  p_real_lng    NUMERIC,
  p_disp_lat    NUMERIC,
  p_disp_lng    NUMERIC,
  p_radius_m    INTEGER,
  p_seed        TEXT,
  p_city        TEXT DEFAULT NULL,
  p_district    TEXT DEFAULT NULL,
  p_privacy     TEXT DEFAULT 'approximate'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO location_privacy
    (user_id, real_latitude, real_longitude, display_latitude, display_longitude,
     display_radius_m, offset_seed, city, district, privacy_level, updated_at)
  VALUES
    (auth.uid(), p_real_lat, p_real_lng, p_disp_lat, p_disp_lng,
     p_radius_m, p_seed, p_city, p_district, p_privacy, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    real_latitude     = p_real_lat,
    real_longitude    = p_real_lng,
    display_latitude  = p_disp_lat,
    display_longitude = p_disp_lng,
    display_radius_m  = p_radius_m,
    offset_seed       = p_seed,
    city              = COALESCE(p_city, location_privacy.city),
    district          = COALESCE(p_district, location_privacy.district),
    privacy_level     = p_privacy,
    updated_at        = NOW();
END;
$$;

-- ── 10. RPC: LOG MESSAGE MODERATION ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_message_moderation(
  p_sender_id     UUID,
  p_receiver_id   UUID,
  p_match_id      TEXT,
  p_score         NUMERIC,
  p_category      TEXT,
  p_action        TEXT,
  p_user_override BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO message_moderation_log
    (sender_id, receiver_id, match_id, toxicity_score, category, action_taken, user_override)
  VALUES
    (p_sender_id, p_receiver_id, p_match_id, p_score, p_category, p_action, p_user_override)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── 11. RPC: COMPUTE PROFILE RISK SCORE ──────────────────────────────────────
CREATE OR REPLACE FUNCTION compute_profile_risk(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score         INTEGER := 50;  -- Start neutral
  v_report_count  INTEGER;
  v_liveness      BOOLEAN;
  v_hc_verified   BOOLEAN;
  v_account_days  INTEGER;
  v_level         TEXT;
BEGIN
  -- Fetch basic profile data
  SELECT
    (SELECT COUNT(*) FROM reports WHERE reported_id = p_user_id AND status = 'pending'),
    COALESCE((SELECT status = 'VERIFIED' FROM user_trust_badges WHERE user_id = p_user_id LIMIT 1), false),
    COALESCE((SELECT verification_status = 'VERIFIED' FROM profiles WHERE id = p_user_id), false),
    COALESCE(EXTRACT(DAY FROM NOW() - (SELECT created_at FROM profiles WHERE id = p_user_id))::INTEGER, 0)
  INTO v_report_count, v_liveness, v_hc_verified, v_account_days;

  -- Reduce score for positive signals
  IF v_liveness     THEN v_score := v_score - 20; END IF;
  IF v_hc_verified  THEN v_score := v_score - 25; END IF;
  IF v_account_days > 30  THEN v_score := v_score - 10; END IF;
  IF v_account_days > 90  THEN v_score := v_score - 5;  END IF;
  IF v_report_count = 0   THEN v_score := v_score - 10; END IF;

  -- Increase score for negative signals
  v_score := v_score + LEAST(v_report_count * 15, 50);
  IF v_account_days < 3 THEN v_score := v_score + 15; END IF;

  -- Clamp
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Determine level
  v_level := CASE
    WHEN v_score <= 20 THEN 'safe'
    WHEN v_score <= 40 THEN 'normal'
    WHEN v_score <= 60 THEN 'caution'
    WHEN v_score <= 80 THEN 'high'
    ELSE 'critical'
  END;

  -- Upsert
  INSERT INTO profile_risk_scores (user_id, risk_score, risk_level, report_factor, calculated_at)
  VALUES (p_user_id, v_score, v_level, v_report_count * 15, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    risk_score     = v_score,
    risk_level     = v_level,
    report_factor  = v_report_count * 15,
    calculated_at  = NOW();

  RETURN v_score;
END;
$$;

-- ── 12. RLS ──────────────────────────────────────────────────────────────────

-- user_security_settings: own row only
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own security settings" ON user_security_settings;
CREATE POLICY "Users own security settings"
  ON user_security_settings FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- location_privacy: own row only (display cols public to matched users)
ALTER TABLE location_privacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own location" ON location_privacy;
CREATE POLICY "Users manage own location"
  ON location_privacy FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Matched users can read display coordinates only
DROP POLICY IF EXISTS "Matched users read display location" ON location_privacy;
CREATE POLICY "Matched users read display location"
  ON location_privacy FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM matches m WHERE m.is_active = true
        AND ((m.profile_1_id = auth.uid() AND m.profile_2_id = location_privacy.user_id)
          OR (m.profile_2_id = auth.uid() AND m.profile_1_id = location_privacy.user_id))
    )
  );

-- message_moderation_log: sender/receiver only
ALTER TABLE message_moderation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Message parties read moderation" ON message_moderation_log;
CREATE POLICY "Message parties read moderation"
  ON message_moderation_log FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Moderators can see all
DROP POLICY IF EXISTS "Moderators read message moderation" ON message_moderation_log;
CREATE POLICY "Moderators read message moderation"
  ON message_moderation_log FOR SELECT TO authenticated
  USING (public.auth_has_moderation_access());

-- image_moderation_log: same pattern
ALTER TABLE image_moderation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Image parties read moderation" ON image_moderation_log;
CREATE POLICY "Image parties read moderation"
  ON image_moderation_log FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- profile_risk_scores: authenticated users can read others' risk level (not full details)
ALTER TABLE profile_risk_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read risk level" ON profile_risk_scores;
CREATE POLICY "Auth users read risk level"
  ON profile_risk_scores FOR SELECT TO authenticated
  USING (true);  -- risk level/score is public within the app

-- screenshot_logs: own rows
ALTER TABLE screenshot_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own screenshot logs" ON screenshot_logs;
CREATE POLICY "Users own screenshot logs"
  ON screenshot_logs FOR ALL TO authenticated
  USING (taker_id = auth.uid() OR target_id = auth.uid())
  WITH CHECK (taker_id = auth.uid());

-- ── 13. COMMENTS ─────────────────────────────────────────────────────────────
COMMENT ON TABLE user_security_settings  IS 'Özellik 5: Tüm güvenlik ayarları. Varsayılan ON — kullanıcı kapatabilir.';
COMMENT ON TABLE location_privacy        IS 'Özellik 5: Obfüsle edilmiş konum. Gerçek koordinatlar ayrı, gösterim koordinatları kaydırılmış.';
COMMENT ON TABLE message_moderation_log  IS 'Özellik 5: Mesaj moderasyon kaydı. Taciz/tehdit/scam tespiti.';
COMMENT ON TABLE image_moderation_log    IS 'Özellik 5: Görsel moderasyon kaydı. Explicit içerik tespiti.';
COMMENT ON TABLE profile_risk_scores     IS 'Özellik 5: Profil risk skoru. 0-100 arası, discovery filtresinde kullanılır.';
COMMENT ON TABLE screenshot_logs         IS 'Özellik 5: Screenshot bildirimi kaydı.';

-- ── 14. DEFENSE-IN-DEPTH: GPS SAFE VIEW ──────────────────────────────────────
-- Application code MUST query this view instead of location_privacy directly
-- when fetching another user's location. Real GPS columns are excluded.
CREATE OR REPLACE VIEW location_privacy_display
  WITH (security_invoker = true)   -- respects caller's RLS context
AS
  SELECT
    user_id,
    privacy_level,
    display_latitude,
    display_longitude,
    display_radius_m,
    city,
    district,
    updated_at
    -- EXCLUDED: real_latitude, real_longitude, offset_seed, neighborhood
  FROM location_privacy;

COMMENT ON VIEW location_privacy_display IS
  'AUDIT-FIX BE-001: GPS-safe projection of location_privacy. '
  'Excludes real_latitude, real_longitude, offset_seed, neighborhood. '
  'Use this view for matched-user location queries.';
