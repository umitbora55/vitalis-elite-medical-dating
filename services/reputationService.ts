import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReputationLevel = 'excellent' | 'good' | 'fair' | 'poor';
export type CancelTiming = 'normal' | 'late' | 'very_late';

export interface UserReputation {
  user_id: string;
  reliability_score: number;       // 0.00 – 1.00
  plan_completion_rate: number;     // 0.00 – 1.00
  no_show_count: number;
  cancel_count: number;
  late_cancel_count: number;
  late_cancel_count_2h: number;    // Very late (<2h)
  normal_cancel_count: number;     // Normal (24h+)
  report_count: number;
  positive_feedback_count: number;
  total_plans: number;
  completed_plans: number;
  last_calculated_at: string | null;
}

export interface ReputationImpact {
  score: number;
  level: ReputationLevel;
  visibilityMultiplier: number;
  cancelTiming?: CancelTiming;
  penaltyApplied?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Users with score < this are shown 50% less in discovery */
export const REDUCED_VISIBILITY_THRESHOLD = 0.5;

/** Users with score < this are shown 80% less */
export const SEVERELY_REDUCED_THRESHOLD = 0.3;

/** Users with score < this are excluded from daily picks entirely */
export const EXCLUDED_FROM_PICKS_THRESHOLD = 0.2;

// ─── Score adjustments ────────────────────────────────────────────────────────
const SCORE = {
  NORMAL_CANCEL:     -0.02,  // 24h+ before plan
  CANCEL:            -0.05,  // legacy (kept for compat)
  LATE_CANCEL:       -0.08,  // within 24h
  VERY_LATE_CANCEL:  -0.15,  // within 2h
  NO_SHOW:           -0.20,
  COMPLETED_PLAN:    +0.03,
  POSITIVE_FEEDBACK: +0.03,
} as const;

/** Hours threshold for "late cancel" (within 24h = late) */
const LATE_CANCEL_THRESHOLD_H = 24;
/** Hours threshold for "very late cancel" (within 2h = very late) */
const VERY_LATE_CANCEL_THRESHOLD_H = 2;

// ─── Service ──────────────────────────────────────────────────────────────────

export const reputationService = {

  /**
   * Get a user's reputation (admin/service-role only — not exposed to users).
   */
  async getReputation(userId: string): Promise<UserReputation | null> {
    const { data, error } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserReputation;
  },

  /**
   * Derive a human-readable level from score (admin use only).
   */
  getReputationLevel(score: number): ReputationLevel {
    if (score >= 0.85) return 'excellent';
    if (score >= 0.60) return 'good';
    if (score >= 0.40) return 'fair';
    return 'poor';
  },

  /**
   * Record a successful plan completion. Called after both parties confirmed.
   * Increments completed_plans + total_plans then recalculates.
   *
   * @param userId  – User who completed the plan
   * @param _planId – Plan ID (for audit trail)
   */
  async recordPlanCompletion(userId: string, _planId?: string): Promise<void> {
    const { error } = await supabase.rpc('rpc_reputation_plan_completed', {
      p_user_id: userId,
    });

    if (error) {
      // Fallback: direct update if RPC not available yet
      await reputationService._directIncrement(userId, {
        completed_plans: 1,
        total_plans:     1,
      });
    }

    await reputationService._recalculate(userId);
  },

  /**
   * Record a plan cancellation with tiered penalty based on timing.
   *
   * Tiers:
   *   - normal    (24h+):  -0.02
   *   - late     (<24h):  -0.08
   *   - very_late  (<2h):  -0.15
   *
   * @param userId          – User who cancelled
   * @param _planId         – Plan ID (for audit trail)
   * @param hoursBeforePlan – Hours remaining until the plan when cancelled
   */
  async recordPlanCancel(
    userId: string,
    _planId: string,
    hoursBeforePlan: number,
  ): Promise<{ timing: CancelTiming; penalty: number }> {
    const timing = reputationService._cancelTiming(hoursBeforePlan);

    const increments: Partial<Record<string, number>> = {
      cancel_count: 1,
      total_plans:  1,
    };

    if (timing === 'very_late') {
      increments.late_cancel_count    = 1;
      increments.late_cancel_count_2h = 1;
    } else if (timing === 'late') {
      increments.late_cancel_count = 1;
    } else {
      increments.normal_cancel_count = 1;
    }

    await reputationService._directIncrement(userId, increments);
    await reputationService._recalculate(userId);

    const penalty =
      timing === 'very_late' ? SCORE.VERY_LATE_CANCEL :
      timing === 'late'      ? SCORE.LATE_CANCEL       :
      SCORE.NORMAL_CANCEL;

    return { timing, penalty };
  },

  /**
   * Record a no-show (match appeared but person did not show up).
   * Penalty: -0.20 (heaviest single penalty).
   *
   * @param userId  – User who no-showed
   * @param _planId – Plan ID (for audit trail)
   */
  async recordNoShow(userId: string, _planId: string): Promise<void> {
    await reputationService._directIncrement(userId, {
      no_show_count: 1,
      total_plans:   1,
    });
    await reputationService._recalculate(userId);
  },

  /**
   * Record a positive feedback from the other party after a date.
   */
  async recordPositiveFeedback(userId: string): Promise<void> {
    await reputationService._directIncrement(userId, {
      positive_feedback_count: 1,
    });
    await reputationService._recalculate(userId);
  },

  /**
   * Calculate what visibility multiplier applies in discovery.
   * Returns a value between 0.0 and 1.0 (1.0 = full visibility).
   * This is NEVER surfaced to the end user — used only by discovery queries.
   */
  getVisibilityMultiplier(score: number): number {
    if (score < EXCLUDED_FROM_PICKS_THRESHOLD) return 0.0;
    if (score < SEVERELY_REDUCED_THRESHOLD)    return 0.2;
    if (score < REDUCED_VISIBILITY_THRESHOLD)  return 0.5;
    return 1.0;
  },

  /**
   * Determine if a user should be excluded from daily picks entirely.
   */
  isExcludedFromPicks(score: number): boolean {
    return score < EXCLUDED_FROM_PICKS_THRESHOLD;
  },

  /**
   * Compute score locally using the same formula as the DB function.
   * Used for quick client-side estimates (admin panel).
   * Uses tiered cancel counts if available, falls back to legacy cancel_count.
   */
  computeScore(rep: Pick<
    UserReputation,
    'cancel_count' | 'late_cancel_count' | 'no_show_count' |
    'completed_plans' | 'positive_feedback_count'
  > & Partial<Pick<UserReputation, 'normal_cancel_count' | 'late_cancel_count_2h'>>): number {
    // Prefer tiered counts when available
    const normalCancels   = rep.normal_cancel_count ?? 0;
    const lateCancels     = rep.late_cancel_count - (rep.late_cancel_count_2h ?? 0);
    const veryLateCancels = rep.late_cancel_count_2h ?? 0;

    const useTiered = (rep.normal_cancel_count !== undefined);

    const raw = useTiered
      ? 1.00
        + normalCancels     * SCORE.NORMAL_CANCEL
        + lateCancels       * SCORE.LATE_CANCEL
        + veryLateCancels   * SCORE.VERY_LATE_CANCEL
        + rep.no_show_count * SCORE.NO_SHOW
        + rep.completed_plans        * SCORE.COMPLETED_PLAN
        + rep.positive_feedback_count * SCORE.POSITIVE_FEEDBACK
      : 1.00
        + rep.cancel_count      * SCORE.CANCEL
        + rep.late_cancel_count * SCORE.LATE_CANCEL
        + rep.no_show_count     * SCORE.NO_SHOW
        + rep.completed_plans        * SCORE.COMPLETED_PLAN
        + rep.positive_feedback_count * SCORE.POSITIVE_FEEDBACK;

    return Math.max(0.00, Math.min(1.00, parseFloat(raw.toFixed(2))));
  },

  /**
   * Fetch reputation and return a full ReputationImpact snapshot.
   * Used by admin panel and moderation tools.
   */
  async getReputationImpact(userId: string): Promise<ReputationImpact | null> {
    const rep = await reputationService.getReputation(userId);
    if (!rep) return null;

    const score = rep.reliability_score;
    return {
      score,
      level:               reputationService.getReputationLevel(score),
      visibilityMultiplier: reputationService.getVisibilityMultiplier(score),
    };
  },

  /**
   * Calculate a fresh reliability score for a user (re-queries DB then recalculates).
   */
  async calculateReliabilityScore(userId: string): Promise<number> {
    await reputationService._recalculate(userId);
    const rep = await reputationService.getReputation(userId);
    return rep?.reliability_score ?? 1.0;
  },

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Determine cancel timing tier from hours before plan.
   */
  _cancelTiming(hoursBeforePlan: number): CancelTiming {
    if (hoursBeforePlan < VERY_LATE_CANCEL_THRESHOLD_H) return 'very_late';
    if (hoursBeforePlan < LATE_CANCEL_THRESHOLD_H)      return 'late';
    return 'normal';
  },

  async _directIncrement(
    userId: string,
    increments: Partial<Record<string, number>>,
  ): Promise<void> {
    const { data: current } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!current) {
      await supabase
        .from('user_reputation')
        .insert({ user_id: userId });
    }

    const updates: Record<string, number> = {};
    const base = (current as Record<string, number> | null) ?? {};

    for (const [key, delta] of Object.entries(increments)) {
      updates[key] = ((base[key] as number) ?? 0) + (delta ?? 0);
    }

    await supabase
      .from('user_reputation')
      .update(updates)
      .eq('user_id', userId);
  },

  async _recalculate(userId: string): Promise<void> {
    await supabase.rpc('fn_recalculate_reputation', { p_user_id: userId });
  },
};
