-- ============================================================
-- Migration 005: Community Events System
-- Features:
--   1. Events feed (Şehrinde Bu Hafta)
--   2. RSVP + Attendees with privacy options
--   3. Event Match Window (48 hours post-event)
-- ============================================================

-- ───────────────────────────────────────────────────────────
-- 1. EVENTS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT        NOT NULL,
  description         TEXT,
  event_type          TEXT        NOT NULL DEFAULT 'meetup'
                      CHECK (event_type IN ('conference','meetup','activity','micro_event','walk','coffee')),
  cover_image         TEXT,
  location_name       TEXT,
  location_address    TEXT,
  location_lat        DECIMAL(9,6),
  location_lng        DECIMAL(9,6),
  city                TEXT        NOT NULL,
  district            TEXT,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  max_attendees       INT,
  current_attendees   INT         NOT NULL DEFAULT 0,
  is_verified_only    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_premium_only     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION fn_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trigger_events_updated_at ON events;
CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION fn_events_updated_at();

-- RLS: Everyone can read active events; only admins can insert/update
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_read_all"   ON events;
DROP POLICY IF EXISTS "events_admin_write" ON events;

CREATE POLICY "events_read_all"
  ON events FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "events_admin_write"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('admin','superadmin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_city      ON events (city, starts_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_type      ON events (event_type)      WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_district  ON events (district)        WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events (starts_at);

-- ───────────────────────────────────────────────────────────
-- 2. EVENT ATTENDEES TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_attendees (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'registered'
                  CHECK (status IN ('registered','checked_in','cancelled','no_show')),
  is_visible      BOOLEAN     NOT NULL DEFAULT TRUE,
  is_anonymous    BOOLEAN     NOT NULL DEFAULT FALSE,
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_at   TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- RLS
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendees_read_visible" ON event_attendees;
DROP POLICY IF EXISTS "attendees_own_write"    ON event_attendees;

-- Users can see visible attendees of any active event
CREATE POLICY "attendees_read_visible"
  ON event_attendees FOR SELECT
  USING (
    is_visible = TRUE
    OR user_id = auth.uid()   -- always see your own row
  );

-- Users can insert/update/delete only their own attendee rows
CREATE POLICY "attendees_own_write"
  ON event_attendees FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendees_event   ON event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_user    ON event_attendees (user_id);
CREATE INDEX IF NOT EXISTS idx_attendees_visible ON event_attendees (event_id, is_visible) WHERE status = 'registered';

-- ───────────────────────────────────────────────────────────
-- 3. TRIGGER: Keep current_attendees count up to date
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_sync_attendee_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'registered' THEN
    UPDATE events SET current_attendees = current_attendees + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
      UPDATE events SET current_attendees = GREATEST(0, current_attendees - 1) WHERE id = NEW.event_id;
    ELSIF OLD.status = 'cancelled' AND NEW.status = 'registered' THEN
      UPDATE events SET current_attendees = current_attendees + 1 WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'registered' THEN
    UPDATE events SET current_attendees = GREATEST(0, current_attendees - 1) WHERE id = OLD.event_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_attendee_count ON event_attendees;
CREATE TRIGGER trigger_attendee_count
  AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION fn_sync_attendee_count();

-- ───────────────────────────────────────────────────────────
-- 4. EVENT MATCH WINDOWS TABLE
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_match_windows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID        NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,   -- = event ends_at
  ends_at     TIMESTAMPTZ NOT NULL,   -- = event ends_at + 48h
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Authenticated users can read active windows
ALTER TABLE event_match_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emw_read_active"  ON event_match_windows;
DROP POLICY IF EXISTS "emw_admin_write"  ON event_match_windows;

CREATE POLICY "emw_read_active"
  ON event_match_windows FOR SELECT
  USING (is_active = TRUE AND ends_at > NOW());

CREATE POLICY "emw_admin_write"
  ON event_match_windows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('admin','superadmin')
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_emw_event    ON event_match_windows (event_id);
CREATE INDEX IF NOT EXISTS idx_emw_active   ON event_match_windows (is_active, ends_at) WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────
-- 5. TRIGGER: Auto-open event match window when event ends
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_auto_open_event_window()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- When event becomes inactive (ended), open the 48h match window
  IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    INSERT INTO event_match_windows (event_id, starts_at, ends_at)
    VALUES (NEW.id, NEW.ends_at, NEW.ends_at + INTERVAL '48 hours')
    ON CONFLICT (event_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_event_match_window ON events;
CREATE TRIGGER trigger_event_match_window
  AFTER UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION fn_auto_open_event_window();

-- ───────────────────────────────────────────────────────────
-- 6. TRIGGER: Auto-close expired match windows (called by cron or on-demand)
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_close_expired_event_windows()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  UPDATE event_match_windows SET is_active = FALSE
  WHERE is_active = TRUE AND ends_at <= NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ───────────────────────────────────────────────────────────
-- 7. MATCHES TABLE: add event match columns
-- ───────────────────────────────────────────────────────────
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS event_id        UUID    REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_event_match  BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_matches_event ON matches (event_id) WHERE event_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────
-- 8. RPC: Get event participants eligible for matching
--    (non-anonymous attendees, active registration, not already matched)
-- ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_event_match_candidates(
  p_event_id UUID,
  p_user_id  UUID
)
RETURNS TABLE (
  user_id     UUID,
  name        TEXT,
  avatar      TEXT,
  specialty   TEXT,
  verified    BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id                       AS user_id,
    p.name                     AS name,
    p.images[1]                AS avatar,
    p.specialty                AS specialty,
    p.verified                 AS verified
  FROM event_attendees ea
  JOIN profiles p ON p.id = ea.user_id
  WHERE ea.event_id  = p_event_id
    AND ea.user_id  != p_user_id
    AND ea.status    = 'registered'
    AND ea.is_anonymous = FALSE
    AND p.id NOT IN (
      SELECT CASE
        WHEN m.profile_1_id = p_user_id THEN m.profile_2_id
        ELSE m.profile_1_id
      END
      FROM matches m
      WHERE (m.profile_1_id = p_user_id OR m.profile_2_id = p_user_id)
    );
END;
$$;

-- ───────────────────────────────────────────────────────────
-- DONE
-- ───────────────────────────────────────────────────────────
