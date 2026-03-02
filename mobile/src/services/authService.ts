/**
 * Auth Service - Mobile
 *
 * Handles authentication with Supabase
 */

import { supabase } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export const authService = {
  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get current session
   */
  async getSession(): Promise<{ session: Session | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  /**
   * Get current user
   */
  async getUser(): Promise<{ user: User | null; error: AuthError | null }> {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};

export default authService;
