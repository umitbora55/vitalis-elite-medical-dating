/**
 * VITALIS Date Invitation Service — Özellik 4: Date Odaklı Akış
 *
 * Manages the formal 48h date invitation funnel:
 *   Match → Send invitation → 48h timer → Accept/Decline → Date plan created
 *
 * Healthcare-specific date types (nöbet sonrası kahve, mola arası, gece nöbeti öncesi)
 * are fully supported alongside standard types.
 */

import { supabase } from '../src/lib/supabase';
import type {
  DateInvitation,
  ExtendedPlanType,
  DateTypeOption,
  UserAvailabilitySlot,
} from '../types';

// ── Date Type Catalogue ────────────────────────────────────────────────────────

export const DATE_TYPE_OPTIONS: DateTypeOption[] = [
  {
    type: 'coffee',
    label: 'Kahve',
    description: 'Sakin bir kafede 30–45 dk tanışma',
    icon: '☕',
    duration: '30–45 dk',
    isHealthcareSpecific: false,
    color: 'amber',
  },
  {
    type: 'walk',
    label: 'Yürüyüş',
    description: 'Açık havada rahat bir yürüyüş',
    icon: '🚶',
    duration: '45–60 dk',
    isHealthcareSpecific: false,
    color: 'emerald',
  },
  {
    type: 'dinner',
    label: 'Yemek',
    description: 'Akşam yemeği, keyifli bir buluşma',
    icon: '🍽️',
    duration: '60–90 dk',
    isHealthcareSpecific: false,
    color: 'rose',
  },
  {
    type: 'nobet_sonrasi_kahve',
    label: 'Nöbet Sonrası Kahve',
    description: 'Sabah nöbet bitişi – yorgun ama mutlu bir kahve molası',
    icon: '🌅',
    duration: '20–30 dk',
    isHealthcareSpecific: true,
    color: 'orange',
  },
  {
    type: 'mola_arasi',
    label: 'Mola Arası',
    description: 'Çalışma aralarında 15–20 dk kısa buluşma',
    icon: '⏱️',
    duration: '15–20 dk',
    isHealthcareSpecific: true,
    color: 'blue',
  },
  {
    type: 'gece_nobeti_oncesi',
    label: 'Nöbet Öncesi Yemek',
    description: 'Gece nöbetine girmeden önce erken akşam yemeği',
    icon: '🌙',
    duration: '45–60 dk',
    isHealthcareSpecific: true,
    color: 'violet',
  },
  {
    type: 'custom',
    label: 'Özel Plan',
    description: 'Kendi tarzında bir buluşma öner',
    icon: '✨',
    duration: 'Esnek',
    isHealthcareSpecific: false,
    color: 'slate',
  },
];

/** Returns the metadata for a single plan type. */
export function getDateTypeOption(type: ExtendedPlanType): DateTypeOption {
  return DATE_TYPE_OPTIONS.find((o) => o.type === type) ?? DATE_TYPE_OPTIONS[DATE_TYPE_OPTIONS.length - 1];
}

// ── Countdown Helper ──────────────────────────────────────────────────────────

/** Returns remaining hours and minutes until invitation expires. Returns null if already expired. */
export function getInvitationTimeLeft(expiresAt: string): { hours: number; minutes: number } | null {
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) return null;
  const totalMin = Math.floor(msLeft / 60000);
  return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
}

// ── Core Service ──────────────────────────────────────────────────────────────

export const dateInvitationService = {
  // ── Invitation CRUD ──────────────────────────────────────────────────────────

  /**
   * Send a date invitation to the match partner.
   * Returns the new invitation id.
   * Throws if a pending invitation already exists for this match.
   */
  async sendInvitation(params: {
    matchId: string;
    inviteeId: string;
    preferredType: ExtendedPlanType;
    preferredTimes?: string[];
    message?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('send_date_invitation', {
      p_match_id:        params.matchId,
      p_invitee_id:      params.inviteeId,
      p_preferred_type:  params.preferredType,
      p_preferred_times: params.preferredTimes ?? [],
      p_message:         params.message ?? null,
    });

    if (error) {
      if (error.message.includes('ALREADY_PENDING')) {
        throw new Error('Bu eşleşme için zaten bekleyen bir davet var.');
      }
      throw new Error('Davet gönderilemedi. Lütfen tekrar dene.');
    }

    return data as string;
  },

  /**
   * Accept a pending invitation.
   * Returns the created date plan id.
   */
  async acceptInvitation(invitationId: string, selectedTime?: string): Promise<string> {
    const { data, error } = await supabase.rpc('respond_date_invitation', {
      p_invitation_id:  invitationId,
      p_status:         'accepted',
      p_selected_time:  selectedTime ?? null,
    });

    if (error) {
      if (error.message.includes('INVITATION_EXPIRED')) {
        throw new Error('Bu davetin süresi dolmuş.');
      }
      if (error.message.includes('INVITATION_NOT_FOUND')) {
        throw new Error('Davet bulunamadı veya zaten yanıtlandı.');
      }
      throw new Error('Davet kabul edilemedi.');
    }

    return data as string;
  },

  /**
   * Decline a pending invitation with an optional reason.
   */
  async declineInvitation(invitationId: string, reason?: string): Promise<void> {
    const { error } = await supabase.rpc('respond_date_invitation', {
      p_invitation_id:   invitationId,
      p_status:          'declined',
      p_declined_reason: reason ?? null,
    });

    if (error) throw new Error('Davet reddedilemedi.');
  },

  /**
   * Cancel a pending invitation that the current user sent.
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { error } = await supabase
      .from('date_invitations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', invitationId)
      .eq('inviter_id', user.id)
      .eq('status', 'pending');

    if (error) throw new Error('Davet iptal edilemedi.');
  },

  // ── Fetch Helpers ─────────────────────────────────────────────────────────────

  /**
   * Get the active (pending / accepted) invitation for a match.
   * Returns null if none exists.
   */
  async getActiveInvitationForMatch(matchId: string): Promise<DateInvitation | null> {
    const { data, error } = await supabase
      .from('date_invitations')
      .select('*')
      .eq('match_id', matchId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as DateInvitation;
  },

  /**
   * Get all invitations received by the current user (inbox).
   */
  async getReceivedInvitations(): Promise<DateInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('date_invitations')
      .select('*')
      .eq('invitee_id', user.id)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as DateInvitation[];
  },

  /**
   * Get all invitations sent by the current user.
   */
  async getSentInvitations(): Promise<DateInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('date_invitations')
      .select('*')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return [];
    return data as DateInvitation[];
  },

  // ── Availability ──────────────────────────────────────────────────────────────

  /**
   * Upsert an availability slot for the current user.
   */
  async upsertAvailabilitySlot(slot: {
    slotStart: string;
    slotEnd: string;
    label?: string;
    isRecurring?: boolean;
    recurDays?: number[];
    expiresAt?: string;
  }): Promise<UserAvailabilitySlot> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { data, error } = await supabase
      .from('user_availability')
      .insert({
        user_id:      user.id,
        slot_start:   slot.slotStart,
        slot_end:     slot.slotEnd,
        label:        slot.label ?? null,
        is_recurring: slot.isRecurring ?? false,
        recur_days:   slot.recurDays ?? null,
        expires_at:   slot.expiresAt ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error('Müsaitlik eklenemedi.');
    return data as UserAvailabilitySlot;
  },

  /**
   * Delete an availability slot by id.
   */
  async deleteAvailabilitySlot(slotId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { error } = await supabase
      .from('user_availability')
      .delete()
      .eq('id', slotId)
      .eq('user_id', user.id);

    if (error) throw new Error('Müsaitlik silinemedi.');
  },

  /**
   * Fetch upcoming availability slots for a user (for matched-pair scheduling).
   */
  async getAvailabilitySlots(userId: string): Promise<UserAvailabilitySlot[]> {
    const { data, error } = await supabase
      .from('user_availability')
      .select('*')
      .eq('user_id', userId)
      .gte('slot_start', new Date().toISOString())
      .order('slot_start', { ascending: true })
      .limit(10);

    if (error || !data) return [];
    return data as UserAvailabilitySlot[];
  },

  /**
   * Find overlapping availability between two users.
   * Returns array of overlapping [start, end] ISO pairs.
   */
  async findOverlappingSlots(
    userId1: string,
    userId2: string,
  ): Promise<Array<{ start: string; end: string }>> {
    const [slots1, slots2] = await Promise.all([
      this.getAvailabilitySlots(userId1),
      this.getAvailabilitySlots(userId2),
    ]);

    const overlaps: Array<{ start: string; end: string }> = [];

    for (const a of slots1) {
      for (const b of slots2) {
        const aStart = new Date(a.slot_start).getTime();
        const aEnd   = new Date(a.slot_end).getTime();
        const bStart = new Date(b.slot_start).getTime();
        const bEnd   = new Date(b.slot_end).getTime();

        const overlapStart = Math.max(aStart, bStart);
        const overlapEnd   = Math.min(aEnd, bEnd);

        if (overlapEnd > overlapStart) {
          overlaps.push({
            start: new Date(overlapStart).toISOString(),
            end:   new Date(overlapEnd).toISOString(),
          });
        }
      }
    }

    return overlaps;
  },

  // ── Formatting ─────────────────────────────────────────────────────────────────

  /**
   * Format remaining time as a human-readable string ("23s 47dk").
   */
  formatTimeLeft(expiresAt: string): string {
    const left = getInvitationTimeLeft(expiresAt);
    if (!left) return 'Süresi doldu';
    if (left.hours === 0) return `${left.minutes} dk kaldı`;
    return `${left.hours}s ${left.minutes}dk kaldı`;
  },

  /**
   * Format a slot time for display ("Pzt 12:30 – 13:00").
   */
  formatSlotTime(isoStart: string, isoEnd: string): string {
    const days   = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const s = new Date(isoStart);
    const e = new Date(isoEnd);
    const hhmm = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${days[s.getDay()]} ${hhmm(s)} – ${hhmm(e)}`;
  },
};
