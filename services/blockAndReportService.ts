/**
 * Block & Report Service — Quick block + report combined flow
 *
 * Handles:
 *   - blockUser()          → Simple block
 *   - blockAndReport()     → Block + create report in one call
 *   - getBlockedUsers()    → List of blocked user IDs
 *   - unblockUser()        → Remove block
 *   - isBlocked()          → Check if A blocked B or B blocked A
 */

import { supabase } from '../src/lib/supabase';
import type { ReportType } from './adminPanelService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlockRecord {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  with_report: boolean;
  report_id: string | null;
  created_at: string;
}

export interface BlockedUserSummary {
  blocked_id: string;
  blocked_name: string | null;
  blocked_avatar: string | null;
  blocked_at: string;
  with_report: boolean;
}

export interface BlockAndReportPayload {
  blockerId: string;
  blockedId: string;
  reportType: ReportType;
  description?: string;
  evidenceUrls?: string[];
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

const getAuthUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const blockAndReportService = {

  /**
   * Block a user without filing a report.
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    reason?: string
  ): Promise<{ error: string | null }> {
    // AUDIT-FIX IDOR: Validate caller owns blockerId
    const authUser = await getAuthUser();
    if (!authUser) return { error: 'Oturum açık değil' };
    if (authUser.id !== blockerId) return { error: 'Başka bir kullanıcı adına işlem yapılamaz' };

    // Upsert — ignore if already blocked
    const { error } = await supabase
      .from('blocks')
      .upsert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        reason: reason ?? null,
        with_report: false,
      }, { onConflict: 'blocker_id,blocked_id' });

    if (error) return { error: error.message };

    // Hide match / conversation — AUDIT-FIX: correct column names profile_1_id/profile_2_id
    await supabase
      .from('matches')
      .update({ is_hidden: true })
      .or(`and(profile_1_id.eq.${blockerId},profile_2_id.eq.${blockedId}),and(profile_1_id.eq.${blockedId},profile_2_id.eq.${blockerId})`);

    return { error: null };
  },

  /**
   * Block a user AND file a moderation report in one atomic-ish operation.
   */
  async blockAndReport(
    payload: BlockAndReportPayload
  ): Promise<{ error: string | null; reportId: string | null }> {
    const { blockerId, blockedId, reportType, description, evidenceUrls } = payload;

    // AUDIT-FIX IDOR: Validate caller owns blockerId
    const authUser = await getAuthUser();
    if (!authUser) return { error: 'Oturum açık değil', reportId: null };
    if (authUser.id !== blockerId) return { error: 'Başka bir kullanıcı adına işlem yapılamaz', reportId: null };

    // 1. Create the report — AUDIT-FIX: reported_id (not reported_user_id)
    const { data: reportRow, error: rErr } = await supabase
      .from('reports')
      .insert({
        reporter_id:  blockerId,
        reported_id:  blockedId,
        report_type:  reportType,
        description:  description ?? null,
        evidence_urls: evidenceUrls ?? [],
        status:       'pending',
      })
      .select('id')
      .single();

    if (rErr) return { error: rErr.message, reportId: null };

    const reportId = (reportRow as { id: string }).id;

    // 2. Upsert block, linking the report
    const { error: bErr } = await supabase
      .from('blocks')
      .upsert({
        blocker_id:  blockerId,
        blocked_id:  blockedId,
        reason:      reportType,
        with_report: true,
        report_id:   reportId,
      }, { onConflict: 'blocker_id,blocked_id' });

    if (bErr) return { error: bErr.message, reportId };

    // 3. Hide the match — AUDIT-FIX: correct column names profile_1_id/profile_2_id
    await supabase
      .from('matches')
      .update({ is_hidden: true })
      .or(`and(profile_1_id.eq.${blockerId},profile_2_id.eq.${blockedId}),and(profile_1_id.eq.${blockedId},profile_2_id.eq.${blockerId})`);

    return { error: null, reportId };
  },

  /**
   * Get the list of user IDs blocked by the given user.
   */
  async getBlockedUsers(userId: string): Promise<BlockedUserSummary[]> {
    // AUDIT-FIX IDOR: Only own blocked list is accessible
    const authUser = await getAuthUser();
    if (!authUser || authUser.id !== userId) return [];

    const { data, error } = await supabase
      .from('blocks')
      .select(`
        blocked_id,
        with_report,
        created_at,
        profiles!blocks_blocked_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => {
      const profile = row.profiles as unknown as Record<string, string | null> | null;
      return {
        blocked_id:    row.blocked_id as string,
        blocked_name:  profile?.['full_name'] ?? null,
        blocked_avatar: profile?.['avatar_url'] ?? null,
        blocked_at:    row.created_at as string,
        with_report:   row.with_report as boolean,
      };
    });
  },

  /**
   * Get all blocked IDs for a user (lightweight, for filtering discovery).
   */
  async getBlockedIds(userId: string): Promise<string[]> {
    // AUDIT-FIX IDOR: Only own blocked IDs are accessible
    const authUser = await getAuthUser();
    if (!authUser || authUser.id !== userId) return [];

    const { data } = await supabase
      .from('blocks')
      .select('blocked_id, blocker_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    if (!data) return [];

    return data.map((row) =>
      (row.blocker_id as string) === userId
        ? (row.blocked_id as string)
        : (row.blocker_id as string)
    );
  },

  /**
   * Unblock a user.
   */
  async unblockUser(
    blockerId: string,
    blockedId: string
  ): Promise<{ error: string | null }> {
    // AUDIT-FIX IDOR: Validate caller owns blockerId
    const authUser = await getAuthUser();
    if (!authUser) return { error: 'Oturum açık değil' };
    if (authUser.id !== blockerId) return { error: 'Başka bir kullanıcı adına işlem yapılamaz' };

    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    return { error: error ? error.message : null };
  },

  /**
   * Check if two users are mutually blocked (either direction).
   */
  async isBlocked(userA: string, userB: string): Promise<boolean> {
    const { count } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })
      .or(
        `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),` +
        `and(blocker_id.eq.${userB},blocked_id.eq.${userA})`
      );

    return (count ?? 0) > 0;
  },
};
