import { supabase } from '../src/lib/supabase';

type VerifiedDomainRow = {
  domain: string;
  institution_name: string;
  tier: number;
};

const VERIFICATION_DOC_BUCKET = 'verification-documents';
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

  const best = matches.sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    return b.domain.length - a.domain.length;
  })[0];

  return { domain: best || null, error: null };
};

export const sendVerificationOtp = async (email: string) => {
  return supabase.auth.signInWithOtp({ email });
};

export const verifyOtp = async (email: string, token: string) => {
  return supabase.auth.verifyOtp({ email, token, type: 'email' });
};

// AUDIT-FIX: BE-008 — Remove userId parameter, use auth.getUser() to prevent IDOR
export const saveVerifiedEmail = async (
  email: string,
  domain: string,
  tier: number,
) => {
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

// AUDIT-FIX: BE-002 — Remove userId parameter, use auth.getUser() to prevent IDOR
export const createVerificationRequest = async (
  method: 'EMAIL' | 'DOCUMENT' | 'STUDENT',
  documentUrl?: string,
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }
  return supabase.from('verification_requests').insert({
    user_id: authData.user.id,
    method,
    document_url: documentUrl || null,
    status: 'PENDING',
  });
};

const sanitizeFileName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

// AUDIT-FIX: BE-002 — Remove userId parameter, use auth.getUser() to prevent IDOR
export const uploadVerificationDocument = async (
  file: File,
): Promise<{ documentPath: string | null; error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { documentPath: null, error: new Error('No authenticated user') };
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return { documentPath: null, error: new Error('Unsupported document format') };
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return { documentPath: null, error: new Error('Document is larger than 10 MB') };
  }

  const safeName = sanitizeFileName(file.name || 'document');
  const userId = authData.user.id;
  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(VERIFICATION_DOC_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { documentPath: null, error: error as unknown as Error };
  }

  return { documentPath: path, error: null };
};

// AUDIT-FIX: BE-002 — Remove userId parameter, use auth.getUser() to prevent IDOR
export const updateProfileVerificationStatus = async (
  status: 'PENDING_VERIFICATION' | 'EMAIL_VERIFICATION_SENT' | 'REJECTED' | 'VERIFIED',
) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { data: null, error: new Error('No authenticated user') };
  }
  return supabase.from('profiles').update({ verification_status: status }).eq('id', authData.user.id);
};
