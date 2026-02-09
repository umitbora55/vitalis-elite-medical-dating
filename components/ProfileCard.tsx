import React, { useState, useMemo } from 'react';
import { Profile } from '../types';
import { BadgeCheck, Info, MapPin, Stethoscope, Navigation, Clock, Flame, Zap, Quote } from 'lucide-react';
import { calculateCompatibility } from '../utils/compatibility';
import { PERSONALITY_OPTIONS } from '../constants';

interface ProfileCardProps {
  profile: Profile;
  onShowDetails: () => void;
  currentUser?: Profile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onShowDetails, currentUser }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex < profile.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      setCurrentImageIndex(0);
    }
  };

  const getStatusColor = () => {
    if (profile.isOnlineHidden) return 'hidden'; // Don't show if hidden on swipe card
    
    const diff = Date.now() - profile.lastActive;
    if (diff < 15 * 60 * 1000) return 'bg-green-500'; // < 15 mins
    if (diff < 24 * 60 * 60 * 1000) return 'bg-orange-500'; // < 24 hours
    return 'bg-slate-400'; // > 24 hours
  };

  const statusColor = getStatusColor();
  
  // Check availability status validity
  const isAvailableNow = profile.isAvailable && (!profile.availabilityExpiresAt || profile.availabilityExpiresAt > Date.now());

  // Location & Distance Logic
  const getDistanceText = () => {
      if (profile.isLocationHidden) return "Nearby";
      if (profile.distance > 50) return "50+ km away";
      return `${profile.distance} km away`;
  };

  const isVeryClose = !profile.isLocationHidden && profile.distance < 5;

  // Compatibility Calculation
  const matchStats = useMemo(() => calculateCompatibility(currentUser, profile), [currentUser, profile]);

  // Featured Q&A (Randomly pick one to show if available)
  const featuredQuestion = useMemo(() => {
      if (!profile.questions || profile.questions.length === 0) return null;
      return profile.questions[0]; // Just grab the first one for consistency or random
  }, [profile.questions]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800 select-none group">
      {/* Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
        onClick={nextImage}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>

      {/* Image Indicator Bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {profile.images.map((_, idx) => (
          <div 
            key={idx} 
            className={`h-1 flex-1 rounded-full backdrop-blur-sm transition-all duration-300 ${idx === currentImageIndex ? 'bg-white' : 'bg-white/30'}`}
          />
        ))}
      </div>

      {/* Info Button (Top Right) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
        className="absolute top-8 right-6 z-20 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/20 transition-all"
      >
        <Info size={16} />
      </button>

      {/* Online Status Indicator (Top Left near image bar) */}
      {statusColor !== 'hidden' && (
        <div className="absolute top-8 left-6 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColor} shadow-[0_0_8px_currentColor]`}></div>
            <span className="text-[10px] font-bold text-white tracking-wide">
                {statusColor === 'bg-green-500' ? 'Active Now' : statusColor === 'bg-orange-500' ? 'Recently' : 'Offline'}
            </span>
        </div>
      )}

      {/* Compatibility Badge (New) - Positioned below status */}
      <div className={`absolute left-6 z-20 flex items-center gap-1.5 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-white/10 ${matchStats.score >= 80 ? 'bg-green-900/40' : 'bg-black/40'} ${statusColor !== 'hidden' ? 'top-[4.5rem]' : 'top-8'}`}>
          <Zap size={12} className={matchStats.color} fill="currentColor" />
          <span className={`text-[10px] font-bold tracking-wide ${matchStats.color}`}>
              {matchStats.score}% Match
          </span>
      </div>

      {/* Shift Status Badge */}
      {isAvailableNow && (
          <div className={`absolute left-6 z-20 flex items-center gap-2 bg-green-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg animate-fade-in border border-green-400 ${statusColor !== 'hidden' ? 'top-[7.5rem]' : 'top-[4.5rem]'}`}>
             <Clock size={12} className="text-white" />
             <span className="text-[10px] font-bold text-white tracking-wide uppercase">Shift Status: Available 🟢</span>
          </div>
      )}
      
      {/* "Very Close" Badge */}
      {isVeryClose && (
          <div className={`absolute left-6 z-20 flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1.5 rounded-full shadow-lg border border-orange-500/50 animate-pulse ${
              // Dynamic positioning logic based on previous elements
              isAvailableNow ? (statusColor !== 'hidden' ? 'top-[10.5rem]' : 'top-[7.5rem]') : (statusColor !== 'hidden' ? 'top-[7.5rem]' : 'top-[4.5rem]')
          }`}>
             <Flame size={12} className="text-white fill-white" />
             <span className="text-[10px] font-bold text-white tracking-wide uppercase">Very Close!</span>
          </div>
      )}

      {/* Content Layer */}
      <div 
        className="absolute bottom-0 w-full flex flex-col justify-end h-3/5 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
      >
        <div className="px-6 pb-24 pt-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent text-white flex flex-col justify-end h-full">
          
          {/* Featured Question Snippet */}
          {featuredQuestion && (
              <div className="mb-4 bg-white/5 backdrop-blur-md border border-white/10 p-3 rounded-xl transform translate-y-2 opacity-90">
                  <div className="flex gap-2">
                      <Quote size={12} className="text-gold-500 rotate-180 flex-shrink-0 mt-0.5" />
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{featuredQuestion.question}</p>
                          <p className="text-sm font-serif italic text-slate-200">"{featuredQuestion.answer}"</p>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-3xl font-serif font-bold text-white shadow-sm drop-shadow-lg">{profile.name}, {profile.age}</h2>
          </div>

          {/* Explicit Verification Badge */}
          <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-0.5 rounded-md border border-green-500/30 w-fit mb-3 backdrop-blur-sm">
             <BadgeCheck size={12} className="text-green-500" fill="currentColor" stroke="black" />
             <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">Verified Healthcare Professional</span>
          </div>
          
          {/* Role and SubSpecialty Display */}
          <div className="flex items-center gap-2 text-gold-400 font-medium mb-2 uppercase tracking-wider text-sm">
            <Stethoscope size={14} />
            <span className="drop-shadow-md">{profile.role} • <span className="text-slate-200">{profile.subSpecialty || profile.specialty}</span></span>
          </div>

          <div className="flex flex-col gap-1 mb-2">
             {/* Institution Location */}
             <div className="flex items-center gap-1 text-slate-300 text-sm opacity-90">
                <MapPin size={14} />
                <span className="drop-shadow-md truncate max-w-[250px]">{profile.institutionHidden ? 'Private Institution' : profile.hospital}</span>
             </div>
             
             {/* Geographic Location / Distance */}
             <div className="flex items-center gap-1 text-slate-400 text-xs">
                <Navigation size={12} />
                <span className="drop-shadow-md">
                    📍 {getDistanceText()}
                </span>
             </div>
          </div>

          {/* Personality Badges Row */}
          {(profile.personalityTags && profile.personalityTags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                  {profile.personalityTags.slice(0, 3).map(tagId => {
                      const tag = PERSONALITY_OPTIONS.find(opt => opt.id === tagId);
                      if (!tag) return null;
                      const isMatch = (currentUser?.personalityTags || []).includes(tagId);
                      return (
                          <span 
                            key={tagId}
                            className={`text-[9px] px-2 py-0.5 rounded-full border backdrop-blur-sm flex items-center gap-1 ${
                                isMatch
                                ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-black font-bold border-gold-400 shadow-md' 
                                : 'bg-white/10 border-white/20 text-white font-medium'
                            }`}
                          >
                              <span>{tag.emoji}</span>
                              <span>{tag.label}</span>
                          </span>
                      );
                  })}
              </div>
          )}
          
          {/* Interests Pills */}
          <div className="flex flex-wrap gap-1.5 mb-1">
              {profile.interests.slice(0, 3).map(interest => {
                 const isCommon = currentUser?.interests.includes(interest);
                 return (
                     <span 
                        key={interest} 
                        className={`text-[10px] px-2 py-0.5 rounded-full border backdrop-blur-sm ${
                            isCommon 
                            ? 'bg-gold-500/20 border-gold-500/50 text-gold-300 shadow-[0_0_5px_rgba(245,158,11,0.2)]' 
                            : 'bg-black/30 border-white/10 text-slate-300'
                        }`}
                     >
                        {interest}
                     </span>
                 );
              })}
              {profile.interests.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-white/10 text-slate-400 backdrop-blur-sm">
                      +{profile.interests.length - 3}
                  </span>
              )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
             <span>Tap for details</span>
          </div>
        </div>
      </div>
    </div>
  );
};