/**
 * planPledgeService
 *
 * Feature 13: Plan Pledge (simulated — no real payment)
 * - Users can "pledge" 50–500 TL as a commitment signal.
 * - Status transitions: held → released (by DB trigger on checkout) or forfeited (no-show).
 * - All monetary values are purely symbolic; no payment gateway is involved.
 */

import { supabase } from '../src/lib/supabase';
import { PlanPledge } from '../types';

const PRESET_AMOUNTS = [50, 100, 200, 300, 500] as const;
export { PRESET_AMOUNTS };

export const planPledgeService = {
  /**
   * Creates (or upserts) a pledge for the given plan.
   * amountTl must be between 50 and 500 TL.
   */
  async createPledge(
    planId:   string,
    userId:   string,
    amountTl: number,
  ): Promise<{ error: string | null; pledge: PlanPledge | null }> {
    if (amountTl < 50 || amountTl > 500) {
      return { error: 'Pledge tutarı 50–500 TL arasında olmalıdır.', pledge: null };
    }

    const { data, error } = await supabase
      .from('plan_pledges')
      .upsert(
        {
          plan_id:    planId,
          user_id:    userId,
          amount_tl:  amountTl,
          status:     'held',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'plan_id,user_id' },
      )
      .select()
      .single();

    if (error || !data) return { error: error?.message ?? 'Pledge oluşturulamadı.', pledge: null };
    return { error: null, pledge: data as PlanPledge };
  },

  /**
   * Returns all pledges for a plan.
   */
  async getPledgesForPlan(planId: string): Promise<PlanPledge[]> {
    const { data, error } = await supabase
      .from('plan_pledges')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as PlanPledge[];
  },

  /**
   * Returns the current user's pledge for a plan, or null if none.
   */
  async getMyPledge(planId: string, userId: string): Promise<PlanPledge | null> {
    const { data, error } = await supabase
      .from('plan_pledges')
      .select('*')
      .eq('plan_id', planId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as PlanPledge;
  },

  /**
   * Marks the user's pledge as forfeited (admin/no-show use).
   * Released pledges are handled automatically by the DB trigger on checkout.
   */
  async forfeitPledge(planId: string, userId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('plan_pledges')
      .update({ status: 'forfeited', updated_at: new Date().toISOString() })
      .eq('plan_id', planId)
      .eq('user_id', userId)
      .eq('status', 'held'); // only forfeit if still held

    return { error: error?.message ?? null };
  },
};
