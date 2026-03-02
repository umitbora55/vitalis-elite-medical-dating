/**
 * Auto-Restriction Service — Repeated report threshold enforcement
 *
 * Applies automatic shadow limits based on distinct reporter counts.
 * Thresholds (DB trigger handles the main logic; this service provides
 * client-side access for admin panel and manual operations):
 *
 *   3 distinct reporters in 24h   → 24h shadow_limit
 *   5 distinct reporters in 7d    → 72h shadow_limit + discovery_hidden
 *   10+ reporters in 30d          → Permanent shadow (requires admin review)
 */

import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutoRestrictionType = 'shadow_limit' | 'messaging_disabled' | 'discovery_hidden';
export type TriggerReason       = 'multiple_reports' | 'spam_detection' | 'abuse_pattern';
export type ReviewResult        = 'lifted' | 'extended' | 'permanent';

export interface AutoRestriction {
  id: string;
  user_id: string;
  restriction_type: AutoRestrictionType;
  trigger_reason: TriggerReason;
  trigger_count: number;
  trigger_reports: string[];
  applied_at: string;
  expires_at: string | null;
  is_active: boolean;
  reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_result: ReviewResult | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const autoRestrictionService = {

  /**
   * Manually check and apply auto-restriction for a user.
   * (The DB trigger runs automatically on INSERT to reports —
   *  this is a manual fallback for admin or edge cases.)
   */
  async checkAndApplyAutoRestriction(
    userId: string
  ): Promise<{ applied: boolean; restrictionType: AutoRestrictionType | null; error: string | null }> {
    // Count distinct reporters in various windows
    const [r24h, r7d, r30d] = await Promise.all([
      supabase
        .from('reports')
        .select('reporter_id', { count: 'estimated' })
        .eq('reported_user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      supabase
        .from('reports')
        .select('reporter_id', { count: 'estimated' })
        .eq('reported_user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
      supabase
        .from('reports')
        .select('reporter_id', { count: 'estimated' })
        .eq('reported_user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
    ]);

    const count24h = r24h.count ?? 0;
    const count7d  = r7d.count  ?? 0;
    const count30d = r30d.count ?? 0;

    // Check if already shadow-limited
    const { data: existing } = await supabase
      .from('auto_restrictions')
      .select('id, restriction_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    const activeTypes = (existing ?? []).map((r) => r.restriction_type as string);

    if (count30d >= 10 && !activeTypes.includes('shadow_limit')) {
      const { error } = await supabase.from('auto_restrictions').insert({
        user_id:          userId,
        restriction_type: 'shadow_limit',
        trigger_reason:   'multiple_reports',
        trigger_count:    count30d,
        expires_at:       null, // permanent until reviewed
      });
      return { applied: true, restrictionType: 'shadow_limit', error: error?.message ?? null };
    }

    if (count7d >= 5 && !activeTypes.includes('discovery_hidden')) {
      const { error } = await supabase.from('auto_restrictions').insert({
        user_id:          userId,
        restriction_type: 'discovery_hidden',
        trigger_reason:   'multiple_reports',
        trigger_count:    count7d,
        expires_at:       new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      });
      return { applied: true, restrictionType: 'discovery_hidden', error: error?.message ?? null };
    }

    if (count24h >= 3 && !activeTypes.includes('shadow_limit')) {
      const { error } = await supabase.from('auto_restrictions').insert({
        user_id:          userId,
        restriction_type: 'shadow_limit',
        trigger_reason:   'multiple_reports',
        trigger_count:    count24h,
        expires_at:       new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      return { applied: true, restrictionType: 'shadow_limit', error: error?.message ?? null };
    }

    return { applied: false, restrictionType: null, error: null };
  },

  /**
   * Get all active auto-restrictions for a user.
   */
  async getActiveRestrictions(userId: string): Promise<AutoRestriction[]> {
    const { data } = await supabase
      .from('auto_restrictions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('applied_at', { ascending: false });

    return (data ?? []) as AutoRestriction[];
  },

  /**
   * Admin: lift a specific auto-restriction.
   */
  async liftRestriction(
    restrictionId: string,
    reviewedBy: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('auto_restrictions')
      .update({
        is_active:     false,
        reviewed:      true,
        reviewed_at:   new Date().toISOString(),
        reviewed_by:   reviewedBy,
        review_result: 'lifted',
      })
      .eq('id', restrictionId);

    return { error: error?.message ?? null };
  },

  /**
   * Admin: extend a restriction by N hours.
   */
  async extendRestriction(
    restrictionId: string,
    additionalHours: number,
    reviewedBy: string
  ): Promise<{ error: string | null }> {
    const { data: current, error: fetchErr } = await supabase
      .from('auto_restrictions')
      .select('expires_at')
      .eq('id', restrictionId)
      .single();

    if (fetchErr || !current) return { error: fetchErr?.message ?? 'Not found' };

    const base = current.expires_at
      ? new Date(current.expires_at as string)
      : new Date();

    const newExpiry = new Date(base.getTime() + additionalHours * 3_600_000);

    const { error } = await supabase
      .from('auto_restrictions')
      .update({
        expires_at:    newExpiry.toISOString(),
        reviewed:      true,
        reviewed_at:   new Date().toISOString(),
        reviewed_by:   reviewedBy,
        review_result: 'extended',
      })
      .eq('id', restrictionId);

    return { error: error?.message ?? null };
  },

  /**
   * Admin: get all un-reviewed restrictions.
   */
  async getPendingReview(): Promise<AutoRestriction[]> {
    const { data } = await supabase
      .from('auto_restrictions')
      .select('*')
      .eq('reviewed', false)
      .eq('is_active', true)
      .order('applied_at', { ascending: true });

    return (data ?? []) as AutoRestriction[];
  },

  /**
   * Check if a user is shadow-limited (for discovery filtering).
   * This result is never surfaced to the end user.
   */
  async isShadowLimited(userId: string): Promise<boolean> {
    const { count } = await supabase
      .from('auto_restrictions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('restriction_type', 'shadow_limit');

    return (count ?? 0) > 0;
  },

  /**
   * Expire stale restrictions (called periodically).
   */
  async expireOldRestrictions(): Promise<void> {
    await supabase
      .from('auto_restrictions')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString())
      .not('expires_at', 'is', null);
  },
};
