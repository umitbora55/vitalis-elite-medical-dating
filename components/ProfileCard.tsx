import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '../types';
import { BadgeCheck, Info, MapPin, Stethoscope, Navigation, Flame, Zap } from 'lucide-react';
import { calculateCompatibility } from '../utils/compatibility';
import { PERSONALITY_OPTIONS } from '../constants';

const INITIAL_NOW_MS = Date.now();

interface ProfileCardProps {
  profile: Profile;
  onShowDetails: () => void;
  currentUser?: Profile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onShowDetails, currentUser }) => {
  const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Avoid Date.now() during render (React purity lint rule).
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    const immediateId = window.setTimeout(() => setNowMs(Date.now()), 0);

    return (): void => {
      window.clearInterval(intervalId);
      window.clearTimeout(immediateId);
    };
  }, []);

  const nextImage = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (currentImageIndex < profile.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      setCurrentImageIndex(0);
    }
  };

  const statusColor = useMemo((): string => {
    if (profile.isOnlineHidden) return 'hidden'; // Don't show if hidden on swipe card

    const diff = nowMs - profile.lastActive;
    if (diff < 15 * 60 * 1000) return 'bg-green-500'; // < 15 mins
    if (diff < 24 * 60 * 60 * 1000) return 'bg-orange-500'; // < 24 hours
    return 'bg-slate-400'; // > 24 hours
  }, [nowMs, profile.isOnlineHidden, profile.lastActive]);

  // Check availability status validity
  const isAvailableNow =
    profile.isAvailable &&
    (!profile.availabilityExpiresAt || profile.availabilityExpiresAt > nowMs);

  // Location & Distance Logic
  const getDistanceText = (): string => {
    if (profile.isLocationHidden) return 'Nearby';
    if (profile.distance > 50) return '50+ km away';
    return `${profile.distance} km away`;
  };

  const isVeryClose = !profile.isLocationHidden && profile.distance < 5;

  // Compatibility Calculation
  const matchStats = useMemo(() => calculateCompatibility(currentUser, profile), [currentUser, profile]);
  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onShowDetails();
    }
  };

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800/60 select-none group">
      {/* Image Layer - Agent 6: Better image treatment */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500 ease-out"
        style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
        onClick={nextImage}
      >
        {/* Premium gradient overlay - Agent 3 */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 via-60% to-transparent" />
        {/* Subtle vignette for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)]" />
      </div>

      {/* Image Indicator Bars - Agent 1: Better spacing */}
      <div className="absolute top-5 left-5 right-5 flex gap-1.5 z-10">
        {profile.images.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full backdrop-blur-sm transition-all duration-300 ease-out ${idx === currentImageIndex ? 'bg-white shadow-sm' : 'bg-white/25'}`}
          />
        ))}
      </div>

      {/* Info Button (Top Right) - Agent 4: Better touch target */}
      <button
        type="button"
        aria-label="Open profile details"
        onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
        className="absolute top-10 right-5 z-20 w-11 h-11 rounded-full glass-dark flex items-center justify-center text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200 active:scale-95"
      >
        <Info size={18} strokeWidth={2} />
      </button>

      {/* Top-Left Badge Stack — Premium Glassmorphism - Agent 3 */}
      <div className="absolute top-10 left-5 z-20 flex flex-col gap-2">
        {/* Online Status - Agent 3: Premium badge styling */}
        {statusColor !== 'hidden' && (
          <div className="flex items-center gap-2 glass-dark px-3 py-2 rounded-xl w-fit">
            <div className={`w-2 h-2 rounded-full ${statusColor} ${statusColor === 'bg-green-500' ? 'animate-pulse' : ''}`}></div>
            <span className="text-caption font-semibold text-white/80 tracking-wider uppercase">
              {statusColor === 'bg-green-500' ? 'Online' : statusColor === 'bg-orange-500' ? 'Recently' : 'Away'}
            </span>
          </div>
        )}

        {/* Compatibility - Agent 3: Premium look */}
        <div className="flex items-center gap-2 glass-dark px-3 py-2 rounded-xl w-fit">
          <Zap size={12} className="text-gold-400" />
          <span className="text-caption font-bold text-white/90 tracking-wide">
            {matchStats.score}%
          </span>
        </div>

        {/* Available - Agent 3 */}
        {isAvailableNow && (
          <div className="flex items-center gap-2 bg-emerald-500/15 backdrop-blur-xl px-3 py-2 rounded-xl border border-emerald-400/25 w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-caption font-semibold text-emerald-300 tracking-wider uppercase">Available</span>
          </div>
        )}

        {/* Proximity - Agent 3 */}
        {isVeryClose && (
          <div className="flex items-center gap-2 bg-amber-500/15 backdrop-blur-xl px-3 py-2 rounded-xl border border-amber-400/25 w-fit">
            <Flame size={12} className="text-amber-400" />
            <span className="text-caption font-semibold text-amber-300 tracking-wider uppercase">Nearby</span>
          </div>
        )}
      </div>

      {/* Content Layer - Agent 1, 2, 3: Premium spacing & typography */}
      <div
        className="absolute bottom-0 w-full cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
        role="button"
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
        aria-label={`Open ${profile.name} profile details`}
      >
        <div className="px-6 pb-28 pt-16 bg-gradient-to-t from-slate-950 via-slate-950/90 via-50% to-transparent text-white">

          {/* Name - Agent 2: Better typography */}
          <h2 className="text-3xl font-serif font-bold text-white drop-shadow-lg mb-1.5 tracking-tight">{profile.name}, {profile.age}</h2>

          {/* Verified Badge - Agent 3: Premium styling */}
          {profile.verified && (
            <div className="flex items-center gap-2 mb-3">
              <BadgeCheck size={14} className="text-emerald-400" fill="currentColor" stroke="black" />
              <span className="text-caption font-bold text-emerald-400 uppercase tracking-widest">Verified Professional</span>
            </div>
          )}

          {/* Role & Specialty - Agent 2: Better hierarchy */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 text-gold-400">
              <Stethoscope size={15} strokeWidth={2.5} />
              <span className="text-xs font-bold uppercase tracking-wider">{profile.role}</span>
            </div>
            <span className="text-slate-500">•</span>
            <span className="text-sm text-slate-200 font-medium">{profile.subSpecialty || profile.specialty}</span>
          </div>

          {/* Location - Agent 1: Better spacing */}
          <div className="flex items-center gap-3 text-slate-400 text-sm mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin size={14} strokeWidth={2} />
              <span className="truncate max-w-[180px]">{profile.institutionHidden ? 'Private' : profile.hospital}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <Navigation size={12} strokeWidth={2} />
              <span>{getDistanceText()}</span>
            </div>
          </div>

          {/* Tags Row - Agent 3: Premium tag styling */}
          <div className="flex flex-wrap gap-2">
            {(profile.personalityTags || []).slice(0, 2).map(tagId => {
              const tag = PERSONALITY_OPTIONS.find(opt => opt.id === tagId);
              if (!tag) return null;
              const isMatch = (currentUser?.personalityTags || []).includes(tagId);
              return (
                <span
                  key={tagId}
                  className={`text-micro px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold transition-all ${isMatch
                    ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-slate-950 shadow-glow-gold'
                    : 'glass-dark text-white/90'
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
                  className={`text-caption px-3 py-1.5 rounded-full font-medium transition-all ${isCommon
                    ? 'bg-gold-500/20 border border-gold-400/40 text-gold-300'
                    : 'glass-dark text-slate-300'
                    }`}
                >
                  {interest}
                </span>
              );
            })}
            {profile.interests.length > 3 && (
              <span className="text-caption px-3 py-1.5 rounded-full glass-dark text-slate-400 font-medium">
                +{profile.interests.length - 3}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
