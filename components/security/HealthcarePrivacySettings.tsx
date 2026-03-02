/**
 * HealthcarePrivacySettings — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Controls healthcare-specific privacy settings that reduce the risk of
 * unwanted contact with colleagues or patients:
 *
 *   • hide_same_institution  — hides user from people at the same hospital/clinic
 *   • hide_profession_detail — shows only "Sağlık çalışanı", not exact role/specialty
 *   • patient_privacy_reminder — shows a reminder banner before each conversation
 *
 * All settings default to TRUE (safe-by-default).
 * Settings are stored in `user_security_settings` table via Supabase.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Stethoscope,
  Bell,
  Shield,
  Loader2,
  Check,
  AlertCircle,
  RefreshCcw,
  Info,
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import type { UserSecuritySettings } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────────

type HcPrivacyKey =
  | 'hide_same_institution'
  | 'hide_profession_detail'
  | 'patient_privacy_reminder';

interface ToggleSetting {
  key:         HcPrivacyKey;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  riskNote:    string;
}

const SETTINGS: ToggleSetting[] = [
  {
    key:         'hide_same_institution',
    label:       'Aynı kurumu gizle',
    description: 'Aynı hastane veya klinikten kişilere profilin gösterilmez.',
    icon:        <Building2 size={17} />,
    riskNote:    'İş yerinde tanınan kişilerle eşleşmeyi önler.',
  },
  {
    key:         'hide_profession_detail',
    label:       'Meslek detayını gizle',
    description: 'Sadece "Sağlık çalışanı" görünür; bölüm ve ünvan gizlenir.',
    icon:        <Stethoscope size={17} />,
    riskNote:    'Tanınmayı ve iş ilişkisi kaynaklı baskıyı azaltır.',
  },
  {
    key:         'patient_privacy_reminder',
    label:       'Hasta gizliliği hatırlatıcısı',
    description: 'Her yeni sohbet öncesinde kısa bir KVKK/hasta gizliliği banner\'ı gösterilir.',
    icon:        <Bell size={17} />,
    riskNote:    'Sağlık hukuku yükümlülüklerinize dair farkındalığı taze tutar.',
  },
];

// ── Toggle row ─────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  setting:  ToggleSetting;
  value:    boolean;
  disabled: boolean;
  onChange: (key: HcPrivacyKey, val: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ setting, value, disabled, onChange }) => {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${value ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/60 text-slate-500'}`}
        >
          {setting.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-100">{setting.label}</p>
            <button
              onClick={() => setShowNote((p) => !p)}
              className="p-0.5 text-slate-600 hover:text-slate-400 transition-colors"
              aria-label="Neden?"
            >
              <Info size={12} />
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            {setting.description}
          </p>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onChange(setting.key, !value)}
          disabled={disabled}
          role="switch"
          aria-checked={value}
          aria-label={setting.label}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5
            ${value ? 'bg-emerald-500' : 'bg-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
              transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {/* Expandable risk note */}
      {showNote && (
        <div className="px-4 pb-3 pt-0 border-t border-slate-700/40">
          <div className="flex items-start gap-2 pt-2.5">
            <Shield size={11} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {setting.riskNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface HealthcarePrivacySettingsProps {
  className?: string;
  onSaved?:   () => void;
}

type LocalState = Pick<
  UserSecuritySettings,
  'hide_same_institution' | 'hide_profession_detail' | 'patient_privacy_reminder'
>;

export const HealthcarePrivacySettings: React.FC<HealthcarePrivacySettingsProps> = ({
  className = '',
  onSaved,
}) => {
  const [settings, setSettings] = useState<LocalState>({
    hide_same_institution:    true,
    hide_profession_detail:   true,
    patient_privacy_reminder: true,
  });
  const [original, setOriginal] = useState<LocalState>(settings);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saved,    setSaved]    = useState(false);

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      const { data, error: dbErr } = await supabase.rpc('get_or_create_security_settings', {
        p_user_id: user.id,
      });

      if (dbErr) throw dbErr;

      if (data) {
        const row = data as UserSecuritySettings;
        const state: LocalState = {
          hide_same_institution:    row.hide_same_institution,
          hide_profession_detail:   row.hide_profession_detail,
          patient_privacy_reminder: row.patient_privacy_reminder,
        };
        setSettings(state);
        setOriginal(state);
      }
    } catch {
      setError('Ayarlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isDirty =
    settings.hide_same_institution    !== original.hide_same_institution    ||
    settings.hide_profession_detail   !== original.hide_profession_detail   ||
    settings.patient_privacy_reminder !== original.patient_privacy_reminder;

  const handleChange = (key: HcPrivacyKey, val: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı.');

      const { error: dbErr } = await supabase
        .from('user_security_settings')
        .update({
          hide_same_institution:    settings.hide_same_institution,
          hide_profession_detail:   settings.hide_profession_detail,
          patient_privacy_reminder: settings.patient_privacy_reminder,
          updated_at:               new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (dbErr) throw dbErr;

      setOriginal(settings);
      setSaved(true);
      onSaved?.();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Sağlık Çalışanı Gizliliği</h3>
        </div>
        {loading ? (
          <Loader2 size={14} className="animate-spin text-slate-500" />
        ) : (
          <button
            onClick={load}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Yenile"
          >
            <RefreshCcw size={13} />
          </button>
        )}
      </div>

      {/* Toggle rows */}
      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {SETTINGS.map((s) => (
            <ToggleRow
              key={s.key}
              setting={s}
              value={settings[s.key]}
              disabled={saving}
              onChange={handleChange}
            />
          ))}
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
        <Shield size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Bu ayarlar KVKK ve Türk Tabipleri Birliği mesleki etik kuralları
          gözetilerek hazırlanmıştır. Tüm ayarlar varsayılan olarak açıktır.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Save */}
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

      {saved && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 py-1">
          <Check size={13} /> Kaydedildi
        </div>
      )}
    </div>
  );
};
