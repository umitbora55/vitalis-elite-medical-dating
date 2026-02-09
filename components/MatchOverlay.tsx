import React, { useEffect, useState } from 'react';
import { Match } from '../types';
import { MessageCircle, Heart, User, Volume2, VolumeX } from 'lucide-react';
import { USER_PROFILE } from '../constants';

interface MatchOverlayProps {
  match: Match;
  onClose: () => void;
  onChat: () => void;
  onViewProfile: () => void;
  isPremium?: boolean;
}

// Confetti Particle Component
const ConfettiParticle: React.FC<{ delay: number, color: string, left: number }> = ({ delay, color, left }) => (
    <div 
      className={`absolute top-0 w-2 h-2 rounded-sm ${color} animate-fall`}
      style={{ 
          left: `${left}%`, 
          animationDelay: `${delay}s`,
          animationDuration: `${Math.random() * 2 + 2}s`
      }}
    ></div>
);

type AnimationStage = 'ENTERING' | 'IMPACT' | 'CELEBRATING' | 'INTERACTIVE';

export const MatchOverlay: React.FC<MatchOverlayProps> = ({ match, onClose, onChat, onViewProfile, isPremium = false }) => {
  const [stage, setStage] = useState<AnimationStage>('ENTERING');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Stage 1: Entering (0ms) -> Impact (100ms triggers CSS transition)
    const t1 = setTimeout(() => {
        setStage('IMPACT');
        if (!isMuted) {
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
  }, [isMuted]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl overflow-hidden">
      
      {/* Sound Toggle */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-50 p-2"
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>

      {/* Confetti Layer (Active in Celebrating & Interactive) */}
      {(stage === 'CELEBRATING' || stage === 'INTERACTIVE') && (
          <div className="absolute inset-0 pointer-events-none z-0">
              {[...Array(30)].map((_, i) => (
                  <ConfettiParticle 
                    key={i} 
                    delay={Math.random()} 
                    left={Math.random() * 100} 
                    color={isPremium ? 'bg-gold-400' : ['bg-red-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'][Math.floor(Math.random() * 4)]}
                  />
              ))}
          </div>
      )}

      <div className="flex flex-col items-center w-full max-w-sm relative z-10">
        
        {/* Avatars Animation Container */}
        <div className="relative w-full h-48 flex items-center justify-center mb-8">
            {/* Left Avatar (User) */}
            <div 
                className={`absolute w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-2xl transition-all duration-700 ease-out z-10 ${
                    stage === 'ENTERING' ? '-translate-x-[200%] opacity-0' : 'translate-x-[-15%] opacity-100 rotate-[-10deg]'
                }`}
            >
                 <img src={USER_PROFILE.images[0]} alt="Me" className="w-full h-full object-cover" />
            </div>

            {/* Right Avatar (Match) */}
            <div 
                className={`absolute w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-2xl transition-all duration-700 ease-out z-10 ${
                    stage === 'ENTERING' ? 'translate-x-[200%] opacity-0' : 'translate-x-[15%] opacity-100 rotate-[10deg]'
                }`}
            >
                 <img src={match.profile.images[0]} alt="Match" className="w-full h-full object-cover" />
            </div>

            {/* Heart Explosion */}
            <div className={`absolute z-20 transition-all duration-500 flex items-center justify-center ${
                stage === 'ENTERING' ? 'scale-0 opacity-0' : 
                stage === 'IMPACT' ? 'scale-150 opacity-100' : 'scale-100 opacity-100'
            }`}>
                <div className={`bg-white rounded-full p-3 shadow-[0_0_30px_rgba(255,255,255,0.5)] ${stage === 'IMPACT' ? 'animate-ping-once' : 'animate-pulse'}`}>
                    <Heart size={40} className="text-red-500 fill-red-500" />
                </div>
            </div>
        </div>

        {/* Text Reveal */}
        <div className={`text-center transition-all duration-1000 transform ${
            stage === 'ENTERING' || stage === 'IMPACT' ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'
        }`}>
            <h2 className="text-5xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-white drop-shadow-lg mb-2">
                It's a Match!
            </h2>
            <p className="text-slate-400 text-sm uppercase tracking-widest font-bold">
                You and {match.profile.name}
            </p>
        </div>

        {/* Action Buttons (Reveal Late) */}
        <div className={`w-full px-6 mt-12 flex flex-col gap-3 transition-all duration-1000 delay-200 ${
            stage === 'INTERACTIVE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}>
            <button 
                onClick={onChat}
                className="w-full py-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
                <MessageCircle size={20} fill="currentColor" />
                Send Message
            </button>

            <button 
                onClick={onViewProfile}
                className="w-full py-4 rounded-full bg-slate-800 text-white font-bold shadow-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
                <User size={20} />
                View Profile
            </button>

            <button 
                onClick={onClose}
                className="w-full py-3 text-slate-500 text-sm font-medium hover:text-white transition-colors"
            >
                Keep Swiping
            </button>
        </div>

      </div>
      
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
      `}</style>
    </div>
  );
};
