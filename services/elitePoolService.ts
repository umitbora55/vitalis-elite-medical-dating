/**
 * elitePoolService
 *
 * Feature 4: Elite Invite-only Verified Pool
 * - Check a user's membership and eligibility status.
 * - Join / leave the pool.
 * - Fetch active pool members (for admin / discovery).
 */

import { supabase } from '../src/lib/supabase';
import { ElitePoolStatus, ElitePoolMember } from '../types';

export const elitePoolService = {
  /**
   * Returns the current membership + eligibility status for a user.
   */
  async getStatus(userId: string): Promise<ElitePoolStatus> {
    // Check if they are already a member
    const { data: member } = await supabase
      .from('elite_pool_members')
      .select('joined_at, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    // Check if they are eligible (via server-side view)
    const { data: eligible } = await supabase
      .from('elite_pool_eligible')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      isMember:   !!member?.is_active,
      isEligible: !!eligible,
      joinedAt:   member?.joined_at ?? null,
    };
  },

  /**
   * Adds the user to the elite pool (requires server-side eligibility).
   */
  async join(userId: string): Promise<{ error: string | null }> {
    // Verify eligibility before inserting
    const { data: eligible } = await supabase
      .from('elite_pool_eligible')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!eligible) {
      return { error: 'Henüz Elite Pool kriterlerini karşılamıyorsunuz.' };
    }

    const { error } = await supabase
      .from('elite_pool_members')
      .upsert(
        { user_id: userId, is_active: true, joined_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );

    return { error: error?.message ?? null };
  },

  /**
   * Deactivates the user's elite pool membership.
   */
  async leave(userId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('elite_pool_members')
      .update({ is_active: false })
      .eq('user_id', userId);

    return { error: error?.message ?? null };
  },

  /**
   * Lists all currently active pool members with basic profile info.
   */
  async getActiveMembers(): Promise<ElitePoolMember[]> {
    const { data, error } = await supabase
      .from('elite_pool_members')
      .select(`
        user_id,
        joined_at,
        is_active,
        profiles!elite_pool_members_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (error || !data) return [];

    return (data as unknown as Array<{
      user_id:   string;
      joined_at: string;
      is_active: boolean;
      profiles:  { full_name: string | null; avatar_url: string | null } | null;
    }>).map((row) => ({
      user_id:    row.user_id,
      joined_at:  row.joined_at,
      is_active:  row.is_active,
      full_name:  row.profiles?.full_name  ?? undefined,
      avatar_url: row.profiles?.avatar_url ?? undefined,
    }));
  },
};
