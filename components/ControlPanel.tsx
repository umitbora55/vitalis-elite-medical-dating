import React from 'react';
import { X, Heart, Star, RotateCcw } from 'lucide-react';
import { SwipeDirection } from '../types';

interface ControlPanelProps {
  onSwipe: (direction: SwipeDirection) => void;
  onRewind: () => void;
  remainingSuperLikes: number;
  // AUDIT-FIX: [FE-006] - Added canRewind prop for proper disabled state
  canRewind?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onSwipe, onRewind, remainingSuperLikes, canRewind = true }) => {
  const isSuperLikeDisabled = remainingSuperLikes <= 0;
  // AUDIT-FIX: [FE-006] - Rewind button disabled state for non-premium or no swipe to rewind
  const isRewindDisabled = !canRewind;

  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4 z-20 pointer-events-none">
      
      {/* AUDIT-FIX: [FE-006] - Rewind Button with proper disabled state */}
      <button
        onClick={onRewind}
        disabled={isRewindDisabled}
        className={`pointer-events-auto w-10 h-10 rounded-full backdrop-blur border transition-all shadow-lg flex items-center justify-center group ${
          isRewindDisabled
            ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
            : 'bg-slate-900/80 border-gold-500/50 text-gold-500 hover:text-white hover:bg-gold-500 hover:border-gold-500 active:scale-95'
        }`}
        title={isRewindDisabled ? "Premium feature" : "Rewind"}
        aria-label={isRewindDisabled ? "Rewind (Premium feature)" : "Rewind last swipe"}
      >
        <RotateCcw size={18} className={!isRewindDisabled ? "group-hover:-rotate-45 transition-transform" : ""} />
      </button>

      {/* Pass Button */}
      <button 
        onClick={() => onSwipe(SwipeDirection.LEFT)}
        className="pointer-events-auto w-14 h-14 rounded-full bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-300 hover:text-red-400 hover:border-red-400/50 transition-all shadow-lg flex items-center justify-center group active:scale-95"
      >
        <X size={28} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Super Like Button */}
      <div className="relative pointer-events-auto">
        <button 
          onClick={() => !isSuperLikeDisabled && onSwipe(SwipeDirection.SUPER)}
          disabled={isSuperLikeDisabled}
          className={`w-12 h-12 rounded-full backdrop-blur border transition-all shadow-lg flex items-center justify-center group active:scale-95 ${
            isSuperLikeDisabled 
              ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
              : 'bg-slate-900/80 border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]'
          }`}
        >
          <Star size={20} className={`transition-transform ${!isSuperLikeDisabled && 'group-hover:scale-110 group-hover:rotate-12'}`} fill={!isSuperLikeDisabled ? "currentColor" : "none"} strokeWidth={2.5} />
        </button>
        
        {/* Counter Badge */}
        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-slate-950 ${
            isSuperLikeDisabled ? 'bg-slate-700 text-slate-400' : 'bg-blue-500 text-white'
        }`}>
            {remainingSuperLikes}
        </div>
      </div>

      {/* Like Button */}
      <button 
        onClick={() => onSwipe(SwipeDirection.RIGHT)}
        className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 text-white shadow-lg shadow-gold-500/30 flex items-center justify-center group active:scale-95 transition-all hover:scale-105"
      >
        <Heart size={28} className="group-hover:scale-110 transition-transform" fill="currentColor" stroke="none" />
      </button>
      
      {/* Message for limit reached */}
      {isSuperLikeDisabled && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-slate-400 text-[10px] py-1 px-3 rounded-full border border-slate-800 whitespace-nowrap backdrop-blur-sm animate-fade-in">
          Daily limit reached
        </div>
      )}
    </div>
  );
};