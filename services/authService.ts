import { supabase } from '../src/lib/supabase';
import type { Provider } from '@supabase/supabase-js';

// ISSUE-W005 Fix: Proper OAuth redirect URL with auth callback path
const getAuthRedirectUrl = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/auth/callback`;
};

export const signInWithOAuth = async (provider: Provider) => {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });
};

export const signInWithMagicLink = async (email: string) => {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
};

export const signUpWithEmail = async (email: string, password: string, metadata?: Record<string, unknown>) => {
  return supabase.auth.signUp({
    email,
    password,
    options: metadata ? { data: metadata } : undefined,
  });
};

export const signInWithEmail = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  // AUDIT-FIX: SEC-006 — Clear persisted state on sign-out to prevent data leakage
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
  return supabase.auth.signOut();
};

export const getSession = async () => {
  return supabase.auth.getSession();
};

export const onAuthStateChange = (
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0],
) => {
  return supabase.auth.onAuthStateChange(callback);
};

// ISSUE-W007 Fix: Password Reset Functions
export const resetPassword = async (email: string) => {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAuthRedirectUrl()}?type=recovery`,
  });
};

export const updatePassword = async (newPassword: string) => {
  return supabase.auth.updateUser({ password: newPassword });
};

// Get current user
export const getCurrentUser = async () => {
  return supabase.auth.getUser();
};
