import { supabase } from '../src/lib/supabase';
import type { Profile } from '../types';

export interface DailyPick {
  id: string;
  user_id: string;
  picked_user_id: string;
  pick_date: string;
  is_viewed: boolean;
  is_liked: boolean | null;
  is_passed: boolean | null;
  is_later: boolean;
  created_at: string;
  profile?: Profile;
}

export interface LikePickResult {
  matched: boolean;
}

export const picksService = {
  async getDailyPicks(userId: string): Promise<DailyPick[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_picks')
      .select('*')
      .eq('user_id', userId)
      .eq('pick_date', today)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[picksService] getDailyPicks error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      // Trigger server-side pick generation
      const generated = await picksService.generateDailyPicks(userId);
      return generated;
    }

    return data as DailyPick[];
  },

  async generateDailyPicks(userId: string): Promise<DailyPick[]> {
    const { data, error } = await supabase.rpc('generate_daily_picks', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[picksService] generateDailyPicks error:', error);
      return [];
    }

    return (data as DailyPick[]) || [];
  },

  async markPickViewed(pickId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_picks')
      .update({ is_viewed: true })
      .eq('id', pickId);

    if (error) {
      console.error('[picksService] markPickViewed error:', error);
    }
  },

  async likePick(pickId: string): Promise<LikePickResult> {
    const { error } = await supabase
      .from('daily_picks')
      .update({ is_liked: true, is_passed: false })
      .eq('id', pickId);

    if (error) {
      throw new Error('Beğeni kaydedilemedi.');
    }

    // Check for mutual like via RPC
    const { data: matchData } = await supabase.rpc('check_daily_pick_match', {
      p_pick_id: pickId,
    });

    return { matched: Boolean(matchData) };
  },

  async passPick(pickId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_picks')
      .update({ is_passed: true, is_liked: false })
      .eq('id', pickId);

    if (error) {
      throw new Error('Geçiş kaydedilemedi.');
    }
  },

  async saveLater(pickId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_picks')
      .update({ is_later: true })
      .eq('id', pickId);

    if (error) {
      throw new Error('Later olarak kaydedilemedi.');
    }

    // Decrement later_count_remaining
    const { data: pickData } = await supabase
      .from('daily_picks')
      .select('user_id')
      .eq('id', pickId)
      .single();

    if (pickData?.user_id) {
      await supabase.rpc('decrement_later_count', { p_user_id: pickData.user_id });
    }
  },

  async getRemainingPicks(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_picks')
      .select('id')
      .eq('user_id', userId)
      .eq('pick_date', today)
      .is('is_liked', null)
      .is('is_passed', null);

    if (error) return 0;
    return data?.length ?? 0;
  },
};
