-- AUDIT-FIX: PRV-006 — Consolidate two conflicting deletion paths into one.
-- delete_user_data is the active path (called by delete-account edge function).
-- process_account_deletion_request is dropped as redundant and conflicting.

-- Drop the conflicting alternative deletion path
DROP FUNCTION IF EXISTS public.process_account_deletion_request(UUID);

-- Drop the old delete_user_data that references non-existent tables
DROP FUNCTION IF EXISTS public.delete_user_data(UUID);

-- Recreate delete_user_data aligned with active schema (20260209_init.sql)
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: only the user themselves or service_role can invoke
  IF current_setting('role', true) <> 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own data';
  END IF;

  -- 1. Soft-delete messages (preserve for other party's chat history)
  UPDATE messages
  SET text = '[deleted]', image_url = NULL, audio_url = NULL, video_url = NULL
  WHERE sender_id = p_user_id;

  -- 2. Delete message reactions by the user
  DELETE FROM message_reactions WHERE profile_id = p_user_id;

  -- 3. Delete user's photos from database (storage handled by edge function)
  DELETE FROM profile_photos WHERE profile_id = p_user_id;

  -- 4. Delete profile-related data
  DELETE FROM profile_interests WHERE profile_id = p_user_id;
  DELETE FROM profile_personality_tags WHERE profile_id = p_user_id;
  DELETE FROM profile_questions WHERE profile_id = p_user_id;

  -- 5. Delete swipe data
  DELETE FROM swipes WHERE swiper_id = p_user_id OR swiped_id = p_user_id;

  -- 6. Delete matches (cascades to messages via match_id FK)
  -- But we already soft-deleted our messages above, so other party sees [deleted]
  DELETE FROM matches WHERE profile_1_id = p_user_id OR profile_2_id = p_user_id;

  -- 7. Delete safety data
  DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
  DELETE FROM reports WHERE reporter_id = p_user_id;
  -- Keep reports against this user for moderation audit trail
  UPDATE reports SET reporter_id = NULL WHERE reported_id = p_user_id AND reporter_id = p_user_id;

  -- 8. Delete verification data
  DELETE FROM verifications WHERE profile_id = p_user_id;
  DELETE FROM verified_work_emails WHERE user_id = p_user_id;
  DELETE FROM verification_requests WHERE user_id = p_user_id;

  -- 9. Delete notifications
  DELETE FROM notifications WHERE recipient_id = p_user_id OR sender_id = p_user_id;

  -- 10. Delete subscription data
  DELETE FROM subscriptions WHERE profile_id = p_user_id;

  -- 11. Delete referral data
  DELETE FROM referrals WHERE referrer_id = p_user_id OR referred_id = p_user_id;
  DELETE FROM referral_codes WHERE owner_id = p_user_id;

  -- 12. Delete consent records (GDPR: right to erasure includes consent records)
  DELETE FROM user_consents WHERE user_id = p_user_id;

  -- 13. Delete data export requests
  DELETE FROM data_export_requests WHERE user_id = p_user_id;

  -- 14. Delete the profile (hard delete — auth user deletion handled by edge function)
  DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

-- Only service_role and the user themselves can call this
REVOKE ALL ON FUNCTION public.delete_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO service_role;
