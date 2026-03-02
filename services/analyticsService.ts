/**
 * Analytics Service — KPI dashboard and trend data
 *
 * Reads from analytics_daily table (aggregated nightly by fn_aggregate_daily_stats).
 * Provides KPI snapshots, trend arrays, and computed deltas for the admin dashboard.
 */

import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyStats {
  stat_date: string;
  new_registrations: number;
  new_verifications: number;
  new_matches: number;
  new_messages: number;
  active_users: number;
  premium_conversions: number;
  churn_count: number;
  verification_queue_size: number;
  avg_verification_hours: number;
  sla_breaches: number;
  reports_filed: number;
  reports_resolved: number;
  bans_issued: number;
  revenue_estimate: number;
  new_events: number;
  event_registrations: number;
  match_window_activations: number;
  avg_session_minutes: number;
  push_opt_in_rate: number;
}

export interface KPISnapshot {
  // Growth
  newUsersToday: number;
  newUsersDelta: number; // % vs yesterday
  activeUsersToday: number;
  activeUsersDelta: number;

  // Verification
  verificationQueueSize: number;
  avgVerificationHours: number;
  slaBreachesToday: number;

  // Safety
  reportsFiledToday: number;
  reportsResolvedToday: number;
  bansIssuedToday: number;

  // Revenue
  premiumConversionsToday: number;
  revenueEstimateToday: number;

  // Engagement
  newMatchesToday: number;
  newMessagesSentToday: number;

  // Events
  eventRegistrationsToday: number;
}

export interface TrendPoint {
  date: string;       // ISO date string
  value: number;
}

export type TrendMetric = keyof Omit<DailyStats, 'stat_date'>;

export interface AlertItem {
  type: 'error' | 'warning' | 'info';
  metric: string;
  message: string;
  value: number;
}

// ─── Thresholds for alerts ────────────────────────────────────────────────────

const ALERT_THRESHOLDS = {
  sla_breaches:          { warning: 1, error: 5 },
  reports_filed:         { warning: 10, error: 25 },
  verification_queue_size: { warning: 20, error: 50 },
  churn_count:           { warning: 5, error: 15 },
  bans_issued:           { warning: 3, error: 10 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseError = (e: unknown): string => {
  if (!e) return 'Bilinmeyen hata';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Bilinmeyen hata';
};

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>;

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const analyticsService = {

  /**
   * Fetch daily stats for a date range (inclusive).
   * Returns rows in ascending date order.
   */
  async getDailyStats(
    startDate: string,
    endDate: string
  ): ServiceResult<DailyStats[]> {
    try {
      const { data, error } = await supabase
        .from('analytics_daily')
        .select('*')
        .gte('stat_date', startDate)
        .lte('stat_date', endDate)
        .order('stat_date', { ascending: true });

      if (error) return { data: null, error: parseError(error) };
      return { data: (data ?? []) as DailyStats[], error: null };
    } catch (e) {
      return { data: null, error: parseError(e) };
    }
  },

  /**
   * Get KPI snapshot comparing today vs yesterday.
   */
  async getKPIs(): ServiceResult<KPISnapshot> {
    try {
      const today = toDateStr(new Date());
      const yesterday = toDateStr(new Date(Date.now() - 86_400_000));

      const { data, error } = await supabase
        .from('analytics_daily')
        .select('*')
        .in('stat_date', [today, yesterday])
        .order('stat_date', { ascending: false });

      if (error) return { data: null, error: parseError(error) };

      const rows = (data ?? []) as DailyStats[];
      const todayRow = rows.find((r) => r.stat_date === today) ?? null;
      const yestRow = rows.find((r) => r.stat_date === yesterday) ?? null;

      // If today's aggregation hasn't run yet, query live counts as fallback
      const todayStats = todayRow ?? await analyticsService._getLiveToday();

      const snapshot: KPISnapshot = {
        // Growth
        newUsersToday:        todayStats.new_registrations,
        newUsersDelta:        pctDelta(todayStats.new_registrations, yestRow?.new_registrations ?? 0),
        activeUsersToday:     todayStats.active_users,
        activeUsersDelta:     pctDelta(todayStats.active_users, yestRow?.active_users ?? 0),

        // Verification
        verificationQueueSize:  todayStats.verification_queue_size,
        avgVerificationHours:   todayStats.avg_verification_hours,
        slaBreachesToday:       todayStats.sla_breaches,

        // Safety
        reportsFiledToday:    todayStats.reports_filed,
        reportsResolvedToday: todayStats.reports_resolved,
        bansIssuedToday:      todayStats.bans_issued,

        // Revenue
        premiumConversionsToday: todayStats.premium_conversions,
        revenueEstimateToday:    todayStats.revenue_estimate,

        // Engagement
        newMatchesToday:      todayStats.new_matches,
        newMessagesSentToday: todayStats.new_messages,

        // Events
        eventRegistrationsToday: todayStats.event_registrations,
      };

      return { data: snapshot, error: null };
    } catch (e) {
      return { data: null, error: parseError(e) };
    }
  },

  /**
   * Get trend data for a specific metric over the last N days.
   */
  async getTrends(metric: TrendMetric, days = 14): ServiceResult<TrendPoint[]> {
    try {
      const endDate = toDateStr(new Date());
      const startDate = toDateStr(new Date(Date.now() - days * 86_400_000));

      const { data, error } = await supabase
        .from('analytics_daily')
        .select(`stat_date, ${metric}`)
        .gte('stat_date', startDate)
        .lte('stat_date', endDate)
        .order('stat_date', { ascending: true });

      if (error) return { data: null, error: parseError(error) };

      const points: TrendPoint[] = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          date:  r['stat_date'] as string,
          value: (r[metric] as number) ?? 0,
        };
      });

      // Fill missing days with 0
      const filled: TrendPoint[] = [];
      const cursor = new Date(startDate);
      const end = new Date(endDate);
      while (cursor <= end) {
        const ds = toDateStr(cursor);
        const existing = points.find((p) => p.date === ds);
        filled.push({ date: ds, value: existing?.value ?? 0 });
        cursor.setDate(cursor.getDate() + 1);
      }

      return { data: filled, error: null };
    } catch (e) {
      return { data: null, error: parseError(e) };
    }
  },

  /**
   * Generate alerts based on today's metrics vs thresholds.
   */
  async getAlerts(): ServiceResult<AlertItem[]> {
    try {
      const today = toDateStr(new Date());
      const { data, error } = await supabase
        .from('analytics_daily')
        .select('*')
        .eq('stat_date', today)
        .maybeSingle();

      if (error) return { data: null, error: parseError(error) };

      const stats = (data as DailyStats | null) ?? await analyticsService._getLiveToday();
      const alerts: AlertItem[] = [];

      for (const [key, thresholds] of Object.entries(ALERT_THRESHOLDS)) {
        const value = stats[key as keyof DailyStats] as number;
        if (value >= thresholds.error) {
          alerts.push({
            type: 'error',
            metric: key,
            message: analyticsService._alertMessage(key, value, 'error'),
            value,
          });
        } else if (value >= thresholds.warning) {
          alerts.push({
            type: 'warning',
            metric: key,
            message: analyticsService._alertMessage(key, value, 'warning'),
            value,
          });
        }
      }

      // Check avg verification hours (warn if > 20h)
      if (stats.avg_verification_hours > 20) {
        alerts.push({
          type: 'warning',
          metric: 'avg_verification_hours',
          message: `Ortalama doğrulama süresi ${stats.avg_verification_hours.toFixed(1)} saat`,
          value: stats.avg_verification_hours,
        });
      }

      return { data: alerts, error: null };
    } catch (e) {
      return { data: null, error: parseError(e) };
    }
  },

  /**
   * Trigger manual stats aggregation for a given date (admin only).
   */
  async triggerAggregation(date?: string): ServiceResult<null> {
    try {
      const targetDate = date ?? toDateStr(new Date());
      const { error } = await supabase.rpc('fn_aggregate_daily_stats', {
        p_date: targetDate,
      });
      if (error) return { data: null, error: parseError(error) };
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: parseError(e) };
    }
  },

  // ─── Private helpers ───────────────────────────────────────────────────────

  /** Live fallback query when today's aggregation hasn't run yet */
  async _getLiveToday(): Promise<DailyStats> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();

    const [
      { count: newRegs },
      { count: newMatches },
      { count: newMessages },
      { count: vqSize },
      { count: slaBreaches },
      { count: reports },
      { count: bans },
      { count: premConv },
      { count: eventRegs },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startIso),
      supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', startIso),
      supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', startIso),
      supabase.from('verification_queue').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_review']),
      supabase.from('verification_queue').select('*', { count: 'exact', head: true }).eq('sla_status', 'breached'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', startIso),
      supabase.from('user_restrictions').select('*', { count: 'exact', head: true }).gte('applied_at', startIso),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', startIso).neq('subscription_tier', 'FREE'),
      supabase.from('event_attendees').select('*', { count: 'exact', head: true }).gte('registered_at', startIso),
    ]);

    return {
      stat_date: toDateStr(new Date()),
      new_registrations:        newRegs ?? 0,
      new_verifications:        0,
      new_matches:              newMatches ?? 0,
      new_messages:             newMessages ?? 0,
      active_users:             0,
      premium_conversions:      premConv ?? 0,
      churn_count:              0,
      verification_queue_size:  vqSize ?? 0,
      avg_verification_hours:   0,
      sla_breaches:             slaBreaches ?? 0,
      reports_filed:            reports ?? 0,
      reports_resolved:         0,
      bans_issued:              bans ?? 0,
      revenue_estimate:         0,
      new_events:               0,
      event_registrations:      eventRegs ?? 0,
      match_window_activations: 0,
      avg_session_minutes:      0,
      push_opt_in_rate:         0,
    };
  },

  _alertMessage(key: string, value: number, level: 'warning' | 'error'): string {
    const prefix = level === 'error' ? '🚨' : '⚠️';
    const labels: Record<string, string> = {
      sla_breaches:             `${prefix} Bugün ${value} SLA ihlali`,
      reports_filed:            `${prefix} Bugün ${value} şikayet alındı`,
      verification_queue_size:  `${prefix} Doğrulama kuyruğunda ${value} bekleyen`,
      churn_count:              `${prefix} Bugün ${value} kullanıcı ayrıldı`,
      bans_issued:              `${prefix} Bugün ${value} yasaklama uygulandı`,
    };
    return labels[key] ?? `${prefix} ${key}: ${value}`;
  },

  // ─── Formatting helpers ───────────────────────────────────────────────────

  formatDelta(delta: number): { label: string; positive: boolean } {
    const positive = delta >= 0;
    return {
      label: `${positive ? '+' : ''}${delta}%`,
      positive,
    };
  },

  formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  },

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(amount);
  },

  getMetricLabel(metric: TrendMetric): string {
    const labels: Record<TrendMetric, string> = {
      new_registrations:        'Yeni Kayıt',
      new_verifications:        'Doğrulama',
      new_matches:              'Yeni Eşleşme',
      new_messages:             'Mesaj',
      active_users:             'Aktif Kullanıcı',
      premium_conversions:      'Premium Dönüşüm',
      churn_count:              'Churn',
      verification_queue_size:  'Doğrulama Kuyruğu',
      avg_verification_hours:   'Ort. Doğrulama Süresi (s)',
      sla_breaches:             'SLA İhlali',
      reports_filed:            'Şikayet',
      reports_resolved:         'Çözülen Şikayet',
      bans_issued:              'Yasaklama',
      revenue_estimate:         'Tahmini Gelir (₺)',
      new_events:               'Yeni Etkinlik',
      event_registrations:      'Etkinlik Kaydı',
      match_window_activations: 'Match Window',
      avg_session_minutes:      'Ort. Oturum (dk)',
      push_opt_in_rate:         'Push İzin Oranı',
    };
    return labels[metric] ?? metric;
  },
};
