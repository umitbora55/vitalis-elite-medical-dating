import React, { useState, useMemo } from 'react';
import { SwipeHistoryItem, Profile } from '../types';
import { RotateCcw, Clock, Heart, X, Star, Filter, Lock, Crown } from 'lucide-react';

interface SwipeHistoryViewProps {
  history: SwipeHistoryItem[];
  isPremium: boolean;
  onUpgradeClick: () => void;
  onUndoSwipe: (item: SwipeHistoryItem) => void;
  onViewProfile: (profile: Profile) => void;
}

type FilterType = 'ALL' | 'LIKES' | 'PASSES';
type TimeFilter = 'ALL' | '24H' | 'WEEK' | 'MONTH';

const SwipeHistoryViewComponent: React.FC<SwipeHistoryViewProps> = ({ 
    history, 
    isPremium, 
    onUpgradeClick,
    onUndoSwipe,
    onViewProfile
}) => {
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const filteredHistory = useMemo(() => {
      let filtered = history;

      // Type Filter
      if (filterType === 'LIKES') {
          filtered = filtered.filter(item => item.action === 'LIKE' || item.action === 'SUPER_LIKE');
      } else if (filterType === 'PASSES') {
          filtered = filtered.filter(item => item.action === 'PASS');
      }

      // Time Filter
      const now = Date.now();
      if (timeFilter === '24H') {
          filtered = filtered.filter(item => now - item.timestamp < 24 * 60 * 60 * 1000);
      } else if (timeFilter === 'WEEK') {
          filtered = filtered.filter(item => now - item.timestamp < 7 * 24 * 60 * 60 * 1000);
      } else if (timeFilter === 'MONTH') {
          filtered = filtered.filter(item => now - item.timestamp < 30 * 24 * 60 * 60 * 1000);
      }

      return filtered;
  }, [history, filterType, timeFilter]);

  if (!isPremium) {
      return (
          <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-4 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-2xl font-serif text-white flex items-center gap-2">
                      <Clock size={24} className="text-gold-500" /> Swipe History
                  </h2>
              </div>

              {/* Blurred Content */}
              <div className="flex-1 space-y-3 blur-sm pointer-events-none opacity-50">
                  {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-slate-900 rounded-xl border border-slate-800">
                          <div className="w-12 h-12 rounded-full bg-slate-700"></div>
                          <div className="flex-1 h-4 bg-slate-700 rounded w-1/2"></div>
                          <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                      </div>
                  ))}
              </div>

              {/* Premium Lock Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-950/60 via-slate-900/90 to-slate-950">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border border-gold-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                      <Lock size={32} className="text-gold-500" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-white text-center mb-3">
                      Review Your Choices
                  </h2>
                  <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed max-w-xs">
                      Did you accidentally pass on someone special? Unlock Swipe History to revisit your last 50 decisions and change your mind.
                  </p>
                  <button 
                      onClick={onUpgradeClick}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 text-slate-950 font-bold uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                  >
                      <Crown size={20} /> Unlock History
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-2xl font-serif text-white flex items-center gap-2">
                <Clock size={24} className="text-gold-500" /> Swipe History
            </h2>
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                Last 50 Actions
            </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-2">
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                {(['ALL', 'LIKES', 'PASSES'] as FilterType[]).map((ft) => (
                    <button
                        key={ft}
                        onClick={() => setFilterType(ft)}
                        className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                            filterType === ft ? 'bg-gold-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        {ft}
                    </button>
                ))}
            </div>
            
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 ml-auto">
                 <select 
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                    className="bg-transparent text-[10px] font-bold text-slate-400 focus:outline-none uppercase px-2"
                 >
                     <option value="ALL">Any Time</option>
                     <option value="24H">Last 24h</option>
                     <option value="WEEK">Last Week</option>
                     <option value="MONTH">Last Month</option>
                 </select>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pb-20">
            {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                    <Filter size={32} className="text-slate-500 mb-2" />
                    <p className="text-sm text-slate-400">No history found with these filters.</p>
                </div>
            ) : (
                filteredHistory.map((item) => (
                    <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-900 rounded-xl border border-slate-800 transition-colors group relative"
                    >
                        {/* Profile Image */}
                        <div 
                            className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-700 cursor-pointer"
                            onClick={() => onViewProfile(item.profile)}
                        >
                            <img src={item.profile.images[0]} alt={item.profile.name} className="w-full h-full object-cover" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0" onClick={() => onViewProfile(item.profile)}>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-200 text-sm truncate">{item.profile.name}, {item.profile.age}</h3>
                                {item.action === 'LIKE' && <Heart size={12} className="text-green-500 fill-green-500" />}
                                {item.action === 'SUPER_LIKE' && <Star size={12} className="text-blue-500 fill-blue-500" />}
                                {item.action === 'PASS' && <X size={12} className="text-red-500" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">{item.profile.specialty}</p>
                                <span className="text-[10px] text-slate-600">•</span>
                                <span className="text-[10px] text-slate-500">{formatTime(item.timestamp)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {item.action === 'PASS' ? (
                                <button 
                                    onClick={() => onUndoSwipe(item)}
                                    className="p-2 rounded-full bg-slate-800 text-green-500 hover:bg-green-500 hover:text-white transition-colors border border-slate-700"
                                    title="Re-Like"
                                >
                                    <Heart size={16} />
                                </button>
                            ) : (
                                <button 
                                    onClick={() => onUndoSwipe(item)}
                                    className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-colors border border-slate-700"
                                    title="Undo Like"
                                >
                                    <RotateCcw size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export const SwipeHistoryView = React.memo(SwipeHistoryViewComponent);
