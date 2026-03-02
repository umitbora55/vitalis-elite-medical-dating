import React, { useState, useMemo, useEffect } from 'react';
import { Match, Profile, MatchSortOption } from '../types';
import { MessageCircle, Search, ArrowUpDown, Check, Stethoscope } from 'lucide-react';
import { calculateCompatibility } from '../utils/compatibility';
import { USER_PROFILE } from '../constants';
import { MatchCardSkeleton } from './LoadingSpinner';

interface MatchesViewProps {
  matches: Match[];
  onMatchSelect: (match: Match) => void;
  onExtendMatch?: (matchId: string) => void;
  isPremium?: boolean;
  dailyExtensions?: number;
  isLoading?: boolean;
}



/** Progress ratio 0→1 where 1 = full time, 0 = expired */
function getTimerProgress(match: Match): number {
  if (!match.expiresAt) return 1;
  const total = match.expiresAt - match.timestamp;
  const remaining = match.expiresAt - Date.now();
  if (remaining <= 0) return 0;
  return Math.min(1, remaining / total);
}




const MatchesViewComponent: React.FC<MatchesViewProps> = ({
  matches,
  onMatchSelect,
  isLoading = false,
}) => {
  const [sortOption, setSortOption] = useState<MatchSortOption>(MatchSortOption.NEWEST);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);

  // Force re-render every 30s for live countdowns
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Filter out expired / inactive matches, plus search
  const filteredMatches = useMemo(() => {
    let filtered = matches.filter((m) => m.isActive !== false);

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(match =>
        match.profile.name.toLowerCase().includes(lowerQuery) ||
        match.profile.specialty.toLowerCase().includes(lowerQuery) ||
        match.profile.role.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }, [matches, searchQuery]);

  const sortedMatches = useMemo(() => {
    let sorted = [...filteredMatches];
    switch (sortOption) {
      case MatchSortOption.NEWEST:
        sorted.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case MatchSortOption.ALPHABETICAL:
        sorted.sort((a, b) => a.profile.name.localeCompare(b.profile.name));
        break;
      case MatchSortOption.LAST_MESSAGE:
        sorted.sort((a, b) => {
          if (a.lastMessage && !b.lastMessage) return -1;
          if (!a.lastMessage && b.lastMessage) return 1;
          return b.timestamp - a.timestamp;
        });
        break;
      case MatchSortOption.COMPATIBLE:
        sorted.sort((a, b) => {
          const scoreA = calculateCompatibility(USER_PROFILE, a.profile).score;
          const scoreB = calculateCompatibility(USER_PROFILE, b.profile).score;
          return scoreB - scoreA;
        });
        break;
    }
    return sorted;
  }, [filteredMatches, sortOption]);

  const sortLabels = {
    [MatchSortOption.NEWEST]: "Newest Matches",
    [MatchSortOption.ALPHABETICAL]: "Alphabetical",
    [MatchSortOption.LAST_MESSAGE]: "Recent Activity",
    [MatchSortOption.COMPATIBLE]: "Most Compatible"
  };



  const getStatusColor = (profile: Profile) => {
    if (profile.isOnlineHidden) return 'bg-slate-500';
    const diff = Date.now() - profile.lastActive;
    if (diff < 15 * 60 * 1000) return 'bg-green-500';
    if (diff < 24 * 60 * 60 * 1000) return 'bg-orange-500';
    return 'bg-slate-500';
  };



  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-4 flex flex-col">
      {/* Dark Mode Fix (Agent 11): Use dark: prefix for theme-aware colors */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-2xl font-serif text-slate-900 dark:text-white">Matches</h2>
        <span className="text-xs font-bold text-gold-500 bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/20">
          {filteredMatches.length} CONNECTIONS
        </span>
      </div>

      {/* Controls: Search & Sort */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search matches..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-300 focus:outline-none focus:border-gold-500/50 transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Touch Target Fix (Agent 01): Minimum 44px touch area */}
        <div className="relative">
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            aria-label="Sort matches"
            aria-expanded={isSortMenuOpen}
            aria-haspopup="listbox"
            className="h-11 w-11 bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-200 dark:hover:text-white hover:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <ArrowUpDown size={18} />
          </button>

          {isSortMenuOpen && (
            <div className="absolute top-12 right-0 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in">
              {Object.values(MatchSortOption).map((option) => (
                <button
                  key={option}
                  onClick={() => { setSortOption(option); setIsSortMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-wide flex justify-between items-center hover:bg-slate-800 transition-colors ${sortOption === option ? 'text-gold-500' : 'text-slate-400'}`}
                >
                  {sortLabels[option]}
                  {sortOption === option && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-20 space-y-8">
        {/* Loading State with Skeleton */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="h-4 w-32 bg-slate-800 rounded animate-pulse mx-2" />
              <div className="flex gap-4 overflow-x-hidden pb-4 px-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-shrink-0 w-24 flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 animate-pulse" />
                    <div className="w-16 h-3 bg-slate-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 w-24 bg-slate-800 rounded animate-pulse mx-2" />
              {[1, 2, 3, 4, 5].map((i) => (
                <MatchCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : sortedMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[40vh] opacity-50 space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <MessageCircle size={32} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-serif text-lg mb-1">No matches found</p>
              <p className="text-slate-500 text-sm max-w-[200px]">
                {searchQuery ? "Try adjusting your search criteria." : "Start swiping to find your match!"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 1: NEW MATCHES (Horizontal Scroll) */}
            {sortedMatches.some(m => !m.lastMessage) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gold-500 uppercase tracking-wider px-2">New Connections</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar px-2 snap-x">
                  {sortedMatches.filter(m => !m.lastMessage).map((match) => {
                    const timerProgress = getTimerProgress(match);
                    // Map bg- color to border- color approximately
                    let borderColor = 'border-gold-500/30';
                    if (timerProgress < 0.2) borderColor = 'border-red-500';
                    else if (timerProgress < 0.5) borderColor = 'border-orange-500';

                    return (
                      <div
                        key={match.profile.id}
                        onClick={() => onMatchSelect(match)}
                        className="snap-start flex-shrink-0 w-24 flex flex-col items-center gap-2 group cursor-pointer"
                      >
                        <div className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 ${borderColor} group-hover:border-gold-500 transition-all shadow-lg group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]`}>
                          <img src={match.profile.images[0]} alt={match.profile.name} className="w-full h-full object-cover" loading="lazy" />
                          {/* Status Dot */}
                          <div className={`absolute bottom-1 right-1 w-3 h-3 ${getStatusColor(match.profile)} border-2 border-slate-900 rounded-full`}></div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-200 truncate w-full">{match.profile.name}</p>
                          {/* New Badge */}
                          <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: MESSAGES (Vertical List) */}
            {sortedMatches.some(m => !!m.lastMessage) && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Messages</h3>
                <div className="space-y-2">
                  {sortedMatches.filter(m => !!m.lastMessage).map((match) => {
                    // Only need timeString for Messages view
                    const isNew = Date.now() - match.timestamp < 24 * 60 * 60 * 1000;

                    return (
                      <div
                        key={match.profile.id}
                        onClick={() => onMatchSelect(match)}
                        className="flex items-center gap-4 p-3 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl border border-transparent hover:border-slate-700 transition-all cursor-pointer group"
                      >
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-700 group-hover:border-slate-500 transition-colors">
                            <img src={match.profile.images[0]} alt={match.profile.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          {match.profile.isOnCall && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 border border-slate-900 rounded-full flex items-center justify-center">
                              <Stethoscope size={8} className="text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className="font-bold text-slate-200 truncate">{match.profile.name}</h4>
                            <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className={`text-xs truncate max-w-[160px] transition-colors ${isNew ? 'text-slate-200 font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                              {match.lastMessage}
                            </p>
                            {/* Unread indicator could go here */}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const MatchesView = React.memo(MatchesViewComponent);
