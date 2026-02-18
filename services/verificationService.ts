import type { VerificationMethod, VerificationPolicy } from '../types';
import { supabase } from '../src/lib/supabase';

type VerificationStatus =
  | 'UNVERIFIED'
  | 'AUTO_VERIFIED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'NEED_MORE_INFO'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'EMAIL_VERIFICATION_SENT';

type VerifiedDomainRow = {
  domain: string;
  institution_name: string;
  tier: number;
};

type EmailType = 'corporate' | 'personal';

type CreateVerificationRequestInput = {
  requestId: string;
  emailType: EmailType;
  method: VerificationMethod;
  initialStatus: 'PENDING' | 'UNDER_REVIEW' | 'PENDING_VERIFICATION' | 'NEED_MORE_INFO';
  documentPath?: string | null;
};

type VerificationSettings = {
  key: string;
  value: string;
};

const VERIFICATION_DOC_BUCKET = 'verification-docs';
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const normalizeDomain = (email: string): string => {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return '';
  return email.slice(atIndex + 1).toLowerCase();
};

const matchesDomain = (candidate: string, domain: string): boolean => {
  if (domain.startsWith('*.')) {
    const suffix = domain.replace('*.', '');
    return candidate === suffix || candidate.endsWith(`.${suffix}`);
  }
  return candidate === domain;
};

const getDomainCandidates = (candidate: string): string[] => {
  const candidates = new Set<string>();
  candidates.add(candidate);

  const parts = candidate.split('.');
  for (let i = 0; i < parts.length - 1; i += 1) {
    const suffix = parts.slice(i).join('.');
    if (suffix.includes('.')) {
      candidates.add(`*.${suffix}`);
    }
  }

  return Array.from(candidates);
};

const normalizeAllowlist = (value: string | null): string[] => {
  try {
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === 'string' ? item.toLowerCase().trim() : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const getVerifiedPolicyValue = (value: string | null): VerificationPolicy => {
  if (value === 'CORPORATE_ONLY' || value === 'AUTO_APPROVE') return value;
  return 'HYBRID';
};

const sanitizeFileName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

const toSha256Hex = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hash = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const getVerifiedDomain = async (
  email: string,
): Promise<{ domain: VerifiedDomainRow | null; error: Error | null }> => {
  const domain = normalizeDomain(email);
  if (!domain) return { domain: null, error: new Error('Invalid email') };

  const candidates = getDomainCandidates(domain);
  const { data, error } = await supabase
    .from('verified_domains')
    .select('domain,institution_name,tier')
    .in('domain', candidates)
    .returns<VerifiedDomainRow[]>();

  if (error) return { domain: null, error: error as unknown as Error };

  const matches = (data || []).filter((row) => matchesDomain(domain, row.domain));
  if (matches.length === 0) return { domain: null, error: null };

  const best = matches
    .sort((a, b) => {
      if (b.tier !== a.tier) return b.tier - a.tier;
      return b.domain.length - a.domain.length;
    })[0];

  return { domain: best || null, error: null };
};

export const sendVerificationOtp = async (email: string) => supabase.auth.signInWithOtp({ email });

export const verifyOtp = async (email: string, token: string) => supabase.auth.verifyOtp({ email, token, type: 'email' });

export const saveVerifiedEmail = async (email: string, domain: string, tier: number) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }

  return supabase.from('verified_work_emails').insert({
    user_id: authData.user.id,
    email,
    domain,
    tier,
  });
};

export const getVerificationPolicy = async (): Promise<{ policy: VerificationPolicy; error: Error | null }> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'verification_policy')
    .maybeSingle<VerificationSettings>();

  if (error) {
    return { policy: 'HYBRID', error: new Error('Could not read verification_policy') };
  }

  return { policy: getVerifiedPolicyValue(data?.value ?? null), error: null };
};

export const getVerificationSettings = async (): Promise<{
  allowList: string[];
  denyList: string[];
  disposableList: string[];
  limitedActions: string[];
  error: Error | null;
}> => {
  const keys = [
    'allowlist_domains',
    'denylist_domains',
    'disposable_domains',
    'limited_actions',
  ];
  const { data, error } = await supabase.from('app_settings').select('key,value').in('key', keys).returns<VerificationSettings[]>();

  if (error) {
    return {
      allowList: [],
      denyList: [],
      disposableList: [],
      limitedActions: ['swipe', 'chat', 'premium'],
      error: error as unknown as Error,
    };
  }

  const map = new Map<string, string>((data || []).map((row) => [row.key, row.value]));
  return {
    allowList: normalizeAllowlist(map.get('allowlist_domains') ?? null),
    denyList: normalizeAllowlist(map.get('denylist_domains') ?? null),
    disposableList: normalizeAllowlist(map.get('disposable_domains') ?? null),
    limitedActions: normalizeAllowlist(map.get('limited_actions') ?? '["swipe","chat","premium"]'),
    error: null,
  };
};

export const createVerificationRequest = async ({
  requestId,
  emailType,
  method,
  initialStatus,
  documentPath = null,
}: CreateVerificationRequestInput) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }

  return supabase.from('verification_requests').insert({
    id: requestId,
    user_id: authData.user.id,
    email_type: emailType,
    method,
    status: initialStatus,
    document_url: documentPath,
    document_path: documentPath,
    decision: null,
    reason_code: null,
    notes: null,
    reviewed_by: null,
    reviewed_at: null,
    claimed_by: null,
    claimed_at: null,
    risk_flags: {},
  });
};

export const uploadVerificationDocument = async (
  file: File,
  requestId: string,
): Promise<{ documentPath: string | null; documentSize: number; sha256: string | null; error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { documentPath: null, documentSize: 0, sha256: null, error: new Error('No authenticated user') };
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return { documentPath: null, documentSize: 0, sha256: null, error: new Error('Unsupported document format') };
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return { documentPath: null, documentSize: 0, sha256: null, error: new Error('Document is larger than 10 MB') };
  }

  const safeName = sanitizeFileName(file.name || 'document');
  const requestSafe = requestId || `${Date.now()}`;
  const path = `${authData.user.id}/${requestSafe}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(VERIFICATION_DOC_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { documentPath: null, documentSize: 0, sha256: null, error: error as unknown as Error };
  }

  const sha256 = await toSha256Hex(file);
  return { documentPath: path, documentSize: file.size, sha256, error: null };
};

export const updateProfileVerificationStatus = async (
  status: Exclude<VerificationStatus, 'VERIFIED' | 'SUSPENDED'>,
  method?: VerificationMethod | null,
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }

  return supabase.from('profiles').update({
    verification_status: status,
    ...(method !== undefined ? { verification_method: method } : {}),
  }).eq('id', authData.user.id);
};

export const upsertVerificationDocument = async (
  requestId: string,
  storagePath: string,
  metadata: { docType?: string; size?: number; mime?: string; sha256?: string | null },
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }

  return supabase.from('verification_documents').insert({
    request_id: requestId,
    user_id: authData.user.id,
    storage_path: storagePath,
    document_path: storagePath,
    doc_type: metadata.docType || 'DOCUMENT',
    mime: metadata.mime || 'application/octet-stream',
    size: metadata.size || 0,
    sha256: metadata.sha256 || null,
  });
};
