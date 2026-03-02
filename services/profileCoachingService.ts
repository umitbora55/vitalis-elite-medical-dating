/**
 * VITALIS Profile Coaching Service — Özellik 6: Etik Monetizasyon
 *
 * Human-powered profile review service.
 *
 * Flow:
 *   1. User purchases COACHING_ONCE or has PREMIUM_COACHING subscription
 *   2. createRequest() → pending
 *   3. Internal staff picks up → in_review
 *   4. Staff fills in feedback fields → completed (48h SLA)
 *   5. User views their coaching report
 */

import { supabase } from '../src/lib/supabase';
import type { ProfileCoachingRequest } from '../types';

// ── Scoring helpers ────────────────────────────────────────────────────────────

/** Describe score as label + color class */
export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 8.5) return { label: 'Mükemmel', color: 'text-emerald-400' };
  if (score >= 7.0) return { label: 'İyi',       color: 'text-blue-400' };
  if (score >= 5.5) return { label: 'Orta',      color: 'text-amber-400' };
  return              { label: 'Gelişmeli',  color: 'text-red-400' };
}

/** Format SLA deadline to remaining time label */
export function formatSLARemaining(slaDeadline: string | null): string {
  if (!slaDeadline) return '';
  const remaining = new Date(slaDeadline).getTime() - Date.now();
  if (remaining <= 0) return 'Süresi doldu';
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const mins  = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}s ${mins}dk içinde`;
  return `${mins} dakika içinde`;
}

// ── Core Service ───────────────────────────────────────────────────────────────

export const profileCoachingService = {

  /**
   * Create a new coaching request for the current user.
   * The DB RPC inserts the row and sets a 48h SLA deadline.
   */
  async createRequest(): Promise<{ requestId: string | null; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { requestId: null, error: 'Oturum bulunamadı.' };

    // Check for existing pending/in_review request (prevent duplicates)
    const { data: existing } = await supabase
      .from('profile_coaching_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'in_review'])
      .maybeSingle();

    if (existing) {
      return { requestId: (existing as { id: string }).id, error: null };
    }

    const { data, error } = await supabase.rpc('create_coaching_request', {
      p_user_id: user.id,
    });

    if (error) return { requestId: null, error: 'Koçluk talebi oluşturulamadı.' };
    return { requestId: data as string, error: null };
  },

  /**
   * Get the most recent coaching request for the current user.
   */
  async getLatestRequest(): Promise<ProfileCoachingRequest | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('profile_coaching_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? (data as ProfileCoachingRequest) : null;
  },

  /**
   * Get all coaching requests for the current user.
   */
  async listRequests(): Promise<ProfileCoachingRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('profile_coaching_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return (data ?? []) as ProfileCoachingRequest[];
  },

  /**
   * Check if user has a completed report they haven't viewed yet.
   */
  async hasUnreadReport(): Promise<boolean> {
    const latest = await this.getLatestRequest();
    return latest?.status === 'completed' && !latest.coach_notes?.includes('[VIEWED]');
  },
};
