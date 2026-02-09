import { create } from 'zustand';
import { DAILY_SWIPE_LIMIT } from '../constants';
import { FilterPreferences, Specialty, SwipeDirection } from '../types';

const defaultFilters: FilterPreferences = {
  ageRange: [24, 55],
  maxDistance: 100,
  specialties: Object.values(Specialty),
  showAvailableOnly: false,
};

interface DiscoveryState {
  swipedProfileIds: Set<string>;
  blockedProfileIds: Set<string>;
  dailySwipesRemaining: number;
  superLikesCount: number;
  swipeDirection: SwipeDirection | null;
  lastSwipedId: string | null;
  filters: FilterPreferences;
  setFilters: (filters: FilterPreferences) => void;
  setDailySwipesRemaining: (count: number) => void;
  setSwipedProfileIds: (ids: Set<string>) => void;
  setSwipeDirection: (direction: SwipeDirection | null) => void;
  setLastSwipedId: (id: string | null) => void;
  decrementSwipe: () => void;
  decrementSuperLike: () => void;
  addSwipedProfile: (profileId: string) => void;
  removeSwipedProfile: (profileId: string) => void;
  clearSwipedProfiles: () => void;
  addBlockedProfile: (profileId: string) => void;
  resetSwipes: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  swipedProfileIds: new Set(),
  blockedProfileIds: new Set(),
  dailySwipesRemaining: DAILY_SWIPE_LIMIT,
  superLikesCount: 5,
  swipeDirection: null,
  lastSwipedId: null,
  filters: defaultFilters,
  setFilters: (filters) => set({ filters }),
  setDailySwipesRemaining: (dailySwipesRemaining) => set({ dailySwipesRemaining }),
  setSwipedProfileIds: (swipedProfileIds) => set({ swipedProfileIds }),
  setSwipeDirection: (swipeDirection) => set({ swipeDirection }),
  setLastSwipedId: (lastSwipedId) => set({ lastSwipedId }),
  decrementSwipe: () =>
    set((state) => ({
      dailySwipesRemaining: Math.max(0, state.dailySwipesRemaining - 1),
    })),
  decrementSuperLike: () =>
    set((state) => ({
      superLikesCount: Math.max(0, state.superLikesCount - 1),
    })),
  addSwipedProfile: (profileId) =>
    set((state) => {
      const next = new Set(state.swipedProfileIds);
      next.add(profileId);
      return { swipedProfileIds: next };
    }),
  removeSwipedProfile: (profileId) =>
    set((state) => {
      const next = new Set(state.swipedProfileIds);
      next.delete(profileId);
      return { swipedProfileIds: next };
    }),
  clearSwipedProfiles: () => set({ swipedProfileIds: new Set() }),
  addBlockedProfile: (profileId) =>
    set((state) => {
      const next = new Set(state.blockedProfileIds);
      next.add(profileId);
      return { blockedProfileIds: next };
    }),
  resetSwipes: () =>
    set({
      dailySwipesRemaining: DAILY_SWIPE_LIMIT,
      swipedProfileIds: new Set(),
      lastSwipedId: null,
    }),
}));
