import React, { useEffect, useMemo, useState } from 'react';
import { Profile } from '../types';
import { BadgeCheck, Info, Stethoscope, Zap, Star } from 'lucide-react';
import { calculateCompatibility } from '../utils/compatibility';
import { MatchExplanationChips, MatchExplanationSheet } from './MatchExplanationChips';


const INITIAL_NOW_MS = Date.now();

interface ProfileCardProps {
  profile: Profile;
  onShowDetails: () => void;
  currentUser?: Profile;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onShowDetails, currentUser }) => {
  const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    // Avoid Date.now() during render (React purity lint rule).
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    const immediateId = window.setTimeout(() => setNowMs(Date.now()), 0);

    return (): void => {
      window.clearInterval(intervalId);
      window.clearTimeout(immediateId);
    };
  }, []);

  const handleImageTap = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const isRightSide = tapX > rect.width / 2;

    if (isRightSide) {
      // Next photo — only if there is one
      if (currentImageIndex < profile.images.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      }
    } else {
      // Previous photo — only if not already at the first
      if (currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
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

  // Compatibility Calculation
  const matchStats = useMemo(() => calculateCompatibility(currentUser, profile), [currentUser, profile]);

  return (
    <div
      className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl bg-slate-950 border border-slate-800/40 select-none group"
      onClick={handleImageTap}
    >
      {/* ── Full Image Background ─────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out transform group-hover:scale-105"
        style={{ backgroundImage: `url(${profile.images[currentImageIndex]})` }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); setCurrentImageIndex(prev => (prev < profile.images.length - 1 ? prev + 1 : 0)); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : profile.images.length - 1)); }
        }}
        role="img"
        aria-label={`${profile.name}'s photo ${currentImageIndex + 1} of ${profile.images.length}.`}
        tabIndex={0}
      >
        {/* Top gradient for badges */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/60 to-transparent z-0" />
        {/* Bottom gradient for text - very tall to ensure legibility */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-0" />
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
          {/* Nöbet Modu badge (Özellik 6) */}
          {(profile as Profile & { is_on_duty?: boolean }).is_on_duty && (
            <div className="flex items-center gap-2 bg-blue-700/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-blue-400/30 shadow-lg shadow-blue-900/20 animate-fade-in-up">
              <Stethoscope size={12} className="text-white" fill="white" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">🏥 Nöbette</span>
            </div>
          )}

          {/* Şu an müsait badge (Özellik 7) */}
          {(profile as Profile & { is_available_now?: boolean; available_district?: string }).is_available_now && (
            <div className="flex items-center gap-2 bg-emerald-600/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-emerald-400/30 shadow-lg shadow-emerald-900/20 animate-fade-in-up">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                📍 {(profile as Profile & { available_district?: string }).available_district ?? 'Müsait'}
              </span>
            </div>
          )}

          {/* Priority 1: On-Call (Most important status) */}
          {profile.isOnCall && !(profile as Profile & { is_on_duty?: boolean }).is_on_duty && (
            <div className="flex items-center gap-2 bg-blue-600/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-blue-400/30 shadow-lg shadow-blue-900/20 animate-fade-in-up">
              <Stethoscope size={12} className="text-white" fill="white" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">On Call</span>
            </div>
          )}

          {/* Priority 2: Available / Online */}
          {!profile.isOnCall && !(profile as Profile & { is_available_now?: boolean }).is_available_now && isAvailableNow ? (
            <div className="flex items-center gap-2 bg-emerald-500/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-emerald-400/30 shadow-lg shadow-emerald-900/20 animate-fade-in-up">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Available</span>
            </div>
          ) : !profile.isOnCall && statusInfo ? (
            <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 shadow-lg animate-fade-in-up">
              <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color}`} />
              <span className="text-xs font-bold text-white/90 uppercase tracking-wider">{statusInfo.label}</span>
            </div>
          ) : null}

          {/* Quick Reply Badge */}
          {profile.quickReplyBadge && (
            <div className="flex items-center gap-1.5 bg-amber-500/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-amber-400/30 shadow-lg shadow-amber-900/20 w-fit animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Zap size={10} className="text-white" fill="white" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Quick Reply</span>
            </div>
          )}
        </div>

        {/* Right Stack: Match Score & Info */}
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
          <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gold-500/30 shadow-lg">
            <span className="text-xs font-bold text-gold-400">{matchStats.score}%</span>
            <Star size={10} className="text-gold-500" fill="currentColor" />
          </div>

          {/* Touch Target Fix (Agent 01): Minimum 44x44px for mobile accessibility */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
            aria-label={`View ${profile.name}'s full profile`}
            className="w-11 h-11 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* ── Bottom Content Overlay ─────────── */}
      <div className="absolute bottom-0 w-full px-6 pt-12 pb-[100px] flex flex-col items-start text-left z-10 pointer-events-none bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">

        {/* Name & Age Row */}
        <div className="flex items-center gap-2 mb-1 pointer-events-auto">
          <h2 className="text-[22px] font-sans font-semibold text-white tracking-tight drop-shadow-md flex items-center">
            {profile.name}, {profile.age}

            {/* Online indicating dot (green dot) as in reference */}
            {(!profile.isOnCall && isAvailableNow) ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            ) : statusInfo ? (
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.color} ml-2`} />
            ) : null}
          </h2>

          {profile.verified && (
            <BadgeCheck
              size={18}
              className="text-blue-500 ml-1"
              fill="currentColor"
              stroke="transparent"
            />
          )}
        </div>

        {/* Distance Subtitle */}
        <p className="text-slate-300/80 text-[12px] font-medium mb-3 pointer-events-auto flex items-center gap-1">
          - {getDistanceText()} bizden uzakta
        </p>

        {/* Tags / Chips Row */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pointer-events-auto">
          {/* Role/Specialty Tag */}
          <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
            <span className="text-white/90 text-[11px] font-medium tracking-wide">{profile.role}</span>
          </div>

          {(profile.subSpecialty || profile.specialty) && (
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
              <span className="text-white/90 text-[11px] font-medium tracking-wide">{profile.subSpecialty || profile.specialty}</span>
            </div>
          )}

          {/* Intent Tag */}
          {(profile as Profile & { intent?: string }).intent && (() => {
            const intentMap: Record<string, { label: string }> = {
              serious: { label: 'Ciddi İlişki' },
              long_term: { label: 'Uzun Vadeli' },
              networking: { label: 'Networking' },
              friendship: { label: 'Arkadaşlık' },
            };
            const intentInfo = intentMap[(profile as Profile & { intent?: string }).intent!];
            if (!intentInfo) return null;
            return (
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                <span className="text-white/90 text-[11px] font-medium tracking-wide">{intentInfo.label}</span>
              </div>
            );
          })()}
        </div>

        {/* BIO Section */}
        <div className="pointer-events-auto w-full mt-1">
          <h3 className="text-[10px] font-light text-slate-400 tracking-widest uppercase mb-1.5">Bio</h3>
          <p className="text-slate-300 text-[13px] font-normal leading-relaxed max-w-[95%] drop-shadow-md line-clamp-3">
            {profile.institutionHidden ? 'Private Practice' : profile.hospital} bünyesinde {profile.specialty} olarak görev yapıyorum. Yoğun tempoda birbirimizi anlayabileceğimiz meslektaşlar arıyorum.
          </p>
        </div>

        {/* ── Explanation Chips (If any) ───────────────────────── */}
        {currentUser && (
          <div className="pointer-events-auto w-full mt-3">
            <MatchExplanationChips
              currentUser={currentUser}
              targetProfile={profile}
              onOpenSheet={() => setSheetOpen(true)}
            />
          </div>
        )}
      </div>

      {/* ── Explanation Detail Sheet ──────────────────────────── */}
      {currentUser && (
        <MatchExplanationSheet
          currentUser={currentUser}
          targetProfile={profile}
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onNavigate={(path) => {
            // Surface navigation to host app via detail handler
            // The host app should handle routing; we use console for now
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('vitalis:navigate', { detail: { path } }));
            }
          }}
        />
      )}
    </div>
  );
};
