-- ============================================
-- USER STATUS & JOURNEY TRACKING
-- ============================================

-- Kullanıcı durumu enum'u
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'pending_invite'
  CHECK (user_status IN (
    'pending_invite',        -- Davet kodu bekleniyor
    'pending_verification',  -- Meslek doğrulaması bekleniyor (admin onayı)
    'verification_rejected', -- Doğrulama reddedildi
    'profile_incomplete',    -- Onaylandı ama profil eksik
    'active',               -- Tam aktif kullanıcı
    'suspended',            -- Askıya alınmış
    'banned'                -- Kalıcı ban
  ));

-- Onboarding progress tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'invite'
  CHECK (onboarding_step IN (
    'invite',           -- Davet kodu aşaması
    'register',         -- Kayıt aşaması
    'verification',     -- Doğrulama belgesi yükleme
    'waiting_approval', -- Admin onayı bekleme
    'location',         -- Konum izni
    'photos',           -- Fotoğraf yükleme
    'bio',              -- Bio yazma
    'intent',           -- Intent seçimi
    'complete'          -- Tamamlandı
  ));

-- ============================================
-- WAITLIST & INVITE SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  referral_code TEXT,
  referred_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'registered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  max_uses INT DEFAULT 3,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Her onaylanan kullanıcıya otomatik davet kodu oluştur
CREATE OR REPLACE FUNCTION generate_invite_code_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_status = 'active' AND OLD.user_status != 'active' THEN
    INSERT INTO invite_codes (code, owner_id, max_uses)
    VALUES (
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
      NEW.id,
      3
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invite_code ON profiles;
CREATE TRIGGER trigger_generate_invite_code
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_invite_code_on_approval();

-- ============================================
-- DEVICE VERIFICATION
-- ============================================

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_fingerprint TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  is_primary BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE TABLE IF NOT EXISTS suspicious_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL,
  user_ids UUID[] DEFAULT '{}',
  account_count INT DEFAULT 1,
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'blocked'))
);

-- ============================================
-- LOCATION
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_lat DECIMAL(10, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_lng DECIMAL(11, 8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_distance_km INT DEFAULT 25;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- ============================================
-- PROFILE REQUIREMENTS
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio_text TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_face_photo BOOLEAN DEFAULT FALSE;

-- ============================================
-- INTENT SYSTEM
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intent TEXT
  CHECK (intent IN ('serious', 'long_term', 'networking', 'friendship'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intent_changes_remaining INT DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intent_last_changed_at TIMESTAMPTZ;

-- ============================================
-- INSTITUTION PRIVACY (Premium)
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hide_from_same_institution BOOLEAN DEFAULT FALSE;

-- ============================================
-- DAILY PICKS
-- ============================================

CREATE TABLE IF NOT EXISTS daily_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  picked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_viewed BOOLEAN DEFAULT FALSE,
  is_liked BOOLEAN,
  is_passed BOOLEAN,
  is_later BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, picked_user_id, pick_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_picks_user_date ON daily_picks(user_id, pick_date);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_pick_limit INT DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS later_count_remaining INT DEFAULT 0;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Waitlist
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own waitlist" ON waitlist;
CREATE POLICY "Users can insert own waitlist" ON waitlist
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own waitlist" ON waitlist;
CREATE POLICY "Users can view own waitlist" ON waitlist
  FOR SELECT USING (email = auth.jwt()->>'email');

-- Invite codes
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can validate codes" ON invite_codes;
CREATE POLICY "Anyone can validate codes" ON invite_codes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage codes" ON invite_codes;
CREATE POLICY "Owners can manage codes" ON invite_codes
  FOR ALL USING (owner_id = auth.uid());

-- Devices
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own devices" ON user_devices;
CREATE POLICY "Users manage own devices" ON user_devices
  FOR ALL USING (user_id = auth.uid());

-- Daily picks
ALTER TABLE daily_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own picks" ON daily_picks;
CREATE POLICY "Users see own picks" ON daily_picks
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System creates picks" ON daily_picks;
CREATE POLICY "System creates picks" ON daily_picks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update own picks" ON daily_picks;
CREATE POLICY "Users update own picks" ON daily_picks
  FOR UPDATE USING (user_id = auth.uid());
