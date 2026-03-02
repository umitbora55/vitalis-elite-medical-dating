import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserFilters {
  id?: string;
  user_id?: string;
  intent_filter: string[];
  profession_filter: string[];
  specialty_filter: string[];
  district_filter: string[];
  age_min: number;
  age_max: number;
  distance_km: number;
  verified_only: boolean;
}

export const DEFAULT_FILTERS: UserFilters = {
  intent_filter: [],
  profession_filter: [],
  specialty_filter: [],
  district_filter: [],
  age_min: 22,
  age_max: 45,
  distance_km: 50,
  verified_only: false,
};

// Premium-only filter keys — enforced on the UI layer
export const PREMIUM_ONLY_FILTERS: Array<keyof UserFilters> = [
  'specialty_filter',
  'district_filter',
];

// ─── Constants ────────────────────────────────────────────────────────────────

export const INTENT_OPTIONS = [
  { value: 'serious',     label: '💍 Ciddi İlişki' },
  { value: 'long_term',   label: '🤝 Uzun Vadeli' },
  { value: 'networking',  label: '💼 Networking' },
  { value: 'friendship',  label: '👋 Arkadaşlık' },
];

export const PROFESSION_OPTIONS = [
  { value: 'doctor',         label: 'Doktor' },
  { value: 'nurse',          label: 'Hemşire' },
  { value: 'pharmacist',     label: 'Eczacı' },
  { value: 'physiotherapist',label: 'Fizyoterapist' },
  { value: 'dentist',        label: 'Diş Hekimi' },
  { value: 'dietitian',      label: 'Diyetisyen' },
  { value: 'technician',     label: 'Sağlık Teknikeri' },
  { value: 'student',        label: 'Tıp Öğrencisi' },
];

export const SPECIALTY_OPTIONS = [
  { value: 'cardiology',      label: 'Kardiyoloji' },
  { value: 'neurology',       label: 'Nöroloji' },
  { value: 'surgery',         label: 'Genel Cerrahi' },
  { value: 'pediatrics',      label: 'Pediatri' },
  { value: 'dermatology',     label: 'Dermatoloji' },
  { value: 'anesthesiology',  label: 'Anestezi' },
  { value: 'radiology',       label: 'Radyoloji' },
  { value: 'emergency',       label: 'Acil Tıp' },
  { value: 'psychiatry',      label: 'Psikiyatri' },
  { value: 'physiotherapy',   label: 'Fizyoterapi' },
  { value: 'pharmacy',        label: 'Eczacılık' },
  { value: 'dentistry',       label: 'Diş Hekimliği' },
];

export const DISTRICT_OPTIONS = [
  'Beşiktaş', 'Kadıköy', 'Şişli', 'Beyoğlu', 'Üsküdar',
  'Bakırköy', 'Ataşehir', 'Maltepe', 'Sarıyer', 'Levent',
  'Taksim', 'Nişantaşı', 'Etiler', 'Bağcılar', 'Fatih',
  'Pendik', 'Kartal', 'Sultanbeyli', 'Başakşehir', 'Avcılar',
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const filterService = {
  /**
   * Load filters for a user. Returns defaults if none saved yet.
   */
  async getFilters(userId: string): Promise<UserFilters> {
    const { data, error } = await supabase
      .from('user_filters')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return { ...DEFAULT_FILTERS };
    return data as UserFilters;
  },

  /**
   * Upsert (save/update) filters for a user.
   */
  async saveFilters(userId: string, filters: UserFilters): Promise<void> {
    const { error } = await supabase
      .from('user_filters')
      .upsert(
        { user_id: userId, ...filters },
        { onConflict: 'user_id' },
      );

    if (error) throw new Error('Filtreler kaydedilemedi.');
  },

  /**
   * Reset filters to defaults.
   */
  async resetFilters(userId: string): Promise<void> {
    await filterService.saveFilters(userId, DEFAULT_FILTERS);
  },

  /**
   * Count active (non-default) filters for badge display.
   */
  countActiveFilters(filters: UserFilters): number {
    let count = 0;
    if (filters.intent_filter.length > 0)     count++;
    if (filters.profession_filter.length > 0) count++;
    if (filters.specialty_filter.length > 0)  count++;
    if (filters.district_filter.length > 0)   count++;
    if (filters.verified_only)                count++;
    if (filters.age_min !== DEFAULT_FILTERS.age_min || filters.age_max !== DEFAULT_FILTERS.age_max) count++;
    if (filters.distance_km !== DEFAULT_FILTERS.distance_km) count++;
    return count;
  },

  /**
   * Strip premium-only filters from a non-premium user.
   * Returns a safe copy of filters.
   */
  sanitizeForFree(filters: UserFilters): UserFilters {
    return {
      ...filters,
      specialty_filter: [],
      district_filter:  [],
    };
  },

  /**
   * Check if a specific filter key requires premium.
   */
  isPremiumFilter(key: keyof UserFilters): boolean {
    return (PREMIUM_ONLY_FILTERS as string[]).includes(key as string);
  },
};
