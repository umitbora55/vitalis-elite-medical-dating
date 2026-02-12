import { create } from 'zustand';
import { USER_PROFILE as INITIAL_USER_PROFILE } from '../constants';
import { PremiumTier, Profile } from '../types';

interface UserState {
  profile: Profile;
  isPremium: boolean;
  premiumTier: PremiumTier;
  setProfile: (profile: Profile) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  setPremium: (isPremium: boolean, tier?: PremiumTier) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: INITIAL_USER_PROFILE,
  isPremium: false,
  premiumTier: 'FREE',
  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) =>
    set((state) => ({
      profile: { ...state.profile, ...updates },
    })),
  setPremium: (isPremium, tier = 'FREE') => set({ isPremium, premiumTier: tier }),
}));
