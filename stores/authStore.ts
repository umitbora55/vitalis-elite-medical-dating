import { create } from 'zustand';

export type AuthStep = 'LANDING' | 'REGISTRATION' | 'ONBOARDING' | 'APP';

interface AuthState {
  authStep: AuthStep;
  setAuthStep: (step: AuthStep) => void;
  resetAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authStep: 'LANDING',
  setAuthStep: (authStep) => set({ authStep }),
  resetAuth: () => set({ authStep: 'LANDING' }),
}));
