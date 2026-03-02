import React, { useState } from 'react';
import { eventService, RegisterOptions } from '../services/eventService';
import { Check, UserPlus, X, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

interface RSVPButtonProps {
  eventId: string;
  userId: string;
  isPremium: boolean;
  isVerifiedOnly: boolean;
  isVerified: boolean;
  isFull: boolean;
  initialRegistered?: boolean;
  onSuccess?: (registered: boolean) => void;
  onUpgradeClick?: () => void;
}

export const RSVPButton: React.FC<RSVPButtonProps> = ({
  eventId,
  userId,
  isPremium,
  isVerifiedOnly,
  isVerified,
  isFull,
  initialRegistered = false,
  onSuccess,
  onUpgradeClick,
}) => {
  const [registered, setRegistered]   = useState(initialRegistered);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isVisible, setIsVisible]     = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Access check
  const canRegister = !isVerifiedOnly || isVerified;

  const handleRegister = async (opts: RegisterOptions = {}) => {
    setLoading(true);
    setError(null);
    try {
      await eventService.registerForEvent(eventId, userId, {
        isVisible:   opts.isVisible  ?? isVisible,
        isAnonymous: opts.isAnonymous ?? isAnonymous,
      });
      setRegistered(true);
      setShowOptions(false);
      onSuccess?.(true);
    } catch {
      setError('Kayıt olunamadı. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      await eventService.cancelRegistration(eventId, userId);
      setRegistered(false);
      onSuccess?.(false);
    } catch {
      setError('Kayıt iptal edilemedi.');
    } finally {
      setLoading(false);
    }
  };

  // ── Already registered state ──────────────────────────────────────────────
  if (registered) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
            <Check size={16} />
            Kayıtlısın
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // ── Locked state ──────────────────────────────────────────────────────────
  if (!canRegister) {
    return (
      <button
        type="button"
        onClick={onUpgradeClick}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gold-500/15 border border-gold-500/30 text-gold-400 font-bold text-sm hover:bg-gold-500/20 transition-all"
      >
        <Lock size={15} />
        Doğrulanmış Kullanıcı Gerekiyor
      </button>
    );
  }

  // ── Full event ─────────────────────────────────────────────────────────────
  if (isFull) {
    return (
      <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm cursor-not-allowed">
        Etkinlik Dolu
      </div>
    );
  }

  // ── Registration options panel ─────────────────────────────────────────────
  if (showOptions) {
    return (
      <div className="space-y-3 animate-fade-in">
        {/* Visible in attendees list */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
          <div className="flex items-center gap-2">
            {isVisible ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} className="text-slate-500" />}
            <span className="text-sm text-white">Katılımcı listesinde görün</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isVisible}
            onClick={() => setIsVisible((p) => !p)}
            className={`relative w-10 h-5 rounded-full transition-all ${isVisible ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isVisible ? 'translate-x-5' : ''}`} />
          </button>
        </label>

        {/* Anonymous in match window (Premium) */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 cursor-pointer">
          <div className="flex items-center gap-2">
            <EyeOff size={14} className={isAnonymous ? 'text-purple-400' : 'text-slate-500'} />
            <div>
              <span className="text-sm text-white">Anonim katıl</span>
              {!isPremium && (
                <span className="ml-2 bg-gold-500/20 text-gold-400 text-[10px] font-bold px-1.5 rounded-full">Premium</span>
              )}
              <p className="text-[10px] text-slate-500 leading-tight">Event Match window'da görünmezsin</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isAnonymous}
            onClick={() => isPremium ? setIsAnonymous((p) => !p) : onUpgradeClick?.()}
            className={`relative w-10 h-5 rounded-full transition-all ${isAnonymous && isPremium ? 'bg-purple-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isAnonymous && isPremium ? 'translate-x-5' : ''}`} />
          </button>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowOptions(false)}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-slate-800 transition-all"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => handleRegister()}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gold-500 text-black font-bold text-sm hover:bg-gold-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Onayla
          </button>
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    );
  }

  // ── Default register button ───────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowOptions(true)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gold-500 text-black font-bold text-sm hover:bg-gold-400 transition-all disabled:opacity-50 shadow-lg shadow-gold-500/15"
      >
        {loading
          ? <Loader2 size={16} className="animate-spin" />
          : <UserPlus size={16} />
        }
        Katıl
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
};
