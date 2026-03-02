-- AUDIT-FIX BE-016: VITALIS-VIP seed kodu production'dan kaldırıldı.
-- Bu migration artık bir no-op'tur.
-- Test seed verileri sadece test veritabanında yer almalıdır.
-- Remediation: bkz. 20260323_remove_vip_seed.sql
--
-- REMOVED:
-- INSERT INTO invite_codes (code, max_uses, is_active)
-- VALUES ('VITALIS-VIP', 999, true)
-- ON CONFLICT (code) DO NOTHING;
SELECT 'BE-016: seed migration deactivated' AS audit_note;
