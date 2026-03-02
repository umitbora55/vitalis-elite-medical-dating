/**
 * TransparencyCenter — Özellik 7: Şeffaf Moderasyon
 *
 * Moderasyon şeffaflık merkezi.
 * DSA kapsamında yayımlanan topluluk güvenlik raporu.
 *   • Çeyreklik moderasyon istatistikleri
 *   • Otomatik vs. insan karar oranı
 *   • İtiraz oranı ve kabul yüzdesi
 *   • Ortalama adalet skoru
 *   • Karar süreçleri açıklaması
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Bot,
  User,
  Scale,
  Star,
  Shield,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { transparentModerationService } from '../../services/transparentModerationService';
import type { TransparencyStats } from '../../types';

// ── Stat card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, color }) => (
  <div className="flex-1 min-w-[120px] px-4 py-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
    <div className={`mb-2 ${color}`}>{icon}</div>
    <p className="text-xl font-bold text-white">{value}</p>
    {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    <p className="text-[10px] text-slate-400 mt-1 leading-tight">{label}</p>
  </div>
);

// ── Mini bar ───────────────────────────────────────────────────────────────

interface MiniBarProps {
  label: string;
  pct: number;
  color: string;
}
const MiniBar: React.FC<MiniBarProps> = ({ label, pct, color }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-300 font-mono">{pct.toFixed(1)}%</span>
    </div>
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

// ── Star rating display ────────────────────────────────────────────────────

interface StarDisplayProps {
  rating: number | null;
}
const StarDisplay: React.FC<StarDisplayProps> = ({ rating }) => {
  if (rating === null) return <span className="text-slate-500 text-xs">Yeterli veri yok</span>;
  const filled = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= filled ? 'text-amber-400' : 'text-slate-700'}
          fill={n <= filled ? 'currentColor' : 'none'}
        />
      ))}
      <span className="text-xs text-slate-300 ml-1.5 font-mono">{rating.toFixed(2)}/5.00</span>
    </div>
  );
};

// ── Period stats panel ─────────────────────────────────────────────────────

interface PeriodPanelProps {
  stats: TransparencyStats;
}
const PeriodPanel: React.FC<PeriodPanelProps> = ({ stats }) => {
  const actionRate = stats.total_notifications > 0
    ? ((stats.bans_issued + stats.warnings_issued) / stats.total_notifications * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Period header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-200 font-mono">{stats.period}</span>
        <span className="text-[10px] text-slate-500">
          {stats.total_notifications} karar
        </span>
      </div>

      {/* Key stats grid */}
      <div className="flex gap-2 flex-wrap">
        <StatCard
          label="Verilen Karar"
          value={stats.total_notifications}
          icon={<Shield size={14} />}
          color="text-blue-400"
        />
        <StatCard
          label="Askıya Alma"
          value={stats.bans_issued}
          sub={`${actionRate.toFixed(0)}% oran`}
          icon={<AlertCircle size={14} />}
          color="text-orange-400"
        />
        <StatCard
          label="İtiraz"
          value={stats.appeals_submitted}
          sub={stats.appeal_approval_pct !== null ? `%${stats.appeal_approval_pct} kabul` : undefined}
          icon={<Scale size={14} />}
          color="text-purple-400"
        />
      </div>

      {/* Ratio bars */}
      <div className="space-y-2.5">
        <MiniBar
          label="Otomatik Kararlar"
          pct={stats.automated_pct}
          color="bg-slate-500"
        />
        <MiniBar
          label="İnsan İncelemesi"
          pct={100 - stats.automated_pct}
          color="bg-emerald-500"
        />
        {stats.appeal_approval_pct !== null && (
          <MiniBar
            label="İtiraz Kabul Oranı"
            pct={stats.appeal_approval_pct}
            color="bg-blue-500"
          />
        )}
      </div>

      {/* Appeal SLA */}
      {stats.avg_appeal_hours !== null && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <TrendingUp size={12} className="text-emerald-400" />
          Ortalama itiraz yanıt süresi:{' '}
          <span className="text-emerald-400 font-semibold">{stats.avg_appeal_hours.toFixed(1)} saat</span>
          {stats.avg_appeal_hours <= 48 && (
            <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
              SLA ✓
            </span>
          )}
        </div>
      )}

      {/* Fairness score */}
      <div className="flex items-center gap-2">
        <Star size={12} className="text-amber-400 flex-shrink-0" />
        <span className="text-[10px] text-slate-500">Kullanıcı adalet değerlendirmesi:</span>
        <StarDisplay rating={stats.avg_fairness_score} />
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export interface TransparencyCenterProps {
  className?: string;
}

export const TransparencyCenter: React.FC<TransparencyCenterProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<TransparencyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await transparentModerationService.getTransparencyStats();
    setStats(data);
    if (data.length === 0) setError('İstatistik verisi henüz mevcut değil.');
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const currentStats = stats[selectedPeriod];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-400" />
          <h2 className="text-base font-bold text-white">Şeffaflık Merkezi</h2>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30"
          aria-label="Yenile"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Intro */}
      <div className="px-4 py-3.5 bg-blue-500/8 border border-blue-500/20 rounded-xl">
        <p className="text-xs text-slate-300 leading-relaxed">
          Bu sayfa, DSA Madde 15 kapsamında moderasyon faaliyetlerimiz hakkında çeyreklik şeffaflık raporu yayımlamaktadır.
          Tüm kararlar denetlenebilir ve kullanıcılar tarafından itiraz edilebilir.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error / empty */}
      {!loading && error && (
        <div className="text-center py-8 space-y-2">
          <BarChart3 size={24} className="mx-auto text-slate-700" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      )}

      {/* Period picker + stats */}
      {!loading && stats.length > 0 && (
        <>
          {/* Period tabs */}
          {stats.length > 1 && (
            <div className="flex gap-1">
              {stats.map((s, i) => (
                <button
                  key={s.period}
                  onClick={() => setSelectedPeriod(i)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedPeriod === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.period}
                </button>
              ))}
            </div>
          )}

          {/* Stats for selected period */}
          {currentStats && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-4">
              <PeriodPanel stats={currentStats} />
            </div>
          )}
        </>
      )}

      {/* Decision process explanation */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200">Karar Süreçleri</h3>
        <div className="space-y-2">
          {[
            {
              icon: <Bot size={14} />,
              color: 'text-slate-400',
              title: 'Otomatik Kararlar',
              desc: 'Belirgin politika ihlalleri (önceden tanımlı eşikler, multi-account tespiti) sistem tarafından otomatik işlenir. Kullanıcı her zaman itiraz edebilir.',
            },
            {
              icon: <User size={14} />,
              color: 'text-emerald-400',
              title: 'İnsan Moderasyon',
              desc: 'Nüanslı kararlar, itirazlar ve ağır ihlaller eğitimli insan moderatörler tarafından incelenir. Hiçbir ban kararı tamamen otomasyona bırakılmaz.',
            },
            {
              icon: <Scale size={14} />,
              color: 'text-blue-400',
              title: 'İtiraz Yolu',
              desc: 'Her karar için 6 aylık itiraz süresi. İtirazlar 48 saat SLA ile insan moderatör tarafından değerlendirilir (DSA Art.20).',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
              <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</div>
              <div>
                <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DSA reference */}
      <div className="px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Bu rapor <span className="text-slate-400">DSA Madde 15 (Şeffaflık Raporlaması)</span> kapsamında
          hazırlanmaktadır. Veriler üç ayda bir güncellenmektedir.
          Soru ve talepler için <span className="text-slate-400">destek@vitalis.app</span> adresine yazabilirsiniz.
        </p>
      </div>
    </div>
  );
};
