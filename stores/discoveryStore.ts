import { create } from 'zustand';
import { DAILY_SWIPE_LIMIT } from '../constants';
import { FilterPreferences, Profile, Specialty, SwipeDirection } from '../types';
import { fetchDiscoveryProfiles } from '../services/discoveryService';

const defaultFilters: FilterPreferences = {
  ageRange: [24, 55],
  maxDistance: 100,
  specialties: Object.values(Specialty),
  showAvailableOnly: false,
};

interface DiscoveryState {
  // Real profiles fetched from Supabase
  profiles: Profile[];
  isLoading: boolean;
  fetchError: string | null;
  hasMore: boolean;

  swipedProfileIds: Set<string>;
  blockedProfileIds: Set<string>;
  dailySwipesRemaining: number;
  superLikesCount: number;
  swipeDirection: SwipeDirection | null;
  lastSwipedId: string | null;
  filters: FilterPreferences;

  // Actions
  fetchProfiles: () => Promise<void>;
  loadMoreProfiles: () => Promise<void>;
  removeProfile: (profileId: string) => void;
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

const PAGE_SIZE = 20;

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  profiles: [],
  isLoading: false,
  fetchError: null,
  hasMore: true,

  swipedProfileIds: new Set(),
  blockedProfileIds: new Set(),
  dailySwipesRemaining: DAILY_SWIPE_LIMIT,
  superLikesCount: 5,
  swipeDirection: null,
  lastSwipedId: null,
  filters: defaultFilters,

  fetchProfiles: async () => {
    const { filters, isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true, fetchError: null });
    const { profiles, error } = await fetchDiscoveryProfiles(filters, PAGE_SIZE, 0);
    set({
      profiles,
      isLoading: false,
      fetchError: error?.message || null,
      hasMore: profiles.length >= PAGE_SIZE,
    });
  },

  loadMoreProfiles: async () => {
    const { filters, profiles, isLoading, hasMore } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    const { profiles: more, error } = await fetchDiscoveryProfiles(filters, PAGE_SIZE, profiles.length);
    set((state) => ({
      profiles: [...state.profiles, ...more],
      isLoading: false,
      fetchError: error?.message || null,
      hasMore: more.length >= PAGE_SIZE,
    }));
  },

  removeProfile: (profileId) =>
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== profileId),
    })),

  setFilters: (filters) => {
    set({ filters });
    // Re-fetch when filters change
    get().fetchProfiles();
  },
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
