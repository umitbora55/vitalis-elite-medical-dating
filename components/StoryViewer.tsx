import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { X, Send, Eye } from 'lucide-react';

interface StoryViewerProps {
  profile: Profile;
  onClose: () => void;
  onSendReply?: (text: string) => void;
  onSendReaction?: (emoji: string) => void;
}

const REACTIONS = ['❤️', '😂', '😮', '👏', '🔥'];

export const StoryViewer: React.FC<StoryViewerProps> = ({ profile, onClose, onSendReply, onSendReaction }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reactionFeedback, setReactionFeedback] = useState<string | null>(null);
  
  const stories = profile.stories || [];
  const currentStory = stories[currentIndex];
  const isMe = profile.id === 'me';

  const storyDuration = 5000; // 5 seconds

  useEffect(() => {
    if (isPaused) return;

    const interval = 100; // Update every 100ms (lower re-render frequency)
    const step = 100 / (storyDuration / interval);

    const timer = setInterval(() => {
        setProgress(prev => {
            if (prev >= 100) {
                if (currentIndex < stories.length - 1) {
                    setCurrentIndex(c => c + 1);
                    return 0;
                } else {
                    onClose();
                    return 100;
                }
            }
            return prev + step;
        });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, stories.length, onClose, isPaused]);

  useEffect(() => {
    if (!reactionFeedback) return;
    const id = window.setTimeout(() => setReactionFeedback(null), 1200);
    return (): void => window.clearTimeout(id);
  }, [reactionFeedback]);

  const handleNext = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (currentIndex < stories.length - 1) {
          setProgress(0);
          setCurrentIndex(prev => prev + 1);
      } else {
          onClose();
      }
  };

  const handlePrev = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (currentIndex > 0) {
          setProgress(0);
          setCurrentIndex(prev => prev - 1);
      }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!replyText.trim()) return;
      if (onSendReply) onSendReply(replyText);
      setReplyText('');
      onClose(); // Close story after sending message
  };

  const handleEmojiClick = (emoji: string) => {
      if (onSendReaction) onSendReaction(emoji);
      setReactionFeedback(`${emoji} gönderildi`);
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-label={`${profile.name} stories`}>
        
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-2 flex gap-1 z-20">
            {stories.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-white transition-[width] linear"
                        style={{ 
                            width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                        }}
                    ></div>
                </div>
            ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 p-4 z-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden">
                    <img src={profile.images[0]} alt={profile.name} className="w-full h-full object-cover" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm shadow-sm">{profile.name}</h3>
                    <p className="text-white/70 text-xs shadow-sm">
                        {new Date(currentStory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
            <button onClick={onClose} aria-label="Close story viewer" className="p-2 text-white hover:bg-white/10 rounded-full">
                <X size={24} />
            </button>
        </div>

        {/* Story Image */}
        <div className="flex-1 relative w-full h-full bg-slate-900">
            <img 
                src={currentStory.imageUrl} 
                alt="Story" 
                className="w-full h-full object-cover" 
            />
            
            {/* Touch Zones (Active only if not typing) */}
            <div className="absolute inset-0 flex z-10">
                <div 
                    className="w-1/3 h-full" 
                    onClick={handlePrev} 
                    onTouchStart={() => setIsPaused(true)} 
                    onTouchEnd={() => setIsPaused(false)}
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                ></div>
                <div 
                    className="w-2/3 h-full" 
                    onClick={handleNext}
                    onTouchStart={() => setIsPaused(true)} 
                    onTouchEnd={() => setIsPaused(false)}
                    onMouseDown={() => setIsPaused(true)}
                    onMouseUp={() => setIsPaused(false)}
                ></div>
            </div>
        </div>

        {/* FOOTER AREA */}
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/60 to-transparent pb-6 pt-12 px-4">
            
            {isMe ? (
                /* --- SELF VIEW: Viewers List --- */
                <div className="flex flex-col gap-3">
                     <div className="flex items-center gap-2 text-white/90 border-b border-white/10 pb-2">
                         <Eye size={18} />
                         <span className="font-bold text-sm">
                             {currentStory.viewers ? currentStory.viewers.length : 0} Views
                         </span>
                     </div>
                     
                     {currentStory.viewers && currentStory.viewers.length > 0 ? (
                         <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto no-scrollbar">
                             {currentStory.viewers.map((viewer) => (
                                 <div key={viewer.id} className="flex items-center justify-between p-1">
                                     <div className="flex items-center gap-3">
                                         <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 relative">
                                             <img src={viewer.avatar} alt={viewer.name} className="w-full h-full object-cover" />
                                             {/* Viewer Reaction Badge */}
                                             {viewer.reaction && (
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-800 rounded-full flex items-center justify-center text-[10px] shadow-sm">
                                                    {viewer.reaction}
                                                </div>
                                             )}
                                         </div>
                                         <span className="text-white text-sm font-medium">{viewer.name}</span>
                                     </div>
                                     {viewer.reaction && (
                                         <span className="text-lg animate-pulse">{viewer.reaction}</span>
                                     )}
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <p className="text-white/50 text-xs italic">No views yet.</p>
                     )}
                </div>
            ) : (
                /* --- OTHER VIEW: Reply & Reactions --- */
                <div className="flex flex-col gap-4">
                     {/* Input Row */}
                     <div className="flex items-center gap-3">
                        <form onSubmit={handleReplySubmit} className="flex-1 relative">
                            <input 
                                type="text" 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onFocus={() => setIsPaused(true)}
                                onBlur={() => setIsPaused(false)}
                                placeholder="Mesaj gönder..." 
                                className="w-full bg-white/10 backdrop-blur-md border border-white/30 rounded-full px-5 py-3 text-white placeholder:text-white/60 focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 focus:bg-black/40 transition-all text-sm"
                            />
                            {replyText && (
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gold-500 rounded-full text-white hover:scale-105 transition-transform">
                                    <Send size={14} />
                                </button>
                            )}
                        </form>
                        
                        {/* Reaction Emojis - Inline with Input */}
                        <div className="flex items-center gap-2">
                            {REACTIONS.map((emoji) => (
                                <button 
                                    key={emoji}
                                    type="button"
                                    aria-label={`Send ${emoji} reaction`}
                                    onClick={() => handleEmojiClick(emoji)}
                                    className="text-2xl hover:scale-125 active:scale-95 transition-transform"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                     </div>
                     {reactionFeedback && (
                        <p className="text-xs text-green-300" role="status" aria-live="polite">
                            {reactionFeedback}
                        </p>
                     )}
                </div>
            )}
        </div>
    </div>
  );
};
