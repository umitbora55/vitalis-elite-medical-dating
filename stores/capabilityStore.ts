/**
 * VITALIS Capability Store — Özellik 6: Etik Monetizasyon
 *
 * Zustand store that holds the current user's resolved capability flags.
 * Populated once on app mount (alongside the subscription check in App.tsx).
 *
 * Usage:
 *   const { canUseTripMode, canUseAdvancedFilters } = useCapabilityStore();
 *   if (!canUseTripMode) show paywall
 */

import { create } from 'zustand';
import type { UserCapabilities } from '../types';

const DEFAULT_CAPABILITIES: UserCapabilities = {
  canUseTripMode:           false,
  canUseAdvancedFilters:    false,
  canUseIncognito:          false,
  canHideActivity:          false,
  canControlReadReceipts:   false,
  canGetCoaching:           false,
  canUseConcierge:          false,
  canAccessPrioritySupport: false,
};

interface CapabilityState extends UserCapabilities {
  /** Whether capabilities have been loaded at least once */
  loaded:              boolean;
  /** Healthcare discount eligibility (20% off) */
  hasHealthcareDiscount: boolean;
  /** Set all capabilities at once (call after subscription fetch) */
  setCapabilities: (caps: UserCapabilities) => void;
  /** Set healthcare discount flag */
  setHealthcareDiscount: (eligible: boolean) => void;
  /** Reset to free defaults (on logout) */
  reset: () => void;
}

export const useCapabilityStore = create<CapabilityState>((set) => ({
  ...DEFAULT_CAPABILITIES,
  loaded:                false,
  hasHealthcareDiscount: false,

  setCapabilities: (caps) => set({ ...caps, loaded: true }),

  setHealthcareDiscount: (eligible) => set({ hasHealthcareDiscount: eligible }),

  reset: () => set({ ...DEFAULT_CAPABILITIES, loaded: false, hasHealthcareDiscount: false }),
}));
