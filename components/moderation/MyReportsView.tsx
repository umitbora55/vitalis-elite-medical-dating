/**
 * MyReportsView — Özellik 7: Şeffaf Moderasyon
 *
 * Kullanıcının dosyaladığı raporların durumu.
 * PII koruması: raporlanan kişi "Kullanıcı #XYZ" olarak gösterilir.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Flag,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { transparentModerationService } from '../../services/transparentModerationService';
import type { UserReportStatus } from '../../types';

// ── Status config ──────────────────────────────────────────────────────────

const REPORT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:      { label: 'Bekliyor',     color: 'text-amber-400',   icon: <Clock size={11} /> },
  investigating:{ label: 'İnceleniyor',  color: 'text-blue-400',    icon: <Loader2 size={11} className="animate-spin" /> },
  resolved:     { label: 'Çözüldü',      color: 'text-emerald-400', icon: <CheckCircle2 size={11} /> },
  dismissed:    { label: 'Hareketsiz',   color: 'text-slate-500',   icon: <AlertCircle size={11} /> },
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  harassment:           '🚨 Taciz',
  threatening:          '⚠️ Tehdit',
  fake_profile:         '🎭 Sahte Profil',
  spam:                 '📢 Spam',
  inappropriate_photo:  '🔞 Uygunsuz Fotoğraf',
  underage:             '🛑 Yaş Altı',
  other:                '❓ Diğer',
};

// ── Report card ────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: UserReportStatus;
}
const ReportCard: React.FC<ReportCardProps> = ({ report }) => {
  const statusCfg = REPORT_STATUS_CONFIG[report.status] ?? REPORT_STATUS_CONFIG['pending'];

  return (
    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 space-y-2.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-200">
            {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Bildirilen: <span className="text-slate-400">{report.reported_user_display}</span>
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/40 ${statusCfg.color} flex-shrink-0`}>
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <span>
          Gönderildi: {new Date(report.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'short',
          })}
        </span>
        {report.resolved_at && (
          <span>
            Çözüldü: {new Date(report.resolved_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'short',
            })}
          </span>
        )}
      </div>

      {/* Resolution summary */}
      {report.resolution_summary && (
        <div className="px-3 py-2 bg-slate-700/30 border border-slate-700/40 rounded-lg">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-0.5">
            Sonuç
          </p>
          <p className="text-xs text-slate-400">{report.resolution_summary}</p>
        </div>
      )}

      {/* Severity badge */}
      {report.severity && report.severity !== 'low' && (
        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
          report.severity === 'critical'
            ? 'bg-red-900/40 text-red-400'
            : report.severity === 'high'
              ? 'bg-orange-900/40 text-orange-400'
              : 'bg-slate-700/40 text-slate-500'
        }`}>
          {report.severity === 'critical' ? '🚨 Kritik' :
           report.severity === 'high'     ? '⚠️ Yüksek' : report.severity}
        </span>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export interface MyReportsViewProps {
  onClose?: () => void;
  className?: string;
}

export const MyReportsView: React.FC<MyReportsViewProps> = ({ className = '' }) => {
  const [reports, setReports] = useState<UserReportStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await transparentModerationService.getMyReports();
    if (data.length === 0 && !loading) {
      setError(null); // empty state
    }
    setReports(data);
    setLoading(false);
  }, [loading]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search && !REPORT_TYPE_LABELS[r.report_type]?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const STATUS_TABS = [
    { key: 'all',          label: 'Tümü' },
    { key: 'pending',      label: 'Bekliyor' },
    { key: 'investigating',label: 'İnceleniyor' },
    { key: 'resolved',     label: 'Çözüldü' },
    { key: 'dismissed',    label: 'Hareketsiz' },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag size={16} className="text-rose-400" />
          <h3 className="text-sm font-semibold text-white">Raporlarım</h3>
          <span className="text-[10px] text-slate-500">({reports.length})</span>
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

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="İhlal türü ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-4 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-600"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              statusFilter === tab.key
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl">
          <AlertCircle size={13} className="text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-10 space-y-2">
          <Flag size={24} className="mx-auto text-slate-700" />
          <p className="text-sm text-slate-500">
            {reports.length === 0 ? 'Henüz rapor göndermemişsiniz.' : 'Sonuç bulunamadı.'}
          </p>
        </div>
      )}

      {/* Report list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      )}

      {/* Privacy note */}
      <div className="px-3 py-2.5 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Raporlanan kişilerin kimlikleri gizlenmektedir.
          Raporlarınız gizli tutulur ve bildirim için kullanılmaz.
        </p>
      </div>
    </div>
  );
};
