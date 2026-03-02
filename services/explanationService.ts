/**
 * VITALIS "Neden Eşleştik" Explanation Engine
 *
 * DSA Article 27 uyumlu açıklama motoru.
 * Tüm faktörler YALNIZCA kullanıcının açıkça paylaştığı bilgilere dayanır.
 * Fotoğraf analizi, embedding inference veya hassas veri çıkarımı YAPILMAZ.
 */

import { supabase } from '../src/lib/supabase';
import { Profile, MedicalRole, Specialty } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FactorKey =
  | 'dating_intention'
  | 'profession'
  | 'work_schedule'
  | 'location'
  | 'values'
  | 'lifestyle'
  | 'interests'
  | 'dealbreaker'
  | 'specialty'
  | 'career_stage'
  | 'institution_type';

export type FactorCategory = 'primary' | 'secondary' | 'healthcare_specific';

export interface MatchExplanation {
  id: string;
  factorKey: FactorKey;
  category: FactorCategory;
  text: string;
  icon: string;           // emoji icon
  iconColor: string;      // tailwind color class
  priority: number;       // 0-100, higher = show first
  adjustable: boolean;
  adjustPath: string;     // in-app route to edit this factor
  details?: string[];     // e.g. ['Seyahat', 'Müzik', 'Yemek']
}

export interface ExplanationResult {
  topReasons: MatchExplanation[];       // Max 3, shown on card
  allReasons: MatchExplanation[];       // All matched factors for detail sheet
  personalized: boolean;
  generatedAt: number;
}

interface FactorMatchResult {
  matched: boolean;
  strength: number;       // 0-1
  text: string;
  details?: string[];
}

interface FactorConfig {
  key: FactorKey;
  category: FactorCategory;
  baseWeight: number;     // 0-100
  icon: string;
  iconColor: string;
  adjustPath: string;
  adjustable: boolean;
}

// ── Factor Registry ───────────────────────────────────────────────────────────

const FACTOR_REGISTRY: FactorConfig[] = [
  { key: 'dating_intention', category: 'primary',             baseWeight: 90, icon: '❤️', iconColor: 'text-rose-400',    adjustPath: '/settings/preferences#intention',  adjustable: true  },
  { key: 'profession',       category: 'healthcare_specific', baseWeight: 70, icon: '🏥', iconColor: 'text-blue-400',    adjustPath: '/settings/preferences#profession', adjustable: true  },
  { key: 'work_schedule',    category: 'primary',             baseWeight: 75, icon: '⏰', iconColor: 'text-amber-400',   adjustPath: '/settings/preferences#schedule',   adjustable: true  },
  { key: 'location',         category: 'primary',             baseWeight: 65, icon: '📍', iconColor: 'text-emerald-400', adjustPath: '/settings/preferences#location',   adjustable: true  },
  { key: 'specialty',        category: 'healthcare_specific', baseWeight: 60, icon: '🩺', iconColor: 'text-cyan-400',    adjustPath: '/profile/specialty',               adjustable: true  },
  { key: 'career_stage',     category: 'healthcare_specific', baseWeight: 50, icon: '🎓', iconColor: 'text-violet-400',  adjustPath: '/profile/career',                  adjustable: false },
  { key: 'institution_type', category: 'healthcare_specific', baseWeight: 45, icon: '🏢', iconColor: 'text-indigo-400',  adjustPath: '/profile/institution',             adjustable: false },
  { key: 'values',           category: 'secondary',           baseWeight: 55, icon: '💫', iconColor: 'text-purple-400',  adjustPath: '/profile/values',                  adjustable: true  },
  { key: 'lifestyle',        category: 'secondary',           baseWeight: 50, icon: '🌿', iconColor: 'text-green-400',   adjustPath: '/profile/lifestyle',               adjustable: true  },
  { key: 'interests',        category: 'secondary',           baseWeight: 55, icon: '⭐', iconColor: 'text-yellow-400',  adjustPath: '/profile/interests',               adjustable: true  },
  { key: 'dealbreaker',      category: 'primary',             baseWeight: 80, icon: '✅', iconColor: 'text-teal-400',    adjustPath: '/settings/dealbreakers',           adjustable: true  },
];

// ── Anti-creepy Filter ────────────────────────────────────────────────────────

const BLOCKED_PHRASES = [
  'aynı yaşta', 'aynı yaşın', 'yaşınız aynı',
  'fotoğraf', 'foto', 'görünüm', 'fizik', 'boy', 'kilo',
  'çevrimiçi saat', 'aktif saat', 'gece aktif',
  'embedding', 'benzerlik skoru', 'ai skoru',
  'aynı apartman', 'aynı bina', 'komşu',
];

const isCreepy = (text: string): boolean => {
  const lower = text.toLowerCase();
  return BLOCKED_PHRASES.some(phrase => lower.includes(phrase));
};

// ── Factor Matching Functions ─────────────────────────────────────────────────

const matchDatingIntention = (a: Profile, b: Profile): FactorMatchResult => {
  if (!a.lookingFor || !b.lookingFor) return { matched: false, strength: 0, text: '' };

  const intentionMap: Record<string, string[]> = {
    SERIOUS: ['SERIOUS'],
    FRIENDSHIP: ['FRIENDSHIP'],
    OPEN: ['OPEN', 'SERIOUS', 'FRIENDSHIP'],
  };

  const compatible = intentionMap[a.lookingFor]?.includes(b.lookingFor) ?? false;
  const exact = a.lookingFor === b.lookingFor;

  if (!compatible) return { matched: false, strength: 0, text: '' };

  const textMap: Record<string, string> = {
    SERIOUS: 'İkiniz de ciddi bir ilişki arıyorsunuz',
    FRIENDSHIP: 'İkiniz de önce arkadaşlık istiyorsunuz',
    OPEN: 'İlişki beklentileriniz uyumlu',
  };

  return {
    matched: true,
    strength: exact ? 1.0 : 0.7,
    text: textMap[a.lookingFor] ?? 'İlişki beklentileriniz uyumlu',
  };
};

const matchProfession = (a: Profile, b: Profile): FactorMatchResult => {
  if (!a.role || !b.role) return { matched: false, strength: 0, text: '' };

  const HEALTHCARE_ROLES = Object.values(MedicalRole);
  const bothHealthcare = HEALTHCARE_ROLES.includes(a.role) && HEALTHCARE_ROLES.includes(b.role);

  if (!bothHealthcare) return { matched: false, strength: 0, text: '' };

  if (a.role === b.role) {
    const roleLabelMap: Partial<Record<MedicalRole, string>> = {
      [MedicalRole.DOCTOR]: 'doktorsunuz',
      [MedicalRole.NURSE]: 'hemşiresiniz',
      [MedicalRole.PHARMACIST]: 'eczacısınız',
      [MedicalRole.PHYSIOTHERAPIST]: 'fizyoterapistsiniz',
      [MedicalRole.DENTIST]: 'diş hekimisiniz',
      [MedicalRole.DIETITIAN]: 'diyetisyensiniz',
    };
    const label = roleLabelMap[a.role] ?? 'sağlık çalışanısınız';
    return { matched: true, strength: 1.0, text: `İkiniz de ${label}` };
  }

  // Related role groups
  const CLINICAL_ROLES = new Set([MedicalRole.DOCTOR, MedicalRole.NURSE, MedicalRole.PHYSIOTHERAPIST]);
  const PHARMACY_ROLES = new Set([MedicalRole.PHARMACIST, MedicalRole.DIETITIAN]);

  const sameGroup = (CLINICAL_ROLES.has(a.role) && CLINICAL_ROLES.has(b.role)) ||
                    (PHARMACY_ROLES.has(a.role) && PHARMACY_ROLES.has(b.role));

  return {
    matched: true,
    strength: sameGroup ? 0.8 : 0.6,
    text: 'İkiniz de sağlık sektöründe çalışıyorsunuz',
  };
};

const matchWorkSchedule = (a: Profile, b: Profile): FactorMatchResult => {
  if (!a.shiftFrequency || !b.shiftFrequency) return { matched: false, strength: 0, text: '' };

  // Night shift compatibility
  const nightShifters = new Set(['WEEKLY_3_4', 'DAILY']);
  const bothNight = nightShifters.has(a.shiftFrequency) && nightShifters.has(b.shiftFrequency);

  if (a.shiftFrequency === b.shiftFrequency) {
    const textMap: Record<string, string> = {
      NONE: 'Çalışma saatleriniz uyumlu',
      WEEKLY_1_2: 'Benzer çalışma düzeniniz var',
      WEEKLY_3_4: 'Gece nöbetlerinin zorluğunu ikiniz de biliyorsunuz',
      DAILY: 'İkiniz de yoğun vardiya çalışıyorsunuz',
    };
    return {
      matched: true,
      strength: 1.0,
      text: textMap[a.shiftFrequency] ?? 'Çalışma saatleriniz uyumlu',
    };
  }

  if (bothNight) {
    return { matched: true, strength: 0.8, text: 'İkiniz de vardiyalı çalışıyorsunuz, birbirinizi anlarsınız' };
  }

  // Workstyle match
  if (a.workStyle && b.workStyle && a.workStyle === b.workStyle) {
    const wsMap: Record<string, string> = {
      FULL_TIME: 'Çalışma saatleriniz uyumlu',
      PART_TIME: 'Benzer çalışma düzeniniz var',
      FREELANCE: 'Esnek çalışma düzeniniz uyumlu',
      ACADEMIC: 'Akademik çevrelerde çalışıyorsunuz',
    };
    return {
      matched: true,
      strength: 0.7,
      text: wsMap[a.workStyle] ?? 'Çalışma saatleriniz uyumlu',
    };
  }

  return { matched: false, strength: 0, text: '' };
};

const matchLocation = (a: Profile, b: Profile): FactorMatchResult => {
  if (b.isLocationHidden) return { matched: false, strength: 0, text: '' };

  const dist = b.distance;
  if (typeof dist !== 'number') return { matched: false, strength: 0, text: '' };

  if (dist < 5) {
    return { matched: true, strength: 1.0, text: `Birbirinize ${dist} km mesafedesiniz` };
  }
  if (dist < 15) {
    return { matched: true, strength: 0.9, text: `Birbirinize yakın mesafedesiniz` };
  }
  if (a.city && b.city && a.city === b.city) {
    return { matched: true, strength: 0.7, text: 'Aynı şehirdesiniz' };
  }
  if (dist < 50) {
    return { matched: true, strength: 0.5, text: 'Aynı bölgedesiniz' };
  }

  return { matched: false, strength: 0, text: '' };
};

const matchSpecialty = (a: Profile, b: Profile): FactorMatchResult => {
  if (!a.specialty || !b.specialty) return { matched: false, strength: 0, text: '' };

  if (a.specialty === b.specialty) {
    return {
      matched: true,
      strength: 1.0,
      text: `İkiniz de ${a.specialty} alanında çalışıyorsunuz`,
    };
  }

  // Related specialty groups
  const INTERNAL_SPECIALTIES = new Set([
    Specialty.CARDIOLOGY, Specialty.NEUROLOGY, Specialty.PEDIATRICS,
    Specialty.DERMATOLOGY, Specialty.PSYCHIATRY, Specialty.RADIOLOGY,
  ]);
  const SURGICAL_SPECIALTIES = new Set([
    Specialty.SURGERY, Specialty.ANESTHESIOLOGY,
  ]);
  const ALLIED_HEALTH = new Set([
    Specialty.NURSING, Specialty.PHYSIOTHERAPY, Specialty.PHARMACY,
    Specialty.DIETETICS, Specialty.DENTISTRY,
  ]);

  const sameGroup = (INTERNAL_SPECIALTIES.has(a.specialty) && INTERNAL_SPECIALTIES.has(b.specialty)) ||
                    (SURGICAL_SPECIALTIES.has(a.specialty) && SURGICAL_SPECIALTIES.has(b.specialty)) ||
                    (ALLIED_HEALTH.has(a.specialty) && ALLIED_HEALTH.has(b.specialty));

  if (sameGroup) {
    return {
      matched: true,
      strength: 0.7,
      text: 'İkiniz de dahili branslarda çalışıyorsunuz',
    };
  }

  return { matched: false, strength: 0, text: '' };
};

const matchCareerStage = (a: Profile, b: Profile): FactorMatchResult => {
  if (!a.experienceYears || !b.experienceYears) return { matched: false, strength: 0, text: '' };

  const getStage = (years: number): string => {
    if (years <= 2) return 'intern';
    if (years <= 5) return 'resident';
    if (years <= 12) return 'specialist';
    return 'senior';
  };

  const stageA = getStage(a.experienceYears);
  const stageB = getStage(b.experienceYears);

  if (stageA === stageB) {
    return { matched: true, strength: 0.8, text: 'Kariyerinizde benzer aşamadasınız' };
  }

  // Adjacent stages also ok
  const stages = ['intern', 'resident', 'specialist', 'senior'];
  const diff = Math.abs(stages.indexOf(stageA) - stages.indexOf(stageB));
  if (diff === 1) {
    return { matched: true, strength: 0.5, text: 'Kariyer aşamalarınız birbirine yakın' };
  }

  return { matched: false, strength: 0, text: '' };
};

const matchValues = (a: Profile, b: Profile): FactorMatchResult => {
  // Values proxied through lookingFor + lifestyle fields
  // Both want serious/long-term → both value commitment
  if (a.lookingFor === 'SERIOUS' && b.lookingFor === 'SERIOUS') {
    return { matched: true, strength: 0.8, text: 'İkiniz de aileyi ön planda tutuyorsunuz' };
  }
  // Both have similar experience/academic → career values
  if (a.experienceYears && b.experienceYears) {
    const diff = Math.abs(a.experienceYears - b.experienceYears);
    if (diff <= 2 && a.experienceYears >= 5) {
      return { matched: true, strength: 0.6, text: 'Kariyer hedefleriniz benzer' };
    }
  }
  return { matched: false, strength: 0, text: '' };
};

const matchLifestyle = (a: Profile, b: Profile): FactorMatchResult => {
  if (!a.smoking || !b.smoking || !a.drinking || !b.drinking) {
    return { matched: false, strength: 0, text: '' };
  }

  const smokingMatch = a.smoking === b.smoking;
  const drinkingMatch = a.drinking === b.drinking;

  if (smokingMatch && a.smoking === 'NO') {
    if (drinkingMatch && a.drinking === 'NO') {
      return { matched: true, strength: 1.0, text: 'İkiniz de sigara ve alkol kullanmıyor' };
    }
    return { matched: true, strength: 0.8, text: 'İkiniz de sigara kullanmıyor' };
  }

  if (smokingMatch && drinkingMatch) {
    return { matched: true, strength: 0.7, text: 'Yaşam tarzlarınız uyumlu' };
  }

  if (drinkingMatch) {
    const textMap: Record<string, string> = {
      NO: 'İkiniz de alkol kullanmıyor',
      SOCIAL: 'İkiniz de sosyal içki tercih ediyor',
      YES: 'Yaşam tercihleri uyumlu',
    };
    return { matched: true, strength: 0.6, text: textMap[a.drinking] ?? 'Yaşam tarzlarınız uyumlu' };
  }

  return { matched: false, strength: 0, text: '' };
};

const matchInterests = (a: Profile, b: Profile): FactorMatchResult => {
  if (!a.interests?.length || !b.interests?.length) return { matched: false, strength: 0, text: '' };

  const common = a.interests.filter(i => b.interests.includes(i));
  if (common.length < 2) return { matched: false, strength: 0, text: '' };

  const topThree = common.slice(0, 3);
  const strength = Math.min(1.0, common.length / 5);

  let text: string;
  if (common.length === 2) {
    text = `${common.length} ortak ilgi alanınız var`;
  } else {
    text = `${common.length} ortak ilgi alanınız var`;
  }

  return { matched: true, strength, text, details: topThree };
};

const matchDealbreaker = (a: Profile, b: Profile): FactorMatchResult => {
  // We check smoking/drinking dealbreakers via lifestyle
  // Here we check lookingFor compatibility as dealbreaker
  if (!a.lookingFor || !b.lookingFor) return { matched: false, strength: 0, text: '' };

  // SERIOUS + OPEN = compatible (no dealbreaker)
  // SERIOUS + FRIENDSHIP = dealbreaker
  if (
    (a.lookingFor === 'SERIOUS' && b.lookingFor === 'FRIENDSHIP') ||
    (a.lookingFor === 'FRIENDSHIP' && b.lookingFor === 'SERIOUS')
  ) {
    return { matched: false, strength: 0, text: '' };
  }

  return { matched: true, strength: 0.9, text: 'Önemli konularda uyumlusunuz' };
};

const matchInstitutionType = (a: Profile, b: Profile): FactorMatchResult => {
  // Proxy: both at same hospital type based on role/education
  if (!a.university || !b.university) return { matched: false, strength: 0, text: '' };

  const isUni = (p: Profile) => {
    const h = (p.hospital ?? '').toLowerCase();
    return h.includes('üniversite') || h.includes('university') || h.includes('tıp fakültesi');
  };

  if (isUni(a) && isUni(b)) {
    return { matched: true, strength: 0.7, text: 'İkiniz de üniversite hastanesinde çalışıyorsunuz' };
  }

  return { matched: false, strength: 0, text: '' };
};

// ── Explanation Engine ────────────────────────────────────────────────────────

const FACTOR_MATCHERS: Record<FactorKey, (a: Profile, b: Profile) => FactorMatchResult> = {
  dating_intention: matchDatingIntention,
  profession: matchProfession,
  work_schedule: matchWorkSchedule,
  location: matchLocation,
  specialty: matchSpecialty,
  career_stage: matchCareerStage,
  institution_type: matchInstitutionType,
  values: matchValues,
  lifestyle: matchLifestyle,
  interests: matchInterests,
  dealbreaker: matchDealbreaker,
};

const getUserWeights = async (userId: string): Promise<Record<string, number>> => {
  const { data } = await supabase
    .from('user_factor_weights')
    .select('factor_key,weight_multiplier,is_disabled')
    .eq('user_id', userId);

  const weights: Record<string, number> = {};
  for (const row of data ?? []) {
    weights[row.factor_key as string] = (row.is_disabled as boolean) ? 0 : (row.weight_multiplier as number);
  }
  return weights;
};

const diversifyReasons = (reasons: MatchExplanation[], max: number): MatchExplanation[] => {
  const categoryCounts: Record<string, number> = {};
  const selected: MatchExplanation[] = [];

  for (const r of reasons) {
    const catCount = categoryCounts[r.category] ?? 0;
    if (catCount >= 2) continue; // Max 2 from same category
    selected.push(r);
    categoryCounts[r.category] = catCount + 1;
    if (selected.length >= max) break;
  }

  return selected;
};

export const generateExplanations = async (
  currentUser: Profile,
  targetProfile: Profile,
  personalized = true,
): Promise<ExplanationResult> => {
  const weights: Record<string, number> = personalized
    ? await getUserWeights(currentUser.id).catch((): Record<string, number> => ({}))
    : {};

  const allReasons: MatchExplanation[] = [];

  for (const cfg of FACTOR_REGISTRY) {
    const matcher = FACTOR_MATCHERS[cfg.key];
    if (!matcher) continue;

    // Check if disabled by user
    const userWeight = weights[cfg.key] ?? 1.0;
    if (userWeight === 0) continue;

    const result = matcher(currentUser, targetProfile);
    if (!result.matched || !result.text) continue;

    // Anti-creepy filter
    if (isCreepy(result.text)) continue;

    const priority = Math.round(cfg.baseWeight * result.strength * userWeight);

    allReasons.push({
      id: `${cfg.key}_${targetProfile.id}`,
      factorKey: cfg.key,
      category: cfg.category,
      text: result.text,
      icon: cfg.icon,
      iconColor: cfg.iconColor,
      priority,
      adjustable: cfg.adjustable,
      adjustPath: cfg.adjustPath,
      details: result.details,
    });
  }

  // Sort by priority descending
  allReasons.sort((a, b) => b.priority - a.priority);

  // Select top 3 with diversity
  const topReasons = diversifyReasons(allReasons, 3);

  // Async audit log (fire-and-forget, don't block UI)
  void logExplanationAudit(currentUser.id, targetProfile.id, topReasons, weights).catch(() => {/* silent */});

  return {
    topReasons,
    allReasons,
    personalized,
    generatedAt: Date.now(),
  };
};

// ── Factor Weights CRUD ──────────────────────────────────────────────────────

export const getFactorWeights = async (): Promise<{
  weights: Record<string, { multiplier: number; disabled: boolean }>;
  error: Error | null;
}> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { weights: {}, error: new Error('Oturum açık değil') };

  const { data, error } = await supabase
    .from('user_factor_weights')
    .select('factor_key,weight_multiplier,is_disabled')
    .eq('user_id', authData.user.id);

  if (error) return { weights: {}, error: error as unknown as Error };

  const weights: Record<string, { multiplier: number; disabled: boolean }> = {};
  for (const row of data ?? []) {
    weights[row.factor_key as string] = {
      multiplier: row.weight_multiplier as number,
      disabled: row.is_disabled as boolean,
    };
  }
  return { weights, error: null };
};

export const setFactorWeight = async (
  factorKey: FactorKey,
  multiplier: number,
  disabled = false,
): Promise<{ error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Oturum açık değil') };

  const clamped = Math.max(0.1, Math.min(2.0, multiplier));

  const { error } = await supabase
    .from('user_factor_weights')
    .upsert({
      user_id: authData.user.id,
      factor_key: factorKey,
      weight_multiplier: clamped,
      is_disabled: disabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,factor_key' });

  return { error: error ? (error as unknown as Error) : null };
};

// ── Feedback (More/Less Like This) ────────────────────────────────────────────

export const submitFactorFeedback = async (
  factorKey: FactorKey,
  feedbackType: 'more_like_this' | 'less_like_this',
  contextMatchId?: string,
): Promise<{ error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Oturum açık değil') };

  // Insert feedback
  const { error: fbErr } = await supabase.from('user_preference_feedback').insert({
    user_id: authData.user.id,
    factor_key: factorKey,
    feedback_type: feedbackType,
    context_match_id: contextMatchId ?? null,
  });
  if (fbErr) return { error: fbErr as unknown as Error };

  // Update weight: +10% for more, -10% for less
  const { data: existing } = await supabase
    .from('user_factor_weights')
    .select('weight_multiplier,is_disabled')
    .eq('user_id', authData.user.id)
    .eq('factor_key', factorKey)
    .maybeSingle();

  const currentWeight = (existing?.weight_multiplier as number) ?? 1.0;
  const newWeight = feedbackType === 'more_like_this'
    ? Math.min(2.0, currentWeight * 1.1)
    : Math.max(0.1, currentWeight * 0.9);

  const { error: wErr } = await supabase
    .from('user_factor_weights')
    .upsert({
      user_id: authData.user.id,
      factor_key: factorKey,
      weight_multiplier: parseFloat(newWeight.toFixed(2)),
      is_disabled: existing?.is_disabled ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,factor_key' });

  return { error: wErr ? (wErr as unknown as Error) : null };
};

// ── DSA Opt-out ───────────────────────────────────────────────────────────────

export const setPersonalizedRecommendations = async (enabled: boolean): Promise<{ error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Oturum açık değil') };

  const { error } = await supabase
    .from('profiles')
    .update({ personalized_recommendations: enabled })
    .eq('id', authData.user.id);

  return { error: error ? (error as unknown as Error) : null };
};

// ── Audit Log ────────────────────────────────────────────────────────────────

const logExplanationAudit = async (
  userId: string,
  targetUserId: string,
  explanations: MatchExplanation[],
  weights: Record<string, number>,
): Promise<void> => {
  await supabase.from('explanation_audit_log').insert({
    user_id: userId,
    target_user_id: targetUserId,
    factors_used: explanations.map(e => e.factorKey),
    templates_used: explanations.map(e => e.text),
    user_weights: weights,
    personalized: Object.keys(weights).length > 0,
  });
};

// ── Factor Metadata (for UI rendering) ───────────────────────────────────────

export const FACTOR_META: Record<FactorKey, { label: string; description: string; icon: string; category: FactorCategory }> = {
  dating_intention: { label: 'İlişki Amacı', description: 'İkiiniz de ne tür bir ilişki aradığınızı belirtmişsiniz.',        icon: '❤️', category: 'primary' },
  profession:       { label: 'Meslek',        description: 'Her ikiniz de sağlık sektöründe çalışıyorsunuz.',                 icon: '🏥', category: 'healthcare_specific' },
  work_schedule:    { label: 'Çalışma Düzeni', description: 'Çalışma saatleriniz ve nöbet düzeniniz karşılaştırılıyor.',      icon: '⏰', category: 'primary' },
  location:         { label: 'Konum',          description: 'Paylaştığınız şehir ve mesafe bilgisi kullanılıyor.',             icon: '📍', category: 'primary' },
  specialty:        { label: 'Uzmanlık',       description: 'Seçtiğiniz tıbbi uzmanlık alanı karşılaştırılıyor.',             icon: '🩺', category: 'healthcare_specific' },
  career_stage:     { label: 'Kariyer Aşaması', description: 'Deneyim yıllarınıza göre kariyer aşaması tahmin ediliyor.',    icon: '🎓', category: 'healthcare_specific' },
  institution_type: { label: 'Kurum Türü',     description: 'Çalıştığınız kurum türü karşılaştırılıyor.',                    icon: '🏢', category: 'healthcare_specific' },
  values:           { label: 'Değerler',       description: 'İlişki beklentiniz ve kariyer önceliğiniz karşılaştırılıyor.',  icon: '💫', category: 'secondary' },
  lifestyle:        { label: 'Yaşam Tarzı',    description: 'Sigara/alkol tercihleriniz karşılaştırılıyor.',                 icon: '🌿', category: 'secondary' },
  interests:        { label: 'İlgi Alanları',  description: 'Profilinize eklediğiniz hobiler karşılaştırılıyor.',            icon: '⭐', category: 'secondary' },
  dealbreaker:      { label: 'Uyumluluk',      description: 'Temel beklentilerinizin çakışıp çakışmadığı kontrol ediliyor.', icon: '✅', category: 'primary' },
};
