import React from 'react';
import { Match, Profile, MedicalRole, Specialty } from '../types';
import { Plus, User } from 'lucide-react';

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

  // --- DEMO MOCK DATA ---
  const demoMatches: Match[] = [
    {
      profile: {
        id: 'd1',
        name: 'Sarah',
        age: 28,
        role: MedicalRole.DOCTOR,
        specialty: Specialty.SURGERY,
        subSpecialty: 'General',
        hospital: 'Acıbadem',
        institutionHidden: false,
        bio: '',
        education: 'Hacettepe',
        images: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150'],
        verified: true,
        interests: [],
        personalityTags: [],
        hasLikedUser: true,
        distance: 5,
        location: 'Istanbul',
        isLocationHidden: false,
        lastActive: Date.now(),
        isOnlineHidden: false,
        isAvailable: true,
        readReceiptsEnabled: true,
        storyPrivacy: 'ALL_MATCHES',
        genderPreference: 'EVERYONE',
        university: 'Hacettepe',
        city: 'Istanbul',
        stories: [
          {
            id: 's1',
            imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
            timestamp: Date.now() - 3600000, // 1 hour ago
            seen: false,
          }
        ]
      },
      timestamp: Date.now() - 86400000,
    },
    {
      profile: {
        id: 'd2',
        name: 'Emma',
        age: 31,
        role: MedicalRole.NURSE,
        specialty: Specialty.PEDIATRICS,
        subSpecialty: 'NICU',
        hospital: 'Memorial',
        institutionHidden: false,
        bio: '',
        education: 'Koç',
        images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150&h=150'],
        verified: true,
        interests: [],
        personalityTags: [],
        hasLikedUser: true,
        distance: 12,
        location: 'Istanbul',
        isLocationHidden: false,
        lastActive: Date.now(),
        isOnlineHidden: false,
        isAvailable: false,
        readReceiptsEnabled: true,
        storyPrivacy: 'ALL_MATCHES',
        genderPreference: 'EVERYONE',
        university: 'Koç',
        city: 'Istanbul',
        stories: [
          {
            id: 's2',
            imageUrl: 'https://images.unsplash.com/photo-1550831107-1553da8c8464?w=800',
            timestamp: Date.now() - 7200000, // 2 hours ago
            seen: true,
          }
        ]
      },
      timestamp: Date.now() - 172800000,
    },
    {
      profile: {
        id: 'd3',
        name: 'Michael',
        age: 34,
        role: MedicalRole.DOCTOR,
        specialty: Specialty.CARDIOLOGY,
        subSpecialty: 'Interventional',
        hospital: 'Florence Nightingale',
        institutionHidden: false,
        bio: '',
        education: 'Cerrahpaşa',
        images: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'],
        verified: true,
        interests: [],
        personalityTags: [],
        hasLikedUser: true,
        distance: 8,
        location: 'Istanbul',
        isLocationHidden: false,
        lastActive: Date.now(),
        isOnlineHidden: false,
        isAvailable: true,
        readReceiptsEnabled: true,
        storyPrivacy: 'ALL_MATCHES',
        genderPreference: 'EVERYONE',
        university: 'Cerrahpaşa',
        city: 'Istanbul',
        stories: [
          {
            id: 's3',
            imageUrl: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800',
            timestamp: Date.now() - 10800000, // 3 hours ago
            seen: false,
          }
        ]
      },
      timestamp: Date.now() - 259200000,
    }
  ];

  const displayMatches = [...matchesWithStories, ...demoMatches];
  // --- END DEMO DATA ---

  const hasMyStories = currentUser.stories && currentUser.stories.length > 0;

  return (
    <div className="w-full overflow-x-auto hide-scrollbar py-5 pl-5 flex gap-4">

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

          {currentUser.images && currentUser.images.length > 0 ? (
            <img
              src={currentUser.images[0]}
              alt="My Story"
              className="w-full h-full rounded-full object-cover border-[3px] border-slate-950"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`absolute inset-0 w-full h-full rounded-full border-[3px] border-slate-950 bg-slate-800 flex flex-col items-center justify-center text-slate-500 overflow-hidden ${currentUser.images && currentUser.images.length > 0 ? 'hidden' : ''}`}>
            <User size={32} className="opacity-80" />
          </div>

          {!hasMyStories && (
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center border-[2.5px] border-slate-950 shadow-sm">
              <Plus size={14} className="text-white" strokeWidth={3} />
            </div>
          )}
        </button>
        <span className="text-caption text-slate-400 font-medium">My Story</span>
      </div>

      {/* Matches Stories - Agent 6 & 7: Better story ring animation */}
      {displayMatches.map((match) => {
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

              {match.profile.images && match.profile.images.length > 0 ? (
                <img
                  src={match.profile.images[0]}
                  alt={match.profile.name}
                  className="relative w-full h-full rounded-full object-cover border-[3px] border-slate-950 z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`absolute inset-0 w-full h-full rounded-full border-[3px] border-slate-950 bg-slate-800 flex flex-col items-center justify-center text-slate-500 overflow-hidden z-10 ${match.profile.images && match.profile.images.length > 0 ? 'hidden' : ''}`}>
                <User size={32} className="opacity-80" />
              </div>

              {/* Unseen indicator glow */}
              {hasUnseen && (
                <div className="absolute inset-0 rounded-full shadow-glow-gold animate-pulse-soft pointer-events-none"></div>
              )}
            </button>
            <span className="text-caption text-slate-400 font-medium truncate max-w-[68px]">{match.profile.name}</span>
          </div>
        );
      })}

      {displayMatches.length === 0 && !hasMyStories && (
        <div className="flex items-center text-sm text-slate-500 italic pr-5 ml-2">
          Connect with matches to see their stories.
        </div>
      )}

    </div>
  );
};
