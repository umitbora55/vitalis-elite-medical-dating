import React, { useState, useMemo, useEffect } from 'react';
import { Match, Profile, MatchSortOption } from '../types';
import { MessageCircle, Search, ArrowUpDown, Check, Clock, Zap, Timer, Stethoscope } from 'lucide-react';
import { calculateCompatibility } from '../utils/compatibility';
import { USER_PROFILE } from '../constants'; // Import current user for compatibility calc

interface MatchesViewProps {
  matches: Match[];
  onMatchSelect: (match: Match) => void;
  onExtendMatch?: (matchId: string) => void;
  isPremium?: boolean;
  dailyExtensions?: number;
}

/** Human-readable time remaining */
function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Süre doldu';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const h = hours % 24;
    return `${days}g ${h}s`;
  }
  if (hours > 0) return `${hours}s ${minutes}dk`;
  return `${minutes}dk`;
}

/** Progress ratio 0→1 where 1 = full time, 0 = expired */
function getTimerProgress(match: Match): number {
  if (!match.expiresAt) return 1;
  const total = match.expiresAt - match.timestamp;
  const remaining = match.expiresAt - Date.now();
  if (remaining <= 0) return 0;
  return Math.min(1, remaining / total);
}

/** Progress bar colour: green → orange → red */
function getTimerColor(progress: number): string {
  if (progress > 0.5) return 'bg-emerald-500';
  if (progress > 0.2) return 'bg-orange-500';
  return 'bg-red-500';
}

const MatchesViewComponent: React.FC<MatchesViewProps> = ({
  matches,
  onMatchSelect,
  onExtendMatch,
  isPremium = false,
  dailyExtensions = 0,
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

  const formatMatchTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return `Yesterday`;
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `Long time ago`;
  };

  const getStatusColor = (profile: Profile) => {
    if (profile.isOnlineHidden) return 'bg-slate-500';
    const diff = Date.now() - profile.lastActive;
    if (diff < 15 * 60 * 1000) return 'bg-green-500';
    if (diff < 24 * 60 * 60 * 1000) return 'bg-orange-500';
    return 'bg-slate-500';
  };

  const canExtend = (match: Match): boolean => {
    if (!match.expiresAt || !match.isActive) return false;
    if (match.extended && !isPremium) return false; // Free users: 1 per match
    if (!isPremium && dailyExtensions >= 1) return false; // Free users: 1/day
    return true;
  };

  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-4 flex flex-col">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-2xl font-serif text-white">Matches</h2>
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
            placeholder="Search by name, role or specialty..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-300 focus:outline-none focus:border-gold-500/50 transition-all placeholder:text-slate-600"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className="h-full px-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
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

      <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pb-20">
        {sortedMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] opacity-50 space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <MessageCircle size={32} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-serif text-lg mb-1">No matches found</p>
              <p className="text-slate-500 text-sm max-w-[200px]">
                {searchQuery ? "Try adjusting your search criteria." : "Profiles you like will appear here once they like you back."}
              </p>
            </div>
          </div>
        ) : (
          sortedMatches.map((match) => {
            const isNew = Date.now() - match.timestamp < 24 * 60 * 60 * 1000;
            const timeString = formatMatchTime(match.timestamp);
            const timerProgress = getTimerProgress(match);
            const hasTimer = match.expiresAt != null && !match.firstMessageSentAt;
            const timeLeft = hasTimer ? match.expiresAt! - Date.now() : 0;
            const isUrgent = hasTimer && timeLeft < 3 * 3_600_000; // < 3 hours

            return (
              <div
                key={match.profile.id + '-' + match.timestamp}
                className="group relative"
              >
                <div
                  onClick={() => onMatchSelect(match)}
                  className="flex items-center gap-4 p-4 bg-slate-900/50 hover:bg-slate-900 rounded-2xl border border-slate-800/50 hover:border-gold-500/30 transition-all cursor-pointer relative overflow-hidden"
                >
                  {/* Timer Progress Bar */}
                  {hasTimer && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                      <div
                        className={`h-full ${getTimerColor(timerProgress)} transition-all duration-1000 ease-linear`}
                        style={{ width: `${timerProgress * 100}%` }}
                      />
                    </div>
                  )}

                  {/* New Badge */}
                  {isNew && (
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-br-lg shadow-sm animate-pulse">
                      NEW
                    </div>
                  )}

                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-gold-500 transition-colors">
                      <img src={match.profile.images[0]} alt={match.profile.name} className="w-full h-full object-cover" />
                    </div>
                    {/* Status Indicator */}
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${getStatusColor(match.profile)} border-2 border-slate-900 rounded-full`}></div>
                    {/* On-Call Icon */}
                    {match.profile.isOnCall && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 border-2 border-slate-900 rounded-full flex items-center justify-center" title="Nöbette">
                        <Stethoscope size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-100 truncate text-lg">{match.profile.name}</h3>
                        {/* Quick Reply Badge */}
                        {match.profile.quickReplyBadge && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5" title="Hızlı Yanıt">
                            <Zap size={10} />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gold-500 uppercase font-bold tracking-wide">{match.profile.specialty}</p>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-sm text-slate-400 truncate group-hover:text-slate-300 transition-colors max-w-[140px]">
                        {match.lastMessage || "Tap to start chatting"}
                      </p>
                      {hasTimer ? (
                        <span className={`text-[10px] font-bold whitespace-nowrap flex items-center gap-1 ${isUrgent ? 'text-red-400' : 'text-orange-400/70'}`}>
                          <Timer size={10} />
                          {formatTimeLeft(timeLeft)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-green-500/70 font-medium whitespace-nowrap">
                          Matched {timeString} 💚
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extend Button */}
                {hasTimer && canExtend(match) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExtendMatch?.(match.profile.id);
                    }}
                    className="absolute top-2 right-2 z-10 bg-slate-800/90 hover:bg-gold-600/20 border border-slate-700 hover:border-gold-500/50 text-slate-400 hover:text-gold-400 text-[9px] font-bold uppercase px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                    title="Süreyi 12 saat uzat"
                  >
                    <Clock size={10} /> Uzat
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};

export const MatchesView = React.memo(MatchesViewComponent);
