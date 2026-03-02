-- ============================================================
-- 007_anti_abuse.sql
-- Anti-Abuse & Moderation Layer
-- Features:
--   1. Multi-account device fingerprint detection
--   2. Photo perceptual-hash duplicate detection
--   3. Block-and-report flow (blocks table)
--   4. Community violation rules + zero-tolerance
--   5. Auto-restriction based on report threshold
--   6. Extended reputation scoring (plan cancel tiers)
--   7. Appeal / Dispute workflow
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. DEVICE ACCOUNTS (Multi-Account Detection)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS device_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL,
  user_ids           UUID[] DEFAULT '{}',
  account_count      INT  DEFAULT 1,
  first_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ DEFAULT NOW(),
  is_flagged         BOOLEAN DEFAULT FALSE,
  flagged_at         TIMESTAMPTZ,
  status             TEXT DEFAULT 'normal'
    CHECK (status IN ('normal', 'suspicious', 'blocked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS device_accounts_fingerprint_idx
  ON device_accounts(device_fingerprint);

ALTER TABLE device_accounts ENABLE ROW LEVEL SECURITY;

-- Only admin/service can read/write
CREATE POLICY "device_accounts_admin_only"
  ON device_accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 2. PHOTO HASH / DUPLICATE DETECTION
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS photo_hashes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_path       TEXT NOT NULL,
  perceptual_hash  TEXT NOT NULL,
  file_hash        TEXT,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS photo_hashes_phash_idx ON photo_hashes(perceptual_hash);
CREATE INDEX IF NOT EXISTS photo_hashes_user_idx  ON photo_hashes(user_id);

ALTER TABLE photo_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_hashes_owner_read"
  ON photo_hashes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "photo_hashes_owner_insert"
  ON photo_hashes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "photo_hashes_admin_all"
  ON photo_hashes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- Duplicate flag table
CREATE TABLE IF NOT EXISTS duplicate_photo_flags (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_photo_id  UUID NOT NULL REFERENCES photo_hashes(id) ON DELETE CASCADE,
  duplicate_photo_id UUID NOT NULL REFERENCES photo_hashes(id) ON DELETE CASCADE,
  original_user_id   UUID NOT NULL,
  duplicate_user_id  UUID NOT NULL,
  similarity_score   DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  status             TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed_duplicate', 'false_positive')),
  flagged_at         TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at        TIMESTAMPTZ,
  reviewed_by        UUID REFERENCES profiles(id)
);

ALTER TABLE duplicate_photo_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dup_flags_admin_only"
  ON duplicate_photo_flags FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. BLOCKS TABLE (Block + Report Flow)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason      TEXT,
  with_report BOOLEAN DEFAULT FALSE,
  report_id   UUID REFERENCES reports(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks(blocked_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_owner_all"
  ON blocks FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 4. VIOLATION RULES (Community Guidelines + Zero Tolerance)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS violation_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code       TEXT UNIQUE NOT NULL,
  rule_name       TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL CHECK (severity IN ('warning', 'temp_ban', 'perm_ban')),
  auto_action     TEXT NOT NULL DEFAULT 'none'
    CHECK (auto_action IN ('none', 'restrict', 'temp_ban_24h', 'temp_ban_7d', 'temp_ban_3d', 'perm_ban')),
  is_zero_tolerance BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed zero-tolerance rules
INSERT INTO violation_rules (rule_code, rule_name, description, severity, auto_action, is_zero_tolerance)
VALUES
  ('sexual_content_send',    'Cinsel İçerik Gönderme',       'İstenmeyen cinsel içerik/görüntü gönderme',           'perm_ban',  'perm_ban',     TRUE),
  ('threatening_message',    'Tehdit İçerikli Mesaj',         'Fiziksel veya psikolojik tehdit içeren mesajlar',     'perm_ban',  'perm_ban',     TRUE),
  ('child_abuse_content',    'Çocuk İstismarı İçeriği',       'Her türlü çocuk istismarı içeriği',                   'perm_ban',  'perm_ban',     TRUE),
  ('doxxing',                'Kişisel Bilgi Paylaşımı (Doxx)', 'Rıza olmadan kişisel bilgi paylaşımı',               'perm_ban',  'perm_ban',     TRUE),
  ('persistent_harassment',  'Israrcı Taciz',                  'Engelleme sonrası ısrar veya sürekli rahatsız etme', 'temp_ban',  'temp_ban_7d',  FALSE),
  ('spam_messages',          'Spam / Reklam',                  'Tekrarlayan spam veya reklam mesajları',             'temp_ban',  'temp_ban_24h', FALSE),
  ('verbal_abuse',           'Küfür / Hakaret',                'Ağır hakaret veya aşağılayıcı dil',                 'temp_ban',  'temp_ban_3d',  FALSE),
  ('fake_profile',           'Sahte Profil',                   'Başka birinin kimliğini kullanma',                   'temp_ban',  'temp_ban_7d',  FALSE),
  ('underage',               'Yaş Altı Kullanıcı',             '18 yaş altı kullanıcı tespiti',                     'perm_ban',  'perm_ban',     TRUE)
ON CONFLICT (rule_code) DO NOTHING;

-- Violation history per user
CREATE TABLE IF NOT EXISTS user_violations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rule_code       TEXT NOT NULL REFERENCES violation_rules(rule_code),
  report_id       UUID REFERENCES reports(id),
  action_taken    TEXT NOT NULL,
  applied_by      UUID REFERENCES profiles(id),
  auto_applied    BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_violations_user_idx ON user_violations(user_id);

ALTER TABLE violation_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_violations    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "violation_rules_public_read"
  ON violation_rules FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "user_violations_admin_all"
  ON user_violations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

CREATE POLICY "user_violations_own_read"
  ON user_violations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 5. AUTO-RESTRICTIONS (Repeated Report Threshold)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auto_restrictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL
    CHECK (restriction_type IN ('shadow_limit', 'messaging_disabled', 'discovery_hidden')),
  trigger_reason   TEXT NOT NULL
    CHECK (trigger_reason IN ('multiple_reports', 'spam_detection', 'abuse_pattern')),
  trigger_count    INT  NOT NULL DEFAULT 0,
  trigger_reports  UUID[] DEFAULT '{}',
  applied_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  reviewed         BOOLEAN DEFAULT FALSE,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID REFERENCES profiles(id),
  review_result    TEXT CHECK (review_result IN ('lifted', 'extended', 'permanent'))
);

CREATE INDEX IF NOT EXISTS auto_restrictions_user_idx    ON auto_restrictions(user_id);
CREATE INDEX IF NOT EXISTS auto_restrictions_active_idx  ON auto_restrictions(user_id, is_active);

ALTER TABLE auto_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auto_restrictions_admin_all"
  ON auto_restrictions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- Trigger: check report threshold after each new report
CREATE OR REPLACE FUNCTION fn_check_auto_restriction()
RETURNS TRIGGER AS $$
DECLARE
  v_24h_count   INT;
  v_7d_count    INT;
  v_30d_count   INT;
  v_expires     TIMESTAMPTZ;
  v_type        TEXT;
  v_already     BOOLEAN;
BEGIN
  -- Count distinct reporters in various windows
  SELECT COUNT(DISTINCT reporter_id) INTO v_24h_count
  FROM reports
  WHERE reported_user_id = NEW.reported_user_id
    AND created_at >= NOW() - INTERVAL '24 hours';

  SELECT COUNT(DISTINCT reporter_id) INTO v_7d_count
  FROM reports
  WHERE reported_user_id = NEW.reported_user_id
    AND created_at >= NOW() - INTERVAL '7 days';

  SELECT COUNT(DISTINCT reporter_id) INTO v_30d_count
  FROM reports
  WHERE reported_user_id = NEW.reported_user_id
    AND created_at >= NOW() - INTERVAL '30 days';

  -- Check if already shadow-limited
  SELECT EXISTS(
    SELECT 1 FROM auto_restrictions
    WHERE user_id = NEW.reported_user_id
      AND is_active = TRUE
      AND restriction_type = 'shadow_limit'
  ) INTO v_already;

  -- Apply thresholds
  IF v_24h_count >= 3 AND NOT v_already THEN
    v_type    := 'shadow_limit';
    v_expires := NOW() + INTERVAL '24 hours';

    INSERT INTO auto_restrictions
      (user_id, restriction_type, trigger_reason, trigger_count, trigger_reports, expires_at)
    VALUES
      (NEW.reported_user_id, v_type, 'multiple_reports', v_24h_count,
       ARRAY(SELECT id FROM reports WHERE reported_user_id = NEW.reported_user_id
             AND created_at >= NOW() - INTERVAL '24 hours'),
       v_expires);

  ELSIF v_7d_count >= 5 THEN
    -- Extend to 72h + discovery_hidden
    UPDATE auto_restrictions
    SET expires_at = NOW() + INTERVAL '72 hours',
        trigger_count = v_7d_count
    WHERE user_id = NEW.reported_user_id
      AND is_active = TRUE
      AND restriction_type = 'shadow_limit';

    -- Also add discovery_hidden if not present
    INSERT INTO auto_restrictions
      (user_id, restriction_type, trigger_reason, trigger_count, expires_at)
    VALUES
      (NEW.reported_user_id, 'discovery_hidden', 'multiple_reports', v_7d_count,
       NOW() + INTERVAL '72 hours')
    ON CONFLICT DO NOTHING;

  ELSIF v_30d_count >= 10 THEN
    -- Permanent shadow + admin review flag
    UPDATE auto_restrictions
    SET expires_at = NULL, -- permanent until reviewed
        trigger_count = v_30d_count
    WHERE user_id = NEW.reported_user_id
      AND is_active = TRUE
      AND restriction_type = 'shadow_limit';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_restriction ON reports;
CREATE TRIGGER trg_auto_restriction
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_auto_restriction();

-- ─────────────────────────────────────────────────────────────
-- 6. REPUTATION: Extended scoring columns
-- ─────────────────────────────────────────────────────────────

-- Add plan_cancel_count tiers to user_reputation if not present
ALTER TABLE user_reputation
  ADD COLUMN IF NOT EXISTS normal_cancel_count    INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_cancel_count_2h   INT DEFAULT 0, -- < 2h before
  ADD COLUMN IF NOT EXISTS plan_cancel_timestamps TIMESTAMPTZ[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_recovery_applied_at TIMESTAMPTZ;

-- Updated reputation recalculation with tiered cancel penalties
CREATE OR REPLACE FUNCTION fn_recalculate_reputation(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_rep   user_reputation%ROWTYPE;
  v_raw   DECIMAL(5,2);
  v_score DECIMAL(5,2);
BEGIN
  SELECT * INTO v_rep FROM user_reputation WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_reputation (user_id) VALUES (p_user_id);
    RETURN;
  END IF;

  v_raw :=
    1.00
    -- Normal cancel (24h+ before): -0.02
    + COALESCE(v_rep.normal_cancel_count, 0) * (-0.02)
    -- Late cancel (within 24h): -0.08 (sum of old cancel_count + late_cancel_count)
    + COALESCE(v_rep.cancel_count, 0)       * (-0.05)
    + COALESCE(v_rep.late_cancel_count, 0)  * (-0.10)
    -- Very late cancel (<2h): -0.15
    + COALESCE(v_rep.late_cancel_count_2h, 0) * (-0.15)
    -- No-show: -0.20
    + COALESCE(v_rep.no_show_count, 0)      * (-0.20)
    -- Completed plan: +0.03
    + COALESCE(v_rep.completed_plans, 0)    * (+0.03)
    -- Positive feedback: +0.03
    + COALESCE(v_rep.positive_feedback_count, 0) * (+0.03);

  v_score := GREATEST(0.00, LEAST(1.00, v_raw));

  UPDATE user_reputation
  SET reliability_score   = v_score,
      last_calculated_at  = NOW(),
      plan_completion_rate = CASE
        WHEN COALESCE(v_rep.total_plans, 0) = 0 THEN 1.00
        ELSE ROUND(
          COALESCE(v_rep.completed_plans, 0)::DECIMAL /
          GREATEST(v_rep.total_plans, 1), 2
        )
      END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 7. APPEALS / DISPUTE WORKFLOW
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appeals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appeal_type          TEXT NOT NULL
    CHECK (appeal_type IN ('ban_appeal', 'report_dispute', 'badge_revocation', 'restriction_appeal')),
  related_entity_type  TEXT NOT NULL
    CHECK (related_entity_type IN ('ban', 'report', 'badge_revocation', 'restriction', 'auto_restriction')),
  related_entity_id    UUID,
  user_statement       TEXT NOT NULL
    CHECK (char_length(user_statement) >= 50),
  evidence_paths       TEXT[] DEFAULT '{}',
  status               TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'denied', 'escalated')),
  priority             TEXT DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to          UUID REFERENCES profiles(id),
  submitted_at         TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at          TIMESTAMPTZ,
  reviewed_by          UUID REFERENCES profiles(id),
  decision             TEXT,
  decision_reason      TEXT,
  action_taken         TEXT,
  -- Prevent multiple appeals for same entity
  UNIQUE(user_id, related_entity_type, related_entity_id)
);

CREATE INDEX IF NOT EXISTS appeals_user_idx    ON appeals(user_id);
CREATE INDEX IF NOT EXISTS appeals_status_idx  ON appeals(status);

ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;

-- Users can read/insert their own appeals
CREATE POLICY "appeals_owner_read"
  ON appeals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "appeals_owner_insert"
  ON appeals FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    -- Only one appeal per entity
  );

-- Admin can do everything
CREATE POLICY "appeals_admin_all"
  ON appeals FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_role IN ('moderator', 'admin', 'superadmin')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Helper: fn_apply_zero_tolerance
-- Called when a zero-tolerance report is confirmed
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_apply_zero_tolerance(
  p_user_id UUID,
  p_rule_code TEXT
)
RETURNS VOID AS $$
DECLARE
  v_auto_action TEXT;
BEGIN
  SELECT auto_action INTO v_auto_action
  FROM violation_rules
  WHERE rule_code = p_rule_code AND is_zero_tolerance = TRUE;

  IF v_auto_action = 'perm_ban' THEN
    -- Update profile
    UPDATE profiles
    SET user_status = 'banned',
        verification_status = 'SUSPENDED'
    WHERE id = p_user_id;

    -- Insert permanent restriction
    INSERT INTO user_restrictions
      (user_id, restriction_type, reason, applied_by)
    VALUES
      (p_user_id, 'perm_ban', 'Zero tolerance: ' || p_rule_code, NULL);

    -- Log in violations
    INSERT INTO user_violations
      (user_id, rule_code, action_taken, auto_applied)
    VALUES
      (p_user_id, p_rule_code, 'perm_ban', TRUE);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- Helper: fn_get_reliability_tier
-- Returns discovery weight for a user
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_get_reliability_tier(p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL;
BEGIN
  SELECT reliability_score INTO v_score
  FROM user_reputation
  WHERE user_id = p_user_id;

  IF NOT FOUND OR v_score IS NULL THEN RETURN 1.0; END IF;

  IF    v_score >= 0.80 THEN RETURN 1.0;
  ELSIF v_score >= 0.60 THEN RETURN 0.8;
  ELSIF v_score >= 0.40 THEN RETURN 0.5;
  ELSIF v_score >= 0.20 THEN RETURN 0.2;
  ELSE                        RETURN 0.0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- Admin action log: extend entity_type enum (no-op if already present)
-- ─────────────────────────────────────────────────────────────

-- Already handled by free-text entity_type column in admin_action_log
-- No migration needed.

COMMIT;
