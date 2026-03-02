import React from 'react';
import { X, Heart, Star } from 'lucide-react';
import { SwipeDirection } from '../types';

interface ControlPanelProps {
  onSwipe: (direction: SwipeDirection) => void;
  onRewind: () => void;
  remainingSuperLikes: number;
  canRewind?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onSwipe, remainingSuperLikes }) => {
  const isSuperLikeDisabled = remainingSuperLikes <= 0;

  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center z-20 pointer-events-none px-6">

      <div className="flex items-center justify-center gap-4 w-full">
        {/* Pass Button: Elegant Small Dark Circle */}
        <button
          onClick={() => onSwipe(SwipeDirection.LEFT)}
          aria-label="Pass on this profile"
          className="pointer-events-auto w-[52px] h-[52px] rounded-full bg-[#1A1A1A]/80 backdrop-blur-md border border-white/5 text-slate-300 hover:text-white hover:bg-[#2A2A2A] transition-all flex items-center justify-center group active:scale-95 focus:outline-none shadow-lg"
        >
          <X size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Super Like Button: Elegant Gold Circle */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => !isSuperLikeDisabled && onSwipe(SwipeDirection.SUPER)}
            disabled={isSuperLikeDisabled}
            aria-label="Super Like"
            className={`w-[52px] h-[52px] rounded-full transition-all flex items-center justify-center group active:scale-95 focus:outline-none shadow-lg ${isSuperLikeDisabled
                ? 'bg-[#1A1A1A]/50 border border-white/5 text-slate-600 cursor-not-allowed'
                : 'bg-gradient-to-tr from-gold-600 to-gold-400 text-slate-900 border border-gold-500/20 hover:shadow-[0_5px_20px_rgba(234,179,8,0.3)] hover:scale-105'
              }`}
          >
            <Star size={20} strokeWidth={2.5} className={!isSuperLikeDisabled ? "group-hover:scale-110 transition-transform" : ""} fill={!isSuperLikeDisabled ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Like Button: Elegant Purple/Vivid Circle (Matches Reference vibe but with 3 buttons) */}
        <button
          onClick={() => onSwipe(SwipeDirection.RIGHT)}
          aria-label="Like this profile"
          className="pointer-events-auto w-[52px] h-[52px] rounded-full bg-[#6200EA] border border-white/5 text-white hover:bg-[#7C4DFF] shadow-[0_5px_20px_rgba(98,0,234,0.3)] transition-all flex items-center justify-center group active:scale-95 focus:outline-none"
        >
          <Heart size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" fill="currentColor" />
        </button>
      </div>

    </div>
  );
};