-- AUDIT-FIX: SEC-004 — Prevent client-side verification_status manipulation
-- Users should NOT be able to set their own verification_status to 'VERIFIED'.
-- Only service_role (admin/edge functions) can set verification_status.

-- Create a helper function to check if verification_status is being changed
CREATE OR REPLACE FUNCTION public.check_profile_update_allowed()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role to update anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Block non-service-role from changing verification_status to VERIFIED
  -- (Allow changing TO non-VERIFIED statuses like PENDING_VERIFICATION, EMAIL_VERIFICATION_SENT)
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status
     AND NEW.verification_status = 'VERIFIED' THEN
    RAISE EXCEPTION 'verification_status=VERIFIED can only be set by administrators';
  END IF;

  -- Block non-service-role from changing premium_tier (must come from Stripe webhook)
  IF OLD.premium_tier IS DISTINCT FROM NEW.premium_tier THEN
    RAISE EXCEPTION 'premium_tier can only be updated by the payment system';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS enforce_profile_update_restrictions ON profiles;

-- Create the trigger
CREATE TRIGGER enforce_profile_update_restrictions
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update_allowed();

-- RPC function for corporate email verification:
-- After saveVerifiedEmail succeeds, client calls this RPC which checks
-- that the user actually has a verified_work_emails record and then sets VERIFIED.
CREATE OR REPLACE FUNCTION public.complete_email_verification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_has_verified_email BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check that user actually has a verified email record
  SELECT EXISTS(
    SELECT 1 FROM verified_work_emails
    WHERE user_id = v_user_id
      AND verified_at IS NOT NULL
  ) INTO v_has_verified_email;

  IF NOT v_has_verified_email THEN
    RAISE EXCEPTION 'No verified email found for this user';
  END IF;

  -- Set verification status to VERIFIED (runs as service_role via SECURITY DEFINER)
  UPDATE profiles
  SET verification_status = 'VERIFIED'
  WHERE id = v_user_id;
END;
$$;
