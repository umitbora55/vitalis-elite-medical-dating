import { create } from 'zustand';
import { USER_PROFILE as INITIAL_USER_PROFILE } from '../constants';
import { Profile } from '../types';

interface UserState {
  profile: Profile;
  isPremium: boolean;
  setProfile: (profile: Profile) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  setPremium: (isPremium: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: INITIAL_USER_PROFILE,
  isPremium: false,
  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) =>
    set((state) => ({
      profile: { ...state.profile, ...updates },
    })),
  setPremium: (isPremium) => set({ isPremium }),
}));
