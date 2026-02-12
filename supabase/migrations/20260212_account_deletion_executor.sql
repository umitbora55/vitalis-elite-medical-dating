-- Account deletion executor (service-role only)
-- Converts request tickets into completed anonymization + data cleanup.

CREATE OR REPLACE FUNCTION process_account_deletion_request(request_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user UUID;
  request_status TEXT;
BEGIN
  SELECT user_id, status
  INTO target_user, request_status
  FROM account_deletion_requests
  WHERE id = request_uuid
  FOR UPDATE;

  IF target_user IS NULL THEN
    RAISE EXCEPTION 'Deletion request not found: %', request_uuid;
  END IF;

  IF request_status = 'COMPLETED' THEN
    RETURN TRUE;
  END IF;

  UPDATE account_deletion_requests
  SET status = 'PROCESSING'
  WHERE id = request_uuid;

  -- Remove user-generated relational data.
  DELETE FROM swipes WHERE swiper_id = target_user OR swiped_id = target_user;
  DELETE FROM matches WHERE profile_1_id = target_user OR profile_2_id = target_user;
  DELETE FROM blocks WHERE blocker_id = target_user OR blocked_id = target_user;
  DELETE FROM reports WHERE reporter_id = target_user OR reported_id = target_user;
  DELETE FROM notifications WHERE recipient_id = target_user OR sender_id = target_user;
  DELETE FROM subscriptions WHERE profile_id = target_user;
  DELETE FROM verifications WHERE profile_id = target_user;
  DELETE FROM verified_work_emails WHERE user_id = target_user;
  DELETE FROM verification_requests WHERE user_id = target_user;
  DELETE FROM data_export_requests WHERE user_id = target_user;
  DELETE FROM referrals WHERE referrer_id = target_user OR referred_id = target_user;
  DELETE FROM referral_codes WHERE owner_id = target_user;
  DELETE FROM users WHERE id = target_user;

  -- Keep profile row for referential/audit continuity, but anonymize.
  UPDATE profiles
  SET
    name = 'Deleted User',
    age = 18,
    role = 'DELETED',
    specialty = 'DELETED',
    sub_specialty = NULL,
    hospital = NULL,
    education = NULL,
    bio = NULL,
    location = NULL,
    location_city = NULL,
    is_location_hidden = TRUE,
    is_online_hidden = TRUE,
    institution_hidden = TRUE,
    is_available = FALSE,
    availability_expires_at = NULL,
    is_frozen = TRUE,
    freeze_reason = 'ACCOUNT_DELETED',
    updated_at = NOW()
  WHERE id = target_user;

  UPDATE account_deletion_requests
  SET status = 'COMPLETED', processed_at = NOW()
  WHERE id = request_uuid;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  UPDATE account_deletion_requests
  SET status = 'REJECTED', processed_at = NOW()
  WHERE id = request_uuid;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION process_account_deletion_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_account_deletion_request(UUID) TO service_role;
