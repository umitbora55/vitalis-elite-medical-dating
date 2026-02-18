-- Admin verification hardening migration
-- Enforces private document access and policy-driven verification settings.

ALTER TABLE verification_requests DROP CONSTRAINT IF EXISTS verification_requests_status_check;
ALTER TABLE verification_requests
  ADD CONSTRAINT verification_requests_status_check
  CHECK (
    status IN (
      'PENDING',
      'UNDER_REVIEW',
      'NEED_MORE_INFO',
      'APPROVED',
      'REJECTED',
      'SUSPENDED',
      'PENDING_VERIFICATION',
      'EMAIL_VERIFICATION_SENT'
    )
  );

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_verification_status_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_verification_status_check
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
      'PENDING_VERIFICATION',
      'EMAIL_VERIFICATION_SENT'
    )
  );

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

ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_verification_requests_status_submitted_at
  ON verification_requests (status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_verification_requests_claimed
  ON verification_requests (claimed_by, claimed_at);
CREATE INDEX IF NOT EXISTS idx_verification_documents_request_id
  ON verification_documents (request_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_created_at
  ON admin_audit_logs (entity, entity_id, created_at DESC);

ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Users can read own verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Users can select own verification documents" ON verification_documents;
DROP POLICY IF EXISTS "Moderators can manage verification documents" ON verification_documents;
CREATE POLICY "Users can insert own verification documents"
ON verification_documents FOR INSERT
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Moderators can read verification documents"
ON verification_documents FOR SELECT
USING (public.auth_has_moderation_access());
CREATE POLICY "Moderators can manage verification documents"
ON verification_documents FOR UPDATE
USING (public.auth_has_moderation_access())
WITH CHECK (public.auth_has_moderation_access());
CREATE POLICY "Moderators can delete verification documents"
ON verification_documents FOR DELETE
USING (public.auth_has_moderation_access());

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can read own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Moderators can read any verification-docs" ON storage.objects;

CREATE POLICY "Users can upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
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
  AND public.auth_has_moderation_access()
);
