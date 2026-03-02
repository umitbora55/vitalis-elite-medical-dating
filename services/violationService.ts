/**
 * Violation Service — Community Rules + Zero Tolerance Enforcement
 *
 * Maps report types to violation rules, applies auto-actions,
 * and tracks violation history per user.
 */

import { supabase } from '../src/lib/supabase';
import type { ReportType } from './adminPanelService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViolationSeverity = 'warning' | 'temp_ban' | 'perm_ban';
export type AutoAction = 'none' | 'restrict' | 'temp_ban_24h' | 'temp_ban_7d' | 'temp_ban_3d' | 'perm_ban';

export interface ViolationRule {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  severity: ViolationSeverity;
  auto_action: AutoAction;
  is_zero_tolerance: boolean;
  created_at: string;
}

export interface UserViolation {
  id: string;
  user_id: string;
  rule_code: string;
  report_id: string | null;
  action_taken: string;
  applied_by: string | null;
  auto_applied: boolean;
  notes: string | null;
  created_at: string;
}

// ─── Report type → rule code mapping ─────────────────────────────────────────

const REPORT_TYPE_TO_RULE: Partial<Record<ReportType, string>> = {
  threatening:         'threatening_message',
  harassment:          'persistent_harassment',
  spam:                'spam_messages',
  fake_profile:        'fake_profile',
  inappropriate_photo: 'sexual_content_send',
  underage:            'underage',
};

const AUTO_ACTION_DURATION_HOURS: Partial<Record<AutoAction, number | null>> = {
  temp_ban_24h: 24,
  temp_ban_3d:  72,
  temp_ban_7d:  168,
  perm_ban:     null, // permanent
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const violationService = {

  /**
   * Get all violation rules (public — displayed in community guidelines).
   */
  async getRules(): Promise<ViolationRule[]> {
    const { data } = await supabase
      .from('violation_rules')
      .select('*')
      .order('is_zero_tolerance', { ascending: false })
      .order('severity', { ascending: false });

    return (data ?? []) as ViolationRule[];
  },

  /**
   * Get zero-tolerance rules only.
   */
  async getZeroToleranceRules(): Promise<ViolationRule[]> {
    const { data } = await supabase
      .from('violation_rules')
      .select('*')
      .eq('is_zero_tolerance', true);

    return (data ?? []) as ViolationRule[];
  },

  /**
   * Check whether a report type maps to a zero-tolerance rule.
   */
  async isZeroTolerance(reportType: ReportType): Promise<boolean> {
    const ruleCode = REPORT_TYPE_TO_RULE[reportType];
    if (!ruleCode) return false;

    const { data } = await supabase
      .from('violation_rules')
      .select('is_zero_tolerance')
      .eq('rule_code', ruleCode)
      .maybeSingle();

    return (data as { is_zero_tolerance: boolean } | null)?.is_zero_tolerance === true;
  },

  /**
   * Apply automated action for a given rule code.
   * Called when a report is confirmed or zero-tolerance rule is triggered.
   */
  async applyAutoAction(
    userId: string,
    ruleCode: string,
    reportId?: string
  ): Promise<{ actionTaken: AutoAction; error: string | null }> {
    // Get rule
    const { data: rule, error: ruleErr } = await supabase
      .from('violation_rules')
      .select('*')
      .eq('rule_code', ruleCode)
      .maybeSingle();

    if (ruleErr || !rule) {
      return { actionTaken: 'none', error: ruleErr?.message ?? 'Rule not found' };
    }

    const r = rule as ViolationRule;
    const action = r.auto_action;

    if (action === 'none') {
      return { actionTaken: 'none', error: null };
    }

    // Zero tolerance → call DB function
    if (r.is_zero_tolerance) {
      const { error: fnErr } = await supabase.rpc('fn_apply_zero_tolerance', {
        p_user_id:   userId,
        p_rule_code: ruleCode,
      });

      if (fnErr) return { actionTaken: action, error: fnErr.message };
      return { actionTaken: action, error: null };
    }

    // Non-zero-tolerance → check violation history first
    const history = await violationService.getViolationHistory(userId);
    const priorCount = history.filter((v) => v.rule_code === ruleCode).length;

    // action is guaranteed non-'none' here (early return above handles 'none')
    type NonNoneAction = Exclude<AutoAction, 'none'>;

    // Progressive escalation
    let effectiveAction: NonNoneAction = action as NonNoneAction;
    if (priorCount === 1) {
      // Second offense: escalate one level
      effectiveAction = escalate(action as NonNoneAction);
    } else if (priorCount > 1) {
      // Third+ offense: permanent
      effectiveAction = 'perm_ban';
    }

    // Apply restriction
    const durationHours = AUTO_ACTION_DURATION_HOURS[effectiveAction];
    const expiresAt = durationHours != null
      ? new Date(Date.now() + durationHours * 3_600_000).toISOString()
      : null;

    {
      await supabase.from('user_restrictions').insert({
        user_id:          userId,
        restriction_type: effectiveAction === 'perm_ban' ? 'perm_ban' : 'temp_ban',
        reason:           `Auto: ${ruleCode}`,
        applied_by:       null,
        expires_at:       expiresAt,
      });

      if (effectiveAction === 'perm_ban') {
        await supabase.from('profiles').update({ user_status: 'banned' }).eq('id', userId);
      } else if (effectiveAction !== 'restrict') {
        await supabase.from('profiles').update({ user_status: 'suspended' }).eq('id', userId);
      }
    }

    // Log violation
    await supabase.from('user_violations').insert({
      user_id:      userId,
      rule_code:    ruleCode,
      report_id:    reportId ?? null,
      action_taken: effectiveAction,
      auto_applied: true,
    });

    return { actionTaken: effectiveAction, error: null };
  },

  /**
   * Get violation history for a user.
   */
  async getViolationHistory(userId: string): Promise<UserViolation[]> {
    const { data } = await supabase
      .from('user_violations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return (data ?? []) as UserViolation[];
  },

  /**
   * Map a report type to its rule code.
   */
  getRuleCodeForReport(reportType: ReportType): string | null {
    return REPORT_TYPE_TO_RULE[reportType] ?? null;
  },

  /**
   * Human-readable label for an auto action.
   */
  getActionLabel(action: AutoAction): string {
    const labels: Record<AutoAction, string> = {
      none:         'Eylem yok',
      restrict:     'Kısıtla',
      temp_ban_24h: '24 saat geçici ban',
      temp_ban_3d:  '3 gün geçici ban',
      temp_ban_7d:  '7 gün geçici ban',
      perm_ban:     'Kalıcı ban',
    };
    return labels[action];
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type NonNoneAutoAction = Exclude<AutoAction, 'none'>;

function escalate(action: NonNoneAutoAction): NonNoneAutoAction {
  const ladder: NonNoneAutoAction[] = ['restrict', 'temp_ban_24h', 'temp_ban_3d', 'temp_ban_7d', 'perm_ban'];
  const idx = ladder.indexOf(action);
  return idx < ladder.length - 1 ? (ladder[idx + 1] ?? 'perm_ban') : 'perm_ban';
}
