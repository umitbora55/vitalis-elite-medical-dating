import { supabase } from '../src/lib/supabase';

export const getActiveSubscription = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) return { isPremium: false, error: authError };
  if (!authData.user) {
    return { isPremium: false, error: new Error('No authenticated user') };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, expires_at, is_active')
    .eq('profile_id', authData.user.id)
    .eq('is_active', true)
    .gte('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { isPremium: false, error };
  return { isPremium: Boolean(data), error: null };
};
