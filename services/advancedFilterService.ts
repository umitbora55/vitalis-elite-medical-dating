/**
 * VITALIS Advanced Filter Service — Özellik 6: Etik Monetizasyon
 *
 * Premium filter management: saving, loading, applying named filter sets.
 * Also exposes the full advanced filter option catalogue.
 */

import { supabase } from '../src/lib/supabase';
import type { AdvancedFilterPayload, SavedFilterSet } from '../types';

// ── Filter option catalogues ───────────────────────────────────────────────────

export interface FilterOption {
  value: string;
  label: string;
}

export const SMOKING_OPTIONS: FilterOption[] = [
  { value: 'no',        label: 'Kullanmaz' },
  { value: 'sometimes', label: 'Bazen' },
  { value: 'yes',       label: 'Kullanır' },
];

export const ALCOHOL_OPTIONS: FilterOption[] = [
  { value: 'no',        label: 'İçmez' },
  { value: 'sometimes', label: 'Sosyal' },
  { value: 'yes',       label: 'İçer' },
];

export const SPORT_OPTIONS: FilterOption[] = [
  { value: 'active',   label: 'Çok aktif' },
  { value: 'moderate', label: 'Orta düzey' },
  { value: 'none',     label: 'Pek değil' },
];

export const DIET_OPTIONS: FilterOption[] = [
  { value: 'vegan',      label: 'Vegan' },
  { value: 'vegetarian', label: 'Vejetaryen' },
  { value: 'omnivore',   label: 'Her şey yer' },
];

export const WANTS_CHILDREN_OPTIONS: FilterOption[] = [
  { value: 'yes',  label: 'İstiyor' },
  { value: 'no',   label: 'İstemiyor' },
  { value: 'open', label: 'Açık fikirli' },
];

export const CAREER_STAGE_OPTIONS: FilterOption[] = [
  { value: 'resident',    label: 'Asistan / Stajyer' },
  { value: 'specialist',  label: 'Uzman' },
  { value: 'professor',   label: 'Doçent / Profesör' },
];

export const INSTITUTION_TYPE_OPTIONS: FilterOption[] = [
  { value: 'public',      label: 'Devlet Hastanesi' },
  { value: 'private',     label: 'Özel Hastane / Klinik' },
  { value: 'university',  label: 'Üniversite Hastanesi' },
];

export const LAST_ACTIVE_OPTIONS: FilterOption[] = [
  { value: 'today',      label: 'Bugün aktif' },
  { value: 'this_week',  label: 'Bu hafta aktif' },
  { value: 'this_month', label: 'Bu ay aktif' },
];

/** Empty filter baseline */
export const EMPTY_FILTERS: AdvancedFilterPayload = {
  smoking:              null,
  alcohol:              null,
  sport:                null,
  diet:                 null,
  pets:                 null,
  height_min:           null,
  height_max:           null,
  wants_children:       null,
  profession_filter:    [],
  specialty_filter:     [],
  career_stage:         null,
  institution_type:     null,
  last_active:          null,
  profile_completeness: null,
  verified_only:        false,
};

/** Count how many filters are active (non-null / non-empty) */
export function countActiveFilters(f: AdvancedFilterPayload): number {
  let n = 0;
  if (f.smoking)              n++;
  if (f.alcohol)              n++;
  if (f.sport)                n++;
  if (f.diet)                 n++;
  if (f.pets !== null)        n++;
  if (f.height_min)           n++;
  if (f.height_max)           n++;
  if (f.wants_children)       n++;
  if (f.profession_filter?.length)  n++;
  if (f.specialty_filter?.length)   n++;
  if (f.career_stage)         n++;
  if (f.institution_type)     n++;
  if (f.last_active)          n++;
  if (f.profile_completeness) n++;
  if (f.verified_only)        n++;
  return n;
}

/** Smart suggestion: which filters could be relaxed to get more results? */
export function suggestFilterRelaxations(filters: AdvancedFilterPayload): Array<{
  field: string;
  suggestion: string;
  estimatedIncrease: number;
}> {
  const suggestions = [];

  if (filters.smoking === 'no') {
    suggestions.push({ field: 'smoking', suggestion: 'Sigara filtresini kaldır', estimatedIncrease: 30 });
  }
  if (filters.verified_only) {
    suggestions.push({ field: 'verified_only', suggestion: 'Doğrulama şartını kaldır', estimatedIncrease: 25 });
  }
  if (filters.last_active === 'today') {
    suggestions.push({ field: 'last_active', suggestion: '"Bugün aktif" → "Bu hafta aktif" yap', estimatedIncrease: 40 });
  }
  if (filters.wants_children === 'yes') {
    suggestions.push({ field: 'wants_children', suggestion: 'Çocuk tercihini esnet', estimatedIncrease: 20 });
  }
  if (filters.career_stage) {
    suggestions.push({ field: 'career_stage', suggestion: 'Kariyer aşaması filtresini kaldır', estimatedIncrease: 35 });
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}

// ── Core Service ───────────────────────────────────────────────────────────────

export const advancedFilterService = {

  /**
   * List saved filter sets for the current user.
   */
  async listFilterSets(): Promise<SavedFilterSet[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('saved_filter_sets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    return (data ?? []) as SavedFilterSet[];
  },

  /**
   * Get the currently active filter set (if any).
   */
  async getActiveFilterSet(): Promise<SavedFilterSet | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('saved_filter_sets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    return data ? (data as SavedFilterSet) : null;
  },

  /**
   * Save a filter set. Uses the DB RPC which enforces capability + limit checks.
   */
  async saveFilterSet(name: string, filters: AdvancedFilterPayload): Promise<{ id: string | null; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: null, error: 'Oturum bulunamadı.' };

    const { data, error } = await supabase.rpc('save_filter_set', {
      p_user_id: user.id,
      p_name:    name,
      p_filters: filters,
    });

    if (error) {
      if (error.message.includes('FILTERS_NOT_ALLOWED')) return { id: null, error: 'Gelişmiş filtreler için premium üyelik gereklidir.' };
      if (error.message.includes('FILTER_LIMIT'))        return { id: null, error: 'En fazla 10 filtre seti kaydedebilirsiniz.' };
      return { id: null, error: 'Filtre seti kaydedilemedi.' };
    }

    return { id: data as string, error: null };
  },

  /**
   * Apply a filter set (mark it as active, deactivate others).
   */
  async applyFilterSet(setId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Deactivate all
    await supabase
      .from('saved_filter_sets')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Activate selected
    await supabase
      .from('saved_filter_sets')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', setId)
      .eq('user_id', user.id);
  },

  /**
   * Delete a saved filter set.
   */
  async deleteFilterSet(setId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('saved_filter_sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', user.id);
  },

  /**
   * Upsert filters into the basic user_filters table (free-tier filters).
   */
  async updateBasicFilters(filters: {
    ageMin?: number;
    ageMax?: number;
    distanceKm?: number;
    intentFilter?: string[];
    verifiedOnly?: boolean;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_filters')
      .upsert(
        {
          user_id:          user.id,
          age_min:          filters.ageMin          ?? 22,
          age_max:          filters.ageMax          ?? 45,
          distance_km:      filters.distanceKm      ?? 50,
          intent_filter:    filters.intentFilter    ?? [],
          verified_only:    filters.verifiedOnly    ?? false,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
  },
};
