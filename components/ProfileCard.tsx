import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '../types';
import { BadgeCheck, Info, MapPin, Stethoscope, Zap, Star } from 'lucide-react';
import { calculateCompatibility } from '../utils/compatibility';


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

  // --- Status Logic ---
  const statusInfo = useMemo(() => {
    if (profile.isOnlineHidden) return null;

    const diff = nowMs - profile.lastActive;
    if (diff < 15 * 60 * 1000) return { label: 'Online', color: 'bg-emerald-500', text: 'text-emerald-100' };
    if (diff < 24 * 60 * 60 * 1000) return { label: 'Recently', color: 'bg-amber-500', text: 'text-amber-100' };
    return null;
  }, [nowMs, profile.isOnlineHidden, profile.lastActive]);

  // Check availability status validity
  const isAvailableNow =
    profile.isAvailable &&
    (!profile.availabilityExpiresAt || profile.availabilityExpiresAt > nowMs);

  // Location & Distance Logic
  const getDistanceText = (): string => {
    if (profile.isLocationHidden) return 'Nearby';
    if (profile.distance > 50) return '50+ km';
    return `${profile.distance} km`;
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
    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl bg-slate-950 border border-slate-800/40 select-none group">
      {/* Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out transform group-hover:scale-105"
        style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
        onClick={nextImage}
      >
        {/* Premium gradient overlay - darker bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 via-60% to-slate-950/30" />
      </div>

      {/* Image Indicators */}
      <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-10">
        {profile.images.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full backdrop-blur-md transition-all duration-300 ease-out ${idx === currentImageIndex ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-white/20'
              }`}
          />
        ))}
      </div>

      {/* --- Top Bar (Badges) --- */}
      <div className="absolute top-8 left-4 right-4 flex justify-between items-start z-20 pointer-events-none">

        {/* Left Stack: Essential Status Only */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          {/* Priority 1: On-Call (Most important status) */}
          {profile.isOnCall && (
            <div className="flex items-center gap-2 bg-blue-600/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-blue-400/30 shadow-lg shadow-blue-900/20 animate-fade-in-up">
              <Stethoscope size={12} className="text-white" fill="white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">On Call</span>
            </div>
          )}

          {/* Priority 2: Available / Online */}
          {!profile.isOnCall && isAvailableNow ? (
            <div className="flex items-center gap-2 bg-emerald-500/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-emerald-400/30 shadow-lg shadow-emerald-900/20 animate-fade-in-up">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Available</span>
            </div>
          ) : !profile.isOnCall && statusInfo ? (
            <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 shadow-lg animate-fade-in-up">
              <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">{statusInfo.label}</span>
            </div>
          ) : null}

          {/* Quick Reply Badge */}
          {profile.quickReplyBadge && (
            <div className="flex items-center gap-1.5 bg-amber-500/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-amber-400/30 shadow-lg shadow-amber-900/20 w-fit animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Zap size={10} className="text-white" fill="white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Quick Reply</span>
            </div>
          )}
        </div>

        {/* Right Stack: Match Score & Info */}
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gold-500/30 shadow-lg">
            <span className="text-xs font-bold text-gold-400">{matchStats.score}%</span>
            <Star size={10} className="text-gold-500" fill="currentColor" />
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
            className="w-9 h-9 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95"
          >
            <Info size={16} />
          </button>
        </div>
      </div>


      {/* --- Footer Content --- */}
      <div
        className="absolute bottom-0 w-full cursor-pointer bg-gradient-to-t from-slate-950 via-slate-950/90 via-40% to-transparent pt-32 pb-32 px-6"
        onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
        role="button"
        tabIndex={0}
        onKeyDown={handleCardKeyDown}
      >
        {/* Name & Verified Badge */}
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-3xl font-serif font-bold text-white leading-tight tracking-tight drop-shadow-sm">
            {profile.name}, {profile.age}
          </h2>
          {profile.verified && (
            <BadgeCheck
              size={20}
              className="text-blue-500"
              fill="currentColor"
              stroke="black" // Creates a border effect for visibility on dark bg
              strokeWidth={1.5}
            />
          )}
        </div>

        {/* Role & Hospital */}
        <div className="flex flex-col gap-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gold-400 uppercase tracking-wide flex items-center gap-1.5">
              <Stethoscope size={14} className="mb-0.5" />
              {profile.role}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
            <span className="truncate">{profile.subSpecialty || profile.specialty}</span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="truncate opacity-80">{profile.institutionHidden ? 'Private Practice' : profile.hospital}</span>
          </div>
        </div>

        {/* Location Display */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin size={12} className={isVeryClose ? "text-amber-400" : "text-slate-500"} />
          <span className={`text-xs font-medium ${isVeryClose ? "text-amber-100" : "text-slate-400"}`}>
            {getDistanceText()}
          </span>
        </div>
      </div>
    </div>
  );
};
