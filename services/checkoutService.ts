import { supabase } from '../src/lib/supabase';

export const createCheckoutSession = async (plan: 'GOLD' | 'PLATINUM') => {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { plan, userId },
  });

  if (error) {
    return { sessionUrl: null, error };
  }

  return { sessionUrl: data?.sessionUrl as string | undefined, error: null };
};
