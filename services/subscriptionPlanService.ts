/**
 * VITALIS Subscription Plan Service — Özellik 6: Etik Monetizasyon
 *
 * Resolves user capabilities from active subscriptions and exposes
 * plan metadata for the ethical monetization system.
 *
 * Philosophy:
 *   • Discovery, matching, messaging, date planning = FREE
 *   • Security = always FREE
 *   • Sell: Convenience, Privacy, Coaching, Concierge
 *   • Never sell: access to people, swipes, visibility boosts
 */

import { supabase } from '../src/lib/supabase';
import type {
  UserCapabilities,
  EthicalPlanId,
  EthicalPlanConfig,
} from '../types';

// ── Plan Catalogue ─────────────────────────────────────────────────────────────

export const ETHICAL_PLANS: EthicalPlanConfig[] = [
  {
    id:           'CONVENIENCE',
    name:         'Kolaylık',
    description:  'Trip Modu + Gelişmiş Filtreler + Okuma bildirimi kontrolü',
    priceMonthly: 49,
    isOneTime:    false,
    isPopular:    false,
    capabilities: {
      canUseTripMode:          true,
      canUseAdvancedFilters:   true,
      canControlReadReceipts:  true,
    },
  },
  {
    id:           'PRIVACY',
    name:         'Gizlilik',
    description:  'Gizli mod + Görünürlük kontrolü + Aktivite gizleme',
    priceMonthly: 59,
    isOneTime:    false,
    capabilities: {
      canUseIncognito:         true,
      canHideActivity:         true,
      canControlReadReceipts:  true,
    },
  },
  {
    id:           'PREMIUM_FULL',
    name:         'Premium Tam',
    description:  'Kolaylık + Gizlilik paketi + Öncelikli destek',
    priceMonthly: 79,
    isOneTime:    false,
    isPopular:    true,
    capabilities: {
      canUseTripMode:           true,
      canUseAdvancedFilters:    true,
      canUseIncognito:          true,
      canHideActivity:          true,
      canControlReadReceipts:   true,
      canAccessPrioritySupport: true,
    },
  },
  {
    id:           'PREMIUM_COACHING',
    name:         'Premium + Koçluk',
    description:  'Premium Tam + Aylık profil incelemesi',
    priceMonthly: 149,
    isOneTime:    false,
    capabilities: {
      canUseTripMode:           true,
      canUseAdvancedFilters:    true,
      canUseIncognito:          true,
      canHideActivity:          true,
      canControlReadReceipts:   true,
      canGetCoaching:           true,
      canAccessPrioritySupport: true,
    },
  },
  {
    id:           'TRIP_ADDON',
    name:         'Trip Modu',
    description:  'Seyahat ederken farklı şehirde eşleşme (aylık 3 seyahat)',
    priceMonthly: 29,
    isOneTime:    false,
    capabilities: { canUseTripMode: true },
  },
  {
    id:           'FILTERS_ADDON',
    name:         'Gelişmiş Filtreler',
    description:  '15+ ek filtre kriterli aramalar + Filtre seti kaydetme',
    priceMonthly: 19,
    isOneTime:    false,
    capabilities: { canUseAdvancedFilters: true },
  },
  {
    id:           'INCOGNITO_ADDON',
    name:         'Gizli Mod',
    description:  'Sadece beğendiğin kişiler seni görebilir',
    priceMonthly: 39,
    isOneTime:    false,
    capabilities: { canUseIncognito: true },
  },
  {
    id:           'COACHING_ONCE',
    name:         'Profil Koçluğu',
    description:  'Profesyonel profil incelemesi + Öneriler (48 saat içinde)',
    priceMonthly: 99,
    isOneTime:    true,
    capabilities: { canGetCoaching: true },
  },
  {
    id:           'CONCIERGE_ONCE',
    name:         'Date Concierge',
    description:  'Kişisel date planlama + Rezervasyon hizmeti',
    priceMonthly: 149,
    isOneTime:    true,
    capabilities: { canUseConcierge: true },
  },
];

/** Default (all-false) capabilities for a free user */
export const FREE_CAPABILITIES: UserCapabilities = {
  canUseTripMode:           false,
  canUseAdvancedFilters:    false,
  canUseIncognito:          false,
  canHideActivity:          false,
  canControlReadReceipts:   false,
  canGetCoaching:           false,
  canUseConcierge:          false,
  canAccessPrioritySupport: false,
};

// ── Capability resolution ──────────────────────────────────────────────────────

/**
 * Map plan ID to capabilities.
 * Legacy plans (DOSE/FORTE/ULTRA) → PREMIUM_FULL capabilities.
 */
export function planToCapabilities(planId: string): Partial<UserCapabilities> {
  const ethical = ETHICAL_PLANS.find((p) => p.id === planId);
  if (ethical) return ethical.capabilities;

  // Legacy mapping
  switch (planId) {
    case 'ULTRA':
    case 'FORTE':
      return ETHICAL_PLANS.find((p) => p.id === 'PREMIUM_FULL')!.capabilities;
    case 'DOSE':
      return ETHICAL_PLANS.find((p) => p.id === 'CONVENIENCE')!.capabilities;
    default:
      return {};
  }
}

// ── Core Service ───────────────────────────────────────────────────────────────

export const subscriptionPlanService = {

  /**
   * Fetch capabilities from the server-side RPC (authoritative source).
   * Falls back to FREE_CAPABILITIES on error — never grants capabilities
   * that weren't confirmed server-side.
   *
   * Note: UI capability flags are convenience only. Actual feature enforcement
   * must be guarded by Supabase RLS policies and server-side checks.
   */
  async getUserCapabilities(): Promise<UserCapabilities> {
    // Always use the DB RPC — prevents client-side capability inflation.
    return this.getUserCapabilitiesFromDB();
  },

  /**
   * Server-side: get capabilities via DB RPC (more accurate, avoids stale data).
   */
  async getUserCapabilitiesFromDB(): Promise<UserCapabilities> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ...FREE_CAPABILITIES };

    const { data, error } = await supabase.rpc('get_user_capabilities', {
      p_user_id: user.id,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { ...FREE_CAPABILITIES };
    }

    const row = data[0] as Record<string, boolean>;
    return {
      canUseTripMode:           row['can_use_trip_mode']           ?? false,
      canUseAdvancedFilters:    row['can_use_advanced_filters']    ?? false,
      canUseIncognito:          row['can_use_incognito']           ?? false,
      canHideActivity:          row['can_hide_activity']           ?? false,
      canControlReadReceipts:   row['can_control_read_receipts']   ?? false,
      canGetCoaching:           row['can_get_coaching']            ?? false,
      canUseConcierge:          row['can_use_concierge']           ?? false,
      canAccessPrioritySupport: row['can_access_priority_support'] ?? false,
    };
  },

  /**
   * Get active subscription records (for display in subscription management).
   */
  async getActiveSubscriptions(): Promise<Array<{
    id: string;
    plan: string;
    expires_at: string;
    period: string;
    cancel_at_period_end: boolean;
  }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('subscriptions')
      .select('id, plan, expires_at, period, cancel_at_period_end')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false });

    return (data ?? []) as Array<{
      id: string;
      plan: string;
      expires_at: string;
      period: string;
      cancel_at_period_end: boolean;
    }>;
  },

  /**
   * Check if user has healthcare-verified discount eligibility.
   * Verified healthcare workers get 20% off any plan.
   */
  async isEligibleForHealthcareDiscount(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('profiles')
      .select('verified, healthcare_verified_for_discount')
      .eq('id', user.id)
      .maybeSingle();

    return !!(data?.verified || data?.healthcare_verified_for_discount);
  },

  /**
   * Apply healthcare discount (20%) to a price.
   */
  applyHealthcareDiscount(price: number, eligible: boolean): number {
    if (!eligible) return price;
    return Math.round(price * 0.8);
  },

  /**
   * Get a plan config by ID.
   */
  getPlan(id: EthicalPlanId): EthicalPlanConfig | undefined {
    return ETHICAL_PLANS.find((p) => p.id === id);
  },

  /**
   * Which plans unlock a given capability?
   */
  plansForCapability(cap: keyof UserCapabilities): EthicalPlanConfig[] {
    return ETHICAL_PLANS.filter((p) => p.capabilities[cap] === true);
  },

  /**
   * Submit monetization feedback.
   */
  async submitFeedback(
    isFair: 'yes' | 'somewhat' | 'no',
    unfairFeature?: string,
    freeText?: string,
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('submit_monetization_feedback', {
      p_user_id:        user.id,
      p_is_fair:        isFair,
      p_unfair_feature: unfairFeature ?? null,
      p_free_text:      freeText ?? null,
    });
  },

  /**
   * Checkout — invokes the existing create-checkout-session Edge Function
   * with the new ethical plan ID.
   */
  async startCheckout(planId: EthicalPlanId): Promise<{ sessionUrl: string | null; error: string | null }> {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { plan: planId },
    });

    if (error) return { sessionUrl: null, error: error.message };
    return { sessionUrl: (data as { sessionUrl?: string })?.sessionUrl ?? null, error: null };
  },
};
