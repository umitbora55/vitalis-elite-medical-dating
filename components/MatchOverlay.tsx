import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Match } from '../types';
import { MessageCircle, Heart, User, Volume2, VolumeX, Sparkles, Loader2 } from 'lucide-react';
import { USER_PROFILE } from '../constants';

interface MatchOverlayProps {
  match: Match;
  onClose: () => void;
  onChat: () => void;
  onViewProfile: () => void;
  isPremium?: boolean;
}

type Particle = {
  id: number;
  delay: number;
  colorClass: string;
  left: number;
  duration: number;
  size: number;
};

const createParticles = (count: number, premium: boolean): Particle[] => {
  const palette = premium
    ? ['bg-gold-400', 'bg-gold-500', 'bg-amber-300', 'bg-amber-200']
    : ['bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'];

  return Array.from({ length: count }, (_, idx) => ({
    id: idx,
    delay: Math.random() * 0.8,
    colorClass: palette[Math.floor(Math.random() * palette.length)],
    left: Math.random() * 100,
    duration: Math.random() * 1.8 + 2.2,
    size: Math.random() * 4 + 3,
  }));
};

const ConfettiParticle: React.FC<{ particle: Particle }> = ({ particle }) => (
  <div
    className={`absolute -top-4 rounded-sm ${particle.colorClass} animate-fall`}
    style={{
      left: `${particle.left}%`,
      width: `${particle.size}px`,
      height: `${particle.size * 1.6}px`,
      animationDelay: `${particle.delay}s`,
      animationDuration: `${particle.duration}s`,
    }}
  />
);

type AnimationStage = 'ENTERING' | 'IMPACT' | 'CELEBRATING' | 'INTERACTIVE' | 'HANDOFF';
const PREMIUM_HANDOFF_MS = 1200;
const STANDARD_HANDOFF_MS = 850;

export const MatchOverlay: React.FC<MatchOverlayProps> = ({ match, onClose, onChat, onViewProfile, isPremium = false }) => {
  const [stage, setStage] = useState<AnimationStage>('ENTERING');
  const [isMuted, setIsMuted] = useState(false);
  const mutedRef = useRef(false);
  const particles = useMemo(() => createParticles(isPremium ? 38 : 28, isPremium), [isPremium, match.profile.id]);
  const isInteractive = stage === 'INTERACTIVE';
  const isHandoff = stage === 'HANDOFF';

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    // Stage 1: Entering (0ms) -> Impact (100ms triggers CSS transition)
    const t1 = setTimeout(() => {
        setStage('IMPACT');
        if (!mutedRef.current) {
            // Play a simulated pop sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'); 
            audio.volume = 0.5;
            audio.play().catch(() => {});
        }
    }, 100);

    // Stage 2: Impact -> Celebrating (600ms)
    const t2 = setTimeout(() => {
        setStage('CELEBRATING');
    }, 700);

    // Stage 3: Celebrating -> Interactive (2500ms)
    const t3 = setTimeout(() => {
        setStage('INTERACTIVE');
    }, 2500);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (!isHandoff) return;

    if (!mutedRef.current) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');
      audio.volume = 0.35;
      audio.play().catch(() => {});
    }

    const handoffDuration = isPremium ? PREMIUM_HANDOFF_MS : STANDARD_HANDOFF_MS;
    const t = window.setTimeout(() => {
      onChat();
    }, handoffDuration);

    return (): void => window.clearTimeout(t);
  }, [isHandoff, isPremium, onChat]);

  const handleStartChat = (): void => {
    if (!isInteractive || isHandoff) return;
    setStage('HANDOFF');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl overflow-hidden" role="dialog" aria-modal="true" aria-label="Match celebration">
      {/* Background ambience - Agent 3: More refined gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(251,191,36,0.15),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(236,72,153,0.12),transparent_45%)]" />
      {isPremium && (
        <>
          <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,rgba(251,191,36,0.3),rgba(251,191,36,0.05),rgba(255,255,255,0.03),rgba(251,191,36,0.25),rgba(251,191,36,0.3))] opacity-50 animate-slow-rotate" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.12),transparent_50%)]" />
        </>
      )}

      {/* Sound Toggle - Agent 4: Better touch target */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        aria-label={isMuted ? 'Enable celebration sound' : 'Mute celebration sound'}
        disabled={isHandoff}
        className="absolute top-6 right-6 btn-icon text-slate-500 hover:text-white hover:bg-white/10 transition-all z-50 disabled:opacity-40"
      >
        {isMuted ? <VolumeX size={22} strokeWidth={2} /> : <Volume2 size={22} strokeWidth={2} />}
      </button>

      {/* Confetti Layer (Active in Celebrating & Interactive) */}
      {(stage === 'CELEBRATING' || stage === 'INTERACTIVE') && (
          <div className="absolute inset-0 pointer-events-none z-0">
              {particles.map((particle) => (
                  <ConfettiParticle 
                    key={particle.id}
                    particle={particle}
                  />
              ))}
          </div>
      )}

      <div className={`flex flex-col items-center w-full max-w-sm relative z-10 px-5 transition-all duration-1000 ease-snap ${isHandoff ? 'scale-[0.97] opacity-90' : 'scale-100 opacity-100'}`}>

        {/* Avatars Animation Container - Agent 3 & 6: Premium avatar treatment */}
        <div className="relative w-full h-52 flex items-center justify-center mb-10">
            {isPremium && (
              <div className={`absolute w-52 h-52 rounded-full bg-gold-400/15 blur-[80px] transition-all duration-700 ${stage === 'ENTERING' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`} />
            )}
            {/* Left Avatar (User) */}
            <div
                className={`absolute w-36 h-36 rounded-full overflow-hidden shadow-2xl transition-all duration-700 ease-out-expo z-10 ${
                    stage === 'ENTERING' ? '-translate-x-[200%] opacity-0' : 'translate-x-[-18%] opacity-100 rotate-[-8deg]'
                }`}
            >
                 <div className={`w-full h-full rounded-full p-[3px] ${isPremium ? 'bg-gradient-to-br from-gold-300 via-gold-500 to-amber-600' : 'bg-white'}`}>
                    <img src={USER_PROFILE.images[0]} alt="Me" className="w-full h-full rounded-full object-cover" />
                 </div>
            </div>

            {/* Right Avatar (Match) */}
            <div
                className={`absolute w-36 h-36 rounded-full overflow-hidden shadow-2xl transition-all duration-700 ease-out-expo z-10 ${
                    stage === 'ENTERING' ? 'translate-x-[200%] opacity-0' : 'translate-x-[18%] opacity-100 rotate-[8deg]'
                }`}
            >
                 <div className={`w-full h-full rounded-full p-[3px] ${isPremium ? 'bg-gradient-to-br from-gold-300 via-gold-500 to-amber-600' : 'bg-white'}`}>
                    <img src={match.profile.images[0]} alt="Match" className="w-full h-full rounded-full object-cover" />
                 </div>
            </div>

            {/* Heart/Sparkle Center Icon - Agent 7: Better animation */}
            <div className={`absolute z-20 transition-all duration-500 ease-out flex items-center justify-center ${
                stage === 'ENTERING' ? 'scale-0 opacity-0' :
                stage === 'IMPACT' ? 'scale-150 opacity-100' : 'scale-100 opacity-100'
            }`}>
                <div className={`rounded-full p-4 ${isPremium ? 'bg-gradient-to-br from-gold-300 to-amber-600 shadow-glow-gold-lg' : 'bg-white shadow-[0_0_40px_rgba(255,255,255,0.5)]'} ${stage === 'IMPACT' ? 'animate-ping-once' : 'animate-pulse-soft'}`}>
                    {isPremium ? (
                      <Sparkles size={36} className="text-slate-950" strokeWidth={2.5} />
                    ) : (
                      <Heart size={38} className="text-red-500 fill-red-500" />
                    )}
                </div>
            </div>
        </div>

        {/* Text Reveal - Agent 2 & 3: Better typography & card */}
        <div className={`w-full card-premium bg-slate-900/60 backdrop-blur-xl border-white/10 px-7 py-6 text-center transition-all duration-1000 ease-snap transform ${
            stage === 'ENTERING' || stage === 'IMPACT' ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'
        }`}>
            <h2 className={`text-4xl sm:text-5xl font-serif italic text-transparent bg-clip-text mb-3 ${isPremium ? 'bg-gradient-to-r from-amber-100 via-gold-400 to-amber-200' : 'bg-gradient-to-r from-white via-slate-200 to-white'}`}>
                {isPremium ? 'Elite Match!' : "It's a Match!"}
            </h2>
            <p className={`text-sm uppercase tracking-[0.2em] font-bold ${isPremium ? 'text-amber-300/90' : 'text-slate-400'}`}>
                You and {match.profile.name}
            </p>
            <p className="text-caption text-slate-400 mt-3 tracking-wide leading-relaxed">
              {isPremium ? 'A high-compatibility connection unlocked.' : 'Start the conversation while the moment is fresh.'}
            </p>
        </div>

        {/* Action Buttons - Agent 4: Premium buttons */}
        <div className={`w-full mt-10 flex flex-col gap-3 transition-all duration-1000 delay-200 ease-snap ${
            isInteractive || isHandoff ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}>
            <button
                onClick={handleStartChat}
                disabled={!isInteractive || isHandoff}
                className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-wait active:scale-[0.98] ${isPremium ? 'bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 shadow-glow-gold hover:shadow-glow-gold-lg' : 'bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg hover:shadow-xl'}`}
            >
                {isHandoff ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20} fill="currentColor" strokeWidth={0} />}
                {isHandoff ? (isPremium ? 'Preparing Private Suite...' : 'Opening Chat...') : 'Send Message'}
            </button>

            <button
                onClick={onViewProfile}
                disabled={isHandoff}
                className="btn-secondary w-full py-4 bg-slate-800/80 border-slate-700/80 hover:bg-slate-700 disabled:opacity-40"
            >
                <User size={20} strokeWidth={2} />
                View Profile
            </button>

            <button
                onClick={onClose}
                disabled={isHandoff}
                className="btn-ghost w-full py-3 text-slate-400 hover:text-white disabled:opacity-40"
            >
                Keep Swiping
            </button>
        </div>

      </div>

      {isHandoff && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(251,191,36,0.28),transparent_50%)] animate-fade-in" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/20 to-slate-950/70" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[280px] max-w-[82vw] px-6 py-4 rounded-2xl border border-gold-400/35 bg-slate-900/70 backdrop-blur-xl shadow-[0_0_35px_rgba(245,158,11,0.35)]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold-300/90 font-semibold text-center">
                {isPremium ? 'Entering Private Suite' : 'Entering Private Chat'}
              </p>
              <div className="mt-3 h-[3px] rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${isPremium ? 'bg-gradient-to-r from-amber-300 via-gold-500 to-amber-300' : 'bg-gradient-to-r from-pink-400 via-rose-500 to-pink-400'} animate-handoff-bar`} />
              </div>
              <p className="mt-2 text-[10px] text-slate-400 text-center tracking-wide">
                {isPremium ? 'Securing an elevated conversation room...' : 'Connecting your conversation...'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        .animate-fall {
            animation-name: fall;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
        }
        @keyframes ping-once {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
        }
        .animate-ping-once {
            animation: ping-once 0.4s cubic-bezier(0, 0, 0.2, 1);
        }
        @keyframes slow-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .animate-slow-rotate {
            animation: slow-rotate 14s linear infinite;
        }
        @keyframes handoff-bar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .animate-handoff-bar {
            animation: handoff-bar 1.05s ease-in-out infinite;
            width: 45%;
        }
      `}</style>
    </div>
  );
};
