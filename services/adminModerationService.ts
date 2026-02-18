import type { UserRole } from '../types';
import { supabase } from '../src/lib/supabase';

type AdminRole = UserRole;

type EdgeResponse<T = unknown> = {
  data?: T;
  error?: string | { message?: string } | null;
};

type AdminContext = {
  userId: string;
  role: AdminRole | 'viewer';
  mfaLevel: 'aal1' | 'aal2' | null;
};

type VerificationListItem = {
  id: string;
  userId: string;
  status: string;
  emailType: string | null;
  method: string | null;
  submittedAt: string | null;
  claimedBy: string | null;
  claimedAt: string | null;
  requestorName: string | null;
  requestorEmail: string | null;
  requestorCity: string | null;
  riskFlags: Record<string, unknown> | null;
};

type VerificationCase = {
  requestId: string;
  userId: string;
  status: string;
  emailType: string | null;
  method: string | null;
  submittedAt: string | null;
  claim: { actorId: string | null; claimedAt: string | null };
  reasonCode: string | null;
  notes: string | null;
  decision: string | null;
  riskFlags: Record<string, unknown> | null;
  requestor: {
    id: string;
    name: string | null;
    city: string | null;
    verificationStatus: string | null;
    createdAt: string | null;
  };
  documents: Array<{
    id: string;
    storagePath: string;
    docType: string | null;
    mime: string | null;
    size: number | null;
    sha256: string | null;
  }>;
};

type AppSettingRecord = {
  key: string;
  value: string;
};

type AuditItem = {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const isAdminRole = (role: AdminRole | 'viewer'): boolean =>
  role === 'moderator' || role === 'admin';

const isMfaLevelTwo = (level: string | null): level is 'aal2' => level === 'aal2';

const parseError = (value: unknown): string => {
  if (!value) return 'Unknown error';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'message' in value) {
    return typeof value.message === 'string' ? value.message : 'Unknown error';
  }
  return 'Unknown error';
};

const callAdminFunction = async <T>(
  functionName: string,
  body: Record<string, unknown> = {},
): Promise<{ data: T | null; error: string | null }> => {
  const { data, error } = await supabase.functions.invoke<EdgeResponse<T>>(functionName, {
    body,
  });

  if (error) return { data: null, error: parseError(error.message) };
  if (!data) return { data: null, error: 'No data returned from function' };
  if (data.error) return { data: null, error: parseError(data.error) };
  return { data: (data.data as T) ?? null, error: null };
};

export const getAdminContext = async (): Promise<{
  context: AdminContext | null;
  error: string | null;
}> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { context: null, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', authData.user.id)
    .single();

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const level = (aalData && 'currentLevel' in aalData)
    ? (aalData.currentLevel as string | null)
    : (typeof aalData === 'string' ? aalData : null);

  const role = (profile?.user_role as AdminRole | null) ?? 'viewer';
  return {
    context: {
      userId: authData.user.id,
      role,
      mfaLevel: isMfaLevelTwo(level as string | null) ? 'aal2' : 'aal1',
    },
    error: null,
  };
};

export const isAdminSession = async (): Promise<{
  isAdmin: boolean;
  isMfaReady: boolean;
  role: AdminRole | 'viewer';
  error: string | null;
}> => {
  const { context, error } = await getAdminContext();
  if (error || !context) {
    return { isAdmin: false, isMfaReady: false, role: 'viewer', error: error || 'Not authenticated' };
  }

  const allowed = isAdminRole(context.role);
  return {
    isAdmin: allowed,
    isMfaReady: context.mfaLevel === 'aal2',
    role: context.role,
    error: allowed ? null : 'Moderator+ role is required',
  };
};

export const fetchVerificationQueue = async (filters: {
  status?: string[];
  emailType?: string | null;
  reason?: string | null;
}): Promise<{
  items: VerificationListItem[];
  error: string | null;
}> => {
  const { data, error } = await callAdminFunction<VerificationListItem[]>('admin-verification-queue', { filters });
  if (error || !data) return { items: [], error };
  return { items: data, error: null };
};

export const fetchVerificationCase = async (
  requestId: string,
): Promise<{ data: VerificationCase | null; error: string | null }> => {
  const { data, error } = await callAdminFunction<VerificationCase>('admin-verification-case', { requestId });
  return { data, error };
};

export const claimVerificationRequest = async (
  requestId: string,
): Promise<{ data: { requestId: string; claimedBy: string; claimedAt: string } | null; error: string | null }> => {
  const { data, error } = await callAdminFunction<{ requestId: string; claimedBy: string; claimedAt: string }>(
    'admin-claim-verification-request',
    { requestId },
  );
  return { data, error };
};

export const getVerificationDocSignedUrl = async (
  requestId: string,
): Promise<{ data: Array<{ docId: string; signedUrl: string; expiresIn: number; mime?: string | null }>; error: string | null; }> => {
  const { data, error } = await callAdminFunction<
    Array<{ docId: string; signedUrl: string; expiresIn: number; mime?: string | null }>
  >('admin-get-verification-doc-url', { requestId });
  return { data: data || [], error };
};

export const decideVerificationRequest = async (payload: {
  requestId: string;
  decision: 'approve' | 'reject' | 'need_more_info';
  reasonCode?: string | null;
  notes?: string | null;
  templateMessage?: string | null;
}): Promise<{ data: null; error: string | null }> => {
  const { data, error } = await callAdminFunction<null>('admin-decide-verification', payload);
  return { data, error };
};

export const getAdminSettings = async (): Promise<{ data: AppSettingRecord[]; error: string | null }> => {
  const { data, error } = await callAdminFunction<AppSettingRecord[]>('admin-settings', {});
  return { data: data || [], error };
};

export const saveAdminSettings = async (
  entries: AppSettingRecord[],
): Promise<{ data: null; error: string | null }> => {
  const { data, error } = await callAdminFunction<null>('admin-settings', { entries });
  return { data, error };
};

export const fetchAuditLogs = async (limit = 25): Promise<{ data: AuditItem[]; error: string | null }> => {
  const { data, error } = await callAdminFunction<AuditItem[]>('admin-audit-logs', { limit });
  return { data: data || [], error };
};
