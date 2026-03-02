import React, { useCallback, useEffect, useState } from 'react';
import {
  eventService,
  EventType,
  VitalisEvent,
} from '../services/eventService';
import { eventMatchService } from '../services/eventMatchService';
import { EventCard } from './EventCard';
import { EventDetailView } from './EventDetailView';
import { EventMatchSection } from './EventMatchSection';
import { SlidersHorizontal, Loader2, RefreshCw, CalendarX } from 'lucide-react';

interface EventFeedProps {
  userId: string;
  userCity: string;
  isPremium: boolean;
  isVerified: boolean;
  onUpgradeClick?: () => void;
}

type WeekTab = 'this' | 'next';

const ALL_TYPES: { value: EventType | 'all' | 'curated_elite'; label: string; emoji: string }[] = [
  { value: 'all', label: 'Tümü', emoji: '📋' },
  { value: 'conference', label: 'Kongre', emoji: '🏥' },
  { value: 'meetup', label: 'Buluşma', emoji: '☕' },
  { value: 'activity', label: 'Aktivite', emoji: '⚡' },
  { value: 'micro_event', label: 'Mini Etkinlik', emoji: '✨' },
  { value: 'walk', label: 'Yürüyüş', emoji: '🚶' },
  { value: 'coffee', label: 'Kahve', emoji: '☕' },
  { value: 'curated_elite', label: 'Elite', emoji: '👑' },
];

export const EventFeed: React.FC<EventFeedProps> = ({
  userId,
  userCity,
  isPremium,
  isVerified,
  onUpgradeClick,
}) => {
  const [weekTab, setWeekTab] = useState<WeekTab>('this');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState(false);
  const [events, setEvents] = useState<VitalisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<VitalisEvent | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [activeWindowEventId, setActiveWindowEventId] = useState<string | null>(null);
  const [activeWindowTitle, setActiveWindowTitle] = useState('');
  const [activeWindowEndsAt, setActiveWindowEndsAt] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventService.getUpcomingEvents(userCity, {
        eventType: typeFilter === 'all' ? undefined : typeFilter,
        verifiedOnly: verifiedFilter,
        includeNextWeek: weekTab === 'next',
      });
      // For "next" tab, filter to only show the second week
      const filtered = weekTab === 'next'
        ? data.filter((e) => !eventService.isThisWeek(e.starts_at))
        : data.filter((e) => eventService.isThisWeek(e.starts_at));
      setEvents(filtered);
    } catch {
      setError('Etkinlikler yüklenemedi. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [userCity, typeFilter, verifiedFilter, weekTab]);

  const loadRegistrations = useCallback(async () => {
    if (!events.length) return;
    const checks = await Promise.allSettled(
      events.map((e) => eventService.isUserRegistered(e.id, userId)),
    );
    const ids = new Set<string>();
    checks.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.registered) {
        ids.add(events[i].id);
      }
    });
    setRegisteredIds(ids);
  }, [events, userId]);

  const loadActiveWindows = useCallback(async () => {
    const windows = await eventMatchService.getUserActiveEventWindows(userId);
    if (windows.length > 0) {
      const first = windows[0];
      setActiveWindowEventId(first.eventId);
      setActiveWindowTitle(first.eventTitle);
      setActiveWindowEndsAt(first.window.ends_at);
    }
  }, [userId]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);
  useEffect(() => { void loadRegistrations(); }, [loadRegistrations]);
  useEffect(() => { void loadActiveWindows(); }, [loadActiveWindows]);

  const handleRegistrationChange = (eventId: string, registered: boolean) => {
    setRegisteredIds((prev) => {
      const next = new Set(prev);
      if (registered) next.add(eventId); else next.delete(eventId);
      return next;
    });
  };

  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-24 overflow-y-auto hide-scrollbar">

      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold text-gold-500/70 uppercase tracking-[0.25em] mb-1">{userCity}</p>
        <h2 className="text-4xl font-serif font-bold text-white tracking-tight leading-none">Etkinlikler</h2>
        <div className="w-8 h-[2px] bg-gradient-to-r from-gold-500 to-transparent rounded-full mt-3" />
      </div>

      {/* Event Match Window Banner */}
      {activeWindowEventId && activeWindowEndsAt && (
        <EventMatchSection
          eventId={activeWindowEventId}
          eventTitle={activeWindowTitle}
          endsAt={activeWindowEndsAt}
          userId={userId}
          onViewProfile={() => { /* handled inside */ }}
          className="mb-5"
        />
      )}

      {/* Week Tabs — segmented control */}
      <div className="flex gap-1 mb-5 bg-slate-900/60 rounded-2xl p-1 border border-slate-800/60">
        {(['this', 'next'] as WeekTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setWeekTab(tab)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${weekTab === tab
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {tab === 'this' ? 'Bu Hafta' : 'Gelecek Hafta'}
          </button>
        ))}
      </div>

      {/* Type Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ALL_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTypeFilter(t.value as EventType | 'all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${typeFilter === t.value
                ? 'bg-gold-500/20 border-gold-500/70 text-gold-300 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Verified-only toggle */}
      <div className="flex items-center justify-between mb-6 py-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-slate-500" />
          <span className="text-xs text-slate-500 font-medium">Sadece doğrulanmış</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={verifiedFilter}
          onClick={() => setVerifiedFilter((p) => !p)}
          className={`relative w-9 h-5 rounded-full transition-all duration-200 ${verifiedFilter ? 'bg-gold-500' : 'bg-slate-700'
            }`}
        >
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${verifiedFilter ? 'translate-x-4' : 'translate-x-0'
            }`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 size={28} className="animate-spin text-gold-400" />
          <p className="text-sm text-slate-500">Etkinlikler yükleniyor…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-sm text-red-400 text-center">{error}</p>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-all"
          >
            <RefreshCw size={14} /> Tekrar dene
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <CalendarX size={28} className="text-slate-400" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
              Etkinlik bulunamadı
            </p>
            <p className="text-sm text-slate-500">
              {weekTab === 'this'
                ? 'Bu hafta için henüz etkinlik yok.'
                : 'Gelecek hafta için henüz etkinlik yok.'}
            </p>
          </div>
          {typeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className="text-xs text-gold-400 hover:underline"
            >
              Tüm etkinlikleri göster
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const locked = (event.is_premium_only && !isPremium) ||
              (event.is_verified_only && !isVerified);

            // curated_elite events require verification
            const rawEventType = (event as unknown as { event_type?: string }).event_type;
            const eliteLocked = rawEventType === 'curated_elite' && !isVerified;

            // Micro event capacity display
            const isMicroEvent = rawEventType === 'micro_event';
            const participantCount = (event as VitalisEvent & { participants_count?: number }).participants_count ?? 0;
            const maxCapacity = (event as VitalisEvent & { max_capacity?: number }).max_capacity ?? 25;
            const capacityPct = Math.min(100, Math.round((participantCount / maxCapacity) * 100));
            const isFull = participantCount >= maxCapacity;

            return (
              <div key={event.id} className="relative">
                <EventCard
                  event={event}
                  isRegistered={registeredIds.has(event.id)}
                  onClick={() => {
                    if (locked || eliteLocked) { onUpgradeClick?.(); return; }
                    setSelectedEvent(event);
                  }}
                />

                {/* Micro event capacity badge */}
                {isMicroEvent && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/80 border border-slate-700 rounded-full px-2 py-0.5 text-[10px] font-bold">
                    <span className={isFull ? 'text-red-400' : capacityPct >= 80 ? 'text-amber-400' : 'text-emerald-400'}>
                      {isFull ? 'Dolu' : `${participantCount}/${maxCapacity}`}
                    </span>
                  </div>
                )}

                {/* Lock overlay for premium/verified gating */}
                {(locked || eliteLocked) && (
                  <div className="absolute inset-0 rounded-2xl bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-slate-900/90 border border-gold-500/30 rounded-xl px-4 py-3 text-center">
                      <p className="text-xs font-bold text-gold-400 mb-1">
                        {eliteLocked
                          ? '👑 Elite Etkinlik'
                          : event.is_premium_only
                            ? '👑 Premium Etkinlik'
                            : '✅ Doğrulanmış Kullanıcı'}
                      </p>
                      <button
                        type="button"
                        onClick={onUpgradeClick}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        Erişim için yükselt →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailView
          event={selectedEvent}
          userId={userId}
          isPremium={isPremium}
          isRegistered={registeredIds.has(selectedEvent.id)}
          onClose={() => setSelectedEvent(null)}
          onRegistrationChange={(registered) => {
            handleRegistrationChange(selectedEvent.id, registered);
          }}
          onUpgradeClick={onUpgradeClick}
        />
      )}
    </div>
  );
};
