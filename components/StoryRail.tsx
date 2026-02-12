import React from 'react';
import { Match, Profile } from '../types';
import { Plus } from 'lucide-react';

interface StoryRailProps {
  currentUser: Profile;
  matches: Match[];
  onAddStory: () => void;
  onViewStory: (profile: Profile) => void;
}

export const StoryRail: React.FC<StoryRailProps> = ({ currentUser, matches, onAddStory, onViewStory }) => {
  // Filter matches that have stories within the last 24 hours
  const matchesWithStories = matches.filter(match => {
    if (!match.profile.stories || match.profile.stories.length === 0) return false;
    // Check if any story is recent
    const hasRecentStory = match.profile.stories.some(s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000);
    return hasRecentStory;
  });

  const hasMyStories = currentUser.stories && currentUser.stories.length > 0;

  return (
    <div className="w-full overflow-x-auto hide-scrollbar py-5 pl-5 flex gap-4 bg-gradient-to-b from-slate-900/40 to-transparent">

      {/* My Story - Agent 3 & 6: Premium story bubble */}
      <div className="flex flex-col items-center gap-2 min-w-[72px]">
        <button
          type="button"
          aria-label={hasMyStories ? 'View my story' : 'Add story'}
          onClick={hasMyStories ? () => onViewStory(currentUser) : onAddStory}
          className="relative w-[68px] h-[68px] rounded-full cursor-pointer group active:scale-95 transition-transform"
        >
          {/* Ring */}
          <div className={`absolute inset-0 rounded-full border-[2.5px] transition-all duration-300 ${hasMyStories ? 'border-gold-500 shadow-glow-gold' : 'border-slate-700 border-dashed group-hover:border-gold-400'}`}></div>

          <img
            src={currentUser.images[0]}
            alt="My Story"
            className="w-full h-full rounded-full object-cover border-[3px] border-slate-950"
          />

          {!hasMyStories && (
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center border-[2.5px] border-slate-950 shadow-sm">
              <Plus size={14} className="text-white" strokeWidth={3} />
            </div>
          )}
        </button>
        <span className="text-caption text-slate-400 font-medium">My Story</span>
      </div>

      {/* Matches Stories - Agent 6 & 7: Better story ring animation */}
      {matchesWithStories.map((match) => {
        const hasUnseen = match.profile.stories.some(s => !s.seen);
        return (
          <div key={match.profile.id} className="flex flex-col items-center gap-2 min-w-[72px]">
            <button
              type="button"
              aria-label={`View ${match.profile.name} story`}
              onClick={() => onViewStory(match.profile)}
              className="relative w-[68px] h-[68px] rounded-full cursor-pointer active:scale-95 transition-transform"
            >
              {/* Ring Gradient for Unseen */}
              <div className={`absolute inset-0 rounded-full transition-all duration-300 ${hasUnseen ? 'bg-gradient-to-tr from-gold-600 via-gold-400 to-amber-300' : 'bg-slate-700/80'}`}></div>

              {/* Inner Mask to create Ring effect */}
              <div className="absolute inset-[2.5px] bg-slate-950 rounded-full"></div>

              <img
                src={match.profile.images[0]}
                alt={match.profile.name}
                className="relative w-full h-full rounded-full object-cover border-[3px] border-slate-950 z-10"
              />

              {/* Unseen indicator glow */}
              {hasUnseen && (
                <div className="absolute inset-0 rounded-full shadow-glow-gold animate-pulse-soft pointer-events-none"></div>
              )}
            </button>
            <span className="text-caption text-slate-400 font-medium truncate max-w-[68px]">{match.profile.name}</span>
          </div>
        );
      })}

      {matchesWithStories.length === 0 && !hasMyStories && (
        <div className="flex items-center text-sm text-slate-500 italic pr-5 ml-2">
          Connect with matches to see their stories.
        </div>
      )}

    </div>
  );
};
