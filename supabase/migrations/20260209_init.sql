-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users (auth-integrated)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
    gender VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    sub_specialty VARCHAR(100),
    hospital VARCHAR(200),
    education VARCHAR(200),
    bio TEXT,
    location GEOGRAPHY(POINT, 4326),
    location_city VARCHAR(100),
    is_location_hidden BOOLEAN DEFAULT FALSE,
    is_online_hidden BOOLEAN DEFAULT FALSE,
    institution_hidden BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT FALSE,
    availability_expires_at TIMESTAMPTZ,
    is_frozen BOOLEAN DEFAULT FALSE,
    freeze_reason TEXT,
    theme_preference VARCHAR(10) DEFAULT 'SYSTEM',
    first_message_preference VARCHAR(20) DEFAULT 'ANYONE',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_profiles_specialty ON profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON profiles(last_active_at DESC);

-- Photos
CREATE TABLE IF NOT EXISTS profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    performance_score INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_profile ON profile_photos(profile_id, order_index);

-- Interests
CREATE TABLE IF NOT EXISTS interests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS profile_interests (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id),
    PRIMARY KEY (profile_id, interest_id)
);

CREATE TABLE IF NOT EXISTS profile_personality_tags (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tag_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (profile_id, tag_id)
);

CREATE TABLE IF NOT EXISTS profile_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    document_url TEXT,
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verifications_profile ON verifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);

-- Swipes
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    swiped_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_swipe UNIQUE (swiper_id, swiped_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_action ON swipes(action) WHERE action IN ('LIKE', 'SUPER_LIKE');

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    profile_2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_super_like BOOLEAN DEFAULT FALSE,
    first_message_by UUID,
    expires_at TIMESTAMPTZ,
    theme JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    unmatched_by UUID,
    unmatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match UNIQUE (
        LEAST(profile_1_id, profile_2_id),
        GREATEST(profile_1_id, profile_2_id)
    )
);

CREATE INDEX IF NOT EXISTS idx_matches_p1 ON matches(profile_1_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_matches_p2 ON matches(profile_2_id) WHERE is_active = TRUE;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    text TEXT,
    image_url TEXT,
    audio_url TEXT,
    audio_duration INTEGER,
    video_url TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    scheduled_for TIMESTAMPTZ,
    reply_to_id UUID REFERENCES messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON messages(scheduled_for) WHERE status = 'scheduled';

CREATE TABLE IF NOT EXISTS message_reactions (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, profile_id)
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL,
    period VARCHAR(20) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    store_transaction_id TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_profile ON subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(profile_id) WHERE is_active = TRUE;

-- Safety & Moderation
CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES profiles(id),
    reported_id UUID REFERENCES profiles(id),
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    evidence_urls TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    action_taken TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    sender_id UUID REFERENCES profiles(id),
    match_id UUID REFERENCES matches(id),
    message_id UUID REFERENCES messages(id),
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);

-- Referrals
CREATE TABLE IF NOT EXISTS referral_codes (
    code VARCHAR(20) PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    max_uses INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES profiles(id),
    referred_id UUID REFERENCES profiles(id),
    code VARCHAR(20) REFERENCES referral_codes(code),
    status VARCHAR(20) DEFAULT 'PENDING',
    reward_days INTEGER DEFAULT 3,
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants can view messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_id
      AND (profile_1_id = auth.uid() OR profile_2_id = auth.uid())
  )
);
CREATE POLICY "Match participants can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE id = match_id
      AND is_active = TRUE
      AND (profile_1_id = auth.uid() OR profile_2_id = auth.uid())
  )
);
