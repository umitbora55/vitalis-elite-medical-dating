import { supabase } from '../src/lib/supabase';

const getAuthUserId = async (): Promise<{ userId: string | null; error: Error | null }> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { userId: null, error: error as unknown as Error };
  if (!data.user) return { userId: null, error: new Error('No authenticated user') };
  return { userId: data.user.id, error: null };
};

export const requestDataExport = async () => {
  const { userId, error: authError } = await getAuthUserId();
  if (authError || !userId) return { error: authError ?? new Error('No authenticated user') };

  const { error } = await supabase.from('data_export_requests').insert({
    user_id: userId,
    status: 'PENDING',
  });

  return { error: (error as unknown as Error) || null };
};

export const requestAccountDeletion = async (reason?: string) => {
  const { userId, error: authError } = await getAuthUserId();
  if (authError || !userId) return { error: authError ?? new Error('No authenticated user') };

  const { error } = await supabase.from('account_deletion_requests').insert({
    user_id: userId,
    reason: reason || null,
    status: 'PENDING',
  });

  return { error: (error as unknown as Error) || null };
};
