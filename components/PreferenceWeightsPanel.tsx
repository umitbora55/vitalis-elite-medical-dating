/**
 * VITALIS Preference Weights Panel
 *
 * Kullanıcının eşleşme faktörlerini kontrol etmesini sağlar.
 * DSA Art.27 uyumlu: Her faktör devre dışı bırakılabilir veya ağırlığı ayarlanabilir.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Power, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { getFactorWeights, setFactorWeight, setPersonalizedRecommendations } from '../services/explanationService';
import type { FactorKey } from '../services/explanationService';
import { FACTOR_META } from '../services/explanationService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FactorRowState {
  key: FactorKey;
  multiplier: number;
  disabled: boolean;
  saving: boolean;
}

const MULTIPLIER_LABELS: { value: number; label: string; color: string }[] = [
  { value: 0.5,  label: 'Az Önemli', color: 'text-slate-500' },
  { value: 1.0,  label: 'Önemli',    color: 'text-white' },
  { value: 1.5,  label: 'Çok Önemli', color: 'text-blue-400' },
  { value: 2.0,  label: 'Kritik',    color: 'text-gold-400' },
];

const getMultiplierLabel = (val: number) =>
  MULTIPLIER_LABELS.reduce((prev, curr) =>
    Math.abs(curr.value - val) < Math.abs(prev.value - val) ? curr : prev
  );

const CATEGORY_ORDER: Array<{ id: string; label: string; keys: FactorKey[] }> = [
  {
    id: 'primary',
    label: 'Temel Faktörler',
    keys: ['dating_intention', 'work_schedule', 'location', 'dealbreaker'],
  },
  {
    id: 'healthcare',
    label: 'Sağlık Sektörü',
    keys: ['profession', 'specialty', 'career_stage', 'institution_type'],
  },
  {
    id: 'secondary',
    label: 'Kişisel Faktörler',
    keys: ['values', 'lifestyle', 'interests'],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export const PreferenceWeightsPanel: React.FC = () => {
  const [rows, setRows] = useState<Map<FactorKey, FactorRowState>>(new Map());
  const [personalizedEnabled, setPersonalizedEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [savingPersonalized, setSavingPersonalized] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('primary');
  const [showInfo, setShowInfo] = useState<FactorKey | null>(null);
  const [globalSaved, setGlobalSaved] = useState(false);

  useEffect(() => {
    void loadWeights();
  }, []);

  const loadWeights = async () => {
    setLoading(true);
    const { weights } = await getFactorWeights();
    const newRows = new Map<FactorKey, FactorRowState>();

    for (const key of Object.keys(FACTOR_META) as FactorKey[]) {
      const saved = weights[key];
      newRows.set(key, {
        key,
        multiplier: saved?.multiplier ?? 1.0,
        disabled: saved?.disabled ?? false,
        saving: false,
      });
    }
    setRows(newRows);
    setLoading(false);
  };

  const handleMultiplierChange = async (key: FactorKey, value: number) => {
    setRows(prev => {
      const next = new Map(prev);
      const row = next.get(key);
      if (row) next.set(key, { ...row, multiplier: value, saving: true });
      return next;
    });

    await setFactorWeight(key, value, false);

    setRows(prev => {
      const next = new Map(prev);
      const row = next.get(key);
      if (row) next.set(key, { ...row, saving: false });
      return next;
    });
  };

  const handleToggleDisabled = async (key: FactorKey) => {
    const current = rows.get(key);
    if (!current) return;

    const newDisabled = !current.disabled;
    setRows(prev => {
      const next = new Map(prev);
      const row = next.get(key);
      if (row) next.set(key, { ...row, disabled: newDisabled, saving: true });
      return next;
    });

    await setFactorWeight(key, current.multiplier, newDisabled);

    setRows(prev => {
      const next = new Map(prev);
      const row = next.get(key);
      if (row) next.set(key, { ...row, saving: false });
      return next;
    });
  };

  const handleReset = async () => {
    const allKeys = Object.keys(FACTOR_META) as FactorKey[];
    await Promise.all(allKeys.map(k => setFactorWeight(k, 1.0, false)));
    await loadWeights();
    setGlobalSaved(true);
    setTimeout(() => setGlobalSaved(false), 2000);
  };

  const handlePersonalizedToggle = async () => {
    const newVal = !personalizedEnabled;
    setSavingPersonalized(true);
    const { error } = await setPersonalizedRecommendations(newVal);
    setSavingPersonalized(false);
    if (!error) setPersonalizedEnabled(newVal);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Eşleşme Tercihlerim</h2>
        <button
          onClick={() => void handleReset()}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {globalSaved ? 'Sıfırlandı ✓' : 'Varsayılanlara dön'}
        </button>
      </div>

      {/* Personalized toggle (DSA) */}
      <div className="flex items-start gap-3 px-3 py-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Kişiselleştirilmiş Öneriler</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Kapatırsanız yalnızca yaş, cinsiyet ve konum filtreleri uygulanır.
            Açıklamalar gösterilmez.
          </p>
        </div>
        <button
          onClick={() => void handlePersonalizedToggle()}
          disabled={savingPersonalized}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
            personalizedEnabled ? 'bg-blue-600' : 'bg-slate-700'
          } disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              personalizedEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Factor categories */}
      {personalizedEnabled && CATEGORY_ORDER.map(cat => (
        <div key={cat.id} className="flex flex-col gap-0 rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Category header */}
          <button
            onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
            className="flex items-center justify-between px-4 py-3 bg-slate-800/70 text-left"
          >
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{cat.label}</span>
            {expandedCategory === cat.id
              ? <ChevronUp className="w-4 h-4 text-slate-500" />
              : <ChevronDown className="w-4 h-4 text-slate-500" />
            }
          </button>

          {/* Factor rows */}
          {expandedCategory === cat.id && cat.keys.map((key, idx) => {
            const row = rows.get(key);
            const meta = FACTOR_META[key];
            if (!row || !meta) return null;

            const multiplierInfo = getMultiplierLabel(row.multiplier);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`px-4 py-3 border-t border-slate-700/40 ${row.disabled ? 'opacity-50' : ''}`}
              >
                {/* Row header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{meta.icon}</span>
                  <span className="text-sm font-medium text-white flex-1">{meta.label}</span>

                  {/* Info */}
                  <button
                    onClick={() => setShowInfo(showInfo === key ? null : key)}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  {/* Disable toggle */}
                  <button
                    onClick={() => void handleToggleDisabled(key)}
                    disabled={row.saving}
                    className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${
                      row.disabled
                        ? 'border-rose-600/50 text-rose-400 bg-rose-900/20'
                        : 'border-slate-600/50 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    <Power className="w-2.5 h-2.5" />
                    {row.disabled ? 'Kapalı' : 'Açık'}
                  </button>
                </div>

                {/* Info expansion */}
                {showInfo === key && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-xs text-slate-500 mb-2 pl-7"
                  >
                    {meta.description}
                  </motion.p>
                )}

                {/* Weight slider */}
                {!row.disabled && (
                  <div className="pl-7">
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.5}
                      value={row.multiplier}
                      onChange={(e) => void handleMultiplierChange(key, parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-slate-700 cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between mt-1">
                      {MULTIPLIER_LABELS.map(l => (
                        <span
                          key={l.value}
                          className={`text-[9px] ${l.value === row.multiplier ? l.color : 'text-slate-700'}`}
                        >
                          {l.label}
                        </span>
                      ))}
                    </div>
                    <p className={`text-xs font-semibold mt-0.5 ${multiplierInfo.color}`}>
                      {row.saving ? 'Kaydediliyor...' : multiplierInfo.label}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}

      {/* DSA note */}
      <p className="text-[10px] text-slate-600 text-center px-2">
        Bu ayarlar yalnızca eşleşme önerilerini etkiler. Verileriniz üçüncü
        taraflarla paylaşılmaz. Dilediğiniz zaman değiştirebilirsiniz.
      </p>
    </div>
  );
};
