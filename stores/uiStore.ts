import { create } from 'zustand';
import { Profile } from '../types';

export type ViewType =
  | 'home'
  | 'profile'
  | 'matches'
  | 'notifications'
  | 'likesYou'
  | 'premium'
  | 'history'
  | 'nearby';

interface UiState {
  currentView: ViewType;
  isFilterOpen: boolean;
  viewingProfile: Profile | null;
  viewingStoryProfile: Profile | null;
  setCurrentView: (view: ViewType) => void;
  setIsFilterOpen: (open: boolean) => void;
  setViewingProfile: (profile: Profile | null) => void;
  setViewingStoryProfile: (profile: Profile | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentView: 'home',
  isFilterOpen: false,
  viewingProfile: null,
  viewingStoryProfile: null,
  setCurrentView: (currentView) => set({ currentView }),
  setIsFilterOpen: (isFilterOpen) => set({ isFilterOpen }),
  setViewingProfile: (viewingProfile) => set({ viewingProfile }),
  setViewingStoryProfile: (viewingStoryProfile) => set({ viewingStoryProfile }),
}));
