/**
 * ClubCard
 *
 * Feature 6: Health Social Clubs
 * Compact club list item with category icon and member count.
 */

import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { Club, ClubCategory } from '../types';

interface ClubCardProps {
  club:     Club;
  userId:   string;
  onSelect: (club: Club) => void;
}

const CATEGORY_CONFIG: Record<ClubCategory, { label: string; emoji: string; color: string }> = {
  running:   { label: 'Koşu',       emoji: '🏃', color: 'bg-orange-500/15 border-orange-500/20 text-orange-400' },
  cycling:   { label: 'Bisiklet',   emoji: '🚴', color: 'bg-yellow-500/15 border-yellow-500/20 text-yellow-400' },
  yoga:      { label: 'Yoga',       emoji: '🧘', color: 'bg-purple-500/15 border-purple-500/20 text-purple-400' },
  nutrition: { label: 'Beslenme',   emoji: '🥗', color: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' },
  research:  { label: 'Araştırma',  emoji: '🔬', color: 'bg-blue-500/15 border-blue-500/20 text-blue-400' },
  social:    { label: 'Sosyal',     emoji: '☕', color: 'bg-amber-500/15 border-amber-500/20 text-amber-400' },
};

export const ClubCard: React.FC<ClubCardProps> = ({ club, onSelect }) => {
  const cfg = CATEGORY_CONFIG[club.category];

  return (
    <button
      type="button"
      onClick={() => onSelect(club)}
      className="w-full flex items-center gap-3 px-4 py-4 border-b border-slate-800/50 text-left hover:bg-slate-800/30 transition-all"
    >
      {/* Category Icon */}
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg flex-shrink-0 ${cfg.color}`}>
        {cfg.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-white truncate">{club.name}</p>
          {club.is_member && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/20 text-gold-400">
              Üye
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-slate-500">·</span>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Users size={10} />
            <span>{club.member_count ?? 0} / {club.max_members}</span>
          </div>
          {club.city && (
            <>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-500 truncate">{club.city}</span>
            </>
          )}
        </div>
        {club.description && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{club.description}</p>
        )}
      </div>

      <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
    </button>
  );
};
