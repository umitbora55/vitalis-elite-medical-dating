-- ─── BE-006: verifications tablosu RLS ──────────────────────────────────────
-- AUDIT FINDING: verifications tablosunda ENABLE ROW LEVEL SECURITY yapılmamış.
-- Her kullanıcı başkasının verifikasyon belgelerine erişebilirdi.
--
-- Politika tasarımı:
--   • SELECT: Sadece kendi satırı (profile_id = auth.uid())
--             Moderatör/Admin/Superadmin tümünü görebilir
--   • INSERT: Sadece kendi satırı, sadece pending status
--   • UPDATE:  YASAK (service_role / admin edge function üzerinden)
--   • DELETE:  YASAK (soft-delete pattern kullanılıyor)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- ── 1. Own row SELECT ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users read own verifications" ON verifications;
CREATE POLICY "Users read own verifications"
  ON verifications FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- ── 2. Moderator / Admin SELECT ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Moderators read all verifications" ON verifications;
CREATE POLICY "Moderators read all verifications"
  ON verifications FOR SELECT TO authenticated
  USING (public.auth_has_moderation_access());

-- ── 3. Own INSERT (only pending, only own profile) ───────────────────────────
DROP POLICY IF EXISTS "Users submit own verification" ON verifications;
CREATE POLICY "Users submit own verification"
  ON verifications FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND status = 'pending'
  );

-- ── 4. Moderator UPDATE (status transitions) ─────────────────────────────────
-- Regular users cannot UPDATE verifications at all.
-- Admin edge functions use service_role which bypasses RLS.
-- This policy is a belt-and-suspenders fallback for moderators using anon key.
DROP POLICY IF EXISTS "Moderators update verification status" ON verifications;
CREATE POLICY "Moderators update verification status"
  ON verifications FOR UPDATE TO authenticated
  USING  (public.auth_has_moderation_access())
  WITH CHECK (public.auth_has_moderation_access());

-- ── 5. No DELETE (soft-delete via status column) ─────────────────────────────
-- Intentionally no DELETE policy — hard deletes are forbidden.

COMMENT ON TABLE verifications IS
  'AUDIT-FIX BE-006: RLS enabled 2026-03-23. '
  'Users see only own rows; moderators see all. '
  'No hard-delete policy — use status column for lifecycle.';
