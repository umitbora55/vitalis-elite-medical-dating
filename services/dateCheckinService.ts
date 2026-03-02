/**
 * dateCheckinService
 *
 * Feature 8: Date OS Check-in / Check-out
 * - Window opens 30 minutes before the plan's selected_time.
 * - When both parties check in, a DB trigger sets status → 'ongoing'.
 * - When both parties check out, trigger sets status → 'completed' and releases pledges.
 */

import { supabase } from '../src/lib/supabase';
import { DateCheckin } from '../types';

/** Minutes before plan time during which check-in is allowed */
const CHECKIN_WINDOW_MINUTES = 30;

export const dateCheckinService = {
  /**
   * Returns true if the current moment is within the check-in window.
   * planSelectedTime: ISO string of the date plan's scheduled time.
   */
  isCheckinWindowOpen(planSelectedTime: string): boolean {
    const planMs   = new Date(planSelectedTime).getTime();
    const nowMs    = Date.now();
    const windowMs = CHECKIN_WINDOW_MINUTES * 60 * 1000;
    // Window: [planTime - 30min, planTime + 60min] (generous upper bound for stragglers)
    return nowMs >= planMs - windowMs && nowMs <= planMs + 60 * 60 * 1000;
  },

  /**
   * Records a check-in for a user on a specific plan.
   */
  async checkIn(planId: string, userId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('date_checkins')
      .upsert(
        { plan_id: planId, user_id: userId, type: 'checkin', created_at: new Date().toISOString() },
        { onConflict: 'plan_id,user_id,type', ignoreDuplicates: true },
      );

    return { error: error?.message ?? null };
  },

  /**
   * Records a check-out for a user on a specific plan.
   */
  async checkOut(planId: string, userId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('date_checkins')
      .upsert(
        { plan_id: planId, user_id: userId, type: 'checkout', created_at: new Date().toISOString() },
        { onConflict: 'plan_id,user_id,type', ignoreDuplicates: true },
      );

    return { error: error?.message ?? null };
  },

  /**
   * Returns all check-in/out records for a plan.
   */
  async getCheckins(planId: string): Promise<DateCheckin[]> {
    const { data, error } = await supabase
      .from('date_checkins')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as DateCheckin[];
  },

  /**
   * Returns true when the user has checked in to a specific plan.
   */
  async hasUserCheckedIn(planId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('date_checkins')
      .select('id')
      .eq('plan_id', planId)
      .eq('user_id', userId)
      .eq('type', 'checkin')
      .maybeSingle();

    return !!data;
  },

  /**
   * Returns true when the user has checked out from a specific plan.
   */
  async hasUserCheckedOut(planId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('date_checkins')
      .select('id')
      .eq('plan_id', planId)
      .eq('user_id', userId)
      .eq('type', 'checkout')
      .maybeSingle();

    return !!data;
  },
};
