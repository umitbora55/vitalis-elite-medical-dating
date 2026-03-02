/**
 * qrCheckinService
 *
 * Feature 3: Partner Venue + QR Check-in
 * - Look up a venue by its QR token.
 * - Record a venue check-in linked to an optional date plan.
 */

import { supabase } from '../src/lib/supabase';
import { PartnerVenue, VenueCheckin } from '../types';

interface CheckInPayload {
  venueId: string;
  userId:  string;
  planId?: string;
  qrToken: string;
}

export const qrCheckinService = {
  /**
   * Fetches the venue that owns the given QR token.
   * Returns null when no active venue is found.
   */
  async getVenueByToken(qrToken: string): Promise<PartnerVenue | null> {
    const { data, error } = await supabase
      .from('partner_venues')
      .select('id, name, address, city, qr_token, is_active')
      .eq('qr_token', qrToken)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;
    return data as PartnerVenue;
  },

  /**
   * Records that userId has checked in at venueId.
   * Idempotent — duplicate check-ins are silently ignored via UNIQUE constraint.
   */
  async checkInToVenue(payload: CheckInPayload): Promise<{ error: string | null }> {
    const { venueId, userId, planId, qrToken } = payload;

    const { error } = await supabase
      .from('venue_checkins')
      .upsert(
        {
          venue_id:  venueId,
          user_id:   userId,
          plan_id:   planId ?? null,
          qr_token:  qrToken,
          checked_in_at: new Date().toISOString(),
        },
        { onConflict: 'venue_id,user_id,plan_id', ignoreDuplicates: true },
      );

    return { error: error?.message ?? null };
  },

  /**
   * Returns all venue check-ins for the given user.
   */
  async getVenueCheckins(userId: string): Promise<VenueCheckin[]> {
    const { data, error } = await supabase
      .from('venue_checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checked_in_at', { ascending: false });

    if (error || !data) return [];
    return data as VenueCheckin[];
  },
};
