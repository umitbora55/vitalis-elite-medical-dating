import { create } from 'zustand';
import { MOCK_SWIPE_HISTORY } from '../constants';
import { Match, SwipeHistoryItem } from '../types';

interface MatchState {
  matches: Match[];
  currentMatch: Match | null;
  activeChatMatch: Match | null;
  swipeHistory: SwipeHistoryItem[];
  dailyExtensions: number; // Free users: 1/day
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  removeMatch: (matchId: string) => void;
  updateMatch: (matchId: string, updates: Partial<Match>) => void;
  extendMatch: (matchId: string) => void;
  expireMatches: () => void;
  setCurrentMatch: (match: Match | null) => void;
  setActiveChatMatch: (match: Match | null) => void;
  setSwipeHistory: (history: SwipeHistoryItem[]) => void;
  addSwipeHistory: (item: SwipeHistoryItem) => void;
  resetDailyExtensions: () => void;
}

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  currentMatch: null,
  activeChatMatch: null,
  swipeHistory: MOCK_SWIPE_HISTORY,
  dailyExtensions: 0,
  setMatches: (matches) => set({ matches }),
  addMatch: (match) => set((state) => ({ matches: [match, ...state.matches] })),
  removeMatch: (matchId) =>
    set((state) => ({
      matches: state.matches.filter((m) => m.profile.id !== matchId),
    })),

  updateMatch: (matchId, updates) =>
    set((state) => ({
      matches: state.matches.map((m) =>
        m.profile.id === matchId ? { ...m, ...updates } : m
      ),
    })),

  extendMatch: (matchId) =>
    set((state) => ({
      dailyExtensions: state.dailyExtensions + 1,
      matches: state.matches.map((m) =>
        m.profile.id === matchId && m.expiresAt
          ? { ...m, expiresAt: m.expiresAt + TWELVE_HOURS, extended: true }
          : m
      ),
    })),

  expireMatches: () =>
    set((state) => {
      const now = Date.now();
      let changed = false;
      const updated = state.matches.map((m) => {
        if (m.expiresAt && m.expiresAt < now && m.isActive !== false) {
          changed = true;
          return { ...m, isActive: false, expiredReason: 'timeout' as const };
        }
        return m;
      });
      return changed ? { matches: updated } : state;
    }),

  setCurrentMatch: (currentMatch) => set({ currentMatch }),
  setActiveChatMatch: (activeChatMatch) => set({ activeChatMatch }),
  setSwipeHistory: (swipeHistory) => set({ swipeHistory }),
  addSwipeHistory: (item) =>
    set((state) => ({ swipeHistory: [item, ...state.swipeHistory] })),
  resetDailyExtensions: () => set({ dailyExtensions: 0 }),
}));
