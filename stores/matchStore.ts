import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Match, SwipeHistoryItem, Message } from '../types';

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
  addMessage: (matchId: string, message: Message) => void;
  extendMatch: (matchId: string) => void;
  expireMatches: () => void;
  setCurrentMatch: (match: Match | null) => void;
  setActiveChatMatch: (match: Match | null) => void;
  setSwipeHistory: (history: SwipeHistoryItem[]) => void;
  addSwipeHistory: (item: SwipeHistoryItem) => void;
  resetDailyExtensions: () => void;
}

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export const useMatchStore = create<MatchState>()(
  persist(
    (set) => ({
      matches: [],
      currentMatch: null,
      activeChatMatch: null,
      swipeHistory: [],
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
          // Also update activeChatMatch if it's the one being modified
          activeChatMatch: state.activeChatMatch?.profile.id === matchId
            ? { ...state.activeChatMatch, ...updates }
            : state.activeChatMatch
        })),

      addMessage: (matchId, message) =>
        set((state) => {
          const updatedMatches = state.matches.map((m) => {
            if (m.profile.id === matchId) {
              const existingMessages = m.messages || [];
              const updatedMatch = {
                ...m,
                messages: [...existingMessages, message],
                lastMessage: message.imageUrl ? '📷 Photo' : (message.audioUrl ? '🎤 Voice' : message.text),
                timestamp: message.timestamp // Update timestamp to bring to top
              };
              return updatedMatch;
            }
            return m;
          });

          return {
            matches: updatedMatches,
            // Update active chat match if needed so UI reflects new message immediately
            activeChatMatch: state.activeChatMatch?.profile.id === matchId
              ? {
                ...state.activeChatMatch,
                messages: [...(state.activeChatMatch.messages || []), message],
                lastMessage: message.imageUrl ? '📷 Photo' : (message.audioUrl ? '🎤 Voice' : message.text),
                timestamp: message.timestamp
              }
              : state.activeChatMatch
          };
        }),

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
    }),
    {
      name: 'match-storage',
      storage: createJSONStorage(() => sessionStorage), // AUDIT-FIX BE-030: sessionStorage clears on tab close
      // AUDIT-FIX BE-030: Removed `matches` and `swipeHistory` from persistence.
      // - matches: contains full Profile objects (name, photos, bio) + Message history → PII
      // - swipeHistory: contains Profile objects → PII
      // Both should be fetched from the server on session start, not cached locally.
      // Only non-PII counters are persisted (dailyExtensions resets server-side anyway).
      partialize: (state): Partial<MatchState> => ({
        dailyExtensions: state.dailyExtensions,
      }),
    }
  )
);
