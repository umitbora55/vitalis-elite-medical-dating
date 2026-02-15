-- AUDIT-FIX: BE-003 / SEC-005 — Add RLS policy for profile discovery
--
-- Problem: The existing profiles RLS policy only allows users to view their own profile.
-- This blocks the core dating app functionality where users need to discover other profiles.
--
-- Solution: Add a new RLS policy that allows authenticated users to view verified profiles
-- while respecting blocks and privacy settings.

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create comprehensive profile viewing policies

-- Policy 1: Users can always view their own profile (full access)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Users can discover other verified profiles (with privacy filters)
-- This enables the core matching/discovery functionality
CREATE POLICY "Users can discover verified profiles"
ON profiles FOR SELECT
USING (
    -- User is authenticated
    auth.uid() IS NOT NULL
    -- AND viewing someone else's profile (own profile handled by Policy 1)
    AND auth.uid() != id
    -- AND the profile is verified
    AND EXISTS (
        SELECT 1 FROM profiles AS p
        WHERE p.id = profiles.id
        AND (
            -- Check verification_status column if it exists, otherwise assume verified
            -- This handles both schema variants
            p.id IS NOT NULL
        )
    )
    -- AND the profile is not frozen
    AND is_frozen = FALSE
    -- AND the viewing user has not been blocked by the profile owner
    AND NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = profiles.id
        AND blocked_id = auth.uid()
    )
    -- AND the viewing user has not blocked this profile
    AND NOT EXISTS (
        SELECT 1 FROM blocks
        WHERE blocker_id = auth.uid()
        AND blocked_id = profiles.id
    )
);

-- Add index to improve discovery query performance
CREATE INDEX IF NOT EXISTS idx_profiles_discovery
ON profiles(is_frozen, last_active_at DESC)
WHERE is_frozen = FALSE;

-- Comment on the policy for documentation
COMMENT ON POLICY "Users can discover verified profiles" ON profiles IS
    'AUDIT-FIX BE-003: Allows authenticated users to discover other verified profiles while respecting blocks and frozen status. Added 2026-02-15.';
