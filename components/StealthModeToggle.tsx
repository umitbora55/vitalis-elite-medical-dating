import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { EyeOff, Loader2, Lock } from 'lucide-react';

interface StealthModeToggleProps {
  userId: string;
  isPremium: boolean;
  initialValue?: boolean;
  onUpgrade?: () => void;
  onChange?: (enabled: boolean) => void;
}

export const StealthModeToggle: React.FC<StealthModeToggleProps> = ({
  userId,
  isPremium,
  initialValue = false,
  onUpgrade,
  onChange,
}) => {
  const [enabled, setEnabled] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (!isPremium) {
      onUpgrade?.();
      return;
    }

    const next = !enabled;
    setLoading(true);
    setError(null);

    try {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          stealth_mode:       next,
          stealth_enabled_at: next ? new Date().toISOString() : null,
        })
        .eq('id', userId);

      if (dbErr) throw dbErr;

      setEnabled(next);
      onChange?.(next);
    } catch {
      setError('Gizlilik modu güncellenemedi. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Main row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            enabled
              ? 'bg-purple-900/40 border border-purple-500/40'
              : 'bg-slate-800 border border-slate-700'
          }`}>
            <EyeOff size={20} className={enabled ? 'text-purple-400' : 'text-slate-500'} />
          </div>

          {/* Text */}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Gizli Mod</p>
              {!isPremium && (
                <span className="bg-gold-500/20 border border-gold-500/40 text-gold-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Premium
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-tight">
              {enabled
                ? 'Profilin sadece beğendiğin kişilere görünür'
                : 'Herkese görünürsün'}
            </p>
          </div>
        </div>

        {/* Toggle or Upgrade */}
        {isPremium ? (
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            aria-label={enabled ? 'Gizli modu kapat' : 'Gizli modu aç'}
            aria-checked={enabled}
            role="switch"
            className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
              enabled ? 'bg-purple-500' : 'bg-slate-700'
            } disabled:opacity-50`}
          >
            {loading ? (
              <Loader2
                size={12}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white"
              />
            ) : (
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`} />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onUpgrade}
            className="flex items-center gap-1.5 bg-gold-500/20 border border-gold-500/40 text-gold-400 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-gold-500/30 transition-all"
          >
            <Lock size={11} />
            Premium'a Geç
          </button>
        )}
      </div>

      {/* Active info banner */}
      {enabled && isPremium && (
        <div className="flex items-start gap-2.5 bg-purple-900/20 border border-purple-500/20 rounded-xl px-3.5 py-3 animate-fade-in">
          <EyeOff size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-purple-200/80 leading-relaxed">
            Profilin swipe havuzundan gizlendi. Sadece daha önce beğendiğin kişiler seni görebilir.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400 animate-fade-in">{error}</p>
      )}
    </div>
  );
};
