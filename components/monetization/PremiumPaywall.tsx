/**
 * PremiumPaywall — Özellik 6: Etik Monetizasyon
 *
 * Context-aware paywall bottom-sheet.  Shown when a user tries to access
 * a premium feature.  Follows ethical paywall principles:
 *
 *   ✓ Soft paywall by default — user can dismiss (isSoftWall)
 *   ✓ Hard paywall when no free fallback exists
 *   ✓ Shows a preview of what they get (value first)
 *   ✓ "Şimdilik gerek yok" (No thanks) always visible
 *   ✗ No countdown timers
 *   ✗ No "You're about to miss out!" language
 *   ✗ No pre-checked boxes
 *
 * Usage:
 *   <PremiumPaywall
 *     context={{ featureId: 'canUseTripMode', featureName: 'Trip Modu', ... }}
 *     onUpgrade={() => setShowPlanSelector(true)}
 *     onDismiss={() => setShowPaywall(false)}
 *   />
 */

import React from 'react';
import {
  X,
  ChevronRight,
  MapPin,
  Filter,
  EyeOff,
  Clock,
  BookOpen,
  CalendarHeart,
  Shield,
  Check,
  Sparkles,
} from 'lucide-react';
import { subscriptionPlanService } from '../../services/subscriptionPlanService';
import type { PaywallContext, EthicalPlanId, UserCapabilities } from '../../types';

// ── Feature icon/colour map ────────────────────────────────────────────────────

const FEATURE_CONFIG: Record<
  keyof UserCapabilities,
  { icon: React.ReactNode; color: string; bg: string; border: string; example: string }
> = {
  canUseTripMode: {
    icon: <MapPin size={22} />,
    color: 'text-sky-400',
    bg: 'bg-sky-500/12',
    border: 'border-sky-500/25',
    example: `"Ankara'ya gitmeden önce eşleş"`,
  },
  canUseAdvancedFilters: {
    icon: <Filter size={22} />,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/12',
    border: 'border-indigo-500/25',
    example: '"Sadece vejetaryen kardiyologlar"',
  },
  canUseIncognito: {
    icon: <EyeOff size={22} />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/12',
    border: 'border-violet-500/25',
    example: '"Sadece beğendiklerin görebilir"',
  },
  canHideActivity: {
    icon: <Clock size={22} />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/12',
    border: 'border-purple-500/25',
    example: '"Son görülme gizlenir"',
  },
  canControlReadReceipts: {
    icon: <Check size={22} />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/12',
    border: 'border-blue-500/25',
    example: '"Mesajı okuyup okumadığın gizli"',
  },
  canGetCoaching: {
    icon: <BookOpen size={22} />,
    color: 'text-rose-400',
    bg: 'bg-rose-500/12',
    border: 'border-rose-500/25',
    example: '"Profesyonel profil incelemesi"',
  },
  canUseConcierge: {
    icon: <CalendarHeart size={22} />,
    color: 'text-pink-400',
    bg: 'bg-pink-500/12',
    border: 'border-pink-500/25',
    example: '"Date planını biz yapalım"',
  },
  canAccessPrioritySupport: {
    icon: <Shield size={22} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/12',
    border: 'border-emerald-500/25',
    example: '"Sorunlara 2 saat içinde yanıt"',
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export interface PremiumPaywallProps {
  context: PaywallContext;
  onUpgrade: (plan?: EthicalPlanId) => void;
  onDismiss: () => void;
}

export const PremiumPaywall: React.FC<PremiumPaywallProps> = ({
  context,
  onUpgrade,
  onDismiss,
}) => {
  const cfg = FEATURE_CONFIG[context.featureId];

  // Find the cheapest suggested plan
  const suggestedPlans = context.suggestedPlans
    .map((id) => subscriptionPlanService.getPlan(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof subscriptionPlanService.getPlan>>[];

  const cheapestPlan = suggestedPlans.sort((a, b) => a.priceMonthly - b.priceMonthly)[0];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={context.isSoftWall ? onDismiss : undefined}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-slide-up">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Dismiss (soft walls only) */}
        {context.isSoftWall && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-4 p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        )}

        {/* Feature preview */}
        <div className={`mx-5 mt-3 mb-4 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
              {cfg.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className={cfg.color} />
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Premium</p>
              </div>
              <p className={`text-sm font-bold mt-0.5 ${cfg.color}`}>{context.featureName}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{context.description}</p>
              <p className="text-[10px] text-slate-500 mt-1 italic">{cfg.example}</p>
            </div>
          </div>
        </div>

        {/* Suggested plans (compact) */}
        {suggestedPlans.length > 0 && (
          <div className="px-5 mb-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bu özelliği içeren paketler</p>
            {suggestedPlans.slice(0, 2).map((plan) => (
              <button
                key={plan.id}
                onClick={() => onUpgrade(plan.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="text-[10px] text-slate-500">{plan.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{plan.priceMonthly} TL</p>
                    <p className="text-[9px] text-slate-500">{plan.isOneTime ? 'tek seferlik' : '/ay'}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-500" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="px-5 pb-5 space-y-2">
          <button
            onClick={() => onUpgrade(cheapestPlan?.id)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 font-bold text-sm transition-all hover:brightness-110 flex items-center justify-center gap-2"
          >
            <Sparkles size={14} /> Premium'a Geç
          </button>

          {context.isSoftWall ? (
            <button
              onClick={onDismiss}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
            >
              Şimdilik gerek yok ✕
            </button>
          ) : (
            <p className="text-center text-[10px] text-slate-600">
              Bu özellik için premium üyelik gereklidir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Pre-built context helpers ──────────────────────────────────────────────────

export const PAYWALL_CONTEXTS: Record<keyof UserCapabilities, PaywallContext> = {
  canUseTripMode: {
    featureId: 'canUseTripMode',
    featureName: 'Trip Modu',
    description: 'Seyahat edeceğin şehirde varmadan önce eşleşmelere başla.',
    suggestedPlans: ['TRIP_ADDON', 'CONVENIENCE', 'PREMIUM_FULL'],
    isSoftWall: true,
  },
  canUseAdvancedFilters: {
    featureId: 'canUseAdvancedFilters',
    featureName: 'Gelişmiş Filtreler',
    description: '15+ filtre kriteri ile tam aradığın kişiyi bul.',
    suggestedPlans: ['FILTERS_ADDON', 'CONVENIENCE', 'PREMIUM_FULL'],
    isSoftWall: true,
  },
  canUseIncognito: {
    featureId: 'canUseIncognito',
    featureName: 'Gizli Mod',
    description: 'Sadece beğendiğin kişiler seni görebilir.',
    suggestedPlans: ['INCOGNITO_ADDON', 'PRIVACY', 'PREMIUM_FULL'],
    isSoftWall: true,
  },
  canHideActivity: {
    featureId: 'canHideActivity',
    featureName: 'Aktivite Gizleme',
    description: 'Online durumun ve son görülmen gizli kalır.',
    suggestedPlans: ['PRIVACY', 'PREMIUM_FULL'],
    isSoftWall: true,
  },
  canControlReadReceipts: {
    featureId: 'canControlReadReceipts',
    featureName: 'Okuma Bildirimi Kontrolü',
    description: 'Mesajı okuyup okumadığın karşı tarafa görünmez.',
    suggestedPlans: ['CONVENIENCE', 'PRIVACY', 'PREMIUM_FULL'],
    isSoftWall: true,
  },
  canGetCoaching: {
    featureId: 'canGetCoaching',
    featureName: 'Profil Koçluğu',
    description: '48 saat içinde profesyonel profil incelemesi ve öneriler.',
    suggestedPlans: ['COACHING_ONCE', 'PREMIUM_COACHING'],
    isSoftWall: true,
  },
  canUseConcierge: {
    featureId: 'canUseConcierge',
    featureName: 'Date Concierge',
    description: 'Kişisel date planlama: mekan, rezervasyon ve senaryo.',
    suggestedPlans: ['CONCIERGE_ONCE'],
    isSoftWall: false,
  },
  canAccessPrioritySupport: {
    featureId: 'canAccessPrioritySupport',
    featureName: 'Öncelikli Destek',
    description: 'Sorunlarınıza 2 saat içinde yanıt.',
    suggestedPlans: ['PREMIUM_FULL', 'PREMIUM_COACHING'],
    isSoftWall: true,
  },
};
