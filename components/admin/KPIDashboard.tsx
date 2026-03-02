import React, { useCallback, useEffect, useState } from 'react';
import {
  analyticsService,
  KPISnapshot,
  TrendPoint,
  TrendMetric,
  AlertItem,
} from '../../services/analyticsService';
import { StatCard } from './StatCard';
import { TrendChart } from './TrendChart';
import {
  LayoutDashboard, Users, BadgeCheck, Flag, TrendingUp,
  AlertTriangle, RefreshCw, Loader2, BarChart2, CalendarDays,
} from 'lucide-react';

type TrendTab = 'users' | 'matches' | 'verification' | 'safety' | 'revenue';

const TREND_CONFIGS: {
  id: TrendTab;
  label: string;
  metrics: { metric: TrendMetric; label: string; color: string; fill: string }[];
}[] = [
  {
    id: 'users',
    label: 'Kullanıcılar',
    metrics: [
      { metric: 'new_registrations', label: 'Yeni Kayıt', color: 'stroke-gold-400', fill: 'fill-gold-400/10' },
      { metric: 'active_users',      label: 'Aktif Kullanıcı', color: 'stroke-blue-400', fill: 'fill-blue-400/10' },
    ],
  },
  {
    id: 'matches',
    label: 'Eşleşmeler',
    metrics: [
      { metric: 'new_matches',  label: 'Eşleşme', color: 'stroke-pink-400', fill: 'fill-pink-400/10' },
      { metric: 'new_messages', label: 'Mesaj',    color: 'stroke-purple-400', fill: 'fill-purple-400/10' },
    ],
  },
  {
    id: 'verification',
    label: 'Doğrulama',
    metrics: [
      { metric: 'new_verifications',       label: 'Doğrulanan',     color: 'stroke-emerald-400', fill: 'fill-emerald-400/10' },
      { metric: 'verification_queue_size', label: 'Kuyruktaki',     color: 'stroke-amber-400', fill: 'fill-amber-400/10' },
      { metric: 'sla_breaches',            label: 'SLA İhlali',     color: 'stroke-red-400', fill: 'fill-red-400/10' },
    ],
  },
  {
    id: 'safety',
    label: 'Güvenlik',
    metrics: [
      { metric: 'reports_filed',    label: 'Şikayet',    color: 'stroke-red-400', fill: 'fill-red-400/10' },
      { metric: 'reports_resolved', label: 'Çözülen',    color: 'stroke-emerald-400', fill: 'fill-emerald-400/10' },
      { metric: 'bans_issued',      label: 'Yasaklama',  color: 'stroke-orange-400', fill: 'fill-orange-400/10' },
    ],
  },
  {
    id: 'revenue',
    label: 'Gelir',
    metrics: [
      { metric: 'premium_conversions', label: 'Premium Dönüşüm', color: 'stroke-gold-400', fill: 'fill-gold-400/10' },
    ],
  },
];

export const KPIDashboard: React.FC = () => {
  const [kpis, setKpis]             = useState<KPISnapshot | null>(null);
  const [alerts, setAlerts]         = useState<AlertItem[]>([]);
  const [trendTab, setTrendTab]     = useState<TrendTab>('users');
  const [trendData, setTrendData]   = useState<Record<string, TrendPoint[]>>({});
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [kpiError, setKpiError]     = useState<string | null>(null);

  const loadKPIs = useCallback(async () => {
    setLoadingKpi(true);
    setKpiError(null);
    const [kpiResult, alertResult] = await Promise.all([
      analyticsService.getKPIs(),
      analyticsService.getAlerts(),
    ]);
    if (kpiResult.error) setKpiError(kpiResult.error);
    else setKpis(kpiResult.data);
    setAlerts(alertResult.data ?? []);
    setLoadingKpi(false);
  }, []);

  const loadTrends = useCallback(async () => {
    setLoadingTrend(true);
    const config = TREND_CONFIGS.find((c) => c.id === trendTab);
    if (!config) { setLoadingTrend(false); return; }

    const results = await Promise.all(
      config.metrics.map(async (m) => {
        const { data } = await analyticsService.getTrends(m.metric, 14);
        return { key: m.metric, data: data ?? [] };
      })
    );

    const map: Record<string, TrendPoint[]> = {};
    results.forEach(({ key, data }) => { map[key] = data; });
    setTrendData(map);
    setLoadingTrend(false);
  }, [trendTab]);

  useEffect(() => { void loadKPIs(); }, [loadKPIs]);
  useEffect(() => { void loadTrends(); }, [loadTrends]);

  const delta = kpis ? analyticsService.formatDelta(kpis.newUsersDelta) : null;
  const activeDelta = kpis ? analyticsService.formatDelta(kpis.activeUsersDelta) : null;

  const ALERT_TYPE_STYLE: Record<string, string> = {
    error:   'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-10">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LayoutDashboard size={20} className="text-gold-400" />
          <h2 className="text-lg font-bold text-white">KPI Dashboard</h2>
        </div>
        <button
          type="button"
          onClick={() => void loadKPIs()}
          disabled={loadingKpi}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <RefreshCw size={14} className={loadingKpi ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-6 mb-5 space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold ${ALERT_TYPE_STYLE[alert.type]}`}
            >
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loadingKpi && !kpis && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="animate-spin text-gold-400" />
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        </div>
      )}

      {kpiError && (
        <div className="px-6 py-4">
          <p className="text-sm text-red-400">{kpiError}</p>
        </div>
      )}

      {kpis && (
        <>
          {/* Growth section */}
          <section className="px-6 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users size={12} /> Büyüme
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Bugün Kayıt"
                value={analyticsService.formatNumber(kpis.newUsersToday)}
                delta={kpis.newUsersDelta}
                icon={<TrendingUp size={16} />}
                variant={delta?.positive ? 'success' : 'default'}
                subLabel="dünle karşı"
                loading={loadingKpi}
              />
              <StatCard
                label="Aktif Kullanıcı"
                value={analyticsService.formatNumber(kpis.activeUsersToday)}
                delta={kpis.activeUsersDelta}
                icon={<Users size={16} />}
                variant={activeDelta?.positive ? 'success' : 'default'}
                subLabel="bugün"
                loading={loadingKpi}
              />
              <StatCard
                label="Eşleşme"
                value={analyticsService.formatNumber(kpis.newMatchesToday)}
                icon={<BarChart2 size={16} />}
                subLabel="bugün"
                loading={loadingKpi}
              />
              <StatCard
                label="Etkinlik Kaydı"
                value={analyticsService.formatNumber(kpis.eventRegistrationsToday)}
                icon={<CalendarDays size={16} />}
                subLabel="bugün"
                loading={loadingKpi}
              />
            </div>
          </section>

          {/* Verification section */}
          <section className="px-6 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BadgeCheck size={12} /> Doğrulama
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Kuyruk"
                value={kpis.verificationQueueSize}
                icon={<BadgeCheck size={16} />}
                variant={kpis.verificationQueueSize > 20 ? 'warning' : 'default'}
                subLabel="bekleyen"
                loading={loadingKpi}
              />
              <StatCard
                label="Ort. Süre"
                value={`${kpis.avgVerificationHours.toFixed(1)}s`}
                icon={<RefreshCw size={16} />}
                variant={kpis.avgVerificationHours > 20 ? 'warning' : 'default'}
                subLabel="saat"
                loading={loadingKpi}
              />
              <StatCard
                label="SLA İhlali"
                value={kpis.slaBreachesToday}
                icon={<AlertTriangle size={16} />}
                variant={kpis.slaBreachesToday > 0 ? 'danger' : 'default'}
                subLabel="bugün"
                loading={loadingKpi}
              />
              <StatCard
                label="Premium Dönüş."
                value={kpis.premiumConversionsToday}
                icon={<TrendingUp size={16} />}
                variant="success"
                subLabel="bugün"
                loading={loadingKpi}
              />
            </div>
          </section>

          {/* Safety section */}
          <section className="px-6 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Flag size={12} /> Güvenlik
            </p>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Şikayet"
                value={kpis.reportsFiledToday}
                variant={kpis.reportsFiledToday > 10 ? 'danger' : 'default'}
                loading={loadingKpi}
              />
              <StatCard
                label="Çözülen"
                value={kpis.reportsResolvedToday}
                variant="success"
                loading={loadingKpi}
              />
              <StatCard
                label="Yasaklama"
                value={kpis.bansIssuedToday}
                variant={kpis.bansIssuedToday > 3 ? 'warning' : 'default'}
                loading={loadingKpi}
              />
            </div>
          </section>

          {/* Revenue section */}
          <section className="px-6 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <TrendingUp size={12} /> Gelir
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Tahmini Gelir"
                value={analyticsService.formatCurrency(kpis.revenueEstimateToday)}
                icon={<TrendingUp size={16} />}
                variant="success"
                subLabel="bugün"
                loading={loadingKpi}
              />
              <StatCard
                label="Mesaj"
                value={analyticsService.formatNumber(kpis.newMessagesSentToday)}
                subLabel="bugün"
                loading={loadingKpi}
              />
            </div>
          </section>
        </>
      )}

      {/* Trend charts */}
      <section className="px-6 mb-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          14 Günlük Trend
        </p>

        {/* Trend tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-5">
          {TREND_CONFIGS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTrendTab(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                trendTab === c.id
                  ? 'bg-gold-500/15 text-gold-400 border-gold-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-6">
          {loadingTrend ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <Loader2 size={20} className="animate-spin text-gold-400" />
              <p className="text-sm text-slate-500">Yükleniyor…</p>
            </div>
          ) : (
            TREND_CONFIGS.find((c) => c.id === trendTab)?.metrics.map((m) => (
              <TrendChart
                key={m.metric}
                data={trendData[m.metric] ?? []}
                label={m.label}
                color={m.color}
                fillColor={m.fill}
                height={80}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};
