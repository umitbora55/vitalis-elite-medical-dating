import React, { useEffect, useState, useCallback } from 'react';
import {
  filterService,
  UserFilters,
  DEFAULT_FILTERS,
  INTENT_OPTIONS,
  PROFESSION_OPTIONS,
  SPECIALTY_OPTIONS,
  DISTRICT_OPTIONS,
} from '../services/filterService';
import { SlidersHorizontal, X, Lock, RotateCcw, Check, Loader2 } from 'lucide-react';

interface AdvancedFiltersProps {
  userId: string;
  isPremium: boolean;
  isOpen: boolean;
  onClose: () => void;
  onFiltersChanged?: (filters: UserFilters, activeCount: number) => void;
  onUpgrade?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MultiChipProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  premiumLocked?: boolean;
  onUpgrade?: () => void;
}

const MultiChip: React.FC<MultiChipProps> = ({
  label,
  options,
  selected,
  onChange,
  premiumLocked = false,
  onUpgrade,
}) => {
  const toggle = (value: string) => {
    if (premiumLocked) { onUpgrade?.(); return; }
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        {premiumLocked && (
          <span className="bg-gold-500/20 border border-gold-500/40 text-gold-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            Premium
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                premiumLocked
                  ? 'bg-slate-800/40 border-slate-700/50 text-slate-600 cursor-not-allowed'
                  : isSelected
                    ? 'bg-gold-500/20 border-gold-500 text-gold-400 shadow-[0_0_8px_rgba(234,179,8,0.15)]'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              {isSelected && !premiumLocked && <Check size={10} />}
              {premiumLocked && <Lock size={10} />}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label, min, max, value, unit = '', onChange,
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-bold text-gold-400">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-gold-500"
    />
    <div className="flex justify-between text-[10px] text-slate-600">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  userId,
  isPremium,
  isOpen,
  onClose,
  onFiltersChanged,
  onUpgrade,
}) => {
  const [filters, setFilters] = useState<UserFilters>({ ...DEFAULT_FILTERS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const f = await filterService.getFilters(userId);
      setFilters(f);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  // Merge partial filter update
  const update = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const toSave = isPremium ? filters : filterService.sanitizeForFree(filters);
      await filterService.saveFilters(userId, toSave);
      const count = filterService.countActiveFilters(toSave);
      onFiltersChanged?.(toSave, count);
      onClose();
    } catch {
      setSaveError('Filtreler kaydedilemedi. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setFilters({ ...DEFAULT_FILTERS });
    await filterService.saveFilters(userId, DEFAULT_FILTERS);
    onFiltersChanged?.(DEFAULT_FILTERS, 0);
  };

  const activeCount = filterService.countActiveFilters(filters);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/90 backdrop-blur-md flex items-end justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Gelişmiş Filtreler"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal size={18} className="text-gold-500" />
            <h2 className="text-lg font-serif font-bold text-white">Gelişmiş Filtreler</h2>
            {activeCount > 0 && (
              <span className="bg-gold-500 text-black text-[11px] font-black px-2 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              aria-label="Filtreleri sıfırla"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gold-400" />
            </div>
          ) : (
            <>
              {/* Intent filter */}
              <MultiChip
                label="İlişki Amacı"
                options={INTENT_OPTIONS}
                selected={filters.intent_filter}
                onChange={(v) => update('intent_filter', v)}
              />

              {/* Profession filter */}
              <MultiChip
                label="Meslek"
                options={PROFESSION_OPTIONS}
                selected={filters.profession_filter}
                onChange={(v) => update('profession_filter', v)}
              />

              {/* Specialty filter (Premium) */}
              <MultiChip
                label="Uzmanlık / Branş"
                options={SPECIALTY_OPTIONS}
                selected={filters.specialty_filter}
                onChange={(v) => update('specialty_filter', v)}
                premiumLocked={!isPremium}
                onUpgrade={onUpgrade}
              />

              {/* District filter (Premium) */}
              <MultiChip
                label="Semt / İlçe"
                options={DISTRICT_OPTIONS.map((d) => ({ value: d, label: d }))}
                selected={filters.district_filter}
                onChange={(v) => update('district_filter', v)}
                premiumLocked={!isPremium}
                onUpgrade={onUpgrade}
              />

              {/* Age range */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Yaş Aralığı
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-12 text-right">Min</span>
                  <input
                    type="range"
                    min={18}
                    max={filters.age_max - 1}
                    value={filters.age_min}
                    onChange={(e) => update('age_min', Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-gold-500"
                  />
                  <span className="text-sm font-bold text-gold-400 w-8">{filters.age_min}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-12 text-right">Max</span>
                  <input
                    type="range"
                    min={filters.age_min + 1}
                    max={65}
                    value={filters.age_max}
                    onChange={(e) => update('age_max', Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-gold-500"
                  />
                  <span className="text-sm font-bold text-gold-400 w-8">{filters.age_max}</span>
                </div>
              </div>

              {/* Distance */}
              <RangeSlider
                label="Maksimum Mesafe"
                min={5}
                max={100}
                value={filters.distance_km}
                unit=" km"
                onChange={(v) => update('distance_km', v)}
              />

              {/* Verified only */}
              <div className="flex items-center justify-between p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">Sadece Doğrulanmış</p>
                  <p className="text-xs text-slate-500">Yalnızca onaylı sağlık profesyonellerini gör</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={filters.verified_only}
                  onClick={() => update('verified_only', !filters.verified_only)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    filters.verified_only ? 'bg-gold-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                    filters.verified_only ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Save error */}
              {saveError && (
                <p className="text-xs text-red-400 text-center">{saveError}</p>
              )}

              {/* Premium upsell for locked features */}
              {!isPremium && (
                <div className="bg-gold-500/10 border border-gold-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={14} className="text-gold-500" />
                    <p className="text-sm font-bold text-gold-400">Premium Filtreler</p>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Uzmanlık branşı ve semt filtrelerini açmak için Premium'a geç.
                  </p>
                  <button
                    type="button"
                    onClick={onUpgrade}
                    className="w-full py-2.5 rounded-xl bg-gold-500 text-black text-sm font-bold hover:bg-gold-400 transition-all"
                  >
                    Premium'a Geç →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full py-3.5 rounded-2xl bg-gold-500 text-black font-bold text-sm hover:bg-gold-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-gold-500/10"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Kaydediliyor…</>
            ) : (
              <>Filtreleri Uygula{activeCount > 0 ? ` (${activeCount})` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
