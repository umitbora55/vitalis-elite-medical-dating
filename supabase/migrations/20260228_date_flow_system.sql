-- ============================================================
-- VITALIS: Date Odaklı Akış Sistemi (Özellik 4)
-- Migration: 20260228_date_flow_system.sql
-- 48h invitation timer, safety features, post-date feedback
-- ============================================================

-- ── 1. EXTEND date_plans WITH HEALTHCARE DATE TYPES ────────────────────────────
ALTER TABLE date_plans
  ADD COLUMN IF NOT EXISTS invitation_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availability_slot_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availability_slot_end   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS venue_id                UUID,
  ADD COLUMN IF NOT EXISTS venue_note              TEXT,
  ADD COLUMN IF NOT EXISTS is_healthcare_type      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS declined_reason         TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by            UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_reason        TEXT,
  ADD COLUMN IF NOT EXISTS rescheduled_from        UUID REFERENCES date_plans(id),
  ADD COLUMN IF NOT EXISTS feedback_requested_at   TIMESTAMPTZ;

-- Extended plan types for healthcare workers
-- (Existing CHECK constraint covers 'coffee'|'dinner'|'walk'|'custom')
-- We alter the constraint to also include healthcare-specific types:
ALTER TABLE date_plans DROP CONSTRAINT IF EXISTS date_plans_plan_type_check;
ALTER TABLE date_plans ADD CONSTRAINT date_plans_plan_type_check
  CHECK (plan_type IN (
    'coffee', 'dinner', 'walk', 'custom',
    'nobet_sonrasi_kahve',  -- Post-night-shift coffee (morning)
    'mola_arasi',           -- Break-time meetup (15–20 min)
    'gece_nobeti_oncesi'    -- Pre-night-shift dinner
  ));

-- ── 2. DATE INVITATIONS TABLE ──────────────────────────────────────────────────
-- Formal invitation step before plan creation (48h timer)
CREATE TABLE IF NOT EXISTS date_invitations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  inviter_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_type    TEXT NOT NULL
    CHECK (preferred_type IN (
      'coffee', 'dinner', 'walk', 'custom',
      'nobet_sonrasi_kahve', 'mola_arasi', 'gece_nobeti_oncesi'
    )),
  preferred_times   JSONB DEFAULT '[]',   -- Array of ISO timestamps offered
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  declined_reason   TEXT,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  accepted_at       TIMESTAMPTZ,
  plan_id           UUID REFERENCES date_plans(id),  -- Set on acceptance
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, inviter_id, status)              -- No duplicate pending invites
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_invitations_match      ON date_invitations (match_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee    ON date_invitations (invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires    ON date_invitations (expires_at) WHERE status = 'pending';

-- ── 3. USER AVAILABILITY SLOTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slot_start   TIMESTAMPTZ NOT NULL,
  slot_end     TIMESTAMPTZ NOT NULL,
  label        TEXT,           -- e.g. "Nöbet Sonrası", "Öğle Arası"
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recur_days   INTEGER[],      -- 0=Sun..6=Sat for recurring
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT availability_duration CHECK (slot_end > slot_start)
);

CREATE INDEX IF NOT EXISTS idx_availability_user_start
  ON user_availability (user_id, slot_start);

-- ── 4. USER SHIFTS (shift calendar) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_shifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_date   DATE NOT NULL,
  shift_type   TEXT NOT NULL
    CHECK (shift_type IN ('morning','afternoon','evening','night','on_call','off')),
  start_time   TIME,
  end_time     TIME,
  hospital     TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, shift_date, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON user_shifts (user_id, shift_date);

-- ── 5. VENUES TABLE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  address         TEXT,
  city            TEXT NOT NULL DEFAULT 'İstanbul',
  district        TEXT,
  lat             NUMERIC(9,6),
  lng             NUMERIC(9,6),
  category        TEXT NOT NULL
    CHECK (category IN ('cafe','restaurant','park','bar','activity','other')),
  tags            TEXT[] DEFAULT '{}',      -- e.g. {'quiet','healthcare_friendly','24h'}
  safety_score    NUMERIC(3,2) DEFAULT 1.0, -- 0.0-1.0
  is_partner      BOOLEAN NOT NULL DEFAULT false,
  partner_discount TEXT,
  opening_hours   JSONB,                    -- {"mon": "08:00-22:00", ...}
  phone           TEXT,
  website         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_city_cat ON venues (city, category) WHERE is_active;

-- ── 6. DATE VENUES (M:N link between date_plans and venues) ────────────────────
CREATE TABLE IF NOT EXISTS date_venues (
  plan_id    UUID NOT NULL REFERENCES date_plans(id) ON DELETE CASCADE,
  venue_id   UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  suggested_by UUID REFERENCES profiles(id),
  voted_by   UUID[] DEFAULT '{}',
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (plan_id, venue_id)
);

-- ── 7. TRUSTED CONTACTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  relation     TEXT DEFAULT 'friend',  -- 'friend','family','colleague'
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  notify_on_date BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON trusted_contacts (user_id);

-- ── 8. SAFETY ALERTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS safety_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id      UUID REFERENCES date_plans(id),
  alert_type   TEXT NOT NULL
    CHECK (alert_type IN ('sos','checkin_overdue','no_checkout','manual_share')),
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','resolved','false_alarm')),
  location_lat NUMERIC(9,6),
  location_lng NUMERIC(9,6),
  message      TEXT,
  notified_contacts JSONB DEFAULT '[]',   -- Array of {name, phone, notified_at}
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_alerts_user ON safety_alerts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_active ON safety_alerts (created_at DESC) WHERE status = 'active';

-- ── 9. DATE FEEDBACK (post-date questionnaire) ────────────────────────────────
CREATE TABLE IF NOT EXISTS date_feedback (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES date_plans(id) ON DELETE CASCADE,
  reviewer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  about_user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  did_meet         BOOLEAN NOT NULL,
  how_was_it       TEXT CHECK (how_was_it IN ('great','good','okay','bad','no_show')),
  see_again        BOOLEAN,
  felt_safe        BOOLEAN,
  would_recommend  BOOLEAN,
  tags             TEXT[] DEFAULT '{}',     -- ['kind','funny','punctual','catfished', ...]
  free_text        TEXT,
  is_anonymous     BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plan_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_plan    ON date_feedback (plan_id);
CREATE INDEX IF NOT EXISTS idx_feedback_about   ON date_feedback (about_user_id);

-- ── 10. EXTEND profiles FOR DATE FLOW PREFERENCES ─────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_readiness           TEXT NOT NULL DEFAULT 'open'
    CHECK (date_readiness IN ('open','cautious','not_ready')),
  ADD COLUMN IF NOT EXISTS preferred_date_types     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS show_availability        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS safety_contact_set       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_reputation_score    NUMERIC(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS total_dates_completed    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_positive_feedback  INTEGER NOT NULL DEFAULT 0;

-- ── 11. RPC: SEND DATE INVITATION ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION send_date_invitation(
  p_match_id       UUID,
  p_invitee_id     UUID,
  p_preferred_type TEXT,
  p_preferred_times JSONB DEFAULT '[]',
  p_message        TEXT DEFAULT NULL
)
RETURNS UUID  -- Returns new invitation id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inviter_id  UUID := auth.uid();
  v_inv_id      UUID;
  v_existing    UUID;
BEGIN
  -- Check no pending invitation already exists from this user on this match
  SELECT id INTO v_existing
  FROM date_invitations
  WHERE match_id = p_match_id
    AND inviter_id = v_inviter_id
    AND status = 'pending';

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'ALREADY_PENDING';
  END IF;

  INSERT INTO date_invitations
    (match_id, inviter_id, invitee_id, preferred_type, preferred_times, message, expires_at)
  VALUES
    (p_match_id, v_inviter_id, p_invitee_id, p_preferred_type, p_preferred_times, p_message,
     NOW() + INTERVAL '48 hours')
  RETURNING id INTO v_inv_id;

  RETURN v_inv_id;
END;
$$;

-- ── 12. RPC: RESPOND TO DATE INVITATION ───────────────────────────────────────
CREATE OR REPLACE FUNCTION respond_date_invitation(
  p_invitation_id  UUID,
  p_status         TEXT,   -- 'accepted' | 'declined'
  p_declined_reason TEXT DEFAULT NULL,
  p_selected_time  TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID  -- Returns plan_id if accepted, NULL if declined
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_inv        date_invitations;
  v_plan_id    UUID;
BEGIN
  SELECT * INTO v_inv
  FROM date_invitations
  WHERE id = p_invitation_id AND invitee_id = v_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITATION_NOT_FOUND';
  END IF;

  IF v_inv.expires_at < NOW() THEN
    UPDATE date_invitations SET status = 'expired', updated_at = NOW()
    WHERE id = p_invitation_id;
    RAISE EXCEPTION 'INVITATION_EXPIRED';
  END IF;

  IF p_status = 'accepted' THEN
    -- Create the date plan
    INSERT INTO date_plans (match_id, proposer_id, plan_type, selected_time, is_healthcare_type,
                            invitation_expires_at, status)
    VALUES (v_inv.match_id, v_inv.inviter_id, v_inv.preferred_type,
            p_selected_time, v_inv.preferred_type IN ('nobet_sonrasi_kahve','mola_arasi','gece_nobeti_oncesi'),
            v_inv.expires_at, 'confirmed')
    RETURNING id INTO v_plan_id;

    UPDATE date_invitations
    SET status = 'accepted', accepted_at = NOW(), plan_id = v_plan_id, updated_at = NOW()
    WHERE id = p_invitation_id;

  ELSE
    UPDATE date_invitations
    SET status = 'declined', declined_reason = p_declined_reason, updated_at = NOW()
    WHERE id = p_invitation_id;
  END IF;

  RETURN v_plan_id;
END;
$$;

-- ── 13. RPC: EXPIRE STALE INVITATIONS (called by cron) ────────────────────────
CREATE OR REPLACE FUNCTION expire_stale_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE date_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── 14. RPC: RECORD DATE FEEDBACK ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_date_feedback(
  p_plan_id        UUID,
  p_about_user_id  UUID,
  p_did_meet       BOOLEAN,
  p_how_was_it     TEXT DEFAULT NULL,
  p_see_again      BOOLEAN DEFAULT NULL,
  p_felt_safe      BOOLEAN DEFAULT NULL,
  p_would_recommend BOOLEAN DEFAULT NULL,
  p_tags           TEXT[] DEFAULT '{}',
  p_free_text      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO date_feedback
    (plan_id, reviewer_id, about_user_id, did_meet, how_was_it, see_again,
     felt_safe, would_recommend, tags, free_text)
  VALUES
    (p_plan_id, v_user_id, p_about_user_id, p_did_meet, p_how_was_it, p_see_again,
     p_felt_safe, p_would_recommend, p_tags, p_free_text)
  ON CONFLICT (plan_id, reviewer_id) DO UPDATE SET
    did_meet       = p_did_meet,
    how_was_it     = p_how_was_it,
    see_again      = p_see_again,
    felt_safe      = p_felt_safe,
    would_recommend = p_would_recommend,
    tags           = p_tags,
    free_text      = p_free_text;

  -- Update positive feedback counter on profile (fire-and-forget style)
  IF p_how_was_it IN ('great','good') THEN
    UPDATE profiles
    SET total_positive_feedback = COALESCE(total_positive_feedback, 0) + 1
    WHERE id = p_about_user_id;
  END IF;

  -- Mark plan as having feedback requested
  UPDATE date_plans
  SET feedback_requested_at = COALESCE(feedback_requested_at, NOW())
  WHERE id = p_plan_id;
END;
$$;

-- ── 15. RPC: UPSERT TRUSTED CONTACT ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_trusted_contact(
  p_name          TEXT,
  p_phone         TEXT,
  p_relation      TEXT DEFAULT 'friend',
  p_is_primary    BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_id      UUID;
BEGIN
  -- If setting primary, clear existing primary first
  IF p_is_primary THEN
    UPDATE trusted_contacts SET is_primary = false WHERE user_id = v_user_id;
  END IF;

  INSERT INTO trusted_contacts (user_id, name, phone, relation, is_primary)
  VALUES (v_user_id, p_name, p_phone, p_relation, p_is_primary)
  RETURNING id INTO v_id;

  -- Mark safety contact as set on profile
  UPDATE profiles SET safety_contact_set = true WHERE id = v_user_id;

  RETURN v_id;
END;
$$;

-- ── 16. RPC: TRIGGER SOS ALERT ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_sos_alert(
  p_plan_id    UUID DEFAULT NULL,
  p_lat        NUMERIC DEFAULT NULL,
  p_lng        NUMERIC DEFAULT NULL,
  p_message    TEXT DEFAULT 'SOS — Vitalis kullanıcısı yardım istiyor'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_alert_id UUID;
  v_contacts JSONB;
BEGIN
  -- Fetch trusted contacts for notification payload
  SELECT json_agg(json_build_object('name', name, 'phone', phone, 'notified_at', NOW()))
  INTO v_contacts
  FROM trusted_contacts
  WHERE user_id = v_user_id AND notify_on_date = true;

  INSERT INTO safety_alerts
    (user_id, plan_id, alert_type, location_lat, location_lng, message, notified_contacts)
  VALUES
    (v_user_id, p_plan_id, 'sos', p_lat, p_lng, p_message, COALESCE(v_contacts, '[]'))
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;

-- ── 17. RLS ────────────────────────────────────────────────────────────────────

-- date_invitations
ALTER TABLE date_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own invitations" ON date_invitations;
CREATE POLICY "Users own invitations"
  ON date_invitations FOR ALL TO authenticated
  USING  (inviter_id = auth.uid() OR invitee_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

-- user_availability
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage availability" ON user_availability;
CREATE POLICY "Users manage availability"
  ON user_availability FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public read for matched users (to show compatible slots)
DROP POLICY IF EXISTS "Matched users read availability" ON user_availability;
CREATE POLICY "Matched users read availability"
  ON user_availability FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.is_active = true
        AND ((m.profile_1_id = auth.uid() AND m.profile_2_id = user_availability.user_id)
          OR (m.profile_2_id = auth.uid() AND m.profile_1_id = user_availability.user_id))
    )
  );

-- user_shifts
ALTER TABLE user_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage shifts" ON user_shifts;
CREATE POLICY "Users manage shifts"
  ON user_shifts FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- venues — public read
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users read venues" ON venues;
CREATE POLICY "Auth users read venues"
  ON venues FOR SELECT TO authenticated USING (true);

-- date_venues
ALTER TABLE date_venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Plan participants manage date venues" ON date_venues;
CREATE POLICY "Plan participants manage date venues"
  ON date_venues FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM date_plans p
      WHERE p.id = date_venues.plan_id
        AND (p.proposer_id = auth.uid() OR p.responder_id = auth.uid())
    )
  );

-- trusted_contacts
ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own trusted contacts" ON trusted_contacts;
CREATE POLICY "Users own trusted contacts"
  ON trusted_contacts FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- safety_alerts
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own safety alerts" ON safety_alerts;
CREATE POLICY "Users own safety alerts"
  ON safety_alerts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Moderators can see active alerts
DROP POLICY IF EXISTS "Moderators read safety alerts" ON safety_alerts;
CREATE POLICY "Moderators read safety alerts"
  ON safety_alerts FOR SELECT TO authenticated
  USING (public.auth_has_moderation_access());

-- date_feedback
ALTER TABLE date_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users submit feedback" ON date_feedback;
CREATE POLICY "Users submit feedback"
  ON date_feedback FOR ALL TO authenticated
  USING  (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- ── 18. COMMENTS ──────────────────────────────────────────────────────────────
COMMENT ON TABLE date_invitations  IS 'Özellik 4: 48 saatlik date daveti. Match → Davet → Plan akışı.';
COMMENT ON TABLE user_availability IS 'Özellik 4: Kullanıcı müsaitlik slotları. Nöbet takvimi entegrasyonu.';
COMMENT ON TABLE user_shifts       IS 'Özellik 4: Nöbet takvimi. Slot önerilerinde kullanılır.';
COMMENT ON TABLE venues            IS 'Özellik 4: Mekan önerileri. Güvenlik skoru ve partner mekanlar.';
COMMENT ON TABLE date_venues       IS 'Özellik 4: Date planı - mekan eşleştirmesi.';
COMMENT ON TABLE trusted_contacts  IS 'Özellik 4: Güvenilir kişiler. SOS ve date bildirimlerinde kullanılır.';
COMMENT ON TABLE safety_alerts     IS 'Özellik 4: Güvenlik uyarıları. SOS + check-in gecikmesi takibi.';
COMMENT ON TABLE date_feedback     IS 'Özellik 4: Date sonrası geri bildirim. Anonim, puanlama ve etiketler.';
