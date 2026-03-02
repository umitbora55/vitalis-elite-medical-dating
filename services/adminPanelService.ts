/**
 * Admin Panel Service — Full admin panel operations
 *
 * Covers: verification queue (SLA), suspicious users, reports/abuse,
 * badge revocations, user bans, and queue statistics.
 *
 * All DB access is gated by RLS (admin role) + server-side trigger logic.
 */

import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support';

export type SlaStatus = 'ok' | 'warning' | 'breached';

export type VerificationQueueStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'needs_more_info';

export type SuspiciousUserSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SuspiciousUserStatus = 'open' | 'investigating' | 'resolved' | 'false_positive';

export type ReportType =
  | 'harassment'
  | 'threatening'
  | 'fake_profile'
  | 'spam'
  | 'inappropriate_photo'
  | 'underage'
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export type RestrictionType =
  | 'shadow_limit'
  | 'messaging_disabled'
  | 'matching_disabled'
  | 'temp_ban'
  | 'perm_ban';

export type BadgeRevocationStatus =
  | 'pending'
  | 'approved'
  | 'appealed'
  | 'appeal_approved'
  | 'appeal_rejected';

export interface VerificationQueueItem {
  id: string;
  user_id: string;
  status: VerificationQueueStatus;
  sla_deadline: string;
  sla_status: SlaStatus;
  priority: number;
  assigned_to: string | null;
  assigned_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  // Joined profile data
  user_name: string | null;
  user_email: string | null;
  user_city: string | null;
  subscription_tier: string | null;
  verification_method: string | null;
}

export interface VerificationQueueFilters {
  status?: VerificationQueueStatus[];
  slaStatus?: SlaStatus;
  assignedToMe?: boolean;
  search?: string;
}

export interface SuspiciousUser {
  id: string;
  user_id: string;
  flag_reason: string;
  severity: SuspiciousUserSeverity;
  status: SuspiciousUserStatus;
  evidence: Record<string, unknown>;
  flagged_by: string | null;
  auto_flagged: boolean;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  // Joined
  user_name: string | null;
  user_email: string | null;
  user_city: string | null;
  report_count: number;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: ReportType;
  description: string | null;
  evidence_urls: string[];
  status: ReportStatus;
  assigned_to: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  auto_actioned: boolean;
  created_at: string;
  resolved_at: string | null;
  // Joined
  reporter_name: string | null;
  reported_user_name: string | null;
  reported_user_email: string | null;
}

export interface UserRestriction {
  id: string;
  user_id: string;
  restriction_type: RestrictionType;
  reason: string;
  applied_by: string | null;
  applied_at: string;
  expires_at: string | null;
  lifted_at: string | null;
  lifted_by: string | null;
}

export interface BadgeRevocation {
  id: string;
  user_id: string;
  revoked_by: string;
  reason: string;
  evidence_notes: string | null;
  status: BadgeRevocationStatus;
  appeal_text: string | null;
  appeal_reviewed_by: string | null;
  appeal_reviewed_at: string | null;
  created_at: string;
  // Joined
  user_name: string | null;
  user_email: string | null;
}

export interface QueueStats {
  verificationPending: number;
  verificationBreached: number;
  verificationWarning: number;
  suspiciousOpen: number;
  suspiciousCritical: number;
  reportsOpen: number;
  reportsAutoActioned: number;
}

export interface BanDuration {
  label: string;
  hours: number | null; // null = permanent
}

export const BAN_DURATIONS: BanDuration[] = [
  { label: '1 Gün',      hours: 24 },
  { label: '3 Gün',      hours: 72 },
  { label: '7 Gün',      hours: 168 },
  { label: '30 Gün',     hours: 720 },
  { label: 'Kalıcı',     hours: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseError = (e: unknown): string => {
  if (!e) return 'Bilinmeyen hata';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Bilinmeyen hata';
};

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>;

async function adminQuery<T>(
  fn: () => PromiseLike<{ data: T | null; error: unknown }>
): ServiceResult<T> {
  try {
    const { data, error } = await fn();
    if (error) return { data: null, error: parseError(error) };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: parseError(e) };
  }
}

// ─── Verification Queue ───────────────────────────────────────────────────────

export const adminPanelService = {

  async getVerificationQueue(
    filters: VerificationQueueFilters = {}
  ): ServiceResult<VerificationQueueItem[]> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id;

      let query = supabase
        .from('verification_queue')
        .select(`
          id,
          user_id,
          status,
          sla_deadline,
          sla_status,
          priority,
          assigned_to,
          assigned_at,
          created_at,
          reviewed_at,
          reviewed_by,
          rejection_reason,
          notes,
          profiles!inner (
            full_name,
            email,
            city,
            subscription_tier,
            verification_method
          )
        `)
        .order('priority', { ascending: false })
        .order('sla_deadline', { ascending: true });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.slaStatus) {
        query = query.eq('sla_status', filters.slaStatus);
      }
      if (filters.assignedToMe && currentUserId) {
        query = query.eq('assigned_to', currentUserId);
      }

      const { data, error } = await query;
      if (error) return { data: null, error };

      const items: VerificationQueueItem[] = (data ?? []).map((row) => {
        const p = (row.profiles as unknown as Record<string, string | null>) ?? {};
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          status: row.status as VerificationQueueStatus,
          sla_deadline: row.sla_deadline as string,
          sla_status: row.sla_status as SlaStatus,
          priority: row.priority as number,
          assigned_to: row.assigned_to as string | null,
          assigned_at: row.assigned_at as string | null,
          created_at: row.created_at as string,
          reviewed_at: row.reviewed_at as string | null,
          reviewed_by: row.reviewed_by as string | null,
          rejection_reason: row.rejection_reason as string | null,
          notes: row.notes as string | null,
          user_name: p['full_name'] ?? null,
          user_email: p['email'] ?? null,
          user_city: p['city'] ?? null,
          subscription_tier: p['subscription_tier'] ?? null,
          verification_method: p['verification_method'] ?? null,
        };
      });

      if (filters.search) {
        const s = filters.search.toLowerCase();
        return {
          data: items.filter(
            (i) =>
              (i.user_name ?? '').toLowerCase().includes(s) ||
              (i.user_email ?? '').toLowerCase().includes(s)
          ),
          error: null,
        };
      }

      return { data: items, error: null };
    });
  },

  async assignVerificationToSelf(queueItemId: string): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      return supabase
        .from('verification_queue')
        .update({
          assigned_to: userId,
          assigned_at: new Date().toISOString(),
          status: 'in_review',
        })
        .eq('id', queueItemId)
        .then(({ error }) => ({ data: null as null, error }));
    });
  },

  async approveVerification(queueItemId: string, notes?: string): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      // Get user_id first
      const { data: item, error: fetchErr } = await supabase
        .from('verification_queue')
        .select('user_id')
        .eq('id', queueItemId)
        .single();
      if (fetchErr || !item) return { data: null, error: fetchErr };

      // Update queue
      const { error: qErr } = await supabase
        .from('verification_queue')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          notes: notes ?? null,
        })
        .eq('id', queueItemId);
      if (qErr) return { data: null, error: qErr };

      // Update profile verification_status
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ verification_status: 'VERIFIED' })
        .eq('id', item.user_id);
      if (pErr) return { data: null, error: pErr };

      // Log action
      await supabase.from('admin_action_log').insert({
        actor_id: userId,
        action: 'verification_approved',
        entity_type: 'verification_queue',
        entity_id: queueItemId,
        metadata: { user_id: item.user_id, notes },
      });

      return { data: null, error: null };
    });
  },

  async rejectVerification(
    queueItemId: string,
    rejectionReason: string,
    notes?: string
  ): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      const { data: item, error: fetchErr } = await supabase
        .from('verification_queue')
        .select('user_id')
        .eq('id', queueItemId)
        .single();
      if (fetchErr || !item) return { data: null, error: fetchErr };

      const { error: qErr } = await supabase
        .from('verification_queue')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          notes: notes ?? null,
        })
        .eq('id', queueItemId);
      if (qErr) return { data: null, error: qErr };

      const { error: pErr } = await supabase
        .from('profiles')
        .update({ verification_status: 'REJECTED' })
        .eq('id', item.user_id);
      if (pErr) return { data: null, error: pErr };

      await supabase.from('admin_action_log').insert({
        actor_id: userId,
        action: 'verification_rejected',
        entity_type: 'verification_queue',
        entity_id: queueItemId,
        metadata: { user_id: item.user_id, reason: rejectionReason, notes },
      });

      return { data: null, error: null };
    });
  },

  async requestMoreInfo(
    queueItemId: string,
    notes: string
  ): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      const { error } = await supabase
        .from('verification_queue')
        .update({
          status: 'needs_more_info',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', queueItemId);

      return { data: null as null, error };
    });
  },

  // ─── Suspicious Users ──────────────────────────────────────────────────────

  async getSuspiciousUsers(
    status?: SuspiciousUserStatus,
    severity?: SuspiciousUserSeverity
  ): ServiceResult<SuspiciousUser[]> {
    return adminQuery(async () => {
      let query = supabase
        .from('suspicious_users')
        .select(`
          id,
          user_id,
          flag_reason,
          severity,
          status,
          evidence,
          flagged_by,
          auto_flagged,
          resolved_by,
          resolution_notes,
          created_at,
          profiles!inner (
            full_name,
            email,
            city
          )
        `)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (severity) query = query.eq('severity', severity);

      const { data, error } = await query;
      if (error) return { data: null, error };

      // Get report counts per user
      const userIds = (data ?? []).map((r) => r.user_id as string);
      const { data: reportCounts } = await supabase
        .from('reports')
        .select('reported_user_id')
        .in('reported_user_id', userIds);

      const countMap: Record<string, number> = {};
      (reportCounts ?? []).forEach((r) => {
        const uid = r.reported_user_id as string;
        countMap[uid] = (countMap[uid] ?? 0) + 1;
      });

      const items: SuspiciousUser[] = (data ?? []).map((row) => {
        const p = (row.profiles as unknown as Record<string, string | null>) ?? {};
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          flag_reason: row.flag_reason as string,
          severity: row.severity as SuspiciousUserSeverity,
          status: row.status as SuspiciousUserStatus,
          evidence: (row.evidence as Record<string, unknown>) ?? {},
          flagged_by: row.flagged_by as string | null,
          auto_flagged: row.auto_flagged as boolean,
          resolved_by: row.resolved_by as string | null,
          resolution_notes: row.resolution_notes as string | null,
          created_at: row.created_at as string,
          user_name: p['full_name'] ?? null,
          user_email: p['email'] ?? null,
          user_city: p['city'] ?? null,
          report_count: countMap[row.user_id as string] ?? 0,
        };
      });

      return { data: items, error: null };
    });
  },

  async resolveFlag(
    flagId: string,
    resolution: 'resolved' | 'false_positive',
    notes: string
  ): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      const { error } = await supabase
        .from('suspicious_users')
        .update({
          status: resolution,
          resolved_by: userId,
          resolution_notes: notes,
        })
        .eq('id', flagId);

      if (!error) {
        await supabase.from('admin_action_log').insert({
          actor_id: userId,
          action: 'flag_resolved',
          entity_type: 'suspicious_users',
          entity_id: flagId,
          metadata: { resolution, notes },
        });
      }

      return { data: null as null, error };
    });
  },

  // ─── Reports / Abuse Queue ─────────────────────────────────────────────────

  async getReports(
    status?: ReportStatus,
    type?: ReportType
  ): ServiceResult<Report[]> {
    return adminQuery(async () => {
      let query = supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_user_id,
          report_type,
          description,
          evidence_urls,
          status,
          assigned_to,
          resolved_by,
          resolution_notes,
          auto_actioned,
          created_at,
          resolved_at,
          reporter:profiles!reports_reporter_id_fkey (
            full_name
          ),
          reported:profiles!reports_reported_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (type) query = query.eq('report_type', type);

      const { data, error } = await query;
      if (error) return { data: null, error };

      const items: Report[] = (data ?? []).map((row) => {
        const reporter = (row.reporter as unknown as Record<string, string | null>) ?? {};
        const reported = (row.reported as unknown as Record<string, string | null>) ?? {};
        return {
          id: row.id as string,
          reporter_id: row.reporter_id as string,
          reported_user_id: row.reported_user_id as string,
          report_type: row.report_type as ReportType,
          description: row.description as string | null,
          evidence_urls: (row.evidence_urls as string[]) ?? [],
          status: row.status as ReportStatus,
          assigned_to: row.assigned_to as string | null,
          resolved_by: row.resolved_by as string | null,
          resolution_notes: row.resolution_notes as string | null,
          auto_actioned: row.auto_actioned as boolean,
          created_at: row.created_at as string,
          resolved_at: row.resolved_at as string | null,
          reporter_name: reporter['full_name'] ?? null,
          reported_user_name: reported['full_name'] ?? null,
          reported_user_email: reported['email'] ?? null,
        };
      });

      return { data: items, error: null };
    });
  },

  async resolveReport(
    reportId: string,
    resolution: 'resolved' | 'dismissed',
    notes: string
  ): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      const { error } = await supabase
        .from('reports')
        .update({
          status: resolution,
          resolved_by: userId,
          resolution_notes: notes,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (!error) {
        await supabase.from('admin_action_log').insert({
          actor_id: userId,
          action: 'report_resolved',
          entity_type: 'reports',
          entity_id: reportId,
          metadata: { resolution, notes },
        });
      }

      return { data: null as null, error };
    });
  },

  // ─── User Restrictions / Bans ──────────────────────────────────────────────

  async banUser(
    targetUserId: string,
    restrictionType: RestrictionType,
    reason: string,
    durationHours: number | null
  ): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      const expiresAt = durationHours
        ? new Date(Date.now() + durationHours * 3600 * 1000).toISOString()
        : null;

      const { error: rErr } = await supabase.from('user_restrictions').insert({
        user_id: targetUserId,
        restriction_type: restrictionType,
        reason,
        applied_by: userId,
        expires_at: expiresAt,
      });
      if (rErr) return { data: null, error: rErr };

      // If perm_ban or temp_ban, update profile status
      if (restrictionType === 'perm_ban') {
        await supabase
          .from('profiles')
          .update({ user_status: 'banned' })
          .eq('id', targetUserId);
      } else if (restrictionType === 'temp_ban') {
        await supabase
          .from('profiles')
          .update({ user_status: 'suspended' })
          .eq('id', targetUserId);
      }

      await supabase.from('admin_action_log').insert({
        actor_id: userId,
        action: 'user_banned',
        entity_type: 'profiles',
        entity_id: targetUserId,
        metadata: {
          restriction_type: restrictionType,
          reason,
          duration_hours: durationHours,
          expires_at: expiresAt,
        },
      });

      return { data: null, error: null };
    });
  },

  async liftBan(restrictionId: string): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      const { data: restriction, error: fetchErr } = await supabase
        .from('user_restrictions')
        .select('user_id, restriction_type')
        .eq('id', restrictionId)
        .single();
      if (fetchErr || !restriction) return { data: null, error: fetchErr };

      const { error: uErr } = await supabase
        .from('user_restrictions')
        .update({
          lifted_at: new Date().toISOString(),
          lifted_by: userId,
        })
        .eq('id', restrictionId);
      if (uErr) return { data: null, error: uErr };

      // Restore profile status for bans
      const rType = restriction.restriction_type as string;
      if (rType === 'perm_ban' || rType === 'temp_ban') {
        await supabase
          .from('profiles')
          .update({ user_status: 'active' })
          .eq('id', restriction.user_id);
      }

      await supabase.from('admin_action_log').insert({
        actor_id: userId,
        action: 'ban_lifted',
        entity_type: 'user_restrictions',
        entity_id: restrictionId,
        metadata: { target_user_id: restriction.user_id },
      });

      return { data: null, error: null };
    });
  },

  async getUserRestrictions(targetUserId: string): ServiceResult<UserRestriction[]> {
    return adminQuery(async () =>
      supabase
        .from('user_restrictions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('applied_at', { ascending: false })
    );
  },

  // ─── Badge Revocations ────────────────────────────────────────────────────

  async revokeBadge(
    targetUserId: string,
    reason: string,
    evidenceNotes?: string
  ): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      // Create revocation record
      const { error: rErr } = await supabase.from('badge_revocations').insert({
        user_id: targetUserId,
        revoked_by: userId,
        reason,
        evidence_notes: evidenceNotes ?? null,
        status: 'approved',
      });
      if (rErr) return { data: null, error: rErr };

      // Update profile
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ verification_status: 'REVOKED' })
        .eq('id', targetUserId);
      if (pErr) return { data: null, error: pErr };

      await supabase.from('admin_action_log').insert({
        actor_id: userId,
        action: 'badge_revoked',
        entity_type: 'profiles',
        entity_id: targetUserId,
        metadata: { reason, evidence_notes: evidenceNotes },
      });

      return { data: null, error: null };
    });
  },

  async getBadgeRevocationHistory(targetUserId: string): ServiceResult<BadgeRevocation[]> {
    return adminQuery(async () => {
      const { data, error } = await supabase
        .from('badge_revocations')
        .select(`
          *,
          profiles!badge_revocations_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) return { data: null, error };

      const items: BadgeRevocation[] = (data ?? []).map((row) => {
        const p = (row.profiles as unknown as Record<string, string | null>) ?? {};
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          revoked_by: row.revoked_by as string,
          reason: row.reason as string,
          evidence_notes: row.evidence_notes as string | null,
          status: row.status as BadgeRevocationStatus,
          appeal_text: row.appeal_text as string | null,
          appeal_reviewed_by: row.appeal_reviewed_by as string | null,
          appeal_reviewed_at: row.appeal_reviewed_at as string | null,
          created_at: row.created_at as string,
          user_name: p['full_name'] ?? null,
          user_email: p['email'] ?? null,
        };
      });

      return { data: items, error: null };
    });
  },

  async handleBadgeAppeal(
    revocationId: string,
    approved: boolean,
    notes?: string
  ): ServiceResult<null> {
    return adminQuery(async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { data: null, error: 'Not authenticated' };

      const newStatus: BadgeRevocationStatus = approved ? 'appeal_approved' : 'appeal_rejected';

      const { data: rev, error: fetchErr } = await supabase
        .from('badge_revocations')
        .select('user_id')
        .eq('id', revocationId)
        .single();
      if (fetchErr || !rev) return { data: null, error: fetchErr };

      const { error: uErr } = await supabase
        .from('badge_revocations')
        .update({
          status: newStatus,
          appeal_reviewed_by: userId,
          appeal_reviewed_at: new Date().toISOString(),
          evidence_notes: notes ?? null,
        })
        .eq('id', revocationId);
      if (uErr) return { data: null, error: uErr };

      // Restore badge if appeal approved
      if (approved) {
        await supabase
          .from('profiles')
          .update({ verification_status: 'VERIFIED' })
          .eq('id', rev.user_id);
      }

      await supabase.from('admin_action_log').insert({
        actor_id: userId,
        action: approved ? 'badge_appeal_approved' : 'badge_appeal_rejected',
        entity_type: 'badge_revocations',
        entity_id: revocationId,
        metadata: { target_user_id: rev.user_id, notes },
      });

      return { data: null, error: null };
    });
  },

  // ─── Queue Stats ──────────────────────────────────────────────────────────

  async getQueueStats(): ServiceResult<QueueStats> {
    return adminQuery(async () => {
      const [
        { count: verPending },
        { count: verBreached },
        { count: verWarning },
        { count: suspOpen },
        { count: suspCritical },
        { count: repOpen },
        { count: repAuto },
      ] = await Promise.all([
        supabase
          .from('verification_queue')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'in_review']),
        supabase
          .from('verification_queue')
          .select('*', { count: 'exact', head: true })
          .eq('sla_status', 'breached')
          .in('status', ['pending', 'in_review']),
        supabase
          .from('verification_queue')
          .select('*', { count: 'exact', head: true })
          .eq('sla_status', 'warning')
          .in('status', ['pending', 'in_review']),
        supabase
          .from('suspicious_users')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open'),
        supabase
          .from('suspicious_users')
          .select('*', { count: 'exact', head: true })
          .eq('severity', 'critical')
          .eq('status', 'open'),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'under_review']),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('auto_actioned', true)
          .in('status', ['pending', 'under_review']),
      ]);

      return {
        data: {
          verificationPending: verPending ?? 0,
          verificationBreached: verBreached ?? 0,
          verificationWarning: verWarning ?? 0,
          suspiciousOpen: suspOpen ?? 0,
          suspiciousCritical: suspCritical ?? 0,
          reportsOpen: repOpen ?? 0,
          reportsAutoActioned: repAuto ?? 0,
        },
        error: null,
      };
    });
  },

  // ─── SLA helpers ─────────────────────────────────────────────────────────

  getSlaColor(slaStatus: SlaStatus): string {
    switch (slaStatus) {
      case 'breached': return 'text-red-400';
      case 'warning':  return 'text-amber-400';
      default:         return 'text-emerald-400';
    }
  },

  getSlaLabel(slaStatus: SlaStatus): string {
    switch (slaStatus) {
      case 'breached': return 'SLA Aşıldı';
      case 'warning':  return 'SLA Uyarı';
      default:         return 'SLA OK';
    }
  },

  getSlaTimeLeft(deadline: string): string {
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return 'Süresi geçmiş';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (h > 0) return `${h}s ${m}d kaldı`;
    return `${m}d kaldı`;
  },

  getSeverityColor(severity: SuspiciousUserSeverity): string {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':     return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium':   return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:         return 'text-slate-400 bg-slate-700/40 border-slate-600/30';
    }
  },

  getReportTypeLabel(type: ReportType): string {
    const labels: Record<ReportType, string> = {
      harassment:          'Taciz',
      threatening:         'Tehdit',
      fake_profile:        'Sahte Profil',
      spam:                'Spam',
      inappropriate_photo: 'Uygunsuz Fotoğraf',
      underage:            'Yaş Altı',
      other:               'Diğer',
    };
    return labels[type] ?? type;
  },

  getReportTypeIcon(type: ReportType): string {
    const icons: Record<ReportType, string> = {
      harassment:          '🚨',
      threatening:         '⚠️',
      fake_profile:        '🎭',
      spam:                '📢',
      inappropriate_photo: '🔞',
      underage:            '🛑',
      other:               '❓',
    };
    return icons[type] ?? '❓';
  },

  // ── Feature 7: İtiraz Kuyruğu (Admin) ──────────────────────────────────

  async getAppealQueue(status?: string): Promise<import('../types').AppealQueueItem[]> {
    let query = supabase
      .from('appeals')
      .select(`
        id, user_id, appeal_type, status, priority,
        submitted_at, sla_deadline, user_statement, notification_id,
        profiles!appeals_user_id_fkey (name, photos)
      `)
      .order('submitted_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['pending', 'under_review']);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('[adminPanelService] getAppealQueue:', error);
      return [];
    }

    return (data ?? []).map((row) => {
      const profile = row.profiles as { name?: string; photos?: string[] } | null;
      const sla = row.sla_deadline as string | null;
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        user_name: (profile?.name ?? 'Bilinmeyen Kullanıcı') as string,
        user_avatar: (profile?.photos?.[0] ?? null) as string | null,
        appeal_type: row.appeal_type as string,
        status: row.status as import('../types').AppealStatus,
        priority: row.priority as string,
        submitted_at: row.submitted_at as string,
        sla_deadline: sla,
        is_sla_breached: sla ? new Date(sla).getTime() < Date.now() : false,
        user_statement_preview: ((row.user_statement as string) ?? '').slice(0, 120),
        notification_action_type: null,
        reason_code: null,
      } satisfies import('../types').AppealQueueItem;
    });
  },

  async reviewAppeal(
    appealId: string,
    decision: 'approved' | 'denied' | 'escalated',
    decisionReason: string,
    reviewerNotes?: string,
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('appeals')
      .update({
        status: decision,
        decision,
        decision_reason: decisionReason,
        reviewer_notes: reviewerNotes ?? null,
        reviewed_at: new Date().toISOString(),
        decided_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', appealId);

    if (error) {
      console.error('[adminPanelService] reviewAppeal:', error);
      return false;
    }

    // Audit log
    await supabase.from('admin_action_log').insert({
      actor_id: user.id,
      actor_role: 'moderator',
      action: `appeal_${decision}`,
      entity_type: 'appeal',
      entity_id: appealId,
      metadata: { decision, reason: decisionReason },
    });

    return true;
  },

  async sendModerationNotification(payload: {
    user_id: string;
    notification_type: string;
    action_type: string;
    reason_code: string | null;
    title_tr: string;
    body_tr: string;
    evidence_summary?: string;
    is_automated: boolean;
    expires_at?: string;
    related_action_id?: string;
  }): Promise<string | null> {
    const { data, error } = await supabase.rpc('create_moderation_notification', {
      p_user_id: payload.user_id,
      p_notification_type: payload.notification_type,
      p_action_type: payload.action_type,
      p_reason_code: payload.reason_code,
      p_title_tr: payload.title_tr,
      p_body_tr: payload.body_tr,
      p_evidence_summary: payload.evidence_summary ?? null,
      p_is_automated: payload.is_automated,
      p_expires_at: payload.expires_at ?? null,
      p_related_action_id: payload.related_action_id ?? null,
    });

    if (error) {
      console.error('[adminPanelService] sendModerationNotification:', error);
      return null;
    }
    return data as string;
  },
};
