-- Admin & Moderation foundation for verification pipeline
-- Idempotent migration: safe to run multiple times.

-- ============================================
-- 1) PROFILE ENRICHMENT FOR VERIFICATION + RBAC
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_role TEXT NOT NULL DEFAULT 'viewer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_flags JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_verification_status_check
  CHECK (
    verification_status IN (
      'UNVERIFIED',
      'AUTO_VERIFIED',
      'PENDING',
      'UNDER_REVIEW',
      'NEED_MORE_INFO',
      'VERIFIED',
      'REJECTED',
      'SUSPENDED',
      -- legacy compatibility
      'PENDING_VERIFICATION',
      'EMAIL_VERIFICATION_SENT'
    )
  );

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_verification_method_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_verification_method_check
  CHECK (
    verification_method IS NULL OR verification_method IN ('CORPORATE_EMAIL', 'DOCUMENTS', 'THIRD_PARTY')
  );

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_role_check
  CHECK (user_role IN ('viewer', 'moderator', 'admin', 'superadmin'));

CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles (user_role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status_submitted
  ON profiles (verification_status);

UPDATE profiles
SET verification_status = 'AUTO_VERIFIED'
WHERE verification_status = 'VERIFIED';

UPDATE profiles
SET user_role = COALESCE(user_role, 'viewer')
WHERE user_role IS NULL;

-- ============================================
-- 2) SETTINGS + DOMAIN CONTROL + AUDIT STRUCTURE
-- ============================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO app_settings (key, value)
VALUES
  ('verification_policy', 'HYBRID'),
  ('retention_days', '30'),
  ('sla_hours', '24'),
  ('immediate_delete_on_verify', 'false'),
  ('limited_actions', '["swipe","chat","premium"]'),
  ('allowlist_domains', '[]'),
  ('denylist_domains', '[]'),
  ('disposable_domains', '[]')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS verification_domain_policies (
  id BIGSERIAL PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('ALLOWLIST', 'DENYLIST', 'DISPOSABLE')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_domain_policies_type
ON verification_domain_policies (policy_type)
WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity ON admin_audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs (created_at DESC);

-- ============================================
-- 3) VERIFICATION REQUESTS / DOCS ENHANCEMENT
-- ============================================

ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS email_type TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reason_code TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS risk_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE verification_requests
SET status = CASE
  WHEN status = 'PENDING_VERIFICATION' THEN 'PENDING'
  ELSE COALESCE(status, 'PENDING')
END
WHERE status IS NULL OR status IN ('PENDING_VERIFICATION');

ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_status_check
  CHECK (
    status IN (
      'PENDING',
      'UNDER_REVIEW',
      'NEED_MORE_INFO',
      'APPROVED',
      'REJECTED',
      'SUSPENDED',
      -- legacy fallback
      'PENDING_VERIFICATION',
      'EMAIL_VERIFICATION_SENT'
    )
  );

UPDATE verification_requests
SET email_type = CASE
  WHEN method = 'EMAIL' THEN 'corporate'
  WHEN method = 'DOCUMENT' THEN 'personal'
  ELSE COALESCE(email_type, 'personal')
END
WHERE email_type IS NULL;

ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_method_check;
ALTER TABLE verification_requests ADD CONSTRAINT verification_requests_method_check
  CHECK (method IN ('EMAIL', 'DOCUMENT', 'STUDENT', 'THIRD_PARTY', 'AUTO_APPROVE', 'CORPORATE_ONLY') OR method IS NULL);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status_created
ON verification_requests (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_status
ON verification_requests (user_id, status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_claimed
ON verification_requests (claimed_by, claimed_at DESC);

ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS doc_type TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS mime TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS size BIGINT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

UPDATE verification_documents
SET storage_path = COALESCE(storage_path, document_path)
WHERE storage_path IS NULL;

UPDATE verification_documents
SET doc_type = COALESCE(document_type, 'DOCUMENT')
WHERE doc_type IS NULL;

UPDATE verification_documents
SET mime = COALESCE(mime, 'application/octet-stream')
WHERE mime IS NULL;

UPDATE verification_documents
SET size = COALESCE(size, 0)
WHERE size IS NULL;

CREATE INDEX IF NOT EXISTS idx_verification_documents_request
ON verification_documents (request_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_user
ON verification_documents (user_id);

-- ============================================
-- 4) PRIVATE VERIFICATION STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own verification docs (legacy)" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own verification docs (legacy)" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own verification docs (legacy)" ON storage.objects;

CREATE POLICY "Users can upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own verification docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Moderators can read any verification-docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND public.auth_user_role() IN ('moderator', 'admin', 'superadmin')
);

-- ============================================
-- 5) SECURITY HELPERS FOR RBAC
-- ============================================

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT user_role FROM public.profiles WHERE id = auth.uid()),
    'viewer'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_has_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.auth_user_role() = ANY (p_roles);
$$;

CREATE OR REPLACE FUNCTION public.auth_has_moderation_access()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT public.auth_has_role(ARRAY['moderator','admin','superadmin']);
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_moderation_access() TO authenticated;

-- ============================================
-- 6) RLS FOR MODERATION TABLES
-- ============================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON app_settings;
DROP POLICY IF EXISTS "Moderators can write app settings" ON app_settings;
CREATE POLICY "Authenticated users can read app settings"
ON app_settings FOR SELECT
USING (auth.uid() IS NOT NULL);
CREATE POLICY "Moderators can write app settings"
ON app_settings FOR ALL
USING (public.auth_has_moderation_access())
WITH CHECK (public.auth_has_moderation_access());

ALTER TABLE verification_domain_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can read domain policies" ON verification_domain_policies;
DROP POLICY IF EXISTS "Moderators can manage domain policies" ON verification_domain_policies;
CREATE POLICY "Moderators can read domain policies"
ON verification_domain_policies FOR SELECT
USING (public.auth_has_moderation_access());
CREATE POLICY "Moderators can manage domain policies"
ON verification_domain_policies FOR ALL
USING (public.auth_has_moderation_access())
WITH CHECK (public.auth_has_moderation_access());

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can create own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Moderators can view verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Moderators can update verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Moderators can manage verification requests" ON verification_requests;
CREATE POLICY "Users can view own verification requests"
ON verification_requests FOR SELECT
USING (user_id = auth.uid());
CREATE POLICY "Users can create own verification requests"
ON verification_requests FOR INSERT
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Moderators can manage verification requests"
ON verification_requests FOR ALL
USING (public.auth_has_moderation_access())
WITH CHECK (public.auth_has_moderation_access());

ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can read verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Moderators can update verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Users can view own verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Users can insert own verification documents" ON verification_documents;
CREATE POLICY "Users can view own verification documents"
ON verification_documents FOR SELECT
USING (user_id = auth.uid());
CREATE POLICY "Users can insert own verification documents"
ON verification_documents FOR INSERT
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Moderators can manage verification documents"
ON verification_documents FOR ALL
USING (public.auth_has_moderation_access())
WITH CHECK (public.auth_has_moderation_access());

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can read audit logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "Moderators can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Moderators can read audit logs"
ON admin_audit_logs FOR SELECT
USING (public.auth_has_moderation_access());
CREATE POLICY "Moderators can insert audit logs"
ON admin_audit_logs FOR INSERT
WITH CHECK (public.auth_has_moderation_access() AND actor_id = auth.uid());

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can view all profiles for admin panel" ON profiles;
CREATE POLICY "Moderators can view all profiles for admin panel"
ON profiles FOR SELECT
USING (public.auth_has_moderation_access() OR auth.uid() = id);

-- ============================================
-- 7) AUDIT HELPERS (OPTIONAL SERVER-SIDE PATH)
-- ============================================

CREATE TABLE IF NOT EXISTS profile_admin_activity (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_admin_activity_profile
ON profile_admin_activity (profile_id, created_at DESC);
