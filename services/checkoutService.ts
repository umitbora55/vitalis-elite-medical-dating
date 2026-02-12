import { supabase } from '../src/lib/supabase';

export const createCheckoutSession = async (plan: 'GOLD' | 'PLATINUM') => {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { plan },
  });

  if (error) {
    return { sessionUrl: null, error };
  }

  return { sessionUrl: data?.sessionUrl as string | undefined, error: null };
};
