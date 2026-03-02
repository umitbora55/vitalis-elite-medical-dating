/**
 * EthicalPlanSelector — Özellik 6: Etik Monetizasyon
 *
 * Full-screen ethical paywall / plan selection.
 * Replaces the old PremiumView for new ethical plans.
 *
 * Key design principles:
 *   ✓ "Ücretsiz devam et" button always visible and easy
 *   ✓ No urgency manipulation / fake timers
 *   ✓ Healthcare discount applied transparently
 *   ✓ Tab: Individual | Bundles to avoid overwhelming
 *   ✓ Features explained in plain language, never hidden
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  Check,
  Star,
  Loader2,
  MapPin,
  Filter,
  EyeOff,
  Clock,
  Shield,
  Heart,
  BookOpen,
  CalendarHeart,
  ChevronRight,
  BadgePercent,
} from 'lucide-react';
import {
  ETHICAL_PLANS,
  subscriptionPlanService,
} from '../../services/subscriptionPlanService';
import { FreeUserManifesto } from './FreeUserManifesto';
import type { EthicalPlanId, EthicalPlanConfig } from '../../types';

// ── Feature icon map ───────────────────────────────────────────────────────────

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  canUseTripMode:           <MapPin size={15} />,
  canUseAdvancedFilters:    <Filter size={15} />,
  canUseIncognito:          <EyeOff size={15} />,
  canHideActivity:          <Clock size={15} />,
  canControlReadReceipts:   <Check size={15} />,
  canGetCoaching:           <BookOpen size={15} />,
  canUseConcierge:          <CalendarHeart size={15} />,
  canAccessPrioritySupport: <Shield size={15} />,
};

const CAPABILITY_LABELS: Record<string, string> = {
  canUseTripMode:           'Trip Modu — seyahatte eşleşme',
  canUseAdvancedFilters:    'Gelişmiş filtreler (15+)',
  canUseIncognito:          'Gizli mod',
  canHideActivity:          'Aktivite gizleme',
  canControlReadReceipts:   'Okuma bildirimi kontrolü',
  canGetCoaching:           'Profil koçluğu',
  canUseConcierge:          'Date concierge hizmeti',
  canAccessPrioritySupport: 'Öncelikli destek',
};

// ── Plan card ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan:            EthicalPlanConfig;
  selected:        boolean;
  discount:        boolean;
  onSelect:        () => void;
}

const PLAN_COLORS: Record<EthicalPlanId, { accent: string; bg: string; border: string }> = {
  FREE:             { accent: 'text-slate-400',   bg: 'bg-slate-800/40', border: 'border-slate-700' },
  CONVENIENCE:      { accent: 'text-blue-400',    bg: 'bg-blue-500/8',   border: 'border-blue-500/30' },
  PRIVACY:          { accent: 'text-violet-400',  bg: 'bg-violet-500/8', border: 'border-violet-500/30' },
  PREMIUM_FULL:     { accent: 'text-amber-400',   bg: 'bg-amber-500/8',  border: 'border-amber-500/35' },
  PREMIUM_COACHING: { accent: 'text-emerald-400', bg: 'bg-emerald-500/8',border: 'border-emerald-500/30' },
  TRIP_ADDON:       { accent: 'text-sky-400',     bg: 'bg-sky-500/8',    border: 'border-sky-500/30' },
  FILTERS_ADDON:    { accent: 'text-indigo-400',  bg: 'bg-indigo-500/8', border: 'border-indigo-500/30' },
  INCOGNITO_ADDON:  { accent: 'text-purple-400',  bg: 'bg-purple-500/8', border: 'border-purple-500/30' },
  COACHING_ONCE:    { accent: 'text-rose-400',    bg: 'bg-rose-500/8',   border: 'border-rose-500/30' },
  CONCIERGE_ONCE:   { accent: 'text-pink-400',    bg: 'bg-pink-500/8',   border: 'border-pink-500/30' },
};

const PlanCard: React.FC<PlanCardProps> = ({ plan, selected, discount, onSelect }) => {
  const colors = PLAN_COLORS[plan.id];
  const price  = discount
    ? subscriptionPlanService.applyHealthcareDiscount(plan.priceMonthly, true)
    : plan.priceMonthly;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all
        ${selected ? `${colors.bg} ${colors.border}` : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold ${selected ? colors.accent : 'text-slate-300'}`}>
              {plan.name}
            </span>
            {plan.isPopular && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                Popüler
              </span>
            )}
            {plan.isOneTime && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 uppercase tracking-wide">
                Tek Seferlik
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{plan.description}</p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 ml-2">
          {discount && (
            <span className="text-[9px] line-through text-slate-600">{plan.priceMonthly} TL</span>
          )}
          <span className={`text-base font-bold ${selected ? colors.accent : 'text-slate-300'}`}>
            {price} TL
          </span>
          <span className="text-[9px] text-slate-500">{plan.isOneTime ? 'tek seferlik' : '/ay'}</span>
        </div>
      </div>

      {/* Capability pills */}
      <div className="flex flex-wrap gap-1 mt-2.5">
        {Object.entries(plan.capabilities)
          .filter(([, v]) => v)
          .map(([key]) => (
            <span
              key={key}
              className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full
                ${selected ? `${colors.bg} ${colors.accent}` : 'bg-slate-700 text-slate-400'}`}
            >
              {CAPABILITY_ICONS[key]}
              {CAPABILITY_LABELS[key]?.split(' ')[0]}
            </span>
          ))}
      </div>

      {selected && (
        <div className={`mt-2 flex items-center gap-1 text-[10px] ${colors.accent} font-semibold`}>
          <Check size={11} strokeWidth={3} />
          Seçildi
        </div>
      )}
    </button>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface EthicalPlanSelectorProps {
  onClose:          () => void;
  /** Pre-select a plan (e.g. from a paywall context) */
  preselectedPlan?: EthicalPlanId;
}

type PlanTab = 'bundles' | 'individual';

export const EthicalPlanSelector: React.FC<EthicalPlanSelectorProps> = ({
  onClose,
  preselectedPlan = 'PREMIUM_FULL',
}) => {
  const [tab,         setTab]         = useState<PlanTab>('bundles');
  const [selected,    setSelected]    = useState<EthicalPlanId>(preselectedPlan);
  const [discount,    setDiscount]    = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [showManifesto, setShowManifesto] = useState(false);

  // Load discount eligibility
  useEffect(() => {
    subscriptionPlanService.isEligibleForHealthcareDiscount()
      .then(setDiscount)
      .catch(() => {/* non-critical */});
  }, []);

  const bundles    = ETHICAL_PLANS.filter((p) => ['CONVENIENCE','PRIVACY','PREMIUM_FULL','PREMIUM_COACHING'].includes(p.id));
  const individual = ETHICAL_PLANS.filter((p) => ['TRIP_ADDON','FILTERS_ADDON','INCOGNITO_ADDON','COACHING_ONCE','CONCIERGE_ONCE'].includes(p.id));
  const currentList = tab === 'bundles' ? bundles : individual;

  const selectedPlan = ETHICAL_PLANS.find((p) => p.id === selected);

  const handlePurchase = async () => {
    setError(null);
    setProcessing(true);
    const { sessionUrl, error: err } = await subscriptionPlanService.startCheckout(selected);
    if (err || !sessionUrl) {
      setError(err ?? 'Ödeme başlatılamadı. Lütfen tekrar dene.');
      setProcessing(false);
      return;
    }
    window.location.assign(sessionUrl);
  };

  const priceDisplay = selectedPlan
    ? subscriptionPlanService.applyHealthcareDiscount(selectedPlan.priceMonthly, discount)
    : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          aria-label="Kapat"
        >
          <X size={20} />
        </button>
        <h2 className="text-base font-bold text-white">Premium</h2>
        <button
          onClick={() => setShowManifesto(true)}
          className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
        >
          Sözümüz
        </button>
      </div>

      {/* Discount banner */}
      {discount && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2">
          <BadgePercent size={14} className="text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-400 font-semibold">
            Doğrulanmış sağlık çalışanı — %20 indirim uygulandı
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex mx-4 mb-3 gap-1 p-1 bg-slate-800/60 rounded-xl flex-shrink-0">
        {([['bundles','Paketler'],['individual','Bireysel']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t as PlanTab)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
              ${tab === t
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Plan list */}
      <div className="flex-1 overflow-y-auto px-4 pb-36">
        <div className="space-y-2.5">
          {currentList.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selected === plan.id}
              discount={discount}
              onSelect={() => setSelected(plan.id)}
            />
          ))}
        </div>

        {/* Full capability breakdown of selected plan */}
        {selectedPlan && (
          <div className="mt-5 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {selectedPlan.name} ne içerir?
            </p>
            <div className="space-y-2">
              {Object.entries(selectedPlan.capabilities)
                .filter(([, v]) => v)
                .map(([key]) => (
                  <div key={key} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" strokeWidth={2.5} />
                    {CAPABILITY_LABELS[key]}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Social proof */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/40">
          <div className="flex -space-x-1.5">
            {['bg-blue-500','bg-amber-500','bg-rose-500'].map((c, i) => (
              <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-slate-800`} />
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Premium kullanıcıların <span className="text-white font-semibold">%78'i</span> daha iyi eşleşme bulduğunu söyledi
          </p>
        </div>

        {/* Ethics note */}
        <div className="mt-4 flex items-start gap-2">
          <Heart size={12} className="text-slate-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Temel eşleşme ve mesajlaşma her zaman ücretsizdir. Premium yalnızca ekstra kolaylık ve hizmetler içindir.
          </p>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-slate-950/95 border-t border-slate-800/40 backdrop-blur-xl z-10">
        {error && (
          <p className="text-xs text-red-400 text-center mb-2">{error}</p>
        )}
        <button
          onClick={handlePurchase}
          disabled={processing}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 font-bold text-sm shadow-lg hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {processing ? (
            <><Loader2 size={16} className="animate-spin" /> Yönlendiriliyor…</>
          ) : (
            <>
              <Star size={15} />
              {selectedPlan?.name} — {priceDisplay} TL{selectedPlan?.isOneTime ? '' : '/ay'}
              <ChevronRight size={15} className="opacity-60" />
            </>
          )}
        </button>

        <button
          onClick={onClose}
          className="w-full mt-2 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
        >
          Şimdilik gerek yok ✕
        </button>

        <p className="text-[9px] text-center text-slate-600 mt-1">
          Otomatik yenileme · İstediğin zaman iptal et · PCI DSS güvenli
        </p>
      </div>

      {/* Manifesto modal */}
      {showManifesto && (
        <FreeUserManifesto
          variant="modal"
          showClose
          onClose={() => setShowManifesto(false)}
        />
      )}
    </div>
  );
};
