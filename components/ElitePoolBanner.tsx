/**
 * ElitePoolBanner
 *
 * Feature 4: Elite Invite-only Verified Pool
 * Shows the user's current elite pool status and a toggle to join/leave.
 * Ineligible users see the criteria they need to meet.
 */

import React, { useEffect, useState } from 'react';
import { Crown, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { elitePoolService } from '../services/elitePoolService';
import { ElitePoolStatus } from '../types';

interface ElitePoolBannerProps {
  userId:    string;
  onToggle?: (isMember: boolean) => void;
}

export const ElitePoolBanner: React.FC<ElitePoolBannerProps> = ({ userId, onToggle }) => {
  const [status, setStatus]   = useState<ElitePoolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    elitePoolService.getStatus(userId).then((s) => {
      setStatus(s);
      setLoading(false);
    });
  }, [userId]);

  const handleToggle = async () => {
    if (!status) return;
    setToggling(true);
    setError(null);

    const result = status.isMember
      ? await elitePoolService.leave(userId)
      : await elitePoolService.join(userId);

    if (result.error) {
      setError(result.error);
      setToggling(false);
      return;
    }

    const newStatus = await elitePoolService.getStatus(userId);
    setStatus(newStatus);
    setToggling(false);
    onToggle?.(newStatus.isMember);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={18} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      status.isMember
        ? 'bg-gradient-to-r from-gold-950/40 to-amber-950/30 border-gold-500/30'
        : status.isEligible
          ? 'bg-slate-800/40 border-slate-700/40'
          : 'bg-slate-900/40 border-slate-800/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          status.isMember ? 'bg-gold-500/20 border border-gold-500/30' : 'bg-slate-800 border border-slate-700'
        }`}>
          {status.isMember
            ? <Crown size={18} className="text-gold-400" />
            : <Lock size={18} className="text-slate-500" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Elite Pool</p>
          {status.isMember ? (
            <p className="text-xs text-gold-400 mt-0.5">
              Aktif üye · {status.joinedAt
                ? new Date(status.joinedAt).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
                : ''}
            </p>
          ) : status.isEligible ? (
            <p className="text-xs text-slate-400 mt-0.5">Kriterleri karşılıyorsunuz — katılabilirsiniz</p>
          ) : (
            <div className="mt-1 space-y-0.5">
              <p className="text-xs text-slate-500">Katılım kriterleri:</p>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-slate-600 flex-shrink-0" />
                <span className="text-[11px] text-slate-500">Kimlik doğrulaması</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-slate-600 flex-shrink-0" />
                <span className="text-[11px] text-slate-500">Güvenilirlik skoru ≥ 0.80</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-slate-600 flex-shrink-0" />
                <span className="text-[11px] text-slate-500">En az 1 tamamlanmış buluşma</span>
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>

        {(status.isMember || status.isEligible) && (
          <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={toggling}
            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 ${
              status.isMember
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-gold-500 text-slate-950 hover:bg-gold-400'
            }`}
          >
            {toggling
              ? <Loader2 size={12} className="animate-spin" />
              : status.isMember ? 'Çık' : 'Katıl'
            }
          </button>
        )}
      </div>
    </div>
  );
};
