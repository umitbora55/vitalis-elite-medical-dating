/**
 * Appeal Service — User dispute & ban appeal workflow
 *
 * Users get one appeal per entity. Admins review with full evidence context.
 * Actions: approve (lift), deny (keep), partially approve (reduce), escalate.
 */

import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppealType =
  | 'ban_appeal'
  | 'report_dispute'
  | 'badge_revocation'
  | 'restriction_appeal';

export type AppealEntityType =
  | 'ban'
  | 'report'
  | 'badge_revocation'
  | 'restriction'
  | 'auto_restriction';

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'denied' | 'escalated';
export type AppealPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Appeal {
  id: string;
  user_id: string;
  appeal_type: AppealType;
  related_entity_type: AppealEntityType;
  related_entity_id: string | null;
  user_statement: string;
  evidence_paths: string[];
  status: AppealStatus;
  priority: AppealPriority;
  assigned_to: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  decision: string | null;
  decision_reason: string | null;
  action_taken: string | null;
  // Joined (admin view)
  user_name?: string | null;
  user_email?: string | null;
}

export interface SubmitAppealPayload {
  userId: string;
  appealType: AppealType;
  relatedEntityType: AppealEntityType;
  relatedEntityId?: string;
  userStatement: string;
  evidencePaths?: string[];
}

export interface ReviewAppealPayload {
  appealId: string;
  decision: 'approved' | 'denied' | 'partially_approved' | 'escalated';
  decisionReason: string;
  actionTaken?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const appealService = {

  /**
   * Submit a new appeal (user side).
   * Enforces one appeal per entity (UNIQUE constraint in DB).
   */
  async submitAppeal(
    payload: SubmitAppealPayload
  ): Promise<{ data: Appeal | null; error: string | null }> {
    if (payload.userStatement.length < 50) {
      return { data: null, error: 'İtiraz metni en az 50 karakter olmalıdır.' };
    }

    const { data, error } = await supabase
      .from('appeals')
      .insert({
        user_id:             payload.userId,
        appeal_type:         payload.appealType,
        related_entity_type: payload.relatedEntityType,
        related_entity_id:   payload.relatedEntityId ?? null,
        user_statement:      payload.userStatement,
        evidence_paths:      payload.evidencePaths ?? [],
        status:              'pending',
        priority:            determinePriority(payload.appealType),
      })
      .select()
      .single();

    if (error) {
      // Unique constraint violation — already appealed
      if (error.code === '23505') {
        return { data: null, error: 'Bu konu için zaten bir itirazınız mevcut.' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as Appeal, error: null };
  },

  /**
   * Get all appeals filed by a user.
   */
  async getMyAppeals(userId: string): Promise<Appeal[]> {
    const { data } = await supabase
      .from('appeals')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    return (data ?? []) as Appeal[];
  },

  /**
   * Get a single appeal by ID (for status page).
   */
  async getAppeal(appealId: string): Promise<Appeal | null> {
    const { data } = await supabase
      .from('appeals')
      .select('*')
      .eq('id', appealId)
      .maybeSingle();

    return data as Appeal | null;
  },

  /**
   * Admin: get the full appeal queue with user info.
   */
  async getAppealQueue(
    status?: AppealStatus
  ): Promise<Appeal[]> {
    let query = supabase
      .from('appeals')
      .select(`
        *,
        profiles!appeals_user_id_fkey (
          full_name,
          email
        )
      `)
      .order('priority', { ascending: false }) // urgent first
      .order('submitted_at', { ascending: true });

    if (status) query = query.eq('status', status);
    else        query = query.in('status', ['pending', 'under_review']);

    const { data } = await query;

    return (data ?? []).map((row) => {
      const profile = row.profiles as Record<string, string | null> | null;
      return {
        ...(row as unknown as Appeal),
        user_name:  profile?.['full_name'] ?? null,
        user_email: profile?.['email'] ?? null,
      };
    });
  },

  /**
   * Admin: assign an appeal to the current admin for review.
   */
  async assignToSelf(appealId: string): Promise<{ error: string | null }> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('appeals')
      .update({
        assigned_to: userId,
        status:      'under_review',
      })
      .eq('id', appealId);

    return { error: error?.message ?? null };
  },

  /**
   * Admin: render a decision on an appeal.
   */
  async reviewAppeal(
    payload: ReviewAppealPayload
  ): Promise<{ error: string | null }> {
    const { data: authData } = await supabase.auth.getUser();
    const adminId = authData.user?.id;
    if (!adminId) return { error: 'Not authenticated' };

    const { data: appeal, error: fetchErr } = await supabase
      .from('appeals')
      .select('*')
      .eq('id', payload.appealId)
      .single();

    if (fetchErr || !appeal) return { error: fetchErr?.message ?? 'Appeal not found' };

    const a = appeal as Appeal;

    // Map our decision to the status enum
    const newStatus: AppealStatus =
      payload.decision === 'escalated'          ? 'escalated'    :
      payload.decision === 'approved'           ? 'approved'     :
      payload.decision === 'partially_approved' ? 'approved'     : // Stored as approved, differentiated by action_taken
      'denied';

    const { error: updateErr } = await supabase
      .from('appeals')
      .update({
        status:          newStatus,
        reviewed_by:     adminId,
        reviewed_at:     new Date().toISOString(),
        decision:        payload.decision,
        decision_reason: payload.decisionReason,
        action_taken:    payload.actionTaken ?? null,
      })
      .eq('id', payload.appealId);

    if (updateErr) return { error: updateErr.message };

    // Apply the decision
    await appealService._applyDecision(a, payload.decision, adminId);

    // Log
    await supabase.from('admin_action_log').insert({
      actor_id:    adminId,
      action:      `appeal_${payload.decision}`,
      entity_type: 'appeals',
      entity_id:   payload.appealId,
      metadata: {
        appeal_type:   a.appeal_type,
        user_id:       a.user_id,
        decision:      payload.decision,
        reason:        payload.decisionReason,
      },
    });

    return { error: null };
  },

  /**
   * Admin: escalate an appeal to a higher authority.
   */
  async escalateAppeal(
    appealId: string,
    reason: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('appeals')
      .update({
        status:    'escalated',
        priority:  'urgent',
        decision_reason: reason,
      })
      .eq('id', appealId);

    return { error: error?.message ?? null };
  },

  // ── Private ──────────────────────────────────────────────────────────────────

  async _applyDecision(
    appeal: Appeal,
    decision: string,
    adminId: string
  ): Promise<void> {
    if (decision === 'denied' || decision === 'escalated') return;

    // Approved or partially approved → lift the related restriction/ban
    const { related_entity_type, related_entity_id, user_id } = appeal;

    if (related_entity_type === 'ban' || related_entity_type === 'restriction') {
      if (related_entity_id) {
        await supabase
          .from('user_restrictions')
          .update({
            lifted_at: new Date().toISOString(),
            lifted_by: adminId,
          })
          .eq('id', related_entity_id);
      }
      // Restore profile status
      await supabase
        .from('profiles')
        .update({ user_status: 'active' })
        .eq('id', user_id);
    }

    if (related_entity_type === 'auto_restriction' && related_entity_id) {
      await supabase
        .from('auto_restrictions')
        .update({
          is_active:     false,
          reviewed:      true,
          reviewed_at:   new Date().toISOString(),
          reviewed_by:   adminId,
          review_result: 'lifted',
        })
        .eq('id', related_entity_id);
    }

    if (related_entity_type === 'badge_revocation' && related_entity_id) {
      await supabase
        .from('badge_revocations')
        .update({
          status:                'appeal_approved',
          appeal_reviewed_by:    adminId,
          appeal_reviewed_at:    new Date().toISOString(),
        })
        .eq('id', related_entity_id);

      await supabase
        .from('profiles')
        .update({ verification_status: 'VERIFIED' })
        .eq('id', user_id);
    }
  },

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getStatusLabel(status: AppealStatus): string {
    const labels: Record<AppealStatus, string> = {
      pending:      '⏳ Beklemede',
      under_review: '🔍 İnceleniyor',
      approved:     '✅ Onaylandı',
      denied:       '❌ Reddedildi',
      escalated:    '⬆️ Üst Seviyeye Taşındı',
    };
    return labels[status];
  },

  getStatusColor(status: AppealStatus): string {
    const colors: Record<AppealStatus, string> = {
      pending:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
      under_review: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      approved:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      denied:       'text-red-400 bg-red-500/10 border-red-500/20',
      escalated:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
    return colors[status];
  },

  getAppealTypeLabel(type: AppealType): string {
    const labels: Record<AppealType, string> = {
      ban_appeal:          'Ban İtirazı',
      report_dispute:      'Şikayet İtirazı',
      badge_revocation:    'Rozet İptali İtirazı',
      restriction_appeal:  'Kısıtlama İtirazı',
    };
    return labels[type];
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function determinePriority(appealType: AppealType): AppealPriority {
  if (appealType === 'ban_appeal') return 'high';
  if (appealType === 'badge_revocation') return 'normal';
  return 'normal';
}
