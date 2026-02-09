import React from 'react';
import { X, Lightbulb } from 'lucide-react';

interface TooltipProps {
  message: string;
  onClose: () => void;
  className?: string; // For positioning
}

export const Tooltip: React.FC<TooltipProps> = ({ message, onClose, className = "" }) => {
  return (
    <div className={`absolute z-40 max-w-[280px] animate-bounce-gentle ${className}`}>
        <div className="relative bg-slate-800 text-slate-200 p-4 rounded-xl border border-gold-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            {/* Arrow */}
            <div className="absolute top-[-8px] left-6 w-4 h-4 bg-slate-800 border-l border-t border-gold-500/50 transform rotate-45"></div>
            
            <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    <Lightbulb size={20} className="text-gold-500 fill-gold-500/20" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium leading-snug mb-3">
                        {message}
                    </p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="text-xs font-bold text-slate-950 bg-gold-500 px-3 py-1 rounded-full hover:bg-gold-400 transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-2 right-2 text-slate-500 hover:text-white"
            >
                <X size={14} />
            </button>
        </div>
    </div>
  );
};