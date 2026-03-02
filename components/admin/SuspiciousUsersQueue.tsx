import React, { useCallback, useEffect, useState } from 'react';
import {
  adminPanelService,
  SuspiciousUser,
  SuspiciousUserSeverity,
  SuspiciousUserStatus,
} from '../../services/adminPanelService';
import {
  AlertTriangle, Search, Loader2, RefreshCw,
  Bot, Flag, Eye,
} from 'lucide-react';

interface SuspiciousUsersQueueProps {
  onSelectUser: (user: SuspiciousUser) => void;
}

const SEVERITY_TABS: { value: SuspiciousUserSeverity | 'all'; label: string }[] = [
  { value: 'all',      label: 'Tümü' },
  { value: 'critical', label: '🔴 Kritik' },
  { value: 'high',     label: '🟠 Yüksek' },
  { value: 'medium',   label: '🟡 Orta' },
  { value: 'low',      label: '⚪ Düşük' },
];

const STATUS_FILTER: { value: SuspiciousUserStatus | 'open_only'; label: string }[] = [
  { value: 'open_only',     label: 'Açık' },
  { value: 'investigating', label: 'İnceleniyor' },
  { value: 'resolved',      label: 'Çözüldü' },
  { value: 'false_positive',label: 'Yanlış Alarm' },
];

export const SuspiciousUsersQueue: React.FC<SuspiciousUsersQueueProps> = ({ onSelectUser }) => {
  const [items, setItems]         = useState<SuspiciousUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [severityFilter, setSeverityFilter] = useState<SuspiciousUserSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter]     = useState<SuspiciousUserStatus | 'open_only'>('open_only');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const statusArg: SuspiciousUserStatus | undefined =
      statusFilter === 'open_only' ? 'open' : statusFilter;

    const { data, error: err } = await adminPanelService.getSuspiciousUsers(
      statusArg,
      severityFilter === 'all' ? undefined : severityFilter
    );

    if (err) setError(err);
    else {
      let filtered = data ?? [];
      if (search.trim()) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            (u.user_name ?? '').toLowerCase().includes(s) ||
            (u.user_email ?? '').toLowerCase().includes(s) ||
            u.flag_reason.toLowerCase().includes(s)
        );
      }
      setItems(filtered);
    }
    setLoading(false);
  }, [severityFilter, statusFilter, search]);

  useEffect(() => { void load(); }, [load]);

  const criticalCount = items.filter((i) => i.severity === 'critical').length;

  return (
    <div className="flex flex-col h-full">

      {/* Title bar */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold text-white">Şüpheli Kullanıcılar</h2>
            {criticalCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                {criticalCount} kritik
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
        <p className="text-xs text-slate-500">{items.length} kayıt</p>
      </div>

      {/* Filters */}
      <div className="px-6 space-y-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="İsim, e-posta veya sebep ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>

        {/* Severity tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {SEVERITY_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSeverityFilter(tab.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                severityFilter === tab.value
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status row */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATUS_FILTER.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value as SuspiciousUserStatus | 'open_only')}
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
            <AlertTriangle size={32} className="text-slate-600" />
            <p className="text-sm text-slate-500">Şüpheli kullanıcı yok</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((user) => {
              const severityClass = adminPanelService.getSeverityColor(user.severity);

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSelectUser(user)}
                  className="w-full text-left bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityClass}`}>
                          {user.severity.toUpperCase()}
                        </span>
                        {user.auto_flagged && (
                          <span className="flex items-center gap-0.5 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                            <Bot size={9} /> Otomatik
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white truncate">
                        {user.user_name ?? 'İsimsiz'}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user.user_email ?? '—'}</p>
                      <p className="text-xs text-amber-400/80 mt-1 line-clamp-1">{user.flag_reason}</p>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {user.report_count > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Flag size={10} /> {user.report_count} şikayet
                        </span>
                      )}
                      <Eye size={14} className="text-slate-600" />
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">
                      {new Date(user.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-500 capitalize">
                      {user.status.replace(/_/g, ' ')}
                    </span>
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
