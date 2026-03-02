import { supabase } from '../src/lib/supabase';
import { reputationService } from './reputationService';

export type PlanType = 'coffee' | 'dinner' | 'walk' | 'custom';
export type PlanStatus = 'pending' | 'confirmed' | 'declined' | 'modified' | 'cancelled';

export interface DatePlan {
  id: string;
  match_id: string;
  proposer_id: string;
  plan_type: PlanType;
  title: string | null;
  location: string | null;
  selected_time: string | null;
  duration_minutes: number | null;
  status: PlanStatus;
  responder_id: string | null;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDatePlanPayload {
  matchId: string;
  proposerId: string;
  planType: PlanType;
  location?: string;
  selectedTime?: string; // ISO timestamp
  durationMinutes?: number;
  title?: string;
  notes?: string;
}

const PLAN_DEFAULTS: Record<PlanType, { duration: number; title: string }> = {
  coffee: { duration: 30, title: '☕ Kahve' },
  dinner: { duration: 60, title: '🍽️ Yemek' },
  walk: { duration: 90, title: '🚶 Yürüyüş' },
  custom: { duration: 60, title: '✨ Özel' },
};

export const datePlanService = {
  getPlanDefaults(type: PlanType) {
    return PLAN_DEFAULTS[type];
  },

  async createPlan(payload: CreateDatePlanPayload): Promise<DatePlan> {
    const defaults = PLAN_DEFAULTS[payload.planType];
    const { data, error } = await supabase
      .from('date_plans')
      .insert({
        match_id: payload.matchId,
        proposer_id: payload.proposerId,
        plan_type: payload.planType,
        title: payload.title ?? defaults.title,
        location: payload.location ?? null,
        selected_time: payload.selectedTime ?? null,
        duration_minutes: payload.durationMinutes ?? defaults.duration,
        notes: payload.notes ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !data) throw new Error('Plan oluşturulamadı.');
    return data as DatePlan;
  },

  async getActivePlanForMatch(matchId: string): Promise<DatePlan | null> {
    const { data, error } = await supabase
      .from('date_plans')
      .select('*')
      .eq('match_id', matchId)
      .in('status', ['pending', 'confirmed', 'modified'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data as DatePlan | null;
  },

  async respondToPlan(planId: string, responderId: string, status: 'confirmed' | 'declined'): Promise<void> {
    const { error } = await supabase
      .from('date_plans')
      .update({ status, responder_id: responderId, responded_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw new Error('Yanıt gönderilemedi.');
  },

  /**
   * Mark a plan as completed and update reputation for both parties.
   * @param planId  The plan that was successfully completed.
   * @param userIds Array of both participants' user IDs.
   */
  async completePlan(planId: string, userIds: [string, string]): Promise<void> {
    const { error } = await supabase
      .from('date_plans')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw new Error('Plan tamamlanamadı.');

    // Fire-and-forget reputation updates for both participants
    void Promise.allSettled([
      reputationService.recordPlanCompletion(userIds[0]),
      reputationService.recordPlanCompletion(userIds[1]),
    ]);
  },

  async modifyPlan(planId: string, changes: Partial<Pick<DatePlan, 'location' | 'selected_time' | 'duration_minutes' | 'plan_type' | 'title' | 'notes'>>): Promise<void> {
    const { error } = await supabase
      .from('date_plans')
      .update({ ...changes, status: 'modified', updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw new Error('Plan güncellenemedi.');
  },

  /**
   * Cancel a plan and record the cancellation in the proposer's reputation.
   * @param planId       The plan to cancel.
   * @param proposerId   ID of the person who proposed (and is now cancelling).
   * @param planTime     Optional ISO string of the scheduled plan time — used to detect late cancels.
   */
  async cancelPlan(
    planId: string,
    proposerId?: string,
    planTime?: string | null,
  ): Promise<void> {
    const { error } = await supabase
      .from('date_plans')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw new Error('Plan iptal edilemedi.');

    // Record cancellation in reputation (fire-and-forget, never surfaced to user)
    if (proposerId) {
      const isLate =
        planTime != null &&
        new Date(planTime).getTime() - Date.now() < 24 * 60 * 60 * 1000;

      // Convert boolean `isLate` to hoursBeforePlan (0 = now; 48 = two days ahead)
      const hoursBeforePlan = isLate ? 0 : 48;
      void reputationService.recordPlanCancel(proposerId, '', hoursBeforePlan);
    }
  },

  /**
   * Record a no-show for a user who did not appear for a confirmed plan.
   * Called by admin or automated check, never by the affected user.
   */
  async recordNoShow(userId: string): Promise<void> {
    void reputationService.recordNoShow(userId, '');
  },

  /**
   * Record positive feedback from one user about the other after a date.
   */
  async recordPositiveFeedback(aboutUserId: string): Promise<void> {
    void reputationService.recordPositiveFeedback(aboutUserId);
  },

  formatPlanDateTime(isoString: string | null): string {
    if (!isoString) return 'Tarih belirsiz';
    const d = new Date(isoString);
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} – ${hh}:${mm}`;
  },
};
