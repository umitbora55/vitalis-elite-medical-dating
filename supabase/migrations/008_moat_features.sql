-- ============================================================
-- 008_moat_features.sql — Faz 4 Moat Features
-- Features: Screenshot Deterrence, Micro-Events, Partner Venues,
--           Elite Pool, Curated Events, Clubs, Peer Vouch,
--           Date Check-in, Conference Mode, Voice Intro, Plan Pledge
-- ============================================================

-- ── Feature 1: Screenshot Deterrence ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.screenshot_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_profile_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type        text        NOT NULL CHECK (event_type IN ('blur','visibilitychange','devtools')),
  occurred_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS screenshot_attempt_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_screenshot_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET screenshot_attempt_count = screenshot_attempt_count + 1
  WHERE id = p_user_id;
END;
$$;

ALTER TABLE public.screenshot_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own screenshot logs" ON public.screenshot_logs;
CREATE POLICY "Users insert own screenshot logs"
  ON public.screenshot_logs FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- ── Feature 2: Micro-Events ──────────────────────────────────────────────────
-- The events table already has 'micro_event' type from 005_events_community.sql.
-- Nothing extra needed here; capacity badge is UI-only.

-- ── Feature 3: Partner Venues + QR Check-in ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_venues (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  address    text,
  city       text,
  qr_token   text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venue_checkins (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      uuid        NOT NULL REFERENCES public.partner_venues(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id       uuid        REFERENCES public.date_plans(id) ON DELETE SET NULL,
  qr_token      text        NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id, plan_id)
);

ALTER TABLE public.partner_venues  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_checkins  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read active venues" ON public.partner_venues;
CREATE POLICY "Authenticated read active venues"
  ON public.partner_venues FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

DROP POLICY IF EXISTS "Users insert own venue checkin" ON public.venue_checkins;
CREATE POLICY "Users insert own venue checkin"
  ON public.venue_checkins FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own venue checkins" ON public.venue_checkins;
CREATE POLICY "Users read own venue checkins"
  ON public.venue_checkins FOR SELECT
  USING (user_id = auth.uid());

-- ── Feature 4: Elite Invite-only Verified Pool ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.elite_pool_members (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  is_active  boolean     NOT NULL DEFAULT true
);

ALTER TABLE public.elite_pool_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own elite membership" ON public.elite_pool_members;
CREATE POLICY "Users manage own elite membership"
  ON public.elite_pool_members
  USING (user_id = auth.uid());

-- View: profiles that are eligible for elite pool
-- (verified + reliability_score >= 0.8 + at least 1 completed plan)
CREATE OR REPLACE VIEW public.elite_pool_eligible AS
  SELECT p.id AS user_id
  FROM   public.profiles p
  JOIN   public.user_reputation ur ON ur.user_id = p.id
  WHERE  p.verification_status = 'VERIFIED'
    AND  ur.reliability_score >= 0.8
    AND  ur.completed_plans >= 1;

-- ── Feature 5: Curated Offline Events ────────────────────────────────────────
-- Add 'curated_elite' to the event_type CHECK constraint on the events table.

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'conference','meetup','activity','walk','coffee',
    'micro_event','curated_elite'
  ));

-- ── Feature 6: Health Social Clubs ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.clubs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  category    text        NOT NULL CHECK (category IN (
                'running','cycling','yoga','nutrition','research','social'
              )),
  creator_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_members int         NOT NULL DEFAULT 50,
  cover_image text,
  city        text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_members (
  club_id   uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member'
              CHECK (role IN ('creator','admin','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

ALTER TABLE public.clubs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active clubs"     ON public.clubs;
DROP POLICY IF EXISTS "Creator inserts club"          ON public.clubs;
DROP POLICY IF EXISTS "Creator updates own club"      ON public.clubs;
DROP POLICY IF EXISTS "Users read memberships"        ON public.club_members;
DROP POLICY IF EXISTS "Users manage own membership"   ON public.club_members;
DROP POLICY IF EXISTS "Users delete own membership"   ON public.club_members;

CREATE POLICY "Anyone reads active clubs"   ON public.clubs FOR SELECT USING (is_active = true);
CREATE POLICY "Creator inserts club"        ON public.clubs FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creator updates own club"    ON public.clubs FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Users read memberships"      ON public.club_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users manage own membership" ON public.club_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own membership" ON public.club_members FOR DELETE USING (user_id = auth.uid());

-- ── Feature 7: Peer Vouch ─────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vouch_count int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.peer_vouches (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vouchee_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text        NOT NULL CHECK (relationship IN (
                 'colleague','coworker','classmate','mentor','other'
               )),
  message      text        NOT NULL CHECK (char_length(message) >= 20),
  status       text        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','revoked')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, vouchee_id)
);

ALTER TABLE public.peer_vouches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vouchee or voucher can read"   ON public.peer_vouches;
DROP POLICY IF EXISTS "Voucher inserts vouch"         ON public.peer_vouches;
DROP POLICY IF EXISTS "Voucher or vouchee updates"    ON public.peer_vouches;

CREATE POLICY "Vouchee or voucher can read"
  ON public.peer_vouches FOR SELECT
  USING (vouchee_id = auth.uid() OR voucher_id = auth.uid());

CREATE POLICY "Voucher inserts vouch"
  ON public.peer_vouches FOR INSERT
  WITH CHECK (voucher_id = auth.uid());

CREATE POLICY "Voucher or vouchee updates"
  ON public.peer_vouches FOR UPDATE
  USING (vouchee_id = auth.uid() OR voucher_id = auth.uid());

-- Trigger: keep profiles.vouch_count in sync
CREATE OR REPLACE FUNCTION public.fn_update_vouch_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
      UPDATE public.profiles
        SET vouch_count = vouch_count + 1
        WHERE id = NEW.vouchee_id;
    ELSIF NEW.status = 'revoked' AND OLD.status = 'confirmed' THEN
      UPDATE public.profiles
        SET vouch_count = GREATEST(0, vouch_count - 1)
        WHERE id = NEW.vouchee_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_vouch_count ON public.peer_vouches;
CREATE TRIGGER trg_update_vouch_count
  AFTER UPDATE ON public.peer_vouches
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_vouch_count();

-- ── Feature 8: Date OS Check-in / Check-out ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.date_checkins (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    uuid        NOT NULL REFERENCES public.date_plans(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (type IN ('checkin','checkout')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, user_id, type)
);

ALTER TABLE public.date_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plan participants insert checkins" ON public.date_checkins;
DROP POLICY IF EXISTS "Plan participants read checkins"   ON public.date_checkins;

CREATE POLICY "Plan participants insert checkins"
  ON public.date_checkins FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Plan participants read checkins"
  ON public.date_checkins FOR SELECT
  USING (auth.role() = 'authenticated');

-- Trigger: when both parties check in → 'ongoing'; both check out → 'completed' + release pledges
CREATE OR REPLACE FUNCTION public.fn_process_date_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.type = 'checkin' THEN
    SELECT COUNT(*) INTO v_count
      FROM public.date_checkins
      WHERE plan_id = NEW.plan_id AND type = 'checkin';
    IF v_count >= 2 THEN
      UPDATE public.date_plans SET status = 'ongoing' WHERE id = NEW.plan_id;
    END IF;

  ELSIF NEW.type = 'checkout' THEN
    SELECT COUNT(*) INTO v_count
      FROM public.date_checkins
      WHERE plan_id = NEW.plan_id AND type = 'checkout';
    IF v_count >= 2 THEN
      UPDATE public.date_plans SET status = 'completed' WHERE id = NEW.plan_id;
      -- Simulate releasing any held pledges
      UPDATE public.plan_pledges
        SET status = 'released', updated_at = now()
        WHERE plan_id = NEW.plan_id AND status = 'held';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_date_checkin ON public.date_checkins;
CREATE TRIGGER trg_process_date_checkin
  AFTER INSERT ON public.date_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_process_date_checkin();

-- ── Feature 10: Conference Mode ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conferences (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  city           text        NOT NULL,
  venue          text,
  start_date     date        NOT NULL,
  end_date       date        NOT NULL,
  specialty_tags text[]      NOT NULL DEFAULT '{}',
  max_pool_size  int         NOT NULL DEFAULT 200,
  is_active      boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conference_attendees (
  conference_id     uuid        NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_in_to_pool  boolean     NOT NULL DEFAULT false,
  verified_attendee boolean     NOT NULL DEFAULT false,
  registered_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conference_id, user_id)
);

ALTER TABLE public.conferences          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conference_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active conferences"  ON public.conferences;
DROP POLICY IF EXISTS "Users manage own attendance"      ON public.conference_attendees;

CREATE POLICY "Anyone reads active conferences"
  ON public.conferences FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users manage own attendance"
  ON public.conference_attendees
  USING (user_id = auth.uid());

-- ── Feature 11: Voice Intro ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.voice_intros (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path     text        NOT NULL,
  duration_seconds int         NOT NULL CHECK (duration_seconds BETWEEN 1 AND 30),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_intros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own voice intro"           ON public.voice_intros;
DROP POLICY IF EXISTS "Authenticated users read voice intros"  ON public.voice_intros;

CREATE POLICY "Users manage own voice intro"
  ON public.voice_intros
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users read voice intros"
  ON public.voice_intros FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── Feature 13: Plan Pledge (simulated) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plan_pledges (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    uuid        NOT NULL REFERENCES public.date_plans(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_tl  int         NOT NULL CHECK (amount_tl BETWEEN 50 AND 500),
  status     text        NOT NULL DEFAULT 'held'
               CHECK (status IN ('held','released','forfeited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, user_id)
);

ALTER TABLE public.plan_pledges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pledges"       ON public.plan_pledges;
DROP POLICY IF EXISTS "Plan participants read pledges" ON public.plan_pledges;

CREATE POLICY "Users manage own pledges"
  ON public.plan_pledges
  USING (user_id = auth.uid());

CREATE POLICY "Plan participants read pledges"
  ON public.plan_pledges FOR SELECT
  USING (auth.role() = 'authenticated');
