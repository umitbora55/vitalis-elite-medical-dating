import React, { useCallback, useEffect, useState } from 'react';
import {
  adminPanelService,
  VerificationQueueItem,
  VerificationQueueFilters,
  VerificationQueueStatus,
  SlaStatus,
} from '../../services/adminPanelService';
import {
  BadgeCheck, Clock, AlertTriangle, Filter,
  Search, Loader2, RefreshCw, UserCheck, Crown, Minus,
} from 'lucide-react';

interface VerificationQueueProps {
  onSelectItem: (item: VerificationQueueItem) => void;
}

const STATUS_TABS: { value: VerificationQueueStatus | 'all'; label: string }[] = [
  { value: 'all',               label: 'Tümü' },
  { value: 'pending',           label: 'Bekliyor' },
  { value: 'in_review',         label: 'İncelemede' },
  { value: 'needs_more_info',   label: 'Bilgi Gerekli' },
  { value: 'approved',          label: 'Onaylı' },
  { value: 'rejected',          label: 'Reddedildi' },
];

const SLA_BADGE: Record<SlaStatus, { label: string; className: string }> = {
  ok:      { label: 'SLA OK',     className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  warning: { label: 'SLA Uyarı',  className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  breached:{ label: 'SLA İhlali', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const TIER_ICON: Record<string, React.ReactNode> = {
  ULTRA: <Crown size={12} className="text-gold-400" />,
  FORTE: <Crown size={12} className="text-blue-400" />,
  DOSE:  <Crown size={12} className="text-slate-400" />,
  FREE:  <Minus size={12} className="text-slate-600" />,
};

export const VerificationQueue: React.FC<VerificationQueueProps> = ({ onSelectItem }) => {
  const [items, setItems]     = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [statusTab, setStatusTab] = useState<VerificationQueueStatus | 'all'>('pending');
  const [slaFilter, setSlaFilter] = useState<SlaStatus | 'all'>('all');
  const [myOnly, setMyOnly]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filters: VerificationQueueFilters = {
      search: search.trim() || undefined,
      assignedToMe: myOnly,
    };
    if (statusTab !== 'all') filters.status = [statusTab];
    if (slaFilter !== 'all') filters.slaStatus = slaFilter;

    const { data, error: err } = await adminPanelService.getVerificationQueue(filters);
    if (err) setError(err);
    else setItems(data ?? []);
    setLoading(false);
  }, [search, statusTab, slaFilter, myOnly]);

  useEffect(() => { void load(); }, [load]);

  const handleAssignToSelf = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    await adminPanelService.assignVerificationToSelf(itemId);
    void load();
  };

  const breachedCount = items.filter((i) => i.sla_status === 'breached').length;
  const warningCount  = items.filter((i) => i.sla_status === 'warning').length;

  return (
    <div className="flex flex-col h-full">

      {/* Title bar */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <BadgeCheck size={20} className="text-blue-400" />
            <h2 className="text-lg font-bold text-white">Doğrulama Kuyruğu</h2>
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

        {/* SLA summary chips */}
        {(breachedCount > 0 || warningCount > 0) && (
          <div className="flex items-center gap-2 mt-2">
            {breachedCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle size={10} /> {breachedCount} ihlal
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock size={10} /> {warningCount} uyarı
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 space-y-3 mb-4">

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="İsim veya e-posta ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusTab(tab.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusTab === tab.value
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 border border-slate-700 hover:border-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary filters row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-slate-500" />
            <span className="text-xs text-slate-500">SLA:</span>
            {(['all', 'breached', 'warning', 'ok'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlaFilter(s)}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  slaFilter === s
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s === 'all' ? 'Hepsi' : s === 'breached' ? 'İhlal' : s === 'warning' ? 'Uyarı' : 'OK'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-slate-500">Sadece bende</span>
            <button
              type="button"
              role="switch"
              aria-checked={myOnly}
              onClick={() => setMyOnly((p) => !p)}
              className={`relative w-9 h-5 rounded-full transition-all ${myOnly ? 'bg-blue-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${myOnly ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
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
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs text-gold-400 hover:underline"
            >
              Tekrar dene
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BadgeCheck size={32} className="text-slate-600" />
            <p className="text-sm text-slate-500">Kuyruk boş</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const sla = SLA_BADGE[item.sla_status];
              const timeLeft = adminPanelService.getSlaTimeLeft(item.sla_deadline);
              const tierIcon = TIER_ICON[item.subscription_tier ?? 'FREE'] ?? TIER_ICON['FREE'];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">

                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {tierIcon}
                        <span className="text-sm font-semibold text-white truncate">
                          {item.user_name ?? 'İsimsiz'}
                        </span>
                        {item.assigned_to && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            <UserCheck size={9} /> Üzerimde
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{item.user_email ?? '—'}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{item.user_city ?? ''}</p>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sla.className}`}>
                        {sla.label}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} /> {timeLeft}
                      </span>
                    </div>
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!item.assigned_to && (item.status === 'pending') && (
                      <button
                        type="button"
                        onClick={(e) => void handleAssignToSelf(e, item.id)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        Üstlen →
                      </button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
