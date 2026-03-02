/**
 * PrivacyControls — Özellik 6: Etik Monetizasyon
 *
 * Premium privacy toggle panel. Features:
 *   • Incognito Mode      — profile invisible to non-matches
 *   • Hide Activity       — last-active / online dot hidden from others
 *   • Read Receipts       — control read receipt visibility
 *
 * Each toggle:
 *   - Shows current state
 *   - Description + "why this matters" note
 *   - Optimistic update with rollback on error
 *
 * States: loading → idle → saving
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EyeOff,
  Activity,
  CheckCheck,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PrivacySettings {
  incognito_mode:    boolean;
  hide_activity:     boolean;
  hide_read_receipts: boolean;
}

// ── Toggle row ─────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  note?:       string;
  checked:     boolean;
  saving:      boolean;
  onChange:    (val: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon, title, description, note, checked, saving, onChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-2">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving ? (
            <Loader2 size={14} className="animate-spin text-slate-500" />
          ) : (
            <button
              onClick={() => onChange(!checked)}
              role="switch"
              aria-checked={checked}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                checked ? 'bg-violet-500' : 'bg-slate-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                checked ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          )}
        </div>
      </div>

      {note && (
        <div>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Neden önemli?
          </button>
          {expanded && (
            <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed pl-3 border-l border-slate-700/60">
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface PrivacyControlsProps {
  className?: string;
}

export const PrivacyControls: React.FC<PrivacyControlsProps> = ({ className = '' }) => {
  const [settings,  setSettings]  = useState<PrivacySettings>({
    incognito_mode:     false,
    hide_activity:      false,
    hide_read_receipts: false,
  });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState<keyof PrivacySettings | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  // ── Load current settings ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('user_security_settings')
      .select('incognito_mode, hide_activity_status, hide_read_receipts')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        incognito_mode:     !!(data as Record<string, unknown>).incognito_mode,
        hide_activity:      !!(data as Record<string, unknown>).hide_activity_status,
        hide_read_receipts: !!(data as Record<string, unknown>).hide_read_receipts,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Toggle handler ─────────────────────────────────────────────────────────
  const handleToggle = async (key: keyof PrivacySettings, val: boolean) => {
    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: val }));
    setSaving(key);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(null); return; }

    // Map to DB column names
    const colMap: Record<keyof PrivacySettings, string> = {
      incognito_mode:     'incognito_mode',
      hide_activity:      'hide_activity_status',
      hide_read_receipts: 'hide_read_receipts',
    };

    const { error: err } = await supabase
      .from('user_security_settings')
      .update({ [colMap[key]]: val, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (err) {
      // Rollback
      setSettings((prev) => ({ ...prev, [key]: !val }));
      setError('Ayar güncellenemedi. Tekrar dene.');
    }

    setSaving(null);
  };

  // ── Count active privacy features ──────────────────────────────────────────
  const activeCount = Object.values(settings).filter(Boolean).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Gizlilik Kontrolü</h3>
        {activeCount > 0 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
            {activeCount} aktif
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Incognito mode */}
          <ToggleRow
            icon={<EyeOff size={15} className="text-violet-400" />}
            title="Gizli Mod"
            description="Profilin yalnızca eşleştiğin kişilere görünür. Keşfet ekranında çıkmaz."
            note="Gizli mod etkinken, seni aramayan biri profilini bulamaz. Aktif eşleşmeler etkilenmez; sadece yeni keşif trafiği kısıtlanır. İş arkadaşlarının seni bulmasını önlemek için idealdir."
            checked={settings.incognito_mode}
            saving={saving === 'incognito_mode'}
            onChange={(v) => handleToggle('incognito_mode', v)}
          />

          {/* Hide activity */}
          <ToggleRow
            icon={<Activity size={15} className="text-sky-400" />}
            title="Aktiviteyi Gizle"
            description="'Son görülme' ve 'çevrimiçi' bilgin karşı tarafa gösterilmez."
            note="Etkinken insanlar ne zaman aktif olduğunu ya da şu an çevrimiçi olup olmadığını bilemez. Kendi iş temponuzu gizli tutmak isteyenler için idealdir."
            checked={settings.hide_activity}
            saving={saving === 'hide_activity'}
            onChange={(v) => handleToggle('hide_activity', v)}
          />

          {/* Read receipts */}
          <ToggleRow
            icon={<CheckCheck size={15} className="text-emerald-400" />}
            title="Okundu Bilgisi"
            description="Mesajlarının okunup okunmadığını karşı tarafa göstermez."
            note="Okundu bilgisini kapatırsan karşı taraf mesajının okunduğunu göremez. Ancak sen de karşı tarafın okundu bilgisini göremezsin — tam karşılıklı gizlilik."
            checked={settings.hide_read_receipts}
            saving={saving === 'hide_read_receipts'}
            onChange={(v) => handleToggle('hide_read_receipts', v)}
          />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
              <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Summary note */}
          <div className="px-3 py-2.5 rounded-xl bg-slate-800/30 border border-slate-700/30">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Bu özellikler{' '}
              <span className="text-violet-400 font-medium">Gizlilik</span> veya{' '}
              <span className="text-violet-400 font-medium">Premium Tam</span>{' '}
              paketlerinde bulunur. Gizlilik özellikleri asla eşleşmeni engellemez;
              sadece nasıl göründüğünü kontrol eder.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
