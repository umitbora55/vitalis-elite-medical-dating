import React from 'react';
import { MapPin, Users, BadgeCheck, Crown, Clock } from 'lucide-react';
import { VitalisEvent, EVENT_TYPE_META, eventService } from '../services/eventService';

interface EventCardProps {
  event: VitalisEvent;
  isRegistered?: boolean;
  onClick?: (event: VitalisEvent) => void;
}

const COLOR_MAP: Record<string, string> = {
  blue:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  amber:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  purple:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  gold:    'bg-gold-500/15 text-gold-400 border-gold-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export const EventCard: React.FC<EventCardProps> = ({ event, isRegistered = false, onClick }) => {
  const meta     = EVENT_TYPE_META[event.event_type];
  const chipCls  = COLOR_MAP[meta.color] ?? COLOR_MAP['gold'];
  const isFull   = eventService.isFull(event);
  const fillPct  = event.max_attendees
    ? Math.min(100, Math.round((event.current_attendees / event.max_attendees) * 100))
    : null;

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className="w-full text-left group bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-gold-500/40 hover:shadow-lg hover:shadow-gold-500/5 transition-all duration-200 active:scale-[0.99]"
    >
      {/* Cover Image */}
      <div className="relative w-full h-36 overflow-hidden bg-slate-100 dark:bg-slate-800">
        {event.cover_image ? (
          <img
            src={event.cover_image}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {meta.emoji}
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${chipCls}`}>
            {meta.emoji} {meta.label}
          </span>
        </div>

        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {event.is_verified_only && (
            <span className="flex items-center gap-1 bg-blue-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <BadgeCheck size={9} /> Doğrulanmış
            </span>
          )}
          {event.is_premium_only && (
            <span className="flex items-center gap-1 bg-gold-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Crown size={9} /> Premium
            </span>
          )}
        </div>

        {/* Registered badge */}
        {isRegistered && (
          <div className="absolute bottom-2.5 right-2.5 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <BadgeCheck size={9} /> Kayıtlısın
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
          {event.title}
        </h3>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-xs text-gold-400 font-semibold mb-2">
          <Clock size={12} className="flex-shrink-0" />
          <span>{eventService.formatEventDateShort(event.starts_at)}</span>
        </div>

        {/* Location */}
        {event.location_name && (
          <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <MapPin size={12} className="flex-shrink-0 mt-0.5" />
            <span className="line-clamp-1">{event.location_name}</span>
          </div>
        )}

        {/* Footer: Attendees + capacity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users size={12} />
            <span>
              {event.current_attendees} katılımcı
              {event.max_attendees ? ` / ${event.max_attendees}` : ''}
            </span>
          </div>

          {isFull ? (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
              Dolu
            </span>
          ) : event.district ? (
            <span className="text-[10px] text-slate-500">{event.district}</span>
          ) : null}
        </div>

        {/* Capacity bar */}
        {fillPct !== null && !isFull && fillPct > 50 && (
          <div className="mt-2.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${fillPct >= 80 ? 'bg-red-400' : 'bg-gold-400'}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        )}
      </div>
    </button>
  );
};
