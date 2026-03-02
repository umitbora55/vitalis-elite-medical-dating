-- ─── BE-016: VITALIS-VIP seed invite kodu kaldırma ───────────────────────────
-- AUDIT FINDING: 20260322_seed_invite_code.sql migration'ı
-- 'VITALIS-VIP' kodunu 999 kullanım hakkıyla prod DB'ye ekliyor.
-- Bu kod herkes tarafından kullanılabilir → unlimited free access bypass.
--
-- Bu migration:
--   1. Mevcut VIP kodunu deactivate eder (max_uses = 0, is_active = false)
--   2. Kullanım sayısını sıfırlar
--   3. Audit log için bir yorum bırakır
-- ─────────────────────────────────────────────────────────────────────────────

-- Deactivate the VIP code immediately if it exists
UPDATE invite_codes
SET
  is_active  = false,
  max_uses   = 0,
  updated_at = NOW()
WHERE code = 'VITALIS-VIP';

-- Hard delete as well — belt-and-suspenders
DELETE FROM invite_codes WHERE code = 'VITALIS-VIP';

-- Verify cleanup
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM invite_codes WHERE code = 'VITALIS-VIP';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'BE-016: VITALIS-VIP code still exists after cleanup! Count: %', v_count;
  END IF;
  RAISE NOTICE 'BE-016: VITALIS-VIP code successfully removed.';
END;
$$;
