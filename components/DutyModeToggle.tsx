import React, { useEffect, useState } from 'react';
import { dutyModeService, type DutyModeStatus } from '../services/dutyModeService';
import { Stethoscope, Loader2, X, Clock } from 'lucide-react';

interface DutyModeToggleProps {
  userId: string;
  onChange?: (status: DutyModeStatus) => void;
  compact?: boolean;
}

const DURATION_OPTIONS = [
  { label: '8 saat', hours: 8 },
  { label: '12 saat', hours: 12 },
  { label: '24 saat', hours: 24 },
  { label: '36 saat', hours: 36 },
];

export const DutyModeToggle: React.FC<DutyModeToggleProps> = ({
  userId,
  onChange,
  compact = false,
}) => {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Use a ref for onChange to avoid infinite re-renders when passed as inline prop
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    dutyModeService.getDutyStatus(userId).then((s) => {
      setIsOnDuty(s.isOnDuty);
      setHoursRemaining(s.hoursRemaining);
      onChangeRef.current?.(s);
    });
  }, [userId]); // onChange intentionally removed from deps

  const handleDeactivate = async () => {
    setLoading(true);
    setIsOnDuty(false); // optimistic
    setHoursRemaining(0);
    try {
      await dutyModeService.deactivateDutyMode(userId);
      const next = { isOnDuty: false, dutyEndsAt: null, hoursRemaining: 0 };
      onChangeRef.current?.(next);
    } catch {
      // Revert on error
      const s = await dutyModeService.getDutyStatus(userId);
      setIsOnDuty(s.isOnDuty);
      setHoursRemaining(s.hoursRemaining);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (hours: number) => {
    setShowPicker(false);
    setLoading(true);
    setIsOnDuty(true); // optimistic
    setHoursRemaining(hours);
    try {
      await dutyModeService.activateDutyMode(userId, hours);
      const s = await dutyModeService.getDutyStatus(userId);
      setIsOnDuty(s.isOnDuty);
      setHoursRemaining(s.hoursRemaining);
      onChangeRef.current?.(s);
    } catch {
      setIsOnDuty(false);
      setHoursRemaining(0);
    } finally {
      setLoading(false);
    }
  };

  // ── ACTIVE STATE ─────────────────────────────────────────────────────────────
  if (isOnDuty) {
    return (
      <div className="flex items-center justify-between bg-blue-900/30 border border-blue-500/40 rounded-2xl p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Stethoscope size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-blue-300 text-sm font-bold">🏥 Nöbettesiniz</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={11} className="text-blue-400/70" />
              <p className="text-blue-400/70 text-xs">
                {hoursRemaining > 0 ? `${hoursRemaining} saat kaldı` : 'Aktif'} • Match +48h • Pick 2/gün
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleDeactivate}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-red-500/50 hover:bg-red-900/20 transition-all"
          aria-label="Nöbet modunu kapat"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
        </button>
      </div>
    );
  }

  // ── COMPACT ──────────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <button
        onClick={() => handleActivate(12)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Stethoscope size={12} />}
        Nöbet Modu
      </button>
    );
  }

  // ── INACTIVE / PICKER ────────────────────────────────────────────────────────
  const toggleOn = isOnDuty || showPicker;

  return (
    <div className="space-y-3">
      {/* Main row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${toggleOn ? 'bg-blue-900/40 border border-blue-500/40' : 'bg-slate-800 border border-slate-700'
            }`}>
            <Stethoscope size={20} className={toggleOn ? 'text-blue-400' : 'text-slate-500'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Nöbet Modu</p>
            <p className="text-xs text-slate-500">Aktifken match süresi +48 saat uzar</p>
          </div>
        </div>

        {/* Toggle — visually ON when picker is open or duty is active */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={loading}
          className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${toggleOn ? 'bg-blue-500' : 'bg-slate-700'
            } disabled:opacity-50`}
          aria-label="Nöbet modunu aç/kapat"
        >
          {loading ? (
            <Loader2 size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
          ) : (
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${toggleOn ? 'translate-x-6' : 'translate-x-0'
              }`} />
          )}
        </button>
      </div>

      {/* Duration picker */}
      {showPicker && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 animate-fade-in">
          <p className="text-slate-400 text-xs mb-2 font-medium">Nöbet süresi seç:</p>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.hours}
                onClick={() => handleActivate(opt.hours)}
                disabled={loading}
                className="py-2.5 rounded-lg text-xs font-bold border transition-all bg-slate-800 border-slate-700 text-slate-300 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-400 active:scale-95 disabled:opacity-40"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
