-- AUDIT-FIX: Kayıt ve profil tamamlama alanları (3-tier sistem)

-- Tier 1: Kayıt sırasında zorunlu
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_preference VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university VARCHAR(200);

-- Tier 2: Kayıt sırasında opsiyonel
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoking VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drinking VARCHAR(20);

-- Tier 3: Onboarding sonrası
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_style VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS on_call_frequency VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifestyle_preference VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_range VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abroad_experience BOOLEAN DEFAULT FALSE;

-- İndeksler (filtreleme/matching için)
CREATE INDEX IF NOT EXISTS idx_profiles_gender_pref ON profiles(gender_preference);
CREATE INDEX IF NOT EXISTS idx_profiles_looking_for ON profiles(looking_for);
CREATE INDEX IF NOT EXISTS idx_profiles_university ON profiles(university);
