-- ============================================
-- MATCH TIMER + DATE PLANNING FLOW
-- ============================================

-- ÖZELLİK 1: Match Timer (72 saat kuralı)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS first_message_deadline TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS first_message_sent_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Match oluşunca 72 saat deadline otomatik set et
CREATE OR REPLACE FUNCTION set_match_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if not already set
  IF NEW.first_message_deadline IS NULL THEN
    -- Base: 72 hours; duty mode users get +48h (handled in app layer)
    NEW.first_message_deadline := NOW() + INTERVAL '72 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_match_deadline ON matches;
CREATE TRIGGER trigger_set_match_deadline
  BEFORE INSERT ON matches
  FOR EACH ROW
  EXECUTE FUNCTION set_match_deadline();

-- İlk mesaj gönderilince deadline'ı temizle
CREATE OR REPLACE FUNCTION clear_match_deadline_on_first_message()
RETURNS TRIGGER AS $$
BEGIN
  -- When first message is sent (first_message_sent_at goes from NULL to a value)
  IF OLD.first_message_sent_at IS NULL AND NEW.first_message_sent_at IS NOT NULL THEN
    NEW.first_message_deadline := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clear_match_deadline ON matches;
CREATE TRIGGER trigger_clear_match_deadline
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION clear_match_deadline_on_first_message();

-- Auto-expire matches past deadline
CREATE OR REPLACE FUNCTION expire_overdue_matches()
RETURNS void AS $$
BEGIN
  UPDATE matches
  SET is_expired = TRUE
  WHERE
    first_message_deadline IS NOT NULL
    AND first_message_deadline < NOW()
    AND first_message_sent_at IS NULL
    AND is_expired = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÖZELLİK 2 & 3: Date Plans (Mini-Date CTA + Plan Kartı)
-- ============================================

CREATE TABLE IF NOT EXISTS date_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,  -- references match
  proposer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('coffee', 'dinner', 'walk', 'custom')),
  title TEXT,              -- Custom plan title
  location TEXT,           -- Free-text location (e.g. "Beşiktaş")
  selected_time TIMESTAMPTZ,
  duration_minutes INT,    -- 30 / 60 / 90 / custom
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'modified', 'cancelled')),
  responder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  responded_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_date_plans_match ON date_plans(match_id);

ALTER TABLE date_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match participants can manage plans" ON date_plans;
CREATE POLICY "Match participants can manage plans" ON date_plans
  FOR ALL USING (
    proposer_id = auth.uid() OR responder_id = auth.uid()
  );

DROP POLICY IF EXISTS "Match participants can insert plans" ON date_plans;
CREATE POLICY "Match participants can insert plans" ON date_plans
  FOR INSERT WITH CHECK (proposer_id = auth.uid());

-- ============================================
-- ÖZELLİK 4 & 5: Müsaitlik / Ortak Slot Seçimi
-- ============================================

CREATE TABLE IF NOT EXISTS user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun,1=Mon,...,6=Sat
  start_time TIME NOT NULL,  -- e.g. '18:00'
  end_time TIME NOT NULL,    -- e.g. '22:00'
  is_visible_to_matches BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, start_time)
);

ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own availability" ON user_availability;
CREATE POLICY "Users manage own availability" ON user_availability
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Matches can view availability" ON user_availability;
CREATE POLICY "Matches can view availability" ON user_availability
  FOR SELECT USING (is_visible_to_matches = TRUE);

-- ============================================
-- ÖZELLİK 6: Nöbet Modu
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_on_duty BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS duty_ends_at TIMESTAMPTZ;

-- Nöbet modu aktifken match deadline uzatma function
CREATE OR REPLACE FUNCTION apply_duty_mode_deadline_extension(p_match_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Check if either party in match is on duty
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND is_on_duty = TRUE AND duty_ends_at > NOW()
  ) THEN
    UPDATE matches
    SET first_message_deadline = first_message_deadline + INTERVAL '48 hours'
    WHERE id::text = p_match_id::text
    AND first_message_deadline IS NOT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ÖZELLİK 7: "Şu an Müsaitim" Modu
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_available_now BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS available_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_visibility TEXT DEFAULT 'all'
  CHECK (availability_visibility IN ('all', 'verified', 'matches_only'));

-- Auto-expire "available now" after deadline
CREATE OR REPLACE FUNCTION expire_available_now()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET is_available_now = FALSE, available_until = NULL, available_district = NULL
  WHERE is_available_now = TRUE AND available_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Index for discovery queries
CREATE INDEX IF NOT EXISTS idx_profiles_available_now ON profiles(is_available_now, available_until)
  WHERE is_available_now = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_on_duty ON profiles(is_on_duty, duty_ends_at)
  WHERE is_on_duty = TRUE;
