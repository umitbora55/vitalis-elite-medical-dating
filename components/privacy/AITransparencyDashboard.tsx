/**
 * AITransparencyDashboard — Feature 8: Privacy-First AI
 *
 * User-facing AI usage log and transparency report.
 * DSA Article 27 + GDPR Article 22 compliance.
 *
 * Sections:
 *   1. This month summary (decisions, blocks, human overrides)
 *   2. Per-feature usage log (last 100 entries)
 *   3. Data retention status per feature
 *   4. Rights reminder (access, erasure, portability, objection)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  RefreshCw,
  Filter,
  ShieldAlert,
  UserCheck,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { aiConsentService, MODEL_CARD_CACHE, getRetentionLabel } from '../../services/aiConsentService';
import type { AIFeatureKey, AIUsageLogEntry } from '../../types';

// ── Action labels ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  label: string;
  color: string;
  icon: React.ReactNode;
}> = {
  allow:  { label: 'İzin verildi', color: 'text-emerald-400', icon: <CheckCircle2 size={11} /> },
  warn:   { label: 'Uyarıldı',    color: 'text-amber-400',   icon: <AlertTriangle size={11} /> },
  block:  { label: 'Engellendi',  color: 'text-red-400',     icon: <XCircle size={11} /> },
  flag:   { label: 'İşaretlendi', color: 'text-orange-400',  icon: <AlertTriangle size={11} /> },
  rank:   { label: 'Sıralandı',   color: 'text-blue-400',    icon: <Layers size={11} /> },
};

// ── Usage log entry row ──────────────────────────────────────────────────────

interface LogRowProps {
  entry: AIUsageLogEntry;
}
const LogRow: React.FC<LogRowProps> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = MODEL_CARD_CACHE[entry.feature_key];
  const actionCfg = ACTION_CONFIG[entry.action_taken] ?? ACTION_CONFIG['allow'];

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        {/* Feature name */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">
            {meta?.display_name_tr ?? entry.feature_key}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{entry.output_summary}</p>
        </div>

        {/* Action badge */}
        <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-bold ${actionCfg.color}`}>
          {actionCfg.icon}
          {actionCfg.label}
        </span>

        {/* Timestamp + expand */}
        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] text-slate-600 font-mono">
            {new Date(entry.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'short',
            })}
          </p>
          {expanded ? <ChevronUp size={11} className="text-slate-500 ml-auto" /> : <ChevronDown size={11} className="text-slate-500 ml-auto" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3 border-t border-slate-700/30 pt-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="px-2 py-1.5 bg-slate-800/50 rounded-lg">
              <p className="text-[9px] text-slate-600 uppercase tracking-wide">Güven skoru</p>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                {entry.confidence !== null ? `${(entry.confidence * 100).toFixed(0)}%` : '—'}
              </p>
            </div>
            <div className="px-2 py-1.5 bg-slate-800/50 rounded-lg">
              <p className="text-[9px] text-slate-600 uppercase tracking-wide">Karar türü</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {entry.human_override ? '👤 İnsan kararı' : '🤖 Otomatik'}
              </p>
            </div>
          </div>
          {!entry.consent_given && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-500/8 border border-amber-500/20 rounded-lg">
              <Info size={10} className="text-amber-400" />
              <p className="text-[10px] text-amber-300">Bu işlem rıza alınmadan gerçekleştirildi.</p>
            </div>
          )}
          {entry.expires_at && (
            <p className="text-[9px] text-slate-600 flex items-center gap-1">
              <Clock size={9} />
              Silinme tarihi:{' '}
              {new Date(entry.expires_at).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Monthly summary card ─────────────────────────────────────────────────────

interface SummaryProps {
  logs: AIUsageLogEntry[];
}
const MonthlySummary: React.FC<SummaryProps> = ({ logs }) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = logs.filter((l) => new Date(l.created_at) >= monthStart);

  const total = thisMonth.length;
  const blocks = thisMonth.filter((l) => l.action_taken === 'block').length;
  const humanOverrides = thisMonth.filter((l) => l.human_override).length;
  const withoutConsent = thisMonth.filter((l) => !l.consent_given).length;

  return (
    <div className="px-4 py-4 bg-slate-800/40 border border-slate-700/40 rounded-2xl">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-3">Bu ay — AI kararları</p>
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Toplam', value: total, icon: <Activity size={13} />, color: 'text-slate-300' },
          { label: 'Engel', value: blocks, icon: <XCircle size={13} />, color: 'text-red-400' },
          { label: 'İnsan kararı', value: humanOverrides, icon: <UserCheck size={13} />, color: 'text-emerald-400' },
          { label: 'Rızasız', value: withoutConsent, icon: <ShieldAlert size={13} />, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="flex-1 min-w-[70px] px-3 py-2.5 bg-slate-800/40 border border-slate-700/30 rounded-xl">
            <div className={`mb-1 ${s.color}`}>{s.icon}</div>
            <p className="text-lg font-bold text-white font-mono">{s.value}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Retention status ─────────────────────────────────────────────────────────

const RetentionStatus: React.FC = () => {
  const features = Object.entries(MODEL_CARD_CACHE) as [AIFeatureKey, (typeof MODEL_CARD_CACHE)[AIFeatureKey]][];
  return (
    <div className="space-y-2">
      {features.map(([key, meta]) => (
        <div key={key} className="flex items-center gap-3 px-3 py-2 bg-slate-800/30 border border-slate-700/30 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-300 truncate">{meta.display_name_tr}</p>
          </div>
          <span className={`text-[10px] font-mono flex-shrink-0 ${
            meta.data_retention_days === 0
              ? 'text-emerald-400'
              : meta.data_retention_days <= 30
                ? 'text-blue-400'
                : meta.data_retention_days <= 90
                  ? 'text-amber-400'
                  : 'text-slate-400'
          }`}>
            {getRetentionLabel(meta.data_retention_days)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export interface AITransparencyDashboardProps {
  className?: string;
}

export const AITransparencyDashboard: React.FC<AITransparencyDashboardProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<AIUsageLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [featureFilter, setFeatureFilter] = useState<AIFeatureKey | 'all'>('all');
  const [showRetention, setShowRetention] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await aiConsentService.getMyAIUsageLogs(
      featureFilter === 'all' ? undefined : featureFilter,
    );
    setLogs(data);
    setLoading(false);
  }, [featureFilter]);

  useEffect(() => { void load(); }, [load]);

  const allLogs = logs; // for monthly summary always show all
  const filtered = featureFilter === 'all'
    ? logs
    : logs.filter((l) => l.feature_key === featureFilter);

  const filterOptions: Array<{ value: AIFeatureKey | 'all'; label: string }> = [
    { value: 'all', label: 'Tümü' },
    ...Object.entries(MODEL_CARD_CACHE).map(([k, v]) => ({
      value: k as AIFeatureKey,
      label: v.display_name_tr,
    })),
  ];

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-blue-400" />
          <h2 className="text-base font-bold text-white">AI Şeffaflık Raporu</h2>
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
          Bu sayfa, Vitalis AI sistemlerinin sizin hakkınızda aldığı kararları gösterir.
          DSA Madde 27 ve GDPR Madde 22 kapsamında şeffaflık hakkınızın bir parçasıdır.
        </p>
      </div>

      {/* Monthly summary */}
      <MonthlySummary logs={allLogs} />

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={12} className="text-slate-500" />
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide flex-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFeatureFilter(opt.value)}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                featureFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log list */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <Activity size={24} className="mx-auto text-slate-700" />
          <p className="text-sm text-slate-500">
            {logs.length === 0
              ? 'AI kararı kaydı bulunamadı.'
              : 'Seçilen filtre için kayıt yok.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map((entry) => <LogRow key={entry.id} entry={entry} />)}
        </div>
      )}

      {/* Data retention section */}
      <div className="space-y-2">
        <button
          onClick={() => setShowRetention((p) => !p)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-xs font-bold text-slate-300">Veri Saklama Süreleri</span>
          {showRetention
            ? <ChevronUp size={13} className="text-slate-500" />
            : <ChevronDown size={13} className="text-slate-500" />
          }
        </button>
        {showRetention && <RetentionStatus />}
      </div>

      {/* Rights reminder */}
      <div className="px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl space-y-2">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">GDPR haklarınız</p>
        <div className="space-y-1">
          {[
            '📋 Erişim: AI kararlarınızı görme hakkı (bu sayfa)',
            '✏️ İtiraz: Otomatik kararlara itiraz (Şeffaflık Merkezi)',
            '🗑️ Silme: Veri silme talebi (destek@vitalis.app)',
            '📦 Taşınabilirlik: Verilerinizi indirme hakkı',
          ].map((r) => (
            <p key={r} className="text-[10px] text-slate-500 leading-relaxed">{r}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AITransparencyDashboard;
