/**
 * clubService
 *
 * Feature 6: Health Social Clubs
 * - CRUD for clubs and memberships.
 * - Supports category + city filtering.
 */

import { supabase } from '../src/lib/supabase';
import { Club, ClubCategory, ClubMember } from '../types';
import { DEMO_CLUBS } from '../constants/demoScenarios';

export interface CreateClubPayload {
  name: string;
  description: string;
  category: ClubCategory;
  creatorId: string;
  maxMembers?: number;
  city?: string;
  coverImage?: string;
}

export const clubService = {
  /**
   * Returns active clubs, optionally filtered by city and/or category.
   * Includes a member_count aggregate and whether the current user has joined.
   */
  async getClubs(filters?: {
    city?: string;
    category?: ClubCategory;
    userId?: string;
  }): Promise<Club[]> {
    try {
      let query = supabase
        .from('clubs')
        .select(`
        *,
        member_count:club_members(count)
      `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters?.city) query = query.eq('city', filters.city);
      if (filters?.category) query = query.eq('category', filters.category);

      const { data, error } = await query;
      if (error || !data) {
        console.warn('[Clubs] Supabase unavailable, using demo clubs');
        return DEMO_CLUBS;
      }

      // Attach is_member flag if userId provided
      const clubs = (data as unknown as Array<Club & { member_count: { count: number }[] }>).map(
        (row) => ({
          ...row,
          member_count: (row.member_count as unknown as { count: number }[])?.[0]?.count ?? 0,
        }),
      );

      if (!filters?.userId) return clubs as Club[];

      // Batch check membership
      const { data: memberships } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', filters.userId)
        .in('club_id', clubs.map((c) => c.id));

      const memberSet = new Set((memberships ?? []).map((m: { club_id: string }) => m.club_id));
      return clubs.map((c) => ({ ...c, is_member: memberSet.has(c.id) })) as Club[];
    } catch (err) {
      console.warn('[Clubs] Supabase unavailable, using demo clubs:', err);
      return DEMO_CLUBS;
    }
  },

  /**
   * Creates a new club and automatically adds the creator as a member.
   */
  async createClub(
    payload: CreateClubPayload,
  ): Promise<{ error: string | null; club: Club | null }> {
    const { data: club, error } = await supabase
      .from('clubs')
      .insert({
        name: payload.name,
        description: payload.description,
        category: payload.category,
        creator_id: payload.creatorId,
        max_members: payload.maxMembers ?? 50,
        city: payload.city ?? null,
        cover_image: payload.coverImage ?? null,
      })
      .select()
      .single();

    if (error || !club) return { error: error?.message ?? 'Kulüp oluşturulamadı.', club: null };

    // Add creator as 'creator' role member
    await supabase.from('club_members').insert({
      club_id: club.id,
      user_id: payload.creatorId,
      role: 'creator',
      joined_at: new Date().toISOString(),
    });

    return { error: null, club: club as Club };
  },

  /**
   * Joins a club as a regular member.
   */
  async joinClub(clubId: string, userId: string): Promise<{ error: string | null }> {
    // Check capacity
    const { count } = await supabase
      .from('club_members')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    const { data: club } = await supabase
      .from('clubs')
      .select('max_members')
      .eq('id', clubId)
      .maybeSingle();

    if (club && count !== null && count >= club.max_members) {
      return { error: 'Kulüp kapasitesi doldu.' };
    }

    const { error } = await supabase
      .from('club_members')
      .upsert(
        { club_id: clubId, user_id: userId, role: 'member', joined_at: new Date().toISOString() },
        { onConflict: 'club_id,user_id', ignoreDuplicates: true },
      );

    return { error: error?.message ?? null };
  },

  /**
   * Removes a user from a club (cannot remove creator).
   */
  async leaveClub(clubId: string, userId: string): Promise<{ error: string | null }> {
    const { data: membership } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membership?.role === 'creator') {
      return { error: 'Kulüp kurucusu ayrılamaz.' };
    }

    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId);

    return { error: error?.message ?? null };
  },

  /**
   * Returns all members of a club with basic profile info.
   */
  async getMembers(clubId: string): Promise<ClubMember[]> {
    const { data, error } = await supabase
      .from('club_members')
      .select(`
        club_id,
        user_id,
        role,
        joined_at,
        profiles!club_members_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('club_id', clubId)
      .order('joined_at', { ascending: true });

    if (error || !data) return [];

    return (data as unknown as Array<{
      club_id: string;
      user_id: string;
      role: 'creator' | 'admin' | 'member';
      joined_at: string;
      profiles: { full_name: string | null; avatar_url: string | null } | null;
    }>).map((row) => ({
      club_id: row.club_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      full_name: row.profiles?.full_name ?? undefined,
      avatar_url: row.profiles?.avatar_url ?? undefined,
    }));
  },

  /**
   * Returns whether the given user is a member of the given club.
   */
  async isMember(clubId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  },
};
