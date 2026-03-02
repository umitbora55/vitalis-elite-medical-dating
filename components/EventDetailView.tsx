import React, { useEffect, useState } from 'react';
import {
  eventService,
  VitalisEvent,
  EVENT_TYPE_META,
} from '../services/eventService';
import { eventMatchService } from '../services/eventMatchService';
import { RSVPButton } from './RSVPButton';
import { AttendeesList } from './AttendeesList';
import {
  X, Clock, MapPin, Users, BadgeCheck, Crown,
  Timer, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Profile } from '../types';

interface EventDetailViewProps {
  event: VitalisEvent;
  userId: string;
  isPremium: boolean;
  isRegistered: boolean;
  onClose: () => void;
  onRegistrationChange?: (registered: boolean) => void;
  onViewProfile?: (profile: Profile) => void;
  onUpgradeClick?: () => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event,
  userId,
  isPremium,
  isRegistered,
  onClose,
  onRegistrationChange,
  onViewProfile,
  onUpgradeClick,
}) => {
  const meta         = EVENT_TYPE_META[event.event_type];
  const isFull       = eventService.isFull(event);
  const isVerified   = true; // passed from parent in real app; default true for now
  const [hasWindow, setHasWindow] = useState(false);
  const [windowCountdown, setWindowCountdown] = useState('');
  const [showDesc, setShowDesc]   = useState(false);

  // Check if event match window is open
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      const active = await eventMatchService.isInEventMatchWindow(event.id);
      setHasWindow(active);

      if (active) {
        const win = await eventMatchService.getEventMatchWindow(event.id);
        if (win) {
          const tick = () => setWindowCountdown(
            eventMatchService.getWindowCountdown(win.ends_at)
          );
          tick();
          intervalId = setInterval(tick, 60000);
        }
      }
    };

    void check();
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [event.id]);

  return (
    <div
      className="fixed inset-0 z-[95] bg-slate-950/90 backdrop-blur-md flex items-end justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[92vh]">

        {/* Cover */}
        <div className="relative w-full h-44 overflow-hidden rounded-t-3xl bg-slate-800 flex-shrink-0">
          {event.cover_image ? (
            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">{meta.emoji}</div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/60 flex items-center justify-center text-white hover:bg-slate-900 transition-all"
          >
            <X size={16} />
          </button>

          {/* Type chip */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span className="bg-slate-900/80 text-white text-xs font-bold px-3 py-1 rounded-full">
              {meta.emoji} {meta.label}
            </span>
            {event.is_verified_only && (
              <span className="bg-blue-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <BadgeCheck size={9} /> Doğrulanmış
              </span>
            )}
            {event.is_premium_only && (
              <span className="bg-gold-500/80 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Crown size={9} /> Premium
              </span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2 space-y-5">

          {/* Title */}
          <h2 className="text-xl font-serif font-bold text-white leading-tight">{event.title}</h2>

          {/* Event Match Window Banner */}
          {hasWindow && (
            <div className="flex items-center gap-2.5 bg-gold-500/15 border border-gold-500/30 rounded-xl px-4 py-3">
              <Timer size={16} className="text-gold-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-gold-400">Etkinlik Match Window Aktif!</p>
                <p className="text-[11px] text-slate-400">
                  Bu etkinlikten katılımcılarla eşleşebilirsin.
                  {windowCountdown && ` (${windowCountdown} kaldı)`}
                </p>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-start gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
            <Clock size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">
                {eventService.formatEventDate(event.starts_at)}
              </p>
              <p className="text-xs text-slate-500">
                {eventService.formatEventDateShort(event.starts_at)} – {eventService.formatEventDateShort(event.ends_at)}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location_name && (
            <div className="flex items-start gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <MapPin size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">{event.location_name}</p>
                {event.location_address && (
                  <p className="text-xs text-slate-500">{event.location_address}</p>
                )}
                {event.district && (
                  <p className="text-xs text-slate-500">{event.district}</p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
              <button
                type="button"
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowDesc((p) => !p)}
              >
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Açıklama</span>
                {showDesc ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
              </button>
              {showDesc && (
                <p className="text-sm text-slate-300 leading-relaxed mt-3 whitespace-pre-line">
                  {event.description}
                </p>
              )}
            </div>
          )}

          {/* Capacity */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users size={15} />
            <span>
              <span className="font-semibold text-white">{event.current_attendees}</span>
              {event.max_attendees ? ` / ${event.max_attendees}` : ''} katılımcı
            </span>
            {isFull && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full ml-1">
                Dolu
              </span>
            )}
          </div>

          {/* Attendees */}
          <AttendeesList
            eventId={event.id}
            totalCount={event.current_attendees}
            onViewProfile={onViewProfile}
          />
        </div>

        {/* Footer: RSVP */}
        <div className="px-5 pb-6 pt-4 border-t border-slate-800 flex-shrink-0">
          <RSVPButton
            eventId={event.id}
            userId={userId}
            isPremium={isPremium}
            isVerifiedOnly={event.is_verified_only}
            isVerified={isVerified}
            isFull={isFull}
            initialRegistered={isRegistered}
            onSuccess={(reg) => onRegistrationChange?.(reg)}
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      </div>
    </div>
  );
};
