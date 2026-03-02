/**
 * AdvancedFilters — Özellik 6: Etik Monetizasyon
 *
 * Premium advanced filter panel. Sections:
 *   1. Lifestyle filters (smoking, alcohol, sport, diet, pets)
 *   2. Preferences (wants_children, height range)
 *   3. Professional (profession, specialty, career_stage, institution_type)
 *   4. Activity (last_active, profile_completeness, verified_only)
 *   5. Saved filter sets (save / load / delete)
 *   6. Smart relaxation suggestions
 *
 * States: loading → idle → saving
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  SlidersHorizontal,
  Save,
  FolderOpen,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  X,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react';
import {
  advancedFilterService,
  SMOKING_OPTIONS,
  ALCOHOL_OPTIONS,
  SPORT_OPTIONS,
  DIET_OPTIONS,
  WANTS_CHILDREN_OPTIONS,
  CAREER_STAGE_OPTIONS,
  INSTITUTION_TYPE_OPTIONS,
  LAST_ACTIVE_OPTIONS,
  EMPTY_FILTERS,
  countActiveFilters,
  suggestFilterRelaxations,
  type FilterOption,
} from '../../services/advancedFilterService';
import type { AdvancedFilterPayload, SavedFilterSet } from '../../types';

// ── Reusable chip selector ─────────────────────────────────────────────────────

interface ChipGroupProps {
  label:     string;
  options:   FilterOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value:     string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange:  (val: string | null | undefined) => void;
}

const ChipGroup: React.FC<ChipGroupProps> = ({ label, options, value, onChange }) => (
  <div>
    <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
            value === opt.value
              ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
              : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

// ── Multi-chip selector (string arrays) ────────────────────────────────────────

interface MultiChipGroupProps {
  label:     string;
  options:   FilterOption[];
  value:     string[];
  onChange:  (val: string[]) => void;
}

const MultiChipGroup: React.FC<MultiChipGroupProps> = ({ label, options, value, onChange }) => {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  return (
    <div>
      <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
              value.includes(opt.value)
                ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Collapsible section ────────────────────────────────────────────────────────

interface SectionProps {
  title:    string;
  badge?:   number;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, badge, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-800/50 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">{title}</span>
          {badge ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
              {badge} aktif
            </span>
          ) : null}
        </div>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {open && <div className="px-3.5 pb-3.5 space-y-3.5">{children}</div>}
    </div>
  );
};

// ── Save set modal ─────────────────────────────────────────────────────────────

interface SaveModalProps {
  onSave:    (name: string) => void;
  onCancel:  () => void;
  saving:    boolean;
}

const SaveModal: React.FC<SaveModalProps> = ({ onSave, onCancel, saving }) => {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Filtre Setini Kaydet</p>
          <button onClick={onCancel} className="p-1 hover:bg-slate-800 rounded-lg text-slate-500">
            <X size={14} />
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Set adı (örn. Hafta sonu)"
          className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
          autoFocus
          maxLength={40}
        />
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim() || saving}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Kaydediliyor…</> : <><Save size={14} /> Kaydet</>}
        </button>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface AdvancedFiltersProps {
  /** Called when filters should be applied to the slate/feed */
  onApply?: (filters: AdvancedFilterPayload) => void;
  className?: string;
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ onApply, className = '' }) => {
  const [filters,    setFilters]    = useState<AdvancedFilterPayload>(EMPTY_FILTERS);
  const [savedSets,  setSavedSets]  = useState<SavedFilterSet[]>([]);
  const [activeSet,  setActiveSet]  = useState<SavedFilterSet | null>(null);

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [applying,   setApplying]   = useState(false);
  const [showSave,   setShowSave]   = useState(false);
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [saved,      setSaved]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [sets, active] = await Promise.all([
      advancedFilterService.listFilterSets(),
      advancedFilterService.getActiveFilterSet(),
    ]);
    setSavedSets(sets);
    setActiveSet(active);
    if (active) setFilters(active.filters as AdvancedFilterPayload);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = (partial: Partial<AdvancedFilterPayload>) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  const handleSave = async (name: string) => {
    setSaving(true);
    setSaveError(null);
    const { error } = await advancedFilterService.saveFilterSet(name, filters);
    if (error) { setSaveError(error); }
    else {
      setSaved(true);
      setShowSave(false);
      void load();
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleApplySet = async (set: SavedFilterSet) => {
    setApplying(true);
    await advancedFilterService.applyFilterSet(set.id);
    setFilters(set.filters as AdvancedFilterPayload);
    setActiveSet(set);
    onApply?.(set.filters as AdvancedFilterPayload);
    setApplying(false);
  };

  const handleDeleteSet = async (setId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await advancedFilterService.deleteFilterSet(setId);
    void load();
  };

  const handleApplyCurrent = () => {
    onApply?.(filters);
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setActiveSet(null);
    onApply?.(EMPTY_FILTERS);
  };

  const activeCount = countActiveFilters(filters);
  const relaxSuggestions = suggestFilterRelaxations(filters);

  const PROFESSION_OPTIONS: FilterOption[] = [
    { value: 'Doktor',       label: 'Doktor' },
    { value: 'Hemşire',      label: 'Hemşire' },
    { value: 'Eczacı',       label: 'Eczacı' },
    { value: 'Fizyoterapist',label: 'Fizyoterapist' },
    { value: 'Diş Hekimi',   label: 'Diş Hekimi' },
    { value: 'Diyetisyen',   label: 'Diyetisyen' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Gelişmiş Filtreler</h3>
        {activeCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
            {activeCount} aktif
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {activeCount > 0 && (
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              title="Sıfırla"
            >
              <RefreshCw size={13} />
            </button>
          )}
          <button
            onClick={() => setShowSave(true)}
            disabled={activeCount === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
          >
            <Save size={12} />
            {saved ? 'Kaydedildi!' : 'Seti Kaydet'}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Saved filter sets */}
          {savedSets.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide flex items-center gap-1.5">
                <FolderOpen size={11} />
                Kayıtlı Setler
              </p>
              <div className="flex flex-wrap gap-2">
                {savedSets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => handleApplySet(set)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                      activeSet?.id === set.id
                        ? 'bg-violet-500/12 border-violet-500/40 text-violet-300'
                        : 'bg-slate-800/50 border-slate-700/40 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {applying && activeSet?.id === set.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : activeSet?.id === set.id
                      ? <Check size={11} />
                      : null}
                    {set.name}
                    <button
                      onClick={(e) => handleDeleteSet(set.id, e)}
                      className="ml-0.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lifestyle section */}
          <Section
            title="Yaşam Tarzı"
            badge={[filters.smoking, filters.alcohol, filters.sport, filters.diet, filters.pets !== null].filter(Boolean).length || undefined}
          >
            <ChipGroup label="Sigara" options={SMOKING_OPTIONS} value={filters.smoking} onChange={(v) => patch({ smoking: v as typeof filters.smoking })} />
            <ChipGroup label="Alkol" options={ALCOHOL_OPTIONS} value={filters.alcohol} onChange={(v) => patch({ alcohol: v as typeof filters.alcohol })} />
            <ChipGroup label="Spor" options={SPORT_OPTIONS} value={filters.sport} onChange={(v) => patch({ sport: v as typeof filters.sport })} />
            <ChipGroup label="Beslenme" options={DIET_OPTIONS} value={filters.diet} onChange={(v) => patch({ diet: v as typeof filters.diet })} />
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Evcil Hayvan</p>
              <div className="flex gap-1.5">
                {[{ v: true, l: 'Var' }, { v: false, l: 'Yok' }].map(({ v, l }) => (
                  <button
                    key={String(v)}
                    onClick={() => patch({ pets: filters.pets === v ? null : v })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      filters.pets === v
                        ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                        : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Preferences section */}
          <Section
            title="Tercihler"
            badge={[filters.wants_children, filters.height_min, filters.height_max].filter(Boolean).length || undefined}
          >
            <ChipGroup label="Çocuk İstiyor mu?" options={WANTS_CHILDREN_OPTIONS} value={filters.wants_children} onChange={(v) => patch({ wants_children: v as typeof filters.wants_children })} />
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Boy (cm)</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.height_min ?? ''}
                  onChange={(e) => patch({ height_min: e.target.value ? Number(e.target.value) : null })}
                  min={150} max={220}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                />
                <span className="text-slate-500 text-xs">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.height_max ?? ''}
                  onChange={(e) => patch({ height_max: e.target.value ? Number(e.target.value) : null })}
                  min={150} max={220}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
                />
              </div>
            </div>
          </Section>

          {/* Professional section */}
          <Section
            title="Mesleki"
            badge={[
              filters.profession_filter?.length,
              filters.specialty_filter?.length,
              filters.career_stage,
              filters.institution_type,
            ].filter(Boolean).length || undefined}
          >
            <MultiChipGroup
              label="Meslek"
              options={PROFESSION_OPTIONS}
              value={filters.profession_filter ?? []}
              onChange={(v) => patch({ profession_filter: v })}
            />
            <ChipGroup label="Kariyer Aşaması" options={CAREER_STAGE_OPTIONS} value={filters.career_stage} onChange={(v) => patch({ career_stage: v as typeof filters.career_stage })} />
            <ChipGroup label="Kurum Tipi" options={INSTITUTION_TYPE_OPTIONS} value={filters.institution_type} onChange={(v) => patch({ institution_type: v as typeof filters.institution_type })} />
          </Section>

          {/* Activity section */}
          <Section
            title="Aktivite & Kalite"
            badge={[filters.last_active, filters.profile_completeness, filters.verified_only].filter(Boolean).length || undefined}
          >
            <ChipGroup label="Son Aktivite" options={LAST_ACTIVE_OPTIONS} value={filters.last_active} onChange={(v) => patch({ last_active: v as typeof filters.last_active })} />

            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Min. Profil Doluluk</p>
              <div className="flex gap-1.5">
                {[50, 70, 90].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => patch({ profile_completeness: filters.profile_completeness === pct ? null : pct })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      filters.profile_completeness === pct
                        ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                        : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    %{pct}+
                  </button>
                ))}
              </div>
            </div>

            {/* Verified only toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck size={13} className="text-emerald-400" />
                <p className="text-xs text-slate-200">Sadece doğrulanmış</p>
              </div>
              <button
                onClick={() => patch({ verified_only: !filters.verified_only })}
                role="switch"
                aria-checked={filters.verified_only}
                className={`relative w-9 h-5 rounded-full transition-colors ${filters.verified_only ? 'bg-violet-500' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${filters.verified_only ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </Section>

          {/* Smart relaxation suggestions */}
          {relaxSuggestions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb size={13} className="text-amber-400" />
                <p className="text-xs font-semibold text-amber-300">Daha fazla eşleşme için</p>
              </div>
              <div className="space-y-1.5">
                {relaxSuggestions.map((s) => (
                  <div key={s.field} className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">{s.suggestion}</p>
                    <span className="text-[10px] text-emerald-400">+%{s.estimatedIncrease}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <p className="text-xs text-red-400 px-1">{saveError}</p>
          )}

          {/* Apply button */}
          <button
            onClick={handleApplyCurrent}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <SlidersHorizontal size={15} />
            Filtreleri Uygula ({activeCount} aktif)
          </button>
        </>
      )}

      {/* Save modal */}
      {showSave && (
        <SaveModal
          onSave={handleSave}
          onCancel={() => setShowSave(false)}
          saving={saving}
        />
      )}
    </div>
  );
};
