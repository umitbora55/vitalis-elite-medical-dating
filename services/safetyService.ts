import { ReportReason } from '../types';
import { supabase } from '../src/lib/supabase';

const getAuthUserId = async (): Promise<{ userId: string | null; error: Error | null }> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { userId: null, error: error as unknown as Error };
  if (!data.user) return { userId: null, error: new Error('No authenticated user') };
  return { userId: data.user.id, error: null };
};

export const blockProfile = async (blockedId: string, reason?: string) => {
  const { userId, error: authError } = await getAuthUserId();
  if (authError || !userId) return { error: authError ?? new Error('No authenticated user') };

  const { error } = await supabase
    .from('blocks')
    .upsert(
      {
        blocker_id: userId,
        blocked_id: blockedId,
        reason: reason || null,
      },
      { onConflict: 'blocker_id,blocked_id' },
    );

  return { error: (error as unknown as Error) || null };
};

export const reportProfile = async (reportedId: string, reason: ReportReason, details?: string) => {
  const { userId, error: authError } = await getAuthUserId();
  if (authError || !userId) return { error: authError ?? new Error('No authenticated user') };

  const { error } = await supabase.from('reports').insert({
    reporter_id: userId,
    reported_id: reportedId,
    reason,
    details: details || null,
  });

  return { error: (error as unknown as Error) || null };
};
