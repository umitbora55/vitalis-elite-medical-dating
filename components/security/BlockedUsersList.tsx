/**
 * BlockedUsersList — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Displays the current user's blocked users and allows unblocking.
 * Uses blockAndReportService.getBlockedUsers() and .unblockUser().
 *
 * States handled:
 *   loading → skeleton rows
 *   empty   → friendly empty state
 *   error   → retry button
 *   list    → avatar + name + blocked date + unblock button
 *   confirm → inline "Are you sure?" before unblocking
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  UserX,
  RotateCcw,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Flag,
  ChevronRight,
  ShieldOff,
  Search,
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import {
  blockAndReportService,
  type BlockedUserSummary,
} from '../../services/blockAndReportService';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBlockDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface BlockedRowProps {
  user:         BlockedUserSummary;
  unblocking:   boolean;
  confirming:   boolean;
  onStartUnblock: () => void;
  onConfirmUnblock: () => void;
  onCancelUnblock:  () => void;
}

const BlockedRow: React.FC<BlockedRowProps> = ({
  user, unblocking, confirming, onStartUnblock, onConfirmUnblock, onCancelUnblock,
}) => (
  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
    {/* Main row */}
    <div className="flex items-center gap-3 p-3.5">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {user.blocked_avatar ? (
          <img
            src={user.blocked_avatar}
            alt={user.blocked_name ?? 'Kullanıcı'}
            className="w-10 h-10 rounded-full object-cover bg-slate-700 grayscale opacity-60"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
            <User size={18} className="text-slate-500" />
          </div>
        )}
        {/* Blocked badge */}
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center">
          <UserX size={9} className="text-red-400" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-300 truncate">
          {user.blocked_name ?? 'İsimsiz Kullanıcı'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Calendar size={9} />
            <span>{formatBlockDate(user.blocked_at)}</span>
          </div>
          {user.with_report && (
            <div className="flex items-center gap-1 text-[10px] text-red-400/70">
              <Flag size={9} />
              <span>Raporlandı</span>
            </div>
          )}
        </div>
      </div>

      {/* Unblock trigger */}
      {!confirming && (
        <button
          onClick={onStartUnblock}
          disabled={unblocking}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {unblocking ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <>
              <ShieldOff size={12} />
              <span>Engeli Kaldır</span>
              <ChevronRight size={11} className="opacity-50" />
            </>
          )}
        </button>
      )}
    </div>

    {/* Confirmation row */}
    {confirming && (
      <div className="px-3.5 pb-3.5 border-t border-slate-700/40 pt-3 space-y-2">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200">
            {user.blocked_name ?? 'Bu kullanıcı'}
          </span>{' '}
          engelini kaldırmak istediğine emin misin?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirmUnblock}
            disabled={unblocking}
            className="flex-1 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {unblocking ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <><ShieldOff size={12} /> Evet, Kaldır</>
            )}
          </button>
          <button
            onClick={onCancelUnblock}
            disabled={unblocking}
            className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors"
          >
            İptal
          </button>
        </div>
      </div>
    )}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

export interface BlockedUsersListProps {
  className?: string;
}

export const BlockedUsersList: React.FC<BlockedUsersListProps> = ({ className = '' }) => {
  const [userId,    setUserId]    = useState<string | null>(null);
  const [users,     setUsers]     = useState<BlockedUserSummary[]>([]);
  const [filtered,  setFiltered]  = useState<BlockedUserSummary[]>([]);
  const [query,     setQuery]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Per-row state
  const [confirming, setConfirming] = useState<string | null>(null);  // blocked_id
  const [unblocking, setUnblocking] = useState<string | null>(null);  // blocked_id

  // Load current user + blocked list
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');
      setUserId(user.id);

      const list = await blockAndReportService.getBlockedUsers(user.id);
      setUsers(list);
      setFiltered(list);
    } catch {
      setError('Engellenenler listesi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Search filter
  useEffect(() => {
    if (!query.trim()) {
      setFiltered(users);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(
      users.filter((u) => (u.blocked_name ?? '').toLowerCase().includes(q)),
    );
  }, [query, users]);

  // Unblock
  const handleConfirmUnblock = async (blockedId: string) => {
    if (!userId) return;
    setUnblocking(blockedId);
    try {
      const { error: uErr } = await blockAndReportService.unblockUser(userId, blockedId);
      if (uErr) throw new Error(uErr);
      setUsers((prev) => prev.filter((u) => u.blocked_id !== blockedId));
      setFiltered((prev) => prev.filter((u) => u.blocked_id !== blockedId));
    } catch {
      setError('Engel kaldırılamadı. Lütfen tekrar dene.');
    } finally {
      setUnblocking(null);
      setConfirming(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserX size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white">
            Engellenenler
            {!loading && users.length > 0 && (
              <span className="ml-1.5 text-xs text-slate-500 font-normal">
                ({users.length})
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
          aria-label="Yenile"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
        </button>
      </div>

      {/* Search */}
      {!loading && users.length > 4 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsimle ara…"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-slate-800/40 animate-pulse"
              style={{ opacity: 1 - i * 0.2 }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400 flex-1">{error}</p>
          <button
            onClick={load}
            className="text-xs text-red-400 font-semibold hover:text-red-300 underline"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
            <UserX size={24} className="text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-400">
              {query ? 'Sonuç bulunamadı' : 'Henüz kimseyi engellemedin'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {query
                ? 'Farklı bir isimle arama yapmayı dene'
                : 'Engellenen kullanıcılar burada listelenecek'}
            </p>
          </div>
        </div>
      )}

      {/* Blocked user rows */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2.5">
          {filtered.map((user) => (
            <BlockedRow
              key={user.blocked_id}
              user={user}
              unblocking={unblocking === user.blocked_id}
              confirming={confirming === user.blocked_id}
              onStartUnblock={() => setConfirming(user.blocked_id)}
              onConfirmUnblock={() => handleConfirmUnblock(user.blocked_id)}
              onCancelUnblock={() => setConfirming(null)}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      {!loading && users.length > 0 && (
        <p className="text-[10px] text-slate-600 text-center leading-relaxed">
          Engeli kaldırırsanız karşı taraf profilini yeniden görebilir.
          Daha önce bildirdiysen rapor kaydı silinmez.
        </p>
      )}
    </div>
  );
};
