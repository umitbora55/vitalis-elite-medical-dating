/**
 * VITALIS Slate Store — Özellik 3: Sınırlı Günlük Öneri Sistemi
 *
 * Cross-component state for the daily recommendation slate.
 * Kept intentionally lean: heavy business logic lives in slateService.ts.
 *
 * Used by:
 *  • DailyPicksView  — primary consumer
 *  • Tab bar badge   — reads pendingMatchCount
 *  • Navigation CTA  — reads isSlateComplete
 */

import { create } from 'zustand';
import type { DailySlate, SlateViewMode, SlateSessionStats } from '../types';

interface SlateState {
  // ── Data ────────────────────────────────────────────────────────────────────
  slate:             DailySlate | null;
  /** 0-indexed position of the card the user is currently looking at */
  currentIndex:      number;
  /** Running stats for the "done" screen */
  sessionStats:      SlateSessionStats;

  // ── UI ──────────────────────────────────────────────────────────────────────
  viewMode:          SlateViewMode;
  isLoading:         boolean;
  error:             string | null;
  /** Name of the person the user just matched with (triggers overlay) */
  matchedName:       string | null;

  // ── Computed helpers (derived from slate, kept here for convenience) ────────
  pendingMatchCount: number;
  isSlateComplete:   boolean;
  isBonusAvailable:  boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Replace entire slate (called after slateService.getTodaySlate()) */
  setSlate:          (slate: DailySlate) => void;

  /** Advance card view to next unseen profile */
  advanceToNext:     () => void;

  /** Called when a like results in a match */
  setMatchedName:    (name: string | null) => void;

  /** Toggle between 'card' and 'grid' display modes */
  setViewMode:       (mode: SlateViewMode) => void;

  setIsLoading:      (loading: boolean) => void;
  setError:          (err: string | null) => void;

  /** Append bonus profiles to existing slate */
  addBonusProfiles:  (slate: DailySlate) => void;

  /** Full reset – e.g. on sign-out or new day */
  reset:             () => void;
}

const INITIAL_SESSION_STATS: SlateSessionStats = {
  likesSent:     0,
  passesDone:    0,
  matchesGained: 0,
};

export const useSlateStore = create<SlateState>((set, get) => ({
  slate:             null,
  currentIndex:      0,
  sessionStats:      INITIAL_SESSION_STATS,
  viewMode:          'card',
  isLoading:         false,
  error:             null,
  matchedName:       null,
  pendingMatchCount: 0,
  isSlateComplete:   false,
  isBonusAvailable:  false,

  setSlate: (slate) => {
    // Find the first unseen index
    const firstUnseen = slate.profiles.findIndex((p) => p.status === 'unseen');
    const currentIndex = firstUnseen === -1 ? slate.profiles.length : firstUnseen;

    set({
      slate,
      currentIndex,
      pendingMatchCount: slate.pendingMatchCount,
      isSlateComplete:   slate.remainingCount === 0,
      isBonusAvailable:  slate.remainingCount === 0 && !slate.bonusUsed,
    });
  },

  advanceToNext: () => {
    const { slate, currentIndex, sessionStats } = get();
    if (!slate) return;

    const nextIndex = currentIndex + 1;
    const isNowComplete = nextIndex >= slate.profiles.length;

    // Count likes/passes from current card
    const card = slate.profiles[currentIndex];
    const newStats: SlateSessionStats = { ...sessionStats };
    if (card?.status === 'liked')  newStats.likesSent++;
    if (card?.status === 'passed') newStats.passesDone++;

    set({
      currentIndex: nextIndex,
      sessionStats: newStats,
      isSlateComplete: isNowComplete,
      isBonusAvailable: isNowComplete && !slate.bonusUsed,
    });
  },

  setMatchedName: (name) => {
    set({ matchedName: name });
    if (name !== null) {
      set((s) => ({
        sessionStats: {
          ...s.sessionStats,
          matchesGained: s.sessionStats.matchesGained + 1,
        },
      }));
    }
  },

  setViewMode:  (viewMode)  => set({ viewMode }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError:     (error)     => set({ error }),

  addBonusProfiles: (updatedSlate) => {
    set({
      slate:           updatedSlate,
      isSlateComplete: false,
      isBonusAvailable: false,
    });
  },

  reset: () =>
    set({
      slate:             null,
      currentIndex:      0,
      sessionStats:      INITIAL_SESSION_STATS,
      viewMode:          'card',
      isLoading:         false,
      error:             null,
      matchedName:       null,
      pendingMatchCount: 0,
      isSlateComplete:   false,
      isBonusAvailable:  false,
    }),
}));
