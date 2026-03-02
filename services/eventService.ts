import { supabase } from '../src/lib/supabase';
import { DEMO_EVENTS } from '../constants/demoScenarios';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType = 'conference' | 'meetup' | 'activity' | 'micro_event' | 'walk' | 'coffee';
export type AttendeeStatus = 'registered' | 'checked_in' | 'cancelled' | 'no_show';

export interface VitalisEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  cover_image: string | null;
  location_name: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  city: string;
  district: string | null;
  starts_at: string;
  ends_at: string;
  max_attendees: number | null;
  current_attendees: number;
  is_verified_only: boolean;
  is_premium_only: boolean;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  is_visible: boolean;
  is_anonymous: boolean;
  registered_at: string;
  checked_in_at: string | null;
}

export interface RegisterOptions {
  isVisible?: boolean;
  isAnonymous?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const EVENT_TYPE_META: Record<EventType, { emoji: string; label: string; color: string }> = {
  conference: { emoji: '🏥', label: 'Kongre', color: 'blue' },
  meetup: { emoji: '☕', label: 'Buluşma', color: 'amber' },
  activity: { emoji: '⚡', label: 'Aktivite', color: 'purple' },
  micro_event: { emoji: '✨', label: 'Mini Etkinlik', color: 'gold' },
  walk: { emoji: '🚶', label: 'Yürüyüş', color: 'emerald' },
  coffee: { emoji: '☕', label: 'Kahve', color: 'amber' },
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const eventService = {
  /**
   * Get upcoming events for a city — this week and optionally next week.
   */
  async getUpcomingEvents(
    city: string,
    filters?: {
      eventType?: EventType;
      district?: string;
      verifiedOnly?: boolean;
      includeNextWeek?: boolean;
    },
  ): Promise<VitalisEvent[]> {
    try {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + (filters?.includeNextWeek ? 14 : 7));

      let query = supabase
        .from('events')
        .select('*')
        .eq('city', city)
        .eq('is_active', true)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', weekEnd.toISOString())
        .order('starts_at', { ascending: true });

      if (filters?.eventType) query = query.eq('event_type', filters.eventType);
      if (filters?.district) query = query.eq('district', filters.district);
      if (filters?.verifiedOnly) query = query.eq('is_verified_only', true);

      const { data, error } = await query;
      if (error) throw new Error('Etkinlikler yüklenemedi.');
      return (data ?? []) as VitalisEvent[];
    } catch (err) {
      console.warn('[Events] Supabase unavailable, using demo events:', err);
      return DEMO_EVENTS;
    }
  },

  /**
   * Get a single event by ID.
   */
  async getEventById(eventId: string): Promise<VitalisEvent | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (error) return null;
    return data as VitalisEvent | null;
  },

  /**
   * Get events filtered by type.
   */
  async getEventsByType(type: EventType, city: string): Promise<VitalisEvent[]> {
    return eventService.getUpcomingEvents(city, { eventType: type });
  },

  /**
   * RSVP to an event.
   */
  async registerForEvent(
    eventId: string,
    userId: string,
    options: RegisterOptions = {},
  ): Promise<EventAttendee> {
    const { data, error } = await supabase
      .from('event_attendees')
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          status: 'registered',
          is_visible: options.isVisible ?? true,
          is_anonymous: options.isAnonymous ?? false,
        },
        { onConflict: 'event_id,user_id' },
      )
      .select()
      .single();

    if (error || !data) throw new Error('Etkinliğe kayıt olunamadı.');
    return data as EventAttendee;
  },

  /**
   * Cancel RSVP.
   */
  async cancelRegistration(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('event_attendees')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw new Error('Kayıt iptal edilemedi.');
  },

  /**
   * Get visible attendees for an event.
   */
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    const { data, error } = await supabase
      .from('event_attendees')
      .select('*')
      .eq('event_id', eventId)
      .in('status', ['registered', 'checked_in'])
      .eq('is_visible', true)
      .order('registered_at', { ascending: true });

    if (error) return [];
    return (data ?? []) as EventAttendee[];
  },

  /**
   * Check in to an event.
   */
  async checkInToEvent(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('event_attendees')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw new Error('Check-in yapılamadı.');
  },

  /**
   * Check if the current user is registered for an event.
   */
  async isUserRegistered(
    eventId: string,
    userId: string,
  ): Promise<{ registered: boolean; attendee: EventAttendee | null }> {
    const { data } = await supabase
      .from('event_attendees')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .neq('status', 'cancelled')
      .maybeSingle();

    return { registered: !!data, attendee: data as EventAttendee | null };
  },

  // ── Formatting helpers ───────────────────────────────────────────────────────

  formatEventDate(isoString: string): string {
    const d = new Date(isoString);
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} – ${hh}:${mm}`;
  },

  formatEventDateShort(isoString: string): string {
    const d = new Date(isoString);
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]}, ${hh}:${mm}`;
  },

  isThisWeek(isoString: string): boolean {
    const now = new Date();
    const d = new Date(isoString);
    const daysDiff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 0 && daysDiff < 7;
  },

  isFull(event: VitalisEvent): boolean {
    if (!event.max_attendees) return false;
    return event.current_attendees >= event.max_attendees;
  },
};
