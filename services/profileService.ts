import { MedicalRole, Profile, Specialty } from '../types';
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
    // Tier 1
    gender_preference: profile.genderPreference || 'EVERYONE',
    university: profile.university || null,
    city: profile.city || null,
    // Tier 2
    graduation_year: profile.graduationYear || null,
    experience_years: profile.experienceYears || null,
    looking_for: profile.lookingFor || null,
    smoking: profile.smoking || null,
    drinking: profile.drinking || null,
    // Tier 3
    work_style: profile.workStyle || null,
    on_call_frequency: profile.shiftFrequency || null,
    lifestyle_preference: profile.livingStatus || null,
    salary_range: profile.salaryRange || null,
    abroad_experience: profile.abroadExperience ?? null,
    updated_at: new Date().toISOString(),
    verification_status: profile.verificationStatus ?? null,
    verification_method: profile.verificationMethod ?? null,
    user_role: profile.userRole ?? 'viewer',
    risk_flags: profile.riskFlags ?? {},
    suspended_until: profile.suspendedUntil ?? null,
  };
};

export const mapRowToProfile = (row: Record<string, unknown>, fallback: Profile): Profile => {
  const role = row.role;
  const specialty = row.specialty;
  const locationCity = row.location_city;
  const lastActiveAt = row.last_active_at;

  return {
    ...fallback,
    ...(typeof row.name === 'string' ? { name: row.name } : {}),
    ...(typeof row.age === 'number' ? { age: row.age } : {}),
    ...(typeof role === 'string' && Object.values(MedicalRole).includes(role as MedicalRole)
      ? { role: role as MedicalRole }
      : {}),
    ...(typeof specialty === 'string' && Object.values(Specialty).includes(specialty as Specialty)
      ? { specialty: specialty as Specialty }
      : {}),
    ...(typeof row.sub_specialty === 'string' ? { subSpecialty: row.sub_specialty } : {}),
    ...(typeof row.hospital === 'string' ? { hospital: row.hospital } : {}),
    ...(typeof row.bio === 'string' ? { bio: row.bio } : {}),
    ...(typeof row.education === 'string' ? { education: row.education } : {}),
    ...(typeof locationCity === 'string' ? { location: locationCity } : {}),
    ...(typeof row.city === 'string' ? { city: row.city } : {}),
    ...(typeof row.university === 'string' ? { university: row.university } : {}),
    ...(typeof row.verification_status === 'string' ? { verificationStatus: row.verification_status as Profile['verificationStatus'] } : {}),
    ...(typeof row.verification_method === 'string' ? { verificationMethod: row.verification_method as Profile['verificationMethod'] } : {}),
    ...(typeof row.user_role === 'string' ? { userRole: row.user_role as Profile['userRole'] } : {}),
    ...(typeof row.risk_flags === 'object' && row.risk_flags !== null ? { riskFlags: row.risk_flags as Record<string, unknown> } : {}),
    ...(typeof row.suspended_until === 'string' ? { suspendedUntil: row.suspended_until } : {}),
    ...(typeof row.is_frozen === 'boolean' ? { isFrozen: row.is_frozen } : {}),
    ...(typeof row.institution_hidden === 'boolean' ? { institutionHidden: row.institution_hidden } : {}),
    ...(typeof row.is_location_hidden === 'boolean' ? { isLocationHidden: row.is_location_hidden } : {}),
    ...(typeof row.is_online_hidden === 'boolean' ? { isOnlineHidden: row.is_online_hidden } : {}),
    ...(typeof row.is_available === 'boolean' ? { isAvailable: row.is_available } : {}),
    ...(typeof row.availability_expires_at === 'string'
      ? { availabilityExpiresAt: new Date(row.availability_expires_at).getTime() }
      : {}),
    ...(typeof lastActiveAt === 'string'
      ? { lastActive: new Date(lastActiveAt).getTime() }
      : {}),
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
