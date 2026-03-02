/**
 * useAuth Hook
 *
 * Manages authentication state throughout the app
 */

import { useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { session } = await authService.getSession();

      if (mounted) {
        setState({
          user: session?.user ?? null,
          session,
          isLoading: false,
          isAuthenticated: !!session,
        });
      }
    };

    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setState({
            user: session?.user ?? null,
            session,
            isLoading: false,
            isAuthenticated: !!session,
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await authService.signInWithEmail(email, password);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await authService.signUpWithEmail(email, password);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await authService.signOut();
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  };
}

export default useAuth;
