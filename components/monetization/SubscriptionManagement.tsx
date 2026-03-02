/**
 * SubscriptionManagement — Özellik 6: Etik Monetizasyon
 *
 * Full subscription management panel. Tabs:
 *   1. Plans    — active subscriptions, expiry dates, cancel-at-period-end status
 *   2. Explore  — browse and start checkout for additional plans
 *   3. Ethics   — monetization fairness feedback (transparency audit)
 *
 * Design:
 *   – Always shows "Ücretsiz Devam Et" option prominently
 *   – Healthcare discount badge when eligible
 *   – No dark patterns: no countdown timers, no fake urgency
 *   – Ethics feedback form: is it fair? Which feature crossed the line?
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  CreditCard,
  Compass,
  Heart,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Stethoscope,
  BadgePercent,
  CalendarDays,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ExternalLink,
} from 'lucide-react';
import {
  subscriptionPlanService,
  ETHICAL_PLANS,
} from '../../services/subscriptionPlanService';
import type { EthicalPlanId } from '../../types';

// ── Plan colour map ────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  CONVENIENCE:      { text: 'text-sky-400',    bg: 'bg-sky-500/10',     border: 'border-sky-500/30' },
  PRIVACY:          { text: 'text-violet-400', bg: 'bg-violet-500/10',  border: 'border-violet-500/30' },
  PREMIUM_FULL:     { text: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  PREMIUM_COACHING: { text: 'text-rose-400',   bg: 'bg-rose-500/10',    border: 'border-rose-500/30' },
  TRIP_ADDON:       { text: 'text-cyan-400',   bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30' },
  FILTERS_ADDON:    { text: 'text-purple-400', bg: 'bg-purple-500/10',  border: 'border-purple-500/30' },
  INCOGNITO_ADDON:  { text: 'text-indigo-400', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30' },
  COACHING_ONCE:    { text: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  CONCIERGE_ONCE:   { text: 'text-pink-400',   bg: 'bg-pink-500/10',    border: 'border-pink-500/30' },
  FREE:             { text: 'text-slate-400',  bg: 'bg-slate-800/40',   border: 'border-slate-700/40' },
  DOSE:             { text: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  FORTE:            { text: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  ULTRA:            { text: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
};

function planColor(planId: string) {
  return PLAN_COLORS[planId] ?? PLAN_COLORS['FREE'];
}

// ── Capability label map ───────────────────────────────────────────────────────

const CAP_LABELS: Record<string, string> = {
  canUseTripMode:           'Trip Modu',
  canUseAdvancedFilters:    'Gelişmiş Filtreler',
  canUseIncognito:          'Gizli Mod',
  canHideActivity:          'Aktivite Gizleme',
  canControlReadReceipts:   'Okundu Bildirimi',
  canGetCoaching:           'Profil Koçluğu',
  canUseConcierge:          'Date Concierge',
  canAccessPrioritySupport: 'Öncelikli Destek',
};

// ── Active subscription card ───────────────────────────────────────────────────

interface ActiveSubCardProps {
  sub: {
    id: string;
    plan: string;
    expires_at: string;
    period: string;
    cancel_at_period_end: boolean;
  };
  onCancelAtPeriodEnd: (id: string) => void;
  cancelling: string | null;
}

const ActiveSubCard: React.FC<ActiveSubCardProps> = ({ sub, onCancelAtPeriodEnd, cancelling }) => {
  const plan = ETHICAL_PLANS.find((p) => p.id === sub.plan);
  const colors = planColor(sub.plan);
  const expiryDate = new Date(sub.expires_at).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const caps = plan?.capabilities ?? {};
  const capList = Object.entries(caps)
    .filter(([, v]) => v === true)
    .map(([k]) => CAP_LABELS[k] ?? k);

  return (
    <div className={`p-3.5 rounded-2xl border ${colors.bg} ${colors.border} space-y-2.5`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold ${colors.text}`}>{plan?.name ?? sub.plan}</p>
            {sub.cancel_at_period_end && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                İptal planlandı
              </span>
            )}
            {plan?.isOneTime && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
                Tek seferlik
              </span>
            )}
          </div>
          {capList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {capList.map((c) => (
                <span key={c} className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/20 text-slate-400">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-bold ${colors.text}`}>
            {plan?.isOneTime ? '—' : `₺${plan?.priceMonthly ?? '?'}/ay`}
          </p>
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500">
            <CalendarDays size={9} />
            {sub.cancel_at_period_end ? 'Bitiş:' : 'Yenileme:'} {expiryDate}
          </div>
        </div>
      </div>

      {!sub.cancel_at_period_end && !plan?.isOneTime && (
        <button
          onClick={() => onCancelAtPeriodEnd(sub.id)}
          disabled={cancelling === sub.id}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-black/20 hover:bg-red-500/10 hover:border-red-500/25 border border-transparent text-slate-500 hover:text-red-400 text-[10px] font-medium transition-all disabled:opacity-50"
        >
          {cancelling === sub.id
            ? <Loader2 size={10} className="animate-spin" />
            : <X size={10} />}
          Yenilemeyi İptal Et
        </button>
      )}
    </div>
  );
};

// ── Ethics feedback form ───────────────────────────────────────────────────────

type FairnessVote = 'yes' | 'somewhat' | 'no';

const EthicsFeedbackForm: React.FC = () => {
  const [vote,         setVote]         = useState<FairnessVote | null>(null);
  const [unfairFeature,setUnfairFeature]= useState('');
  const [freeText,     setFreeText]     = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!vote) return;
    setSubmitting(true);
    setError(null);
    try {
      await subscriptionPlanService.submitFeedback(
        vote,
        unfairFeature || undefined,
        freeText || undefined,
      );
      setSubmitted(true);
    } catch {
      setError('Geri bildirim gönderilemedi.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
          <Check size={20} className="text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-white">Teşekkürler!</p>
        <p className="text-xs text-slate-400 text-center">
          Geri bildiriminiz aylık etik raporda değerlendirilecek.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-300 font-medium mb-2">Vitalis'in ücretlendirmesi adil mi?</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'yes',      label: 'Evet, adil', icon: <ThumbsUp size={14} /> },
            { v: 'somewhat', label: 'Kısmen',      icon: <Minus size={14} /> },
            { v: 'no',       label: 'Hayır',       icon: <ThumbsDown size={14} /> },
          ].map(({ v, label, icon }) => (
            <button
              key={v}
              onClick={() => setVote(v as FairnessVote)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs transition-all ${
                vote === v
                  ? 'bg-violet-500/12 border-violet-500/40 text-violet-300'
                  : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-600'
              }`}
            >
              {icon}
              <span className="text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {vote && vote !== 'yes' && (
        <div>
          <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">
            Hangi özellik ücretli olmamalıydı?
          </label>
          <input
            type="text"
            value={unfairFeature}
            onChange={(e) => setUnfairFeature(e.target.value)}
            placeholder="örn. Okuma bildirimi, Trip Modu…"
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
        </div>
      )}

      <div>
        <label className="text-[10px] text-slate-500 mb-1 block uppercase tracking-wide">
          Ek görüş (isteğe bağlı)
        </label>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Ücretlendirme hakkındaki düşünceleriniz…"
          rows={2}
          maxLength={400}
          className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!vote || submitting}
        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 size={14} className="animate-spin" /> Gönderiliyor…</>
          : 'Gönder'}
      </button>

      <p className="text-[9px] text-slate-600 text-center leading-relaxed">
        Geri bildirimler anonim değerlendirmeye alınır ve aylık Etik Şeffaflık Raporu'nda
        yayımlanır.
      </p>
    </div>
  );
};

// ── Explore plan card ──────────────────────────────────────────────────────────

interface ExplorePlanCardProps {
  plan:           typeof ETHICAL_PLANS[0];
  discountedPrice?: number;
  onCheckout:     (id: EthicalPlanId) => void;
  checkouting:    string | null;
}

const ExplorePlanCard: React.FC<ExplorePlanCardProps> = ({
  plan, discountedPrice, onCheckout, checkouting,
}) => {
  const colors = planColor(plan.id);
  const isDiscounted = discountedPrice !== undefined && discountedPrice !== plan.priceMonthly;

  return (
    <div className={`p-3 rounded-xl border ${colors.border} bg-slate-800/30 space-y-2`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold ${colors.text}`}>{plan.name}</p>
        <div className="text-right">
          {isDiscounted && (
            <p className="text-[10px] text-slate-500 line-through">₺{plan.priceMonthly}</p>
          )}
          <p className={`text-xs font-bold ${colors.text}`}>
            ₺{isDiscounted ? discountedPrice : plan.priceMonthly}
            {plan.isOneTime ? '' : '/ay'}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">{plan.description}</p>
      <button
        onClick={() => onCheckout(plan.id as EthicalPlanId)}
        disabled={checkouting === plan.id}
        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${colors.bg} ${colors.text} hover:opacity-80 disabled:opacity-40`}
      >
        {checkouting === plan.id
          ? <Loader2 size={11} className="animate-spin" />
          : <ExternalLink size={11} />}
        {plan.isOneTime ? 'Satın Al' : 'Abone Ol'}
      </button>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface SubscriptionManagementProps {
  className?: string;
}

type Tab = 'plans' | 'explore' | 'ethics';

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ className = '' }) => {
  const [tab,           setTab]           = useState<Tab>('plans');
  const [activeSubs,    setActiveSubs]    = useState<Array<{
    id: string;
    plan: string;
    expires_at: string;
    period: string;
    cancel_at_period_end: boolean;
  }>>([]);
  const [hasDiscount,   setHasDiscount]   = useState(false);

  const [loading,       setLoading]       = useState(true);
  const [cancelling,    setCancelling]    = useState<string | null>(null);
  const [checkouting,   setCheckouting]   = useState<string | null>(null);
  const [cancelError,   setCancelError]   = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [subs, discount] = await Promise.all([
      subscriptionPlanService.getActiveSubscriptions(),
      subscriptionPlanService.isEligibleForHealthcareDiscount(),
    ]);
    setActiveSubs(subs);
    setHasDiscount(discount);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCancelAtPeriodEnd = async (subId: string) => {
    setCancelling(subId);
    setCancelError(null);
    const { error } = await supabase_cancelSub(subId);
    if (error) setCancelError('İptal işlemi başarısız. Destek ile iletişime geç.');
    else await load();
    setCancelling(null);
  };

  const handleCheckout = async (planId: EthicalPlanId) => {
    setCheckouting(planId);
    setCheckoutError(null);
    const { sessionUrl, error } = await subscriptionPlanService.startCheckout(planId);
    if (error || !sessionUrl) {
      setCheckoutError(error ?? 'Ödeme sayfası açılamadı.');
    } else {
      window.location.href = sessionUrl;
    }
    setCheckouting(null);
  };

  // Supabase helper for cancellation (cancel_at_period_end flag)
  async function supabase_cancelSub(subId: string): Promise<{ error: string | null }> {
    const { supabase } = await import('../../src/lib/supabase');
    const { error } = await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq('id', subId);
    return { error: error ? error.message : null };
  }

  const discountedPrice = (price: number) =>
    subscriptionPlanService.applyHealthcareDiscount(price, hasDiscount);

  // Filter out plans already subscribed to for explore tab
  const subscribedPlanIds = new Set(activeSubs.map((s) => s.plan));
  const explorePlans = ETHICAL_PLANS.filter((p) => !subscribedPlanIds.has(p.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Üyelik Yönetimi</h3>
        {hasDiscount && (
          <div className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
            <Stethoscope size={10} />
            <BadgePercent size={10} />
            <span>%20 sağlık indirimi</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl bg-slate-800/40 border border-slate-700/40 p-1 gap-1">
        {[
          { key: 'plans',   icon: <CreditCard size={12} />,  label: 'Aktif'   },
          { key: 'explore', icon: <Compass size={12} />,     label: 'Keşfet'  },
          { key: 'ethics',  icon: <Heart size={12} />,       label: 'Etik'    },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <div className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />}

      {!loading && (
        <>
          {/* ── Plans tab ────────────────────────────────────────────────── */}
          {tab === 'plans' && (
            <div className="space-y-3">
              {activeSubs.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mx-auto">
                    <CreditCard size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">Aktif üyelik yok</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ücretsiz olarak keşfet, eşleş ve mesajlaş.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab('explore')}
                    className="flex items-center justify-center gap-1.5 mx-auto text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    Premium özellikler <ChevronRight size={12} />
                  </button>
                </div>
              ) : (
                <>
                  {cancelError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
                      <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-400">{cancelError}</p>
                    </div>
                  )}
                  {activeSubs.map((sub) => (
                    <ActiveSubCard
                      key={sub.id}
                      sub={sub}
                      onCancelAtPeriodEnd={handleCancelAtPeriodEnd}
                      cancelling={cancelling}
                    />
                  ))}
                </>
              )}

              {/* Free tier reminder */}
              <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 flex items-start gap-2">
                <Check size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Keşif (7/gün), eşleşme, mesajlaşma ve tüm güvenlik özellikleri
                  her zaman <span className="text-emerald-400 font-medium">ücretsiz</span> kalacak.
                </p>
              </div>

              <button
                onClick={() => void load()}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-700 text-slate-500 hover:text-slate-300 text-xs font-medium transition-colors"
              >
                <RotateCcw size={11} />
                Yenile
              </button>
            </div>
          )}

          {/* ── Explore tab ──────────────────────────────────────────────── */}
          {tab === 'explore' && (
            <div className="space-y-3">
              {hasDiscount && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                  <Stethoscope size={12} className="text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">
                    Sağlık çalışanı indirimi (%20) tüm fiyatlara uygulandı.
                  </p>
                </div>
              )}

              {checkoutError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{checkoutError}</p>
                </div>
              )}

              {/* Bundle plans */}
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Paketler</p>
              <div className="space-y-2">
                {explorePlans
                  .filter((p) => !p.isOneTime && ['CONVENIENCE', 'PRIVACY', 'PREMIUM_FULL', 'PREMIUM_COACHING'].includes(p.id))
                  .map((plan) => (
                    <ExplorePlanCard
                      key={plan.id}
                      plan={plan}
                      discountedPrice={discountedPrice(plan.priceMonthly)}
                      onCheckout={handleCheckout}
                      checkouting={checkouting}
                    />
                  ))}
              </div>

              {/* Add-on plans */}
              {explorePlans.some((p) => !p.isOneTime && ['TRIP_ADDON', 'FILTERS_ADDON', 'INCOGNITO_ADDON'].includes(p.id)) && (
                <>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium pt-1">Bireysel Eklentiler</p>
                  <div className="space-y-2">
                    {explorePlans
                      .filter((p) => !p.isOneTime && ['TRIP_ADDON', 'FILTERS_ADDON', 'INCOGNITO_ADDON'].includes(p.id))
                      .map((plan) => (
                        <ExplorePlanCard
                          key={plan.id}
                          plan={plan}
                          discountedPrice={discountedPrice(plan.priceMonthly)}
                          onCheckout={handleCheckout}
                          checkouting={checkouting}
                        />
                      ))}
                  </div>
                </>
              )}

              {/* One-time purchases */}
              {explorePlans.some((p) => p.isOneTime) && (
                <>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium pt-1">Tek Seferlik</p>
                  <div className="space-y-2">
                    {explorePlans
                      .filter((p) => p.isOneTime)
                      .map((plan) => (
                        <ExplorePlanCard
                          key={plan.id}
                          plan={plan}
                          discountedPrice={discountedPrice(plan.priceMonthly)}
                          onCheckout={handleCheckout}
                          checkouting={checkouting}
                        />
                      ))}
                  </div>
                </>
              )}

              {explorePlans.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-500">Tüm planlara zaten abone oldunuz! 🎉</p>
                </div>
              )}

              {/* "Continue free" always visible */}
              <div className="pt-1 border-t border-slate-700/40">
                <p className="text-center text-[10px] text-slate-600">
                  Ücretsiz devam etmek için hiçbir şey yapmanıza gerek yok.
                </p>
              </div>
            </div>
          )}

          {/* ── Ethics tab ───────────────────────────────────────────────── */}
          {tab === 'ethics' && (
            <div className="space-y-4">
              {/* Transparency values */}
              <div className="p-3.5 rounded-xl bg-violet-500/8 border border-violet-500/20 space-y-2.5">
                <p className="text-xs font-semibold text-violet-300">Etik Taahhüdümüz</p>
                <div className="space-y-1.5">
                  {[
                    'Asla "daha fazla eşleşme görme" satmayız',
                    'Asla "daha fazla beğeni hakkı" satmayız',
                    'Asla güvenliği ücretli yapmayız',
                    'Gizli ücret veya abonelik tuzağı yok',
                    'İptal her zaman bir tık uzakta',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <Check size={11} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <EthicsFeedbackForm />
            </div>
          )}
        </>
      )}
    </div>
  );
};
