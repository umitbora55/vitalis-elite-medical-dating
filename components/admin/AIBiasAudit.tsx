/**
 * AIBiasAudit — Feature 8: Privacy-First AI (Admin)
 *
 * Admin dashboard for monitoring AI model bias and usage patterns.
 * EU AI Act Article 9 (risk management), Article 13 (transparency),
 * Article 15 (accuracy, robustness, cybersecurity).
 *
 * Displays:
 *   1. Model registry overview (all 7 models, last bias audit date)
 *   2. Monthly usage stats per feature (from ai_usage_stats view)
 *   3. Block rate, warn rate, human override rate
 *   4. Uses-without-consent count (GDPR compliance)
 *   5. Average confidence per feature (calibration check)
 *   6. Bias audit schedule (last / next audit date)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Shield,
  BarChart3,
  Calendar,
  Eye,
  TrendingUp,
  XCircle,
  UserCheck,
  Info,
  Cpu,
} from 'lucide-react';
import { aiConsentService, MODEL_CARD_CACHE } from '../../services/aiConsentService';
import type { AIFeatureKey, AIBiasAuditRow, ModelCard } from '../../types';

// ── Metric bar ───────────────────────────────────────────────────────────────

interface MetricBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
  warn?: number; // warn threshold (%)
}
const MetricBar: React.FC<MetricBarProps> = ({ label, value, total, color, warn }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const isWarning = warn !== undefined && pct > warn;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className={`${isWarning ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
          {isWarning && '⚠ '}
          {label}
        </span>
        <span className="text-slate-300 font-mono">
          {value} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isWarning ? 'bg-red-500' : color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};

// ── Model card status row ────────────────────────────────────────────────────

interface ModelStatusRowProps {
  card: ModelCard;
  latestStats: AIBiasAuditRow | undefined;
}
const ModelStatusRow: React.FC<ModelStatusRowProps> = ({ card, latestStats }) => {
  const [expanded, setExpanded] = useState(false);

  const auditOverdue = card.last_bias_audit === null ||
    (new Date().getTime() - new Date(card.last_bias_audit).getTime()) > 90 * 86_400_000; // 90 days

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/40 flex items-center justify-center flex-shrink-0">
          <Cpu size={13} className="text-violet-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-slate-200">{card.display_name_tr}</p>
            {card.is_security && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400 uppercase tracking-wide">
                Güvenlik
              </span>
            )}
            {card.gdpr_article_22 && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-400 uppercase tracking-wide">
                Art.22
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{card.model_id} · v{card.version}</p>
        </div>

        {/* Bias audit status */}
        <div className="flex-shrink-0 flex items-center gap-1.5" title={auditOverdue ? 'Bias denetimi gecikmiş' : 'Bias denetimi güncel'}>
          {auditOverdue
            ? <AlertTriangle size={13} className="text-amber-400" />
            : <CheckCircle2 size={13} className="text-emerald-400" />
          }
          {latestStats && (
            <span className="text-[10px] text-slate-500 font-mono">
              {latestStats.total_uses.toLocaleString()} kullanım
            </span>
          )}
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-4">
          {/* Model metadata */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Model tipi', value: card.model_type },
              { label: 'Çıktı', value: card.output_type },
              { label: 'Saklama', value: card.data_retention_days > 0 ? `${card.data_retention_days} gün` : 'Saklanmaz' },
              { label: 'İnsan onayı', value: card.human_review_required_for ?? 'Yok' },
            ].map(({ label, value }) => (
              <div key={label} className="px-2.5 py-2 bg-slate-800/50 rounded-lg">
                <p className="text-[9px] text-slate-600 uppercase tracking-wide">{label}</p>
                <p className="text-[11px] text-slate-300 font-mono mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Bias audit date */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
            auditOverdue
              ? 'bg-amber-500/8 border-amber-500/20'
              : 'bg-emerald-500/8 border-emerald-500/20'
          }`}>
            <Calendar size={12} className={auditOverdue ? 'text-amber-400' : 'text-emerald-400'} />
            <div>
              <p className={`text-[10px] font-semibold ${auditOverdue ? 'text-amber-300' : 'text-emerald-300'}`}>
                {auditOverdue ? 'Bias denetimi gecikmiş (90+ gün)' : 'Bias denetimi güncel'}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Son denetim:{' '}
                {card.last_bias_audit
                  ? new Date(card.last_bias_audit).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Hiç denetlenmedi'}
              </p>
            </div>
          </div>

          {/* Usage stats for last month */}
          {latestStats ? (
            <div className="space-y-2.5">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                Son ay istatistikleri
              </p>
              <MetricBar
                label="Engel oranı"
                value={latestStats.blocks}
                total={latestStats.total_uses}
                color="bg-red-500"
                warn={15}
              />
              <MetricBar
                label="Uyarı oranı"
                value={latestStats.warns}
                total={latestStats.total_uses}
                color="bg-amber-500"
                warn={25}
              />
              <MetricBar
                label="İnsan müdahalesi"
                value={latestStats.human_overrides}
                total={latestStats.total_uses}
                color="bg-blue-500"
              />
              {latestStats.uses_without_consent > 0 && (
                <MetricBar
                  label="Rızasız kullanım (GDPR!)"
                  value={latestStats.uses_without_consent}
                  total={latestStats.total_uses}
                  color="bg-red-700"
                  warn={0.1}
                />
              )}
              {latestStats.avg_confidence !== null && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Ort. güven skoru</span>
                  <span className={`font-mono font-bold ${
                    latestStats.avg_confidence >= 0.85 ? 'text-emerald-400' :
                    latestStats.avg_confidence >= 0.70 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {(latestStats.avg_confidence * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-600 text-center py-2">İstatistik verisi mevcut değil.</p>
          )}

          {/* Input fields */}
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide mb-1">Girdi alanları</p>
            <div className="flex flex-wrap gap-1">
              {card.input_fields.map((f) => (
                <span key={f} className="text-[9px] px-1.5 py-0.5 bg-slate-700/60 border border-slate-600/40 rounded text-slate-400 font-mono">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Summary stats bar ────────────────────────────────────────────────────────

interface SummaryStatsProps {
  stats: AIBiasAuditRow[];
  cards: ModelCard[];
}
const SummaryStats: React.FC<SummaryStatsProps> = ({ stats, cards }) => {
  // Aggregate last month across all features
  const allMonths = [...new Set(stats.map((s) => s.month))].sort().reverse();
  const lastMonth = allMonths[0];
  const lastMonthStats = stats.filter((s) => s.month === lastMonth);

  const total = lastMonthStats.reduce((acc, s) => acc + s.total_uses, 0);
  const blocks = lastMonthStats.reduce((acc, s) => acc + s.blocks, 0);
  const humanOverrides = lastMonthStats.reduce((acc, s) => acc + s.human_overrides, 0);
  const withoutConsent = lastMonthStats.reduce((acc, s) => acc + s.uses_without_consent, 0);
  const overdueAudits = cards.filter((c) =>
    c.last_bias_audit === null ||
    (new Date().getTime() - new Date(c.last_bias_audit).getTime()) > 90 * 86_400_000
  ).length;

  const items = [
    { label: 'Toplam AI Kullanımı', value: total.toLocaleString(), icon: <BarChart3 size={14} />, color: 'text-blue-400' },
    { label: 'Engel Kararı', value: blocks.toLocaleString(), icon: <XCircle size={14} />, color: 'text-red-400' },
    { label: 'İnsan Müdahalesi', value: humanOverrides.toLocaleString(), icon: <UserCheck size={14} />, color: 'text-emerald-400' },
    { label: 'Rızasız Kullanım', value: withoutConsent.toLocaleString(), icon: <AlertTriangle size={14} />, color: withoutConsent > 0 ? 'text-red-500' : 'text-slate-500' },
    { label: 'Denetim Bekleyen', value: overdueAudits.toString(), icon: <Calendar size={14} />, color: overdueAudits > 0 ? 'text-amber-400' : 'text-emerald-400' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex-1 min-w-[90px] px-3 py-2.5 bg-slate-800/40 border border-slate-700/30 rounded-xl">
          <div className={`mb-1.5 ${item.color}`}>{item.icon}</div>
          <p className="text-lg font-bold text-white font-mono">{item.value}</p>
          <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{item.label}</p>
        </div>
      ))}
    </div>
  );
};

// ── Monthly trend chart (simple) ─────────────────────────────────────────────

interface TrendChartProps {
  stats: AIBiasAuditRow[];
  featureKey: AIFeatureKey;
}
const TrendChart: React.FC<TrendChartProps> = ({ stats, featureKey }) => {
  const featureStats = stats
    .filter((s) => s.feature_key === featureKey)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  if (featureStats.length === 0) return null;

  const maxTotal = Math.max(...featureStats.map((s) => s.total_uses), 1);

  return (
    <div className="space-y-1">
      <p className="text-[9px] text-slate-600 uppercase tracking-wide">Son 6 ay trend</p>
      <div className="flex items-end gap-1 h-10">
        {featureStats.map((s) => (
          <div key={s.month} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full bg-violet-500/40 border border-violet-500/25 rounded-sm"
              style={{ height: `${Math.round((s.total_uses / maxTotal) * 40)}px` }}
              title={`${s.month}: ${s.total_uses} kullanım`}
            />
            <p className="text-[7px] text-slate-700 font-mono">
              {s.month.slice(5, 7)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export interface AIBiasAuditProps {
  className?: string;
}

export const AIBiasAudit: React.FC<AIBiasAuditProps> = ({ className = '' }) => {
  const [cards, setCards] = useState<ModelCard[]>([]);
  const [stats, setStats] = useState<AIBiasAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<AIFeatureKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cardsData, statsData] = await Promise.all([
      aiConsentService.getAllModelCards(),
      aiConsentService.getAIBiasAuditData(),
    ]);
    setCards(cardsData);
    setStats(statsData);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Get latest stats per feature for model rows
  const latestStatsByFeature = (featureKey: AIFeatureKey): AIBiasAuditRow | undefined => {
    const featureStats = stats
      .filter((s) => s.feature_key === featureKey)
      .sort((a, b) => b.month.localeCompare(a.month));
    return featureStats[0];
  };

  const overdueCount = cards.filter((c) =>
    c.last_bias_audit === null ||
    (new Date().getTime() - new Date(c.last_bias_audit).getTime()) > 90 * 86_400_000
  ).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-violet-400" />
          <h2 className="text-base font-bold text-white">AI Bias Denetimi</h2>
          {overdueCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
              {overdueCount} gecikmiş
            </span>
          )}
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

      {/* Regulatory context */}
      <div className="px-4 py-3.5 bg-violet-500/8 border border-violet-500/20 rounded-xl">
        <div className="flex items-start gap-2">
          <Info size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            AB AI Yasası (Madde 9, 13, 15) kapsamında yüksek riskli AI sistemleri 3 ayda bir bias denetimine tabi olmalıdır.
            GDPR Madde 22 kapsamında otomatik kararlar izlenmelidir.
          </p>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-slate-800/40 animate-pulse" />
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-800/40 animate-pulse" />)}
        </div>
      )}

      {!loading && (
        <>
          {/* Summary stats */}
          <SummaryStats stats={stats} cards={cards} />

          {/* Trend chart for selected feature */}
          {selectedFeature && stats.length > 0 && (
            <div className="px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-300">
                  {MODEL_CARD_CACHE[selectedFeature]?.display_name_tr}
                </p>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="text-[10px] text-slate-500 hover:text-slate-400"
                >
                  Kapat
                </button>
              </div>
              <TrendChart stats={stats} featureKey={selectedFeature} />
            </div>
          )}

          {/* Model cards */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield size={13} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Model Kartları</h3>
            </div>

            {cards.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                Model kayıt defteri boş veya erişim yetkiniz yok.
              </p>
            ) : (
              <div className="space-y-1.5">
                {cards.map((card) => (
                  <div key={card.model_id} onClick={() => setSelectedFeature(card.feature_key)}>
                    <ModelStatusRow
                      card={card}
                      latestStats={latestStatsByFeature(card.feature_key)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick guidance */}
          <div className="space-y-2 px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Denetim Kılavuzu</p>
            <div className="space-y-1.5">
              {[
                { icon: <TrendingUp size={11} />, text: 'Engel oranı > %15 → itiraz verilerini kontrol edin', color: 'text-red-400' },
                { icon: <Eye size={11} />, text: 'Rızasız kullanım > 0 → GDPR uyum incelemesi gerekli', color: 'text-amber-400' },
                { icon: <CheckCircle2 size={11} />, text: 'Ortalama güven < %70 → model kalibrasyonu gerekiyor', color: 'text-blue-400' },
                { icon: <Calendar size={11} />, text: 'Her modeli 90 günde bir bias testi için işaretleyin', color: 'text-emerald-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</span>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIBiasAudit;
