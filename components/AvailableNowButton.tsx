import React, { useEffect, useState } from 'react';
import { dutyModeService } from '../services/dutyModeService';
import { MapPin, X, Loader2, ChevronDown } from 'lucide-react';

interface AvailableNowButtonProps {
  userId: string;
  currentDistrict?: string;
  isPremium?: boolean;
}

const ISTANBUL_DISTRICTS = [
  'Beşiktaş', 'Kadıköy', 'Şişli', 'Beyoğlu', 'Üsküdar',
  'Bakırköy', 'Ataşehir', 'Maltepe', 'Sarıyer', 'Levent',
  'Taksim', 'Nişantaşı', 'Etiler', 'Bağcılar', 'Fatih',
];

const VISIBILITY_OPTIONS: { value: 'all' | 'verified' | 'matches_only'; label: string; badge?: string }[] = [
  { value: 'verified', label: 'Sadece Doğrulanmış', badge: 'Güvenli' },
  { value: 'all', label: 'Herkese Görünür' },
  { value: 'matches_only', label: 'Sadece Match\'lerime' },
];

export const AvailableNowButton: React.FC<AvailableNowButtonProps> = ({
  userId,
  currentDistrict,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [availableUntil, setAvailableUntil] = useState<string | null>(null);
  const [district, setDistrict] = useState(currentDistrict ?? '');
  const [visibility, setVisibility] = useState<'all' | 'verified' | 'matches_only'>('verified');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [countdown, setCountdown] = useState('');

  // Initial fetch
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await dutyModeService.getAvailableStatus(userId);
        if (status.is_available_now) {
          setIsActive(true);
          setAvailableUntil(status.available_until);
          if (status.available_district) {
            setDistrict(status.available_district);
          }
        }
      } catch (err) {
        console.error('Failed to fetch availability status:', err);
      }
    };
    fetchStatus();
  }, [userId]);

  // Countdown ticker
  useEffect(() => {
    if (!availableUntil) return;
    const tick = () => setCountdown(dutyModeService.getAvailableCountdown(availableUntil));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [availableUntil]);

  const handleActivate = async () => {
    if (!district.trim()) return;
    setLoading(true);
    try {
      await dutyModeService.activateAvailableNow(userId, district.trim(), visibility);
      setIsActive(true);
      setAvailableUntil(new Date(Date.now() + 90 * 60 * 1000).toISOString());
      setShowSetup(false);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      await dutyModeService.deactivateAvailableNow(userId);
      setIsActive(false);
      setAvailableUntil(null);
      setCountdown('');
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  // Active state
  if (isActive) {
    return (
      <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <MapPin size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-emerald-400 text-sm font-bold">📍 Şu an {district}&#39;ta</p>
            <p className="text-slate-500 text-xs">{countdown} kaldı</p>
          </div>
        </div>
        <button
          onClick={handleDeactivate}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
        </button>
      </div>
    );
  }

  // Setup form
  if (showSetup) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-semibold">Şu An Müsaitim (90 dk)</p>
          <button onClick={() => setShowSetup(false)} className="text-slate-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* District picker */}
        <div>
          <label className="text-slate-500 text-xs font-medium mb-1.5 block">Semt seç</label>
          <div className="relative">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gold-500/40"
            >
              <option value="">Semt seç…</option>
              {ISTANBUL_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="text-slate-500 text-xs font-medium mb-1.5 block">Kimler görebilsin?</label>
          <div className="space-y-1.5">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${visibility === opt.value
                  ? 'bg-gold-500/10 border-gold-500/50 text-gold-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
              >
                <span>{opt.label}</span>
                {opt.badge && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleActivate}
          disabled={!district || loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-sm tracking-wide hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : '📍 Aktifleştir (90 dk)'}
        </button>
      </div>
    );
  }

  // Default button
  return (
    <button
      onClick={() => setShowSetup(true)}
      className="w-full flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 hover:border-emerald-500/30 hover:bg-emerald-900/10 rounded-2xl p-3.5 transition-all group"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-700 group-hover:bg-emerald-500/20 flex items-center justify-center transition-all">
        <MapPin size={18} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
      </div>
      <div className="text-left">
        <p className="text-slate-300 text-sm font-semibold group-hover:text-white transition-colors">
          Şu An Müsaitim
        </p>
        <p className="text-slate-600 text-xs">90 dk aktif • Sadece semt görünür</p>
      </div>
    </button>
  );
};
