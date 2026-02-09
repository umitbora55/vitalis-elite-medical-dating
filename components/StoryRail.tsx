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
    <div className="w-full overflow-x-auto hide-scrollbar py-4 pl-4 flex gap-4 bg-gradient-to-b from-slate-900/50 to-transparent">
      
      {/* My Story */}
      <div className="flex flex-col items-center gap-1 min-w-[64px]">
        <div 
            onClick={hasMyStories ? () => onViewStory(currentUser) : onAddStory}
            className="relative w-16 h-16 rounded-full p-[2px] cursor-pointer group"
        >
            {/* Ring */}
            <div className={`absolute inset-0 rounded-full border-2 ${hasMyStories ? 'border-gold-500' : 'border-slate-700 border-dashed'} group-hover:border-gold-400 transition-colors`}></div>
            
            <img 
                src={currentUser.images[0]} 
                alt="My Story" 
                className="w-full h-full rounded-full object-cover border-2 border-slate-950" 
            />
            
            {!hasMyStories && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-gold-500 rounded-full flex items-center justify-center border-2 border-slate-950">
                    <Plus size={12} className="text-white" strokeWidth={3} />
                </div>
            )}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">My Story</span>
      </div>

      {/* Matches Stories */}
      {matchesWithStories.map((match) => {
          const hasUnseen = match.profile.stories.some(s => !s.seen);
          return (
            <div key={match.profile.id} className="flex flex-col items-center gap-1 min-w-[64px]">
                <div 
                    onClick={() => onViewStory(match.profile)}
                    className="relative w-16 h-16 rounded-full p-[2px] cursor-pointer"
                >
                    {/* Ring Gradient for Unseen */}
                    <div className={`absolute inset-0 rounded-full ${hasUnseen ? 'bg-gradient-to-tr from-gold-600 via-gold-400 to-yellow-200 animate-spin-slow' : 'bg-slate-700'}`}></div>
                    
                    {/* Inner Mask to create Ring effect */}
                    <div className="absolute inset-[2px] bg-slate-950 rounded-full"></div>

                    <img 
                        src={match.profile.images[0]} 
                        alt={match.profile.name} 
                        className="relative w-full h-full rounded-full object-cover border-2 border-slate-950 z-10" 
                    />
                </div>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[64px]">{match.profile.name}</span>
            </div>
          );
      })}

      {matchesWithStories.length === 0 && !hasMyStories && (
          <div className="flex items-center text-xs text-slate-500 italic pr-4">
              Connect with matches to see their stories.
          </div>
      )}

    </div>
  );
};