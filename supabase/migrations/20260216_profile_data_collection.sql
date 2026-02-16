-- Add new columns for 3-tier data collection
-- Tier 1 (Registration Required)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_preference VARCHAR(20) DEFAULT 'EVERYONE';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university VARCHAR(200);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Tier 2 (Registration Optional)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoking VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drinking VARCHAR(20);

-- Tier 3 (Profile Completion)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_style VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shift_frequency VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS living_status VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_range VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abroad_experience BOOLEAN DEFAULT FALSE;

-- Indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_university ON profiles(university);
CREATE INDEX IF NOT EXISTS idx_profiles_gender_preference ON profiles(gender_preference);
CREATE INDEX IF NOT EXISTS idx_profiles_looking_for ON profiles(looking_for);
