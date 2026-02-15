-- Verification domains
CREATE TABLE IF NOT EXISTS verified_domains (
  domain TEXT PRIMARY KEY,
  institution_name TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3))
);

-- Verified work emails
CREATE TABLE IF NOT EXISTS verified_work_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  domain TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verified_work_emails_user ON verified_work_emails(user_id);

-- Verification requests (document-based)
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  method TEXT NOT NULL, -- 'EMAIL', 'DOCUMENT', 'STUDENT'
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);

-- Add verification status to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_verification_status_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_verification_status_check
    CHECK (verification_status IN ('PENDING_VERIFICATION','EMAIL_VERIFICATION_SENT','REJECTED','VERIFIED'));
  END IF;
END $$;








