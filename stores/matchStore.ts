import { create } from 'zustand';
import { MOCK_SWIPE_HISTORY } from '../constants';
import { Match, SwipeHistoryItem } from '../types';

interface MatchState {
  matches: Match[];
  currentMatch: Match | null;
  activeChatMatch: Match | null;
  swipeHistory: SwipeHistoryItem[];
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  removeMatch: (matchId: string) => void;
  setCurrentMatch: (match: Match | null) => void;
  setActiveChatMatch: (match: Match | null) => void;
  setSwipeHistory: (history: SwipeHistoryItem[]) => void;
  addSwipeHistory: (item: SwipeHistoryItem) => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  matches: [],
  currentMatch: null,
  activeChatMatch: null,
  swipeHistory: MOCK_SWIPE_HISTORY,
  setMatches: (matches) => set({ matches }),
  addMatch: (match) => set((state) => ({ matches: [match, ...state.matches] })),
  removeMatch: (matchId) =>
    set((state) => ({
      matches: state.matches.filter((m) => m.profile.id !== matchId),
    })),
  setCurrentMatch: (currentMatch) => set({ currentMatch }),
  setActiveChatMatch: (activeChatMatch) => set({ activeChatMatch }),
  setSwipeHistory: (swipeHistory) => set({ swipeHistory }),
  addSwipeHistory: (item) =>
    set((state) => ({ swipeHistory: [item, ...state.swipeHistory] })),
}));
