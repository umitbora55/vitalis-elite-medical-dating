import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Building2, ShieldCheck, Lock, Loader2, X } from 'lucide-react';
import { Profile } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstitutionPrivacy {
  hide_from_same_institution: boolean;
  hide_from_same_department: boolean;
  hide_from_same_campus: boolean;
  hidden_institution_ids: string[];
}

interface InstitutionPrivacySettingsProps {
  userId: string;
  isPremium: boolean;
  profile: Profile;
  initial?: Partial<InstitutionPrivacy>;
  onUpdate?: (privacy: InstitutionPrivacy) => void;
  onUpgrade?: () => void;
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
  premiumBadge?: boolean;
  onUpgrade?: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  loading = false,
  premiumBadge = false,
  onUpgrade,
}) => (
  <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
    checked
      ? 'bg-blue-900/20 border-blue-500/30'
      : 'bg-slate-800/30 border-slate-700/50'
  }`}>
    <div className="flex-1 mr-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-white">{label}</p>
        {premiumBadge && (
          <span className="bg-gold-500/20 border border-gold-500/40 text-gold-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            Premium
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 leading-tight mt-0.5">{description}</p>
    </div>

    {disabled && !loading ? (
      <button
        type="button"
        onClick={onUpgrade}
        className="flex items-center gap-1 bg-gold-500/20 border border-gold-500/40 text-gold-400 text-xs font-bold px-2.5 py-1.5 rounded-full hover:bg-gold-500/30 transition-all flex-shrink-0"
      >
        <Lock size={10} />
        Yükselt
      </button>
    ) : (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={loading}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
          checked ? 'bg-blue-500' : 'bg-slate-700'
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2
            size={11}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white"
          />
        ) : (
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`} />
        )}
      </button>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const InstitutionPrivacySettings: React.FC<InstitutionPrivacySettingsProps> = ({
  userId,
  isPremium,
  profile,
  initial = {},
  onUpdate,
  onUpgrade,
}) => {
  const [privacy, setPrivacy] = useState<InstitutionPrivacy>({
    hide_from_same_institution: initial.hide_from_same_institution ?? false,
    hide_from_same_department:  initial.hide_from_same_department  ?? false,
    hide_from_same_campus:      initial.hide_from_same_campus      ?? false,
    hidden_institution_ids:     initial.hidden_institution_ids     ?? [],
  });

  const [loadingKey, setLoadingKey] = useState<keyof InstitutionPrivacy | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Save single boolean toggle ──────────────────────────────────────────────
  const handleToggle = async (key: keyof Omit<InstitutionPrivacy, 'hidden_institution_ids'>) => {
    const next = !privacy[key];
    setLoadingKey(key);
    setError(null);

    try {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ [key]: next })
        .eq('id', userId);

      if (dbErr) throw dbErr;

      const updated = { ...privacy, [key]: next };
      setPrivacy(updated);
      onUpdate?.(updated);
    } catch {
      setError('Ayar kaydedilemedi. Tekrar deneyin.');
    } finally {
      setLoadingKey(null);
    }
  };

  // ── Remove a hidden institution id ──────────────────────────────────────────
  const removeHiddenInstitution = async (id: string) => {
    const next = privacy.hidden_institution_ids.filter((x) => x !== id);
    setLoadingKey('hidden_institution_ids');
    setError(null);

    try {
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ hidden_institution_ids: next })
        .eq('id', userId);

      if (dbErr) throw dbErr;

      const updated = { ...privacy, hidden_institution_ids: next };
      setPrivacy(updated);
      onUpdate?.(updated);
    } catch {
      setError('Kurum kaldırılamadı.');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="space-y-3">

      {/* Toggle 1: Hide from same institution — FREE */}
      <ToggleRow
        label="Aynı Kurumdan Gizle"
        description={`${profile.hospital ? `"${profile.hospital}"` : 'Aynı hastanedeki'} kullanıcılar seni göremez`}
        checked={privacy.hide_from_same_institution}
        onChange={() => handleToggle('hide_from_same_institution')}
        loading={loadingKey === 'hide_from_same_institution'}
      />

      {/* Toggle 2: Hide from same department — PREMIUM */}
      <ToggleRow
        label="Aynı Bölümden Gizle"
        description="Aynı klinik veya bölümdeki kişiler seni göremez (daha ince ayar)"
        checked={privacy.hide_from_same_department}
        onChange={() => isPremium ? handleToggle('hide_from_same_department') : onUpgrade?.()}
        loading={loadingKey === 'hide_from_same_department'}
        disabled={!isPremium}
        premiumBadge
        onUpgrade={onUpgrade}
      />

      {/* Toggle 3: Hide from same campus — PREMIUM */}
      <ToggleRow
        label="Aynı Kampüsten Gizle"
        description="Aynı hastane kompleksi / kampüsten kimse seni göremez"
        checked={privacy.hide_from_same_campus}
        onChange={() => isPremium ? handleToggle('hide_from_same_campus') : onUpgrade?.()}
        loading={loadingKey === 'hide_from_same_campus'}
        disabled={!isPremium}
        premiumBadge
        onUpgrade={onUpgrade}
      />

      {/* Hidden institutions list (Premium) */}
      {isPremium && privacy.hidden_institution_ids.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={13} className="text-slate-400" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Gizlenen Kurumlar</p>
          </div>
          {privacy.hidden_institution_ids.map((id) => (
            <div
              key={id}
              className="flex items-center justify-between bg-slate-900/60 border border-slate-700/30 rounded-lg px-3 py-2"
            >
              <span className="text-xs text-slate-300 font-medium truncate">{id}</span>
              <button
                type="button"
                onClick={() => removeHiddenInstitution(id)}
                disabled={loadingKey === 'hidden_institution_ids'}
                className="text-slate-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                aria-label="Kurumu kaldır"
              >
                {loadingKey === 'hidden_institution_ids'
                  ? <Loader2 size={12} className="animate-spin" />
                  : <X size={12} />
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active summary */}
      {(privacy.hide_from_same_institution || privacy.hide_from_same_department || privacy.hide_from_same_campus) && (
        <div className="flex items-start gap-2.5 bg-blue-900/20 border border-blue-500/20 rounded-xl px-3.5 py-3 animate-fade-in">
          <ShieldCheck size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-200/80 leading-relaxed">
            Kurum gizlilik filtresi aktif. Belirtilen kurum/bölüm/kampüsteki kullanıcılar seni discovery'de göremez.
          </p>
        </div>
      )}

      {/* Premium upsell */}
      {!isPremium && (
        <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock size={13} className="text-gold-500" />
            <p className="text-xs font-bold text-gold-400">Premium Gizlilik</p>
          </div>
          <p className="text-xs text-slate-400 mb-2.5 leading-relaxed">
            Bölüm ve kampüs bazlı gizlilik ile çok daha ince ayar kontrolü.
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="w-full py-2.5 rounded-xl bg-gold-500 text-black text-xs font-bold hover:bg-gold-400 transition-all"
          >
            Premium'a Geç →
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 animate-fade-in">{error}</p>
      )}
    </div>
  );
};
