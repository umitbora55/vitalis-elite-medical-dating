import { supabase } from '../src/lib/supabase';
import type { Provider } from '@supabase/supabase-js';

export const signInWithOAuth = async (provider: Provider) => {
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
};

export const signInWithMagicLink = async (email: string) => {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
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
