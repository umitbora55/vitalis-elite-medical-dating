import { supabase } from '../src/lib/supabase';

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  is_visible_to_matches: boolean;
}

export interface CommonSlot {
  day_of_week: number;
  day_label: string;
  start_time: string;
  end_time: string;
}

const DAY_LABELS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const availabilityService = {
  DAY_LABELS,

  async getUserSlots(userId: string): Promise<AvailabilitySlot[]> {
    const { data, error } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week')
      .order('start_time');

    if (error) return [];
    return (data as AvailabilitySlot[]) || [];
  },

  async upsertSlot(userId: string, slot: Omit<AvailabilitySlot, 'id' | 'user_id'>): Promise<void> {
    const { error } = await supabase.from('user_availability').upsert(
      { user_id: userId, ...slot },
      { onConflict: 'user_id,day_of_week,start_time' },
    );
    if (error) throw new Error('Slot kaydedilemedi.');
  },

  async deleteSlot(slotId: string): Promise<void> {
    const { error } = await supabase.from('user_availability').delete().eq('id', slotId);
    if (error) throw new Error('Slot silinemedi.');
  },

  async setVisibility(userId: string, visible: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_availability')
      .update({ is_visible_to_matches: visible })
      .eq('user_id', userId);
    if (error) throw new Error('Görünürlük güncellenemedi.');
  },

  /**
   * Find overlapping time slots between two users
   */
  findCommonSlots(mySlots: AvailabilitySlot[], theirSlots: AvailabilitySlot[]): CommonSlot[] {
    const common: CommonSlot[] = [];

    for (const mine of mySlots) {
      for (const theirs of theirSlots) {
        if (mine.day_of_week !== theirs.day_of_week) continue;

        const overlapStart = mine.start_time > theirs.start_time ? mine.start_time : theirs.start_time;
        const overlapEnd = mine.end_time < theirs.end_time ? mine.end_time : theirs.end_time;

        if (overlapStart < overlapEnd) {
          common.push({
            day_of_week: mine.day_of_week,
            day_label: DAY_LABELS[mine.day_of_week],
            start_time: overlapStart,
            end_time: overlapEnd,
          });
        }
      }
    }

    return common;
  },

  async getMatchPartnerSlots(matchPartnerId: string): Promise<AvailabilitySlot[]> {
    const { data, error } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', matchPartnerId)
      .eq('is_visible_to_matches', true)
      .order('day_of_week');

    if (error) return [];
    return (data as AvailabilitySlot[]) || [];
  },

  formatTimeRange(start: string, end: string): string {
    return `${start} – ${end}`;
  },
};
