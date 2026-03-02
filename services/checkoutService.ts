import { supabase } from '../src/lib/supabase';

// AUDIT-FIX: FE-003/BE-021 — Use actual tier names (DOSE/FORTE/ULTRA) instead of legacy GOLD/PLATINUM
export const createCheckoutSession = async (plan: 'DOSE' | 'FORTE' | 'ULTRA') => {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { plan },
  });

  if (error) {
    return { sessionUrl: null, error };
  }

  return { sessionUrl: data?.sessionUrl as string | undefined, error: null };
};
