import { Profile } from '../types';
import { supabase } from '../src/lib/supabase';

const mapProfileToRow = (profile: Profile) => {
  return {
    name: profile.name,
    age: profile.age,
    role: profile.role,
    specialty: profile.specialty,
    sub_specialty: profile.subSpecialty || null,
    hospital: profile.hospital || null,
    education: profile.education || null,
    bio: profile.bio || null,
    location_city: profile.location || null,
    is_location_hidden: profile.isLocationHidden,
    is_online_hidden: profile.isOnlineHidden,
    institution_hidden: profile.institutionHidden,
    is_available: profile.isAvailable,
    availability_expires_at: profile.availabilityExpiresAt
      ? new Date(profile.availabilityExpiresAt).toISOString()
      : null,
    is_frozen: profile.isFrozen || false,
    freeze_reason: profile.freezeReason || null,
    theme_preference: profile.themePreference || 'SYSTEM',
    first_message_preference: profile.firstMessagePreference || 'ANYONE',
    last_active_at: new Date(profile.lastActive).toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const upsertProfile = async (profile: Profile) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { data: null, error: authError };
  if (!authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }

  return supabase
    .from('profiles')
    .upsert({ id: authData.user.id, ...mapProfileToRow(profile) })
    .select()
    .single();
};

export const getMyProfile = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { data: null, error: authError };
  if (!authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }

  return supabase.from('profiles').select('*').eq('id', authData.user.id).single();
};
