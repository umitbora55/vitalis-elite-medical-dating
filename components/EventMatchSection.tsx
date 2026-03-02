import React, { useEffect, useState } from 'react';
import { eventMatchService, EventMatchCandidate } from '../services/eventMatchService';
import { Timer, BadgeCheck, Heart, ChevronRight, Loader2 } from 'lucide-react';

interface EventMatchSectionProps {
  eventId: string;
  eventTitle: string;
  endsAt: string;
  userId: string;
  onViewProfile?: (userId: string) => void;
  className?: string;
}

export const EventMatchSection: React.FC<EventMatchSectionProps> = ({
  eventId,
  eventTitle,
  endsAt,
  userId,
  onViewProfile,
  className = '',
}) => {
  const [candidates, setCandidates] = useState<EventMatchCandidate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [countdown, setCountdown]   = useState('');

  // Countdown tick
  useEffect(() => {
    const tick = () => setCountdown(eventMatchService.getWindowCountdown(endsAt));
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [endsAt]);

  // Load candidates
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await eventMatchService.getEventParticipantsForMatching(eventId, userId);
        setCandidates(data.slice(0, 10)); // show max 10
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [eventId, userId]);

  if (!countdown) return null; // Window closed

  return (
    <div className={`bg-gradient-to-br from-gold-500/10 to-amber-900/10 border border-gold-500/25 rounded-2xl overflow-hidden ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gold-500/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gold-500/20 flex items-center justify-center">
            <Timer size={16} className="text-gold-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-gold-400 leading-tight">Etkinlik Match Window</p>
            <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">{eventTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-gold-500/20 border border-gold-500/30 rounded-full px-2.5 py-1">
          <Timer size={10} className="text-gold-400" />
          <span className="text-[11px] font-bold text-gold-400">{countdown} kaldı</span>
        </div>
      </div>

      {/* Candidate list */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 size={14} className="animate-spin text-slate-500" />
            <span className="text-xs text-slate-500">Yükleniyor…</span>
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-3">
            Şu an eşleşme adayı yok. Daha sonra tekrar kontrol et!
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Bu etkinliğe katılan {candidates.length} kişiyle tanışabilirsin 👇
            </p>
            <div className="space-y-2">
              {candidates.map((c) => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => onViewProfile?.(c.user_id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-gold-500/30 hover:bg-slate-800 transition-all group"
                >
                  {/* Avatar */}
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center text-sm font-bold text-white">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{c.name}</span>
                      {c.verified && (
                        <BadgeCheck size={13} className="text-blue-400 flex-shrink-0" fill="currentColor" />
                      )}
                    </div>
                    {c.specialty && (
                      <p className="text-xs text-slate-500 truncate">{c.specialty}</p>
                    )}
                  </div>

                  {/* Event badge + arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] bg-gold-500/15 border border-gold-500/25 text-gold-400 px-1.5 py-0.5 rounded-full font-semibold">
                      📍 Etkinlik
                    </span>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-gold-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            {/* Like all CTA hint */}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Heart size={11} className="text-rose-400" />
              <span>Bu kişilere keşif sayfanızdan beğeni gönderebilirsiniz</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
