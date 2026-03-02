-- ============================================================
-- Migration 006: Admin Panel Features
-- Features:
--   1. Verification Queue (SLA-aware)
--   2. Suspicious Users Queue
--   3. Reports / Abuse Queue
--   4. SLA Management
--   5. Badge Revocation
--   6. KPI Analytics Daily Aggregation
-- ============================================================

-- ───────────────────────────────────────────────────────────
-- 1. ADMIN USERS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'moderator'
              CHECK (role IN ('super_admin','admin','moderator','support')),
  permissions JSONB       NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_read_self" ON admin_users;
CREATE POLICY "admin_users_read_self"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_admin_users_user ON admin_users(user_id) WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────
-- 2. ADMIN ACTION LOG
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_action_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID        NOT NULL,   -- admin user_id
  actor_role    TEXT,
  action        TEXT        NOT NULL,   -- e.g. 'approve_verification', 'ban_user'
  entity_type   TEXT,                   -- 'verification', 'user', 'report'
  entity_id     TEXT,
  metadata      JSONB       DEFAULT '{}',
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aal_admin_read" ON admin_action_log;
CREATE POLICY "aal_admin_read"
  ON admin_action_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('admin','superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_aal_actor    ON admin_action_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aal_entity   ON admin_action_log(entity_type, entity_id);

-- ───────────────────────────────────────────────────────────
-- 3. VERIFICATION QUEUE (SLA-AWARE)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type   TEXT        NOT NULL DEFAULT 'diploma'
                  CHECK (document_type IN ('diploma','kimlik','kurum_karti','sertifika','other')),
  document_path   TEXT        NOT NULL,
  document_url    TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_review','approved','rejected','needs_more_info')),
  priority        INT         NOT NULL DEFAULT 0,
  sla_tier        TEXT        NOT NULL DEFAULT 'normal'
                  CHECK (sla_tier IN ('normal','premium','elite')),
  sla_deadline    TIMESTAMPTZ,
  is_sla_breached BOOLEAN     NOT NULL DEFAULT FALSE,
  assigned_to     UUID        REFERENCES admin_users(id),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID        REFERENCES admin_users(id),
  rejection_reason TEXT,
  notes           TEXT
);

-- SLA deadline trigger: set based on subscription_tier
CREATE OR REPLACE FUNCTION fn_set_vq_sla()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tier     TEXT;
  v_hours    INT;
  v_priority INT;
BEGIN
  -- Fetch user's subscription tier
  SELECT COALESCE(subscription_tier::text, 'FREE')
  INTO v_tier
  FROM profiles WHERE id = NEW.user_id;

  IF v_tier IN ('ULTRA','elite') THEN
    v_hours    := 5;
    v_priority := 100;
    NEW.sla_tier := 'elite';
  ELSIF v_tier IN ('FORTE','DOSE','premium') THEN
    v_hours    := 9;
    v_priority := 50;
    NEW.sla_tier := 'premium';
  ELSE
    v_hours    := 24;
    v_priority := 0;
    NEW.sla_tier := 'normal';
  END IF;

  NEW.sla_deadline := NOW() + (v_hours || ' hours')::INTERVAL;
  NEW.priority     := v_priority;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_vq_sla ON verification_queue;
CREATE TRIGGER trigger_vq_sla
  BEFORE INSERT ON verification_queue
  FOR EACH ROW EXECUTE FUNCTION fn_set_vq_sla();

-- Mark breached SLAs (callable from server/cron)
CREATE OR REPLACE FUNCTION fn_check_sla_breaches()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  UPDATE verification_queue
  SET is_sla_breached = TRUE
  WHERE status IN ('pending','in_review')
    AND sla_deadline < NOW()
    AND is_sla_breached = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

ALTER TABLE verification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vq_admin_all" ON verification_queue;
CREATE POLICY "vq_admin_all"
  ON verification_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('moderator','admin','superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_vq_status   ON verification_queue(status, priority DESC, sla_deadline);
CREATE INDEX IF NOT EXISTS idx_vq_user     ON verification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_vq_breached ON verification_queue(is_sla_breached) WHERE is_sla_breached = TRUE;

-- ───────────────────────────────────────────────────────────
-- 4. SUSPICIOUS USERS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suspicious_users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type         TEXT        NOT NULL
                    CHECK (flag_type IN ('multi_account','fake_photo','spam_behavior','reported_multiple','other')),
  flag_reason       TEXT        NOT NULL,
  evidence          JSONB       NOT NULL DEFAULT '{}',
  severity          TEXT        NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','investigating','cleared','actioned')),
  auto_restricted   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID,
  resolution_action TEXT,
  resolution_notes  TEXT
);

ALTER TABLE suspicious_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "su_admin_all" ON suspicious_users;
CREATE POLICY "su_admin_all"
  ON suspicious_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('moderator','admin','superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_su_severity ON suspicious_users(severity, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_su_user     ON suspicious_users(user_id);

-- Auto-flag trigger: device fingerprint reuse
CREATE OR REPLACE FUNCTION fn_auto_flag_multi_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO v_count
  FROM user_devices
  WHERE device_fingerprint = NEW.device_fingerprint
    AND user_id != NEW.user_id;

  IF v_count >= 2 THEN
    INSERT INTO suspicious_users (user_id, flag_type, flag_reason, evidence, severity)
    VALUES (
      NEW.user_id,
      'multi_account',
      'Aynı cihaz parmak izinden ' || (v_count + 1) || ' farklı hesap tespit edildi',
      jsonb_build_object('device_fingerprint', NEW.device_fingerprint, 'account_count', v_count + 1),
      CASE WHEN v_count >= 3 THEN 'high' ELSE 'medium' END
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_flag_multi_account ON user_devices;
CREATE TRIGGER trigger_flag_multi_account
  AFTER INSERT ON user_devices
  FOR EACH ROW EXECUTE FUNCTION fn_auto_flag_multi_account();

-- ───────────────────────────────────────────────────────────
-- 5. REPORTS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type         TEXT        NOT NULL DEFAULT 'other'
                      CHECK (report_type IN ('harassment','spam','fake_profile','inappropriate_content','no_show','threatening','other')),
  description         TEXT,
  evidence_paths      TEXT[]      NOT NULL DEFAULT '{}',
  related_match_id    UUID,
  related_message_ids UUID[]      NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','investigating','resolved','dismissed')),
  severity            TEXT        NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('low','medium','high','critical')),
  auto_action_taken   TEXT        NOT NULL DEFAULT 'none'
                      CHECK (auto_action_taken IN ('none','restricted','shadow_banned')),
  assigned_to         UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  resolved_by         UUID,
  resolution_type     TEXT
                      CHECK (resolution_type IN ('warning','temp_ban','perm_ban','dismissed','false_report')),
  resolution_notes    TEXT,
  UNIQUE(reporter_id, reported_user_id, report_type, created_at)
);

-- Auto-restriction trigger on harassment/threatening reports
CREATE OR REPLACE FUNCTION fn_auto_restrict_on_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_report_count INT;
BEGIN
  -- Threatening → immediate critical + temp ban
  IF NEW.report_type = 'threatening' THEN
    NEW.severity := 'critical';
    INSERT INTO user_restrictions (user_id, restriction_type, reason, related_report_id, ends_at, created_by)
    VALUES (NEW.reported_user_id, 'temp_ban', 'Tehdit içerikli rapor - otomatik kısıtlama', NEW.id, NOW() + INTERVAL '48 hours', NULL)
    ON CONFLICT DO NOTHING;
    NEW.auto_action_taken := 'restricted';
  END IF;

  -- Harassment → disable messaging 24h
  IF NEW.report_type = 'harassment' THEN
    INSERT INTO user_restrictions (user_id, restriction_type, reason, related_report_id, ends_at, created_by)
    VALUES (NEW.reported_user_id, 'messaging_disabled', 'Taciz raporu - otomatik mesaj kısıtlaması', NEW.id, NOW() + INTERVAL '24 hours', NULL)
    ON CONFLICT DO NOTHING;
    NEW.auto_action_taken := 'restricted';
  END IF;

  -- 3+ reports from different people → shadow limit
  SELECT COUNT(DISTINCT reporter_id)
  INTO v_report_count
  FROM reports
  WHERE reported_user_id = NEW.reported_user_id
    AND status != 'dismissed';

  IF v_report_count >= 3 THEN
    INSERT INTO user_restrictions (user_id, restriction_type, reason, related_report_id, ends_at, created_by)
    VALUES (NEW.reported_user_id, 'shadow_limit', '3+ farklı kullanıcı raporu - shadow kısıtlama', NEW.id, NULL, NULL)
    ON CONFLICT DO NOTHING;
    NEW.auto_action_taken := 'shadow_banned';
    -- Auto-flag suspicious
    INSERT INTO suspicious_users (user_id, flag_type, flag_reason, evidence, severity)
    VALUES (
      NEW.reported_user_id, 'reported_multiple',
      v_report_count || ' farklı kullanıcı raporu',
      jsonb_build_object('report_count', v_report_count),
      CASE WHEN v_report_count >= 5 THEN 'critical' WHEN v_report_count >= 4 THEN 'high' ELSE 'medium' END
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_admin_all"      ON reports;
DROP POLICY IF EXISTS "reports_reporter_insert" ON reports;

CREATE POLICY "reports_admin_all"
  ON reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('moderator','admin','superadmin')
    )
  );

CREATE POLICY "reports_reporter_insert"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

DROP TRIGGER IF EXISTS trigger_auto_restrict ON reports;
CREATE TRIGGER trigger_auto_restrict
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION fn_auto_restrict_on_report();

CREATE INDEX IF NOT EXISTS idx_reports_status     ON reports(status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported   ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter   ON reports(reporter_id);

-- ───────────────────────────────────────────────────────────
-- 6. USER RESTRICTIONS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_restrictions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restriction_type TEXT        NOT NULL
                   CHECK (restriction_type IN ('shadow_limit','messaging_disabled','matching_disabled','temp_ban','perm_ban')),
  reason           TEXT        NOT NULL DEFAULT '',
  related_report_id UUID,
  starts_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at          TIMESTAMPTZ,
  created_by       UUID,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, restriction_type)
);

ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ur_admin_all" ON user_restrictions;
CREATE POLICY "ur_admin_all"
  ON user_restrictions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('moderator','admin','superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_ur_user   ON user_restrictions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ur_active ON user_restrictions(is_active, ends_at) WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────
-- 7. BADGE REVOCATIONS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badge_revocations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type       TEXT        NOT NULL
                   CHECK (badge_type IN ('profession_verified','identity_verified','photo_verified')),
  revocation_reason TEXT       NOT NULL
                   CHECK (revocation_reason IN ('fake_document','expired_document','user_request','policy_violation')),
  evidence         TEXT,
  revoked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by       UUID,
  user_notified    BOOLEAN     NOT NULL DEFAULT FALSE,
  appeal_status    TEXT        NOT NULL DEFAULT 'none'
                   CHECK (appeal_status IN ('none','pending','approved','denied')),
  appeal_notes     TEXT
);

ALTER TABLE badge_revocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "br_admin_all" ON badge_revocations;
CREATE POLICY "br_admin_all"
  ON badge_revocations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('moderator','admin','superadmin')
    )
  );

-- User can read their own badge revocations (for appeal status)
DROP POLICY IF EXISTS "br_user_read_own" ON badge_revocations;
CREATE POLICY "br_user_read_own"
  ON badge_revocations FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_br_user ON badge_revocations(user_id, revoked_at DESC);

-- ───────────────────────────────────────────────────────────
-- 8. ANALYTICS DAILY TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_daily (
  id                            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  date                          DATE  NOT NULL UNIQUE,
  new_signups                   INT   NOT NULL DEFAULT 0,
  signups_completed_onboarding  INT   NOT NULL DEFAULT 0,
  verification_submitted        INT   NOT NULL DEFAULT 0,
  verification_approved         INT   NOT NULL DEFAULT 0,
  verification_rejected         INT   NOT NULL DEFAULT 0,
  daily_active_users            INT   NOT NULL DEFAULT 0,
  new_matches                   INT   NOT NULL DEFAULT 0,
  messages_sent                 INT   NOT NULL DEFAULT 0,
  plans_created                 INT   NOT NULL DEFAULT 0,
  plans_accepted                INT   NOT NULL DEFAULT 0,
  plans_completed               INT   NOT NULL DEFAULT 0,
  plans_cancelled               INT   NOT NULL DEFAULT 0,
  plans_no_show                 INT   NOT NULL DEFAULT 0,
  reports_received              INT   NOT NULL DEFAULT 0,
  reports_harassment            INT   NOT NULL DEFAULT 0,
  users_banned                  INT   NOT NULL DEFAULT 0,
  premium_conversions           INT   NOT NULL DEFAULT 0,
  premium_churns                INT   NOT NULL DEFAULT 0,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_admin_read" ON analytics_daily;
CREATE POLICY "ad_admin_read"
  ON analytics_daily FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('moderator','admin','superadmin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_ad_date ON analytics_daily(date DESC);

-- ───────────────────────────────────────────────────────────
-- 9. DAILY AGGREGATION FUNCTION (called by Edge Function cron)
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_aggregate_daily_stats(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start TIMESTAMPTZ := p_date::TIMESTAMPTZ;
  v_end   TIMESTAMPTZ := (p_date + 1)::TIMESTAMPTZ;
BEGIN
  INSERT INTO analytics_daily (
    date,
    new_signups,
    verification_submitted,
    verification_approved,
    verification_rejected,
    new_matches,
    reports_received,
    reports_harassment,
    plans_created,
    plans_cancelled
  )
  SELECT
    p_date,
    (SELECT COUNT(*) FROM profiles        WHERE created_at BETWEEN v_start AND v_end),
    (SELECT COUNT(*) FROM verification_requests WHERE submitted_at BETWEEN v_start AND v_end),
    (SELECT COUNT(*) FROM verification_requests WHERE reviewed_at  BETWEEN v_start AND v_end AND status = 'APPROVED'),
    (SELECT COUNT(*) FROM verification_requests WHERE reviewed_at  BETWEEN v_start AND v_end AND status = 'REJECTED'),
    (SELECT COUNT(*) FROM matches          WHERE created_at BETWEEN v_start AND v_end),
    (SELECT COUNT(*) FROM reports          WHERE created_at BETWEEN v_start AND v_end),
    (SELECT COUNT(*) FROM reports          WHERE created_at BETWEEN v_start AND v_end AND report_type = 'harassment'),
    (SELECT COUNT(*) FROM date_plans       WHERE created_at BETWEEN v_start AND v_end),
    (SELECT COUNT(*) FROM date_plans       WHERE updated_at BETWEEN v_start AND v_end AND status = 'cancelled')
  ON CONFLICT (date) DO UPDATE SET
    new_signups            = EXCLUDED.new_signups,
    verification_submitted = EXCLUDED.verification_submitted,
    verification_approved  = EXCLUDED.verification_approved,
    verification_rejected  = EXCLUDED.verification_rejected,
    new_matches            = EXCLUDED.new_matches,
    reports_received       = EXCLUDED.reports_received,
    reports_harassment     = EXCLUDED.reports_harassment,
    plans_created          = EXCLUDED.plans_created,
    plans_cancelled        = EXCLUDED.plans_cancelled;
END;
$$;

-- ───────────────────────────────────────────────────────────
-- DONE
-- ───────────────────────────────────────────────────────────
