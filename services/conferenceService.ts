/**
 * conferenceService
 *
 * Feature 10: Conference Mode (Kongre Modu)
 * - Lists active conferences filtered by city and/or date.
 * - Manages attendee registrations and pool opt-in.
 */

import { supabase } from '../src/lib/supabase';
import { Conference, ConferenceAttendee } from '../types';
import { DEMO_CONFERENCES } from '../constants/demoScenarios';

export const conferenceService = {
  /**
   * Returns all currently active conferences.
   * Optionally filtered to those occurring in `city`.
   */
  async getActiveConferences(city?: string): Promise<Conference[]> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      let query = supabase
        .from('conferences')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', today) // not yet ended
        .order('start_date', { ascending: true });

      if (city) query = query.eq('city', city);

      const { data, error } = await query;
      if (error || !data) {
        console.warn('[Conferences] Supabase unavailable, using demo conferences');
        return DEMO_CONFERENCES;
      }
      return data as Conference[];
    } catch (err) {
      console.warn('[Conferences] Supabase unavailable, using demo conferences:', err);
      return DEMO_CONFERENCES;
    }
  },

  /**
   * Registers the user for a conference and optionally opts them into the pool.
   */
  async register(
    conferenceId: string,
    userId: string,
    optInToPool: boolean,
  ): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('conference_attendees')
      .upsert(
        {
          conference_id: conferenceId,
          user_id: userId,
          opted_in_to_pool: optInToPool,
          registered_at: new Date().toISOString(),
        },
        { onConflict: 'conference_id,user_id' },
      );

    return { error: error?.message ?? null };
  },

  /**
   * Updates whether the user has opted into the conference discovery pool.
   */
  async updatePoolOptIn(
    conferenceId: string,
    userId: string,
    optIn: boolean,
  ): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('conference_attendees')
      .update({ opted_in_to_pool: optIn })
      .eq('conference_id', conferenceId)
      .eq('user_id', userId);

    return { error: error?.message ?? null };
  },

  /**
   * Returns all attendees who have opted into the pool for a given conference.
   */
  async getPoolMembers(conferenceId: string): Promise<ConferenceAttendee[]> {
    const { data, error } = await supabase
      .from('conference_attendees')
      .select(`
        conference_id,
        user_id,
        opted_in_to_pool,
        verified_attendee,
        registered_at,
        profiles!conference_attendees_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('conference_id', conferenceId)
      .eq('opted_in_to_pool', true)
      .order('registered_at', { ascending: false });

    if (error || !data) return [];

    return (data as unknown as Array<ConferenceAttendee & {
      profiles: { full_name: string | null; avatar_url: string | null } | null;
    }>).map((row) => ({
      conference_id: row.conference_id,
      user_id: row.user_id,
      opted_in_to_pool: row.opted_in_to_pool,
      verified_attendee: row.verified_attendee,
      registered_at: row.registered_at,
      full_name: row.profiles?.full_name ?? undefined,
      avatar_url: row.profiles?.avatar_url ?? undefined,
    }));
  },

  /**
   * Returns whether the user is registered for the conference.
   */
  async isRegistered(conferenceId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('conference_attendees')
      .select('conference_id')
      .eq('conference_id', conferenceId)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  },
};
