-- AUDIT-FIX: BE-004 — Drop unused public.users table to eliminate schema confusion
--
-- Problem: public.users table was created in init.sql but is never used.
-- The profiles table references auth.users(id), not public.users.
-- This creates schema confusion and potential FK violations.
--
-- Solution: Drop the unused table. This is safe because:
-- 1. No FK references public.users (profiles references auth.users)
-- 2. No application code queries public.users
-- 3. Table contains no data in production (newly created database)

-- First check if the table exists and is empty (safety check)
DO $$
BEGIN
    -- Only drop if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Check if table is empty before dropping
        IF (SELECT COUNT(*) FROM public.users) = 0 THEN
            DROP TABLE IF EXISTS public.users CASCADE;
            RAISE NOTICE 'AUDIT-FIX BE-004: Dropped unused public.users table';
        ELSE
            RAISE WARNING 'AUDIT-FIX BE-004: public.users table is not empty. Manual review required.';
        END IF;
    ELSE
        RAISE NOTICE 'AUDIT-FIX BE-004: public.users table does not exist (already dropped or never created)';
    END IF;
END $$;
