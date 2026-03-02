/**
 * Admin Service — Edge Function clients for the Verification Admin Panel
 *
 * Calls deployed Supabase Edge Functions that enforce moderator/admin access
 * and MFA (aal2) server-side.
 */

import { supabase } from '../src/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueueItem {
    id: string;
    userId: string;
    status: string;
    emailType: string | null;
    method: string | null;
    submittedAt: string;
    claimedBy: string | null;
    claimedAt: string | null;
    requestorName: string | null;
    requestorEmail: string | null;
    requestorCity: string | null;
    riskFlags: Record<string, unknown>;
}

export interface CaseDetail {
    requestId: string;
    userId: string;
    status: string;
    emailType: string | null;
    method: string | null;
    submittedAt: string;
    claim: { actorId: string | null; claimedAt: string | null };
    reasonCode: string | null;
    notes: string | null;
    decision: string | null;
    riskFlags: Record<string, unknown>;
    requestor: {
        id: string;
        name: string | null;
        city: string | null;
        verificationStatus: string | null;
        createdAt: string | null;
    };
    documents: {
        id: string;
        storagePath: string;
        docType: string | null;
        mime: string | null;
        size: number | null;
        sha256: string | null;
    }[];
}

export interface SignedDoc {
    docId: string;
    signedUrl: string;
    expiresIn: number;
    mime: string | null;
}

export type Decision = 'approve' | 'reject' | 'need_more_info';

export interface QueueFilters {
    status?: string[];
    emailType?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAuthHeader = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return `Bearer ${token}`;
};

const invoke = async <T>(fnName: string, body: Record<string, unknown> = {}): Promise<T> => {
    const auth = await getAuthHeader();
    const { data, error } = await supabase.functions.invoke(fnName, {
        body,
        headers: { Authorization: auth },
    });

    if (error) throw error;

    // Edge functions return { data: T } or { error: string }
    if (data?.error) throw new Error(data.error as string);
    return data?.data as T;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** Fetch the queue of verification requests with optional filters */
export const fetchVerificationQueue = async (filters: QueueFilters = {}): Promise<QueueItem[]> => {
    return invoke<QueueItem[]>('admin-verification-queue', { filters });
};

/** Fetch full details of a single verification case */
export const fetchVerificationCase = async (requestId: string): Promise<CaseDetail> => {
    return invoke<CaseDetail>('admin-verification-case', { requestId });
};

/** Claim a verification request for review */
export const claimVerificationRequest = async (requestId: string) => {
    return invoke<{ requestId: string; claimedBy: string; claimedAt: string }>(
        'admin-claim-verification-request',
        { requestId },
    );
};

/** Submit a decision on a verification request */
export const decideVerification = async (
    requestId: string,
    decision: Decision,
    reasonCode?: string | null,
    notes?: string | null,
) => {
    return invoke<null>('admin-decide-verification', {
        requestId,
        decision,
        reasonCode: reasonCode ?? null,
        notes: notes ?? null,
    });
};

/** Get signed URLs for verification documents */
export const getVerificationDocUrls = async (requestId: string): Promise<SignedDoc[]> => {
    return invoke<SignedDoc[]>('admin-get-verification-doc-url', { requestId });
};

/** Check if the current user has admin/moderator access */
export const checkAdminAccess = async (): Promise<{
    hasAccess: boolean;
    role: string;
}> => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return { hasAccess: false, role: 'viewer' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', authData.user.id)
        .maybeSingle();

    const role = (profile?.user_role as string) || 'viewer';
    const hasAccess = ['moderator', 'admin', 'superadmin'].includes(role);
    return { hasAccess, role };
};
