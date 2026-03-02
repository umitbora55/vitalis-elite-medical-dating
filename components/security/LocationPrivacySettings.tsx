/**
 * LocationPrivacySettings — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Settings panel for location privacy.  Lets the user choose between:
 *   • approximate  (default) — shows district/city with 500–1500m obfuscation
 *   • city_only             — shows only city name
 *   • hidden                — completely hides location
 *
 * Also explains what information each option reveals to other users.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  MapPin,
  Eye,
  EyeOff,
  Building2,
  Map,
  Check,
  Loader2,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { locationPrivacyService } from '../../services/locationPrivacyService';
import type { LocationPrivacyLevel } from '../../types';

// ── Option definitions ─────────────────────────────────────────────────────────

interface PrivacyOption {
  level:       LocationPrivacyLevel;
  label:       string;
  description: string;
  example:     string;
  icon:        React.ReactNode;
  recommended: boolean;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    level:       'approximate',
    label:       'Yaklaşık konum',
    description: 'Semtiniz ve şehriniz gösterilir. Gerçek konumunuz 500–1500 m kaydırılır.',
    example:     '"Kadıköy, İstanbul"',
    icon:        <MapPin size={18} />,
    recommended: true,
  },
  {
    level:       'city_only',
    label:       'Sadece şehir',
    description: 'Yalnızca hangi şehirde olduğunuz görünür. Semt bilgisi gizlenir.',
    example:     '"İstanbul"',
    icon:        <Building2 size={18} />,
    recommended: false,
  },
  {
    level:       'hidden',
    label:       'Gizli',
    description: 'Konum bilgisi tamamen gizlenir. "Konum gizli" gösterilir.',
    example:     '"Konum gizli"',
    icon:        <EyeOff size={18} />,
    recommended: false,
  },
];

// ── Sub-component: option card ─────────────────────────────────────────────────

interface OptionCardProps extends PrivacyOption {
  selected:  boolean;
  disabled:  boolean;
  onSelect:  () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  label, description, example, icon, recommended, selected, disabled, onSelect,
}) => (
  <button
    onClick={onSelect}
    disabled={disabled}
    className={`w-full text-left p-4 rounded-xl border transition-all
      ${selected
        ? 'bg-emerald-500/10 border-emerald-500/40'
        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className="flex items-start gap-3">
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          ${selected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/60 text-slate-400'}`}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-200'}`}>
            {label}
          </span>
          {recommended && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              Önerilen
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
        <p className="text-xs text-slate-500 mt-1">
          Görünen: <span className="text-slate-300 font-medium">{example}</span>
        </p>
      </div>

      {/* Check */}
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
          ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}
      >
        {selected && <Check size={11} className="text-white" />}
      </div>
    </div>
  </button>
);

// ── Main component ─────────────────────────────────────────────────────────────

export interface LocationPrivacySettingsProps {
  /** Outer className */
  className?: string;
  /** Called after a successful save (for parent to refresh if needed) */
  onSaved?: (level: LocationPrivacyLevel) => void;
}

export const LocationPrivacySettings: React.FC<LocationPrivacySettingsProps> = ({
  className = '',
  onSaved,
}) => {
  const [current,  setCurrent]  = useState<LocationPrivacyLevel>('approximate');
  const [pending,  setPending]  = useState<LocationPrivacyLevel>('approximate');
  const [city,     setCity]     = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saved,    setSaved]    = useState(false);

  // Load current settings
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await locationPrivacyService.getMyPrivacySettings();
      if (settings) {
        setCurrent(settings.privacyLevel);
        setPending(settings.privacyLevel);
        setCity(settings.city);
        setDistrict(settings.district);
      }
    } catch {
      setError('Ayarlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isDirty = pending !== current;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await locationPrivacyService.setPrivacyLevel(pending);
      setCurrent(pending);
      setSaved(true);
      onSaved?.(pending);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Ayarlar kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Konum Gizliliği</h3>
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-slate-500" />}
        {!loading && (
          <button
            onClick={load}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Yenile"
          >
            <RefreshCcw size={13} />
          </button>
        )}
      </div>

      {/* Current location label */}
      {!loading && city && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-300">
            <span className="text-slate-500">Şu anki konum:</span>{' '}
            <span className="font-medium">
              {locationPrivacyService.formatLocationLabel(
                {
                  display_latitude:  0,
                  display_longitude: 0,
                  display_radius_m:  1000,
                  city,
                  district,
                  privacy_level:     current,
                },
                current,
              )}
            </span>
          </p>
        </div>
      )}

      {/* Options */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {PRIVACY_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.level}
              {...opt}
              selected={pending === opt.level}
              disabled={saving}
              onSelect={() => setPending(opt.level)}
            />
          ))}
        </div>
      )}

      {/* Privacy info note */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
        <Eye size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Gerçek konumunuz hiçbir zaman diğer kullanıcılara gösterilmez.
          Konum verisi KVKK kapsamında işlenir.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Save button */}
      {isDirty && !loading && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 size={15} className="animate-spin" /> Kaydediliyor…</>
          ) : (
            <><Check size={15} /> Kaydet</>
          )}
        </button>
      )}

      {/* Saved confirmation */}
      {saved && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 py-1">
          <Check size={13} /> Kaydedildi
        </div>
      )}
    </div>
  );
};
