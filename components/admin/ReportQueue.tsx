import React, { useCallback, useEffect, useState } from 'react';
import {
  adminPanelService,
  Report,
  ReportType,
  ReportStatus,
} from '../../services/adminPanelService';
import {
  Flag, Search, Loader2, RefreshCw, Zap,
} from 'lucide-react';

interface ReportQueueProps {
  onSelectReport: (report: Report) => void;
}

const TYPE_TABS: { value: ReportType | 'all'; label: string }[] = [
  { value: 'all',               label: 'Tümü' },
  { value: 'threatening',       label: '⚠️ Tehdit' },
  { value: 'harassment',        label: '🚨 Taciz' },
  { value: 'fake_profile',      label: '🎭 Sahte' },
  { value: 'spam',              label: '📢 Spam' },
  { value: 'inappropriate_photo', label: '🔞 Uygunsuz' },
  { value: 'underage',          label: '🛑 Yaş Altı' },
  { value: 'other',             label: '❓ Diğer' },
];

const STATUS_TABS: { value: ReportStatus | 'open_only'; label: string }[] = [
  { value: 'open_only',    label: 'Açık' },
  { value: 'under_review', label: 'İncelemede' },
  { value: 'resolved',     label: 'Çözüldü' },
  { value: 'dismissed',    label: 'Reddedildi' },
];

export const ReportQueue: React.FC<ReportQueueProps> = ({ onSelectReport }) => {
  const [items, setItems]         = useState<Report[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter]     = useState<ReportType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'open_only'>('open_only');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const statusArg: ReportStatus | undefined =
      statusFilter === 'open_only' ? 'pending' : statusFilter;

    const { data, error: err } = await adminPanelService.getReports(
      statusArg,
      typeFilter === 'all' ? undefined : typeFilter
    );

    if (err) setError(err);
    else {
      let filtered = data ?? [];
      if (search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            (r.reporter_name ?? '').toLowerCase().includes(s) ||
            (r.reported_user_name ?? '').toLowerCase().includes(s) ||
            (r.description ?? '').toLowerCase().includes(s)
        );
      }
      setItems(filtered);
    }
    setLoading(false);
  }, [typeFilter, statusFilter, search]);

  useEffect(() => { void load(); }, [load]);

  const autoActionedCount = items.filter((i) => i.auto_actioned).length;

  return (
    <div className="flex flex-col h-full">

      {/* Title bar */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <Flag size={20} className="text-red-400" />
            <h2 className="text-lg font-bold text-white">Şikayetler</h2>
            {autoActionedCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <Zap size={10} /> {autoActionedCount} otomatik
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p className="text-xs text-slate-500">{items.length} şikayet</p>
      </div>

      {/* Filters */}
      <div className="px-6 space-y-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Şikayetçi veya hedef kullanıcı ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>

        {/* Type tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTypeFilter(tab.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                typeFilter === tab.value
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status row */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_TABS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value as ReportStatus | 'open_only')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                statusFilter === s.value
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={24} className="animate-spin text-gold-400" />
            <p className="text-sm text-slate-500">Yükleniyor…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-red-400">{error}</p>
            <button type="button" onClick={() => void load()} className="text-xs text-gold-400 hover:underline">
              Tekrar dene
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Flag size={32} className="text-slate-600" />
            <p className="text-sm text-slate-500">Şikayet yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => onSelectReport(report)}
                className="w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">
                        {adminPanelService.getReportTypeIcon(report.report_type)}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {adminPanelService.getReportTypeLabel(report.report_type)}
                      </span>
                      {report.auto_actioned && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <Zap size={9} /> Otomatik
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span className="truncate max-w-[100px]">{report.reporter_name ?? 'Anonim'}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-semibold text-white truncate max-w-[100px]">
                        {report.reported_user_name ?? 'Bilinmiyor'}
                      </span>
                    </div>

                    {report.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{report.description}</p>
                    )}
                  </div>

                  {/* Right */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      report.status === 'pending'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : report.status === 'under_review'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {report.status === 'pending' ? 'Bekliyor'
                        : report.status === 'under_review' ? 'İnceleniyor'
                        : report.status === 'resolved' ? 'Çözüldü'
                        : 'Reddedildi'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">
                    {new Date(report.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {report.evidence_urls.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      {report.evidence_urls.length} kanıt
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
