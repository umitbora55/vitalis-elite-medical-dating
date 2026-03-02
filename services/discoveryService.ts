import { supabase } from '../src/lib/supabase';
import { Profile, FilterPreferences, MedicalRole, Specialty } from '../types';
// DEMO_PROFILES and DEMO_LIKES_YOU removed — real users only in production.

interface DiscoveryRow {
  id: string;
  name: string;
  age: number;
  role: string;
  specialty: string;
  sub_specialty: string | null;
  hospital: string | null;
  institution_hidden: boolean;
  education: string | null;
  bio: string | null;
  location_city: string | null;
  is_location_hidden: boolean;
  is_available: boolean;
  availability_expires_at: string | null;
  last_active_at: string | null;
  is_online_hidden: boolean;
  gender_preference: string;
  university: string | null;
  city: string | null;
  graduation_year: number | null;
  experience_years: number | null;
  looking_for: string | null;
  verified: boolean;
  verification_status: string | null;
  premium_tier: string | null;
}

interface PhotoRow {
  url: string;
  order_index: number;
}

interface QuestionRow {
  id: string;
  question: string;
  answer: string;
}

const mapRowToProfile = (
  row: DiscoveryRow,
  photos: string[],
  interests: string[],
  personalityTags: string[],
  questions: QuestionRow[],
  hasLikedUser: boolean,
): Profile => ({
  id: row.id,
  name: row.name,
  age: row.age,
  role: row.role as MedicalRole,
  specialty: row.specialty as Specialty,
  subSpecialty: row.sub_specialty || '',
  hospital: row.hospital || '',
  institutionHidden: row.institution_hidden,
  bio: row.bio || '',
  education: row.education || '',
  images: photos.length > 0 ? photos : [],
  verified: row.verified,
  interests,
  personalityTags,
  questions: questions.map((q) => ({ id: q.id, question: q.question, answer: q.answer })),
  hasLikedUser,
  distance: 0, // Distance calculation is server-side via PostGIS when location enabled
  location: row.location_city || '',
  isLocationHidden: row.is_location_hidden,
  lastActive: row.last_active_at ? new Date(row.last_active_at).getTime() : 0,
  isOnlineHidden: row.is_online_hidden,
  isAvailable: row.is_available,
  availabilityExpiresAt: row.availability_expires_at
    ? new Date(row.availability_expires_at).getTime()
    : undefined,
  readReceiptsEnabled: true,
  stories: [],
  storyPrivacy: 'ALL_MATCHES',
  genderPreference: (row.gender_preference || 'EVERYONE') as Profile['genderPreference'],
  university: row.university || '',
  city: row.city || '',
  graduationYear: row.graduation_year ?? undefined,
  experienceYears: row.experience_years ?? undefined,
  lookingFor: row.looking_for as Profile['lookingFor'],
  verificationStatus: row.verification_status as Profile['verificationStatus'],
  premiumTier: (row.premium_tier || 'FREE') as Profile['premiumTier'],
});

/**
 * Fetch discovery profiles from Supabase.
 * Uses the discover_profiles RPC which handles swiped/blocked exclusion server-side.
 */
export const fetchDiscoveryProfiles = async (
  filters: FilterPreferences,
  limit = 20,
  offset = 0,
): Promise<{ profiles: Profile[]; error: Error | null }> => {
  try {
    // 1. Call RPC
    const { data: rows, error: rpcError } = await supabase.rpc('discover_profiles', {
      p_min_age: filters.ageRange[0],
      p_max_age: filters.ageRange[1],
      p_max_distance_km: filters.maxDistance,
      p_specialties: filters.specialties.length > 0 ? filters.specialties : null,
      p_available_only: filters.showAvailableOnly,
      p_limit: limit,
      p_offset: offset,
    });

    if (rpcError) {
      return { profiles: [], error: new Error(rpcError.message) };
    }

    if (!rows || rows.length === 0) {
      return { profiles: [], error: null };
    }

    const profileIds = (rows as DiscoveryRow[]).map((r) => r.id);

    // 2. Batch-fetch photos, interests, tags, questions, and who-liked-me in parallel
    const [photosRes, interestsRes, tagsRes, questionsRes, likesRes] = await Promise.all([
      supabase
        .from('profile_photos')
        .select('profile_id, url, order_index')
        .in('profile_id', profileIds)
        .order('order_index'),
      supabase
        .from('profile_interests')
        .select('profile_id, interest_id, interests(name)')
        .in('profile_id', profileIds),
      supabase
        .from('profile_personality_tags')
        .select('profile_id, tag_id')
        .in('profile_id', profileIds),
      supabase
        .from('profile_questions')
        .select('id, profile_id, question, answer')
        .in('profile_id', profileIds)
        .order('order_index'),
      supabase
        .from('swipes')
        .select('swiper_id')
        .in('swiper_id', profileIds)
        .eq('action', 'LIKE'),
    ]);

    // Build lookup maps
    const photosMap = new Map<string, string[]>();
    if (photosRes.data) {
      for (const p of photosRes.data as (PhotoRow & { profile_id: string })[]) {
        const arr = photosMap.get(p.profile_id) || [];
        arr.push(p.url);
        photosMap.set(p.profile_id, arr);
      }
    }

    const interestsMap = new Map<string, string[]>();
    if (interestsRes.data) {
      for (const i of interestsRes.data as unknown as { profile_id: string; interests: { name: string } | null }[]) {
        const arr = interestsMap.get(i.profile_id) || [];
        if (i.interests?.name) arr.push(i.interests.name);
        interestsMap.set(i.profile_id, arr);
      }
    }

    const tagsMap = new Map<string, string[]>();
    if (tagsRes.data) {
      for (const t of tagsRes.data as { profile_id: string; tag_id: string }[]) {
        const arr = tagsMap.get(t.profile_id) || [];
        arr.push(t.tag_id);
        tagsMap.set(t.profile_id, arr);
      }
    }

    const questionsMap = new Map<string, QuestionRow[]>();
    if (questionsRes.data) {
      for (const q of questionsRes.data as (QuestionRow & { profile_id: string })[]) {
        const arr = questionsMap.get(q.profile_id) || [];
        arr.push({ id: q.id, question: q.question, answer: q.answer });
        questionsMap.set(q.profile_id, arr);
      }
    }

    // "has liked user" — check the likes query for current user's auth.uid
    const { data: authData } = await supabase.auth.getUser();
    const myId = authData?.user?.id;
    const likedBySet = new Set<string>();
    if (likesRes.data && myId) {
      // These are swipes where swiper_id is in profileIds and swiped_id would be me
      // But our RLS limits this — we need to check differently
      // The RPC already filtered, so we do a targeted query
      const { data: whoLikedMe } = await supabase
        .from('swipes')
        .select('swiper_id')
        .in('swiper_id', profileIds)
        .eq('swiped_id', myId)
        .in('action', ['LIKE', 'SUPER_LIKE']);
      if (whoLikedMe) {
        for (const l of whoLikedMe) {
          likedBySet.add(l.swiper_id);
        }
      }
    }

    // 3. Map to Profile objects
    const profiles = (rows as DiscoveryRow[]).map((row) =>
      mapRowToProfile(
        row,
        photosMap.get(row.id) || [],
        interestsMap.get(row.id) || [],
        tagsMap.get(row.id) || [],
        questionsMap.get(row.id) || [],
        likedBySet.has(row.id),
      ),
    );

    return { profiles, error: null };
  } catch (err) {
    // Never silently fall back to demo profiles in production — surface the error
    // so the UI can show a proper error state instead of fake data.
    const error = err instanceof Error ? err : new Error('Profiller yüklenemedi');
    console.error('[Discovery] Supabase unavailable:', err);
    return { profiles: [], error };
  }
};

/**
 * Record a swipe action server-side and check for match.
 */
export const recordSwipe = async (
  swipedId: string,
  action: 'LIKE' | 'PASS' | 'SUPER_LIKE',
): Promise<{ isMatch: boolean; matchId: string | null; error: Error | null }> => {
  const { data, error } = await supabase.rpc('record_swipe', {
    p_swiped_id: swipedId,
    p_action: action,
  });

  if (error) {
    return { isMatch: false, matchId: null, error: new Error(error.message) };
  }

  const result = data as { success: boolean; is_match: boolean; match_id: string | null };
  return { isMatch: result.is_match, matchId: result.match_id, error: null };
};

/**
 * Fetch profiles that liked the current user (premium feature).
 */
export const fetchLikesYou = async (
  limit = 20,
  offset = 0,
): Promise<{ profiles: Profile[]; error: Error | null }> => {
  try {
    const { data, error } = await supabase.rpc('get_likes_you', {
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('[LikesYou] Supabase error:', error.message);
      return { profiles: [], error: new Error(error.message) };
    }

    if (!data || data.length === 0) {
      return { profiles: [], error: null };
    }

    const profiles: Profile[] = (data as {
      id: string; name: string; age: number; role: string; specialty: string;
      sub_specialty: string | null; images: string[]; verified: boolean; swiped_at: string;
    }[]).map((row) => ({
      id: row.id,
      name: row.name,
      age: row.age,
      role: row.role as MedicalRole,
      specialty: row.specialty as Specialty,
      subSpecialty: row.sub_specialty || '',
      hospital: '',
      institutionHidden: true,
      bio: '',
      education: '',
      images: row.images || [],
      verified: row.verified,
      interests: [],
      personalityTags: [],
      hasLikedUser: true,
      distance: 0,
      location: '',
      isLocationHidden: true,
      lastActive: 0,
      isOnlineHidden: true,
      isAvailable: false,
      readReceiptsEnabled: false,
      stories: [],
      storyPrivacy: 'ALL_MATCHES',
      genderPreference: 'EVERYONE',
      university: '',
      city: '',
    }));

    return { profiles, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Beğenenler yüklenemedi');
    console.error('[LikesYou] Supabase unavailable:', err);
    return { profiles: [], error };
  }
};
