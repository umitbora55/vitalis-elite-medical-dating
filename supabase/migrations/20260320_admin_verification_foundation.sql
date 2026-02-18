-- Admin moderation foundation migration
-- Creates RBAC/settings/audit structures required by admin edge functions.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_role TEXT NOT NULL DEFAULT 'viewer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_flags JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_verification_method_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_verification_method_check
  CHECK (verification_method IS NULL OR verification_method IN ('CORPORATE_EMAIL', 'DOCUMENTS', 'THIRD_PARTY'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_role_check
  CHECK (user_role IN ('viewer', 'moderator', 'admin', 'superadmin'));

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

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

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created_at
  ON admin_audit_logs (actor_id, created_at DESC);

ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS email_type TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS reason_code TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS risk_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS doc_type TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS mime TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS size BIGINT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE verification_documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

UPDATE verification_requests
SET email_type = CASE
  WHEN method IN ('EMAIL', 'CORPORATE_EMAIL') THEN 'corporate'
  ELSE 'personal'
END
WHERE email_type IS NULL;

UPDATE verification_documents
SET storage_path = COALESCE(storage_path, document_path)
WHERE storage_path IS NULL;

UPDATE verification_documents
SET doc_type = COALESCE(doc_type, document_type, 'DOCUMENT')
WHERE doc_type IS NULL;

INSERT INTO app_settings (key, value)
VALUES
  ('verification_policy', 'HYBRID'),
  ('allowlist_domains', '[]'),
  ('denylist_domains', '[]'),
  ('disposable_domains', '[]'),
  ('limited_actions', '["swipe","chat","premium"]'),
  ('retention_days', '30'),
  ('sla_hours', '24'),
  ('immediate_delete_on_verify', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
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
  SELECT public.auth_has_role(ARRAY['moderator', 'admin', 'superadmin']);
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_moderation_access() TO authenticated;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read app settings" ON app_settings;
CREATE POLICY "Authenticated users can read app settings"
ON app_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can write app settings" ON app_settings;
CREATE POLICY "Admins can write app settings"
ON app_settings FOR ALL
USING (public.auth_has_role(ARRAY['admin', 'superadmin']))
WITH CHECK (public.auth_has_role(ARRAY['admin', 'superadmin']));

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can read audit logs" ON admin_audit_logs;
CREATE POLICY "Moderators can read audit logs"
ON admin_audit_logs FOR SELECT
USING (public.auth_has_moderation_access());

DROP POLICY IF EXISTS "Moderators can insert audit logs" ON admin_audit_logs;
CREATE POLICY "Moderators can insert audit logs"
ON admin_audit_logs FOR INSERT
WITH CHECK (public.auth_has_moderation_access() AND actor_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;
