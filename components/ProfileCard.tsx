import React, { useState, useMemo } from 'react';
import { Profile } from '../types';
import { BadgeCheck, Info, MapPin, Stethoscope, Navigation, Flame, Zap } from 'lucide-react';
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

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800 select-none group">
      {/* Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
        onClick={nextImage}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
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

      {/* Top-Left Badge Stack — Premium Glassmorphism */}
      <div className="absolute top-8 left-6 z-20 flex flex-col gap-1.5">
        {/* Online Status */}
        {statusColor !== 'hidden' && (
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/[0.08] w-fit">
            <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`}></div>
            <span className="text-[10px] font-medium text-white/70 tracking-[0.08em] uppercase">
              {statusColor === 'bg-green-500' ? 'Online' : statusColor === 'bg-orange-500' ? 'Recently' : 'Away'}
            </span>
          </div>
        )}

        {/* Compatibility */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/[0.08] w-fit">
          <Zap size={10} className="text-white/50" />
          <span className="text-[10px] font-semibold text-white/80 tracking-[0.06em]">
            {matchStats.score}%
          </span>
        </div>

        {/* Available */}
        {isAvailableNow && (
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[10px] font-medium text-emerald-300/80 tracking-[0.08em] uppercase">Available</span>
          </div>
        )}

        {/* Proximity */}
        {isVeryClose && (
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-amber-500/20 w-fit">
            <Flame size={10} className="text-amber-400/70" />
            <span className="text-[10px] font-medium text-amber-300/80 tracking-[0.08em] uppercase">Nearby</span>
          </div>
        )}
      </div>

      {/* Content Layer */}
      <div
        className="absolute bottom-0 w-full cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
      >
        <div className="px-6 pb-24 pt-12 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent text-white">

          {/* Name */}
          <h2 className="text-3xl font-serif font-bold text-white drop-shadow-lg mb-1">{profile.name}, {profile.age}</h2>

          {/* Verified Badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <BadgeCheck size={12} className="text-green-500" fill="currentColor" stroke="black" />
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">Verified</span>
          </div>

          {/* Role & Specialty */}
          <div className="flex items-center gap-2 text-gold-400 font-medium mb-2 uppercase tracking-wider text-xs">
            <Stethoscope size={14} />
            <span className="drop-shadow-md">{profile.role} • <span className="text-slate-200">{profile.subSpecialty || profile.specialty}</span></span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-3">
            <MapPin size={12} />
            <span className="truncate max-w-[200px]">{profile.institutionHidden ? 'Private' : profile.hospital}</span>
            <span className="text-slate-600">·</span>
            <Navigation size={10} />
            <span>{getDistanceText()}</span>
          </div>

          {/* Tags Row (Personality + Interests combined, max 4) */}
          <div className="flex flex-wrap gap-1.5">
            {(profile.personalityTags || []).slice(0, 2).map(tagId => {
              const tag = PERSONALITY_OPTIONS.find(opt => opt.id === tagId);
              if (!tag) return null;
              const isMatch = (currentUser?.personalityTags || []).includes(tagId);
              return (
                <span
                  key={tagId}
                  className={`text-[9px] px-2 py-0.5 rounded-full border backdrop-blur-sm flex items-center gap-1 ${isMatch
                    ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-black font-bold border-gold-400 shadow-md'
                    : 'bg-white/10 border-white/20 text-white font-medium'
                    }`}
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </span>
              );
            })}
            {profile.interests.slice(0, 3).map(interest => {
              const isCommon = currentUser?.interests.includes(interest);
              return (
                <span
                  key={interest}
                  className={`text-[10px] px-2 py-0.5 rounded-full border backdrop-blur-sm ${isCommon
                    ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
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

        </div>
      </div>
    </div>
  );
};