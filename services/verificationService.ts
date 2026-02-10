import { supabase } from '../src/lib/supabase';

const normalizeDomain = (email: string) => {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return '';
  return email.slice(atIndex + 1).toLowerCase();
};

const matchesDomain = (candidate: string, domain: string) => {
  if (domain.startsWith('*.')) {
    const suffix = domain.replace('*.', '');
    return candidate === suffix || candidate.endsWith(`.${suffix}`);
  }
  return candidate === domain;
};

export const getVerifiedDomain = async (email: string) => {
  const domain = normalizeDomain(email);
  if (!domain) return { domain: null, error: new Error('Invalid email') };

  const { data, error } = await supabase.from('verified_domains').select('*');
  if (error) return { domain: null, error };

  const match = data?.find((row: { domain: string }) => matchesDomain(domain, row.domain));
  return { domain: match || null, error: null };
};

export const sendVerificationOtp = async (email: string) => {
  return supabase.auth.signInWithOtp({ email });
};

export const verifyOtp = async (email: string, token: string) => {
  return supabase.auth.verifyOtp({ email, token, type: 'email' });
};

export const saveVerifiedEmail = async (
  userId: string,
  email: string,
  domain: string,
  tier: number,
) => {
  return supabase.from('verified_work_emails').insert({
    user_id: userId,
    email,
    domain,
    tier,
  });
};

export const createVerificationRequest = async (
  userId: string,
  method: 'EMAIL' | 'DOCUMENT' | 'STUDENT',
  documentUrl?: string,
) => {
  return supabase.from('verification_requests').insert({
    user_id: userId,
    method,
    document_url: documentUrl || null,
    status: 'PENDING',
  });
};

export const updateProfileVerificationStatus = async (
  userId: string,
  status: 'PENDING_VERIFICATION' | 'EMAIL_VERIFICATION_SENT' | 'REJECTED' | 'VERIFIED',
) => {
  return supabase.from('profiles').update({ verification_status: status }).eq('id', userId);
};
