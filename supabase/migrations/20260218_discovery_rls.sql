-- Discovery RLS & RPC
-- Allows authenticated users to discover other profiles in the swipe engine.
-- The RPC hides sensitive fields and excludes already-swiped / blocked users.

-- 1. Add discovery SELECT policy so RPC with SECURITY INVOKER can read profiles
DROP POLICY IF EXISTS "Authenticated users can discover profiles" ON profiles;
CREATE POLICY "Authenticated users can discover profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL          -- must be authenticated
    AND id <> auth.uid()            -- cannot see own profile
    AND (is_frozen IS DISTINCT FROM TRUE)  -- skip frozen accounts
  );

-- 2. Profile photos readable by authenticated users
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON profile_photos;
CREATE POLICY "Authenticated users can view photos"
  ON profile_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 3. Profile interests readable by authenticated users
ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view interests" ON profile_interests;
CREATE POLICY "Authenticated users can view interests"
  ON profile_interests FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view interest names" ON interests;
CREATE POLICY "Authenticated users can view interest names"
  ON interests FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. Profile personality tags readable
ALTER TABLE profile_personality_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON profile_personality_tags;
CREATE POLICY "Authenticated users can view tags"
  ON profile_personality_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 5. Profile questions readable
ALTER TABLE profile_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view questions" ON profile_questions;
CREATE POLICY "Authenticated users can view questions"
  ON profile_questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. Swipes: users can see own swipes and insert own swipes
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
CREATE POLICY "Users can view own swipes"
  ON swipes FOR SELECT
  USING (swiper_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own swipes" ON swipes;
CREATE POLICY "Users can insert own swipes"
  ON swipes FOR INSERT
  WITH CHECK (swiper_id = auth.uid());

-- 7. Blocks: users can view and insert own blocks
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own blocks" ON blocks;
CREATE POLICY "Users can insert own blocks"
  ON blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

-- 8. Discovery RPC — returns profiles the current user hasn't swiped/blocked
CREATE OR REPLACE FUNCTION public.discover_profiles(
  p_min_age INTEGER DEFAULT 18,
  p_max_age INTEGER DEFAULT 100,
  p_max_distance_km INTEGER DEFAULT 100,
  p_specialties TEXT[] DEFAULT NULL,
  p_available_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  age INTEGER,
  role VARCHAR,
  specialty VARCHAR,
  sub_specialty VARCHAR,
  hospital VARCHAR,
  institution_hidden BOOLEAN,
  education VARCHAR,
  bio TEXT,
  location_city VARCHAR,
  is_location_hidden BOOLEAN,
  is_available BOOLEAN,
  availability_expires_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  is_online_hidden BOOLEAN,
  gender_preference VARCHAR,
  university VARCHAR,
  city VARCHAR,
  graduation_year INTEGER,
  experience_years INTEGER,
  looking_for VARCHAR,
  verified BOOLEAN,
  verification_status VARCHAR,
  premium_tier VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Touch last_active
  UPDATE profiles SET last_active_at = NOW() WHERE profiles.id = v_user_id;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.age,
    p.role,
    p.specialty,
    p.sub_specialty,
    CASE WHEN p.institution_hidden THEN NULL ELSE p.hospital END AS hospital,
    p.institution_hidden,
    p.education,
    p.bio,
    CASE WHEN p.is_location_hidden THEN NULL ELSE p.location_city END AS location_city,
    p.is_location_hidden,
    p.is_available,
    p.availability_expires_at,
    CASE WHEN p.is_online_hidden THEN NULL ELSE p.last_active_at END AS last_active_at,
    p.is_online_hidden,
    p.gender_preference,
    p.university,
    p.city,
    p.graduation_year,
    p.experience_years,
    p.looking_for,
    -- Compute verified from verifications table
    EXISTS(
      SELECT 1 FROM verifications v
      WHERE v.profile_id = p.id AND v.type = 'license' AND v.status = 'verified'
    ) AS verified,
    p.verification_status,
    p.premium_tier
  FROM profiles p
  WHERE p.id <> v_user_id
    AND (p.is_frozen IS DISTINCT FROM TRUE)
    -- Age filter
    AND p.age >= p_min_age
    AND p.age <= p_max_age
    -- Specialty filter
    AND (p_specialties IS NULL OR p.specialty = ANY(p_specialties))
    -- Availability filter
    AND (NOT p_available_only OR (p.is_available AND (p.availability_expires_at IS NULL OR p.availability_expires_at > NOW())))
    -- Exclude already swiped
    AND NOT EXISTS (
      SELECT 1 FROM swipes s WHERE s.swiper_id = v_user_id AND s.swiped_id = p.id
    )
    -- Exclude blocked (both directions)
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = v_user_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = v_user_id)
    )
    -- Exclude already matched (active)
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE m.is_active = TRUE
        AND ((m.profile_1_id = v_user_id AND m.profile_2_id = p.id)
          OR (m.profile_1_id = p.id AND m.profile_2_id = v_user_id))
    )
  ORDER BY
    -- Available users first
    (CASE WHEN p.is_available AND (p.availability_expires_at IS NULL OR p.availability_expires_at > NOW()) THEN 0 ELSE 1 END),
    -- Recently active first
    p.last_active_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.discover_profiles TO authenticated;

-- 9. Fetch "likes you" — profiles that liked the current user but we haven't swiped back yet
CREATE OR REPLACE FUNCTION public.get_likes_you(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  age INTEGER,
  role VARCHAR,
  specialty VARCHAR,
  sub_specialty VARCHAR,
  images TEXT[],
  verified BOOLEAN,
  swiped_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.age,
    p.role,
    p.specialty,
    p.sub_specialty,
    ARRAY(
      SELECT ph.url FROM profile_photos ph
      WHERE ph.profile_id = p.id
      ORDER BY ph.order_index
      LIMIT 3
    ) AS images,
    EXISTS(
      SELECT 1 FROM verifications v
      WHERE v.profile_id = p.id AND v.type = 'license' AND v.status = 'verified'
    ) AS verified,
    s.created_at AS swiped_at
  FROM swipes s
  JOIN profiles p ON p.id = s.swiper_id
  WHERE s.swiped_id = v_user_id
    AND s.action IN ('LIKE', 'SUPER_LIKE')
    -- Exclude those we already swiped back
    AND NOT EXISTS (
      SELECT 1 FROM swipes s2 WHERE s2.swiper_id = v_user_id AND s2.swiped_id = s.swiper_id
    )
    -- Exclude blocked
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = v_user_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = v_user_id)
    )
    AND (p.is_frozen IS DISTINCT FROM TRUE)
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_likes_you TO authenticated;

-- 10. Record a swipe action
CREATE OR REPLACE FUNCTION public.record_swipe(
  p_swiped_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_match BOOLEAN := FALSE;
  v_match_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_action NOT IN ('LIKE', 'PASS', 'SUPER_LIKE') THEN
    RAISE EXCEPTION 'Invalid swipe action: %', p_action;
  END IF;

  -- Insert swipe (upsert to handle re-swipes after undo)
  INSERT INTO swipes (swiper_id, swiped_id, action)
  VALUES (v_user_id, p_swiped_id, p_action)
  ON CONFLICT (swiper_id, swiped_id)
  DO UPDATE SET action = p_action, created_at = NOW();

  -- Check for match if it's a LIKE or SUPER_LIKE
  IF p_action IN ('LIKE', 'SUPER_LIKE') THEN
    SELECT EXISTS(
      SELECT 1 FROM swipes
      WHERE swiper_id = p_swiped_id
        AND swiped_id = v_user_id
        AND action IN ('LIKE', 'SUPER_LIKE')
    ) INTO v_is_match;

    IF v_is_match THEN
      -- Create match (check it doesn't already exist)
      INSERT INTO matches (profile_1_id, profile_2_id, is_super_like, expires_at)
      SELECT
        LEAST(v_user_id, p_swiped_id),
        GREATEST(v_user_id, p_swiped_id),
        p_action = 'SUPER_LIKE',
        NOW() + INTERVAL '24 hours'
      WHERE NOT EXISTS (
        SELECT 1 FROM matches m
        WHERE m.is_active = TRUE
          AND m.profile_1_id = LEAST(v_user_id, p_swiped_id)
          AND m.profile_2_id = GREATEST(v_user_id, p_swiped_id)
      )
      RETURNING id INTO v_match_id;

      IF v_match_id IS NOT NULL THEN
        v_is_match := TRUE;
      END IF;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'success', TRUE,
    'is_match', v_is_match,
    'match_id', v_match_id
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_swipe TO authenticated;
