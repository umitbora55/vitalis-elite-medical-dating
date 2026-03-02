/**
 * VITALIS Date Concierge Service — Özellik 6: Etik Monetizasyon
 *
 * Premium date planning service: user submits preferences, concierge team
 * builds a personalised plan with venue, menu suggestions, conversation
 * starters, and backup options.
 *
 * Flow:
 *   1. User purchases CONCIERGE_ONCE (149 TL per date)
 *   2. createRequest() → pending
 *   3. Concierge team plans → planning → ready
 *   4. User accepts/requests changes
 *   5. Date happens → completed + rating
 */

import { supabase } from '../src/lib/supabase';
import type { DateConciergeRequest } from '../types';

// ── Date type catalogue ────────────────────────────────────────────────────────

export interface ConciergeActivity {
  type:         string;
  label:        string;
  emoji:        string;
  description:  string;
  durationHint: string;
}

export const CONCIERGE_ACTIVITIES: ConciergeActivity[] = [
  {
    type:         'dinner',
    label:        'Akşam Yemeği',
    emoji:        '🍽️',
    description:  'Sakin, romantik atmosferde yemek',
    durationHint: '60–90 dk',
  },
  {
    type:         'coffee',
    label:        'Kahve',
    emoji:        '☕',
    description:  'Keyifli ve rahat bir buluşma',
    durationHint: '45–60 dk',
  },
  {
    type:         'activity',
    label:        'Aktivite',
    emoji:        '🎳',
    description:  'Bowling, escape room veya sergi',
    durationHint: '90–120 dk',
  },
  {
    type:         'walk',
    label:        'Yürüyüş',
    emoji:        '🌳',
    description:  'Park veya sahil yürüyüşü',
    durationHint: '45–60 dk',
  },
  {
    type:         'custom',
    label:        'Özel İstek',
    emoji:        '✨',
    description:  'Kendi fikrin veya tercihini belirt',
    durationHint: 'Değişken',
  },
];

export const CONCIERGE_BUDGETS = [
  { value: 'under_200',  label: '200 TL altı',  emoji: '💛' },
  { value: '200_500',    label: '200–500 TL',   emoji: '🥈' },
  { value: 'over_500',   label: '500 TL üstü',  emoji: '💎' },
] as const;

// ── Plan status helpers ────────────────────────────────────────────────────────

export function conciergeStatusLabel(status: DateConciergeRequest['status']): string {
  switch (status) {
    case 'pending':    return 'Talep alındı';
    case 'planning':   return 'Plan hazırlanıyor';
    case 'ready':      return 'Plan hazır! ✨';
    case 'accepted':   return 'Plan onaylandı';
    case 'completed':  return 'Date tamamlandı';
    case 'cancelled':  return 'İptal edildi';
  }
}

export function conciergeStatusColor(status: DateConciergeRequest['status']): string {
  switch (status) {
    case 'pending':   return 'text-amber-400';
    case 'planning':  return 'text-blue-400';
    case 'ready':     return 'text-emerald-400';
    case 'accepted':  return 'text-emerald-400';
    case 'completed': return 'text-slate-400';
    case 'cancelled': return 'text-red-400';
  }
}

// ── Core Service ───────────────────────────────────────────────────────────────

export const dateConciergeService = {

  /**
   * Submit a new concierge request.
   */
  async createRequest(params: {
    matchId:         string | null;
    preferredDate:   string;    // YYYY-MM-DD
    timeRange:       string;    // e.g. "18:00-22:00"
    dateType:        string;
    budget:          DateConciergeRequest['budget'];
    specialRequests: string | null;
  }): Promise<{ requestId: string | null; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { requestId: null, error: 'Oturum bulunamadı.' };

    const { data, error } = await supabase.rpc('create_concierge_request', {
      p_user_id:         user.id,
      p_match_id:        params.matchId ?? null,
      p_preferred_date:  params.preferredDate,
      p_time_range:      params.timeRange,
      p_date_type:       params.dateType,
      p_budget:          params.budget,
      p_special_requests: params.specialRequests,
    });

    if (error) return { requestId: null, error: 'Concierge talebi oluşturulamadı.' };
    return { requestId: data as string, error: null };
  },

  /**
   * Get the most recent concierge request for the current user.
   */
  async getLatestRequest(): Promise<DateConciergeRequest | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('date_concierge_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? (data as DateConciergeRequest) : null;
  },

  /**
   * List all concierge requests for the current user.
   */
  async listRequests(): Promise<DateConciergeRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('date_concierge_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return (data ?? []) as DateConciergeRequest[];
  },

  /**
   * Accept the concierge's proposed plan.
   */
  async acceptPlan(requestId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('date_concierge_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('user_id', user.id);
  },

  /**
   * Submit rating after the date.
   */
  async submitRating(requestId: string, rating: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('date_concierge_requests')
      .update({
        status:     'completed',
        rating:     Math.max(1, Math.min(5, rating)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('user_id', user.id);
  },

  /**
   * Check if user has a pending/planning concierge request.
   */
  async hasActiveRequest(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { count } = await supabase
      .from('date_concierge_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'planning', 'ready', 'accepted']);

    return (count ?? 0) > 0;
  },
};
