import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventMatchWindow {
  id: string;
  event_id: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface EventMatchCandidate {
  user_id: string;
  name: string;
  avatar: string | null;
  specialty: string | null;
  verified: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const eventMatchService = {
  /**
   * Get the active match window for an event (post-event 48h window).
   */
  async getEventMatchWindow(eventId: string): Promise<EventMatchWindow | null> {
    const { data, error } = await supabase
      .from('event_match_windows')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;
    return data as EventMatchWindow;
  },

  /**
   * Get all currently active match windows (across all events) for discovery.
   */
  async getActiveMatchWindows(): Promise<EventMatchWindow[]> {
    const { data, error } = await supabase
      .from('event_match_windows')
      .select('*')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true });

    if (error) return [];
    return (data ?? []) as EventMatchWindow[];
  },

  /**
   * Get event participants eligible for matching with the current user.
   * Excludes: anonymous attendees, already-matched users, the user themselves.
   */
  async getEventParticipantsForMatching(
    eventId: string,
    userId: string,
  ): Promise<EventMatchCandidate[]> {
    const { data, error } = await supabase.rpc('rpc_event_match_candidates', {
      p_event_id: eventId,
      p_user_id:  userId,
    });

    if (error || !data) return [];
    return data as EventMatchCandidate[];
  },

  /**
   * Create a new match that is tied to an event.
   */
  async createEventMatch(
    eventId: string,
    user1Id: string,
    user2Id: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('matches')
      .insert({
        user1_id:       user1Id,
        user2_id:       user2Id,
        event_id:       eventId,
        is_event_match: true,
      });

    if (error) throw new Error('Etkinlik eşleşmesi oluşturulamadı.');
  },

  /**
   * Check whether the 48-hour event match window is currently active.
   */
  async isInEventMatchWindow(eventId: string): Promise<boolean> {
    const window = await eventMatchService.getEventMatchWindow(eventId);
    if (!window) return false;
    const now = Date.now();
    return new Date(window.starts_at).getTime() <= now && new Date(window.ends_at).getTime() > now;
  },

  /**
   * Countdown string for the 48h window (e.g. "31s 22d").
   * Returns empty string if window is not active.
   */
  getWindowCountdown(endsAtIso: string): string {
    const diff = new Date(endsAtIso).getTime() - Date.now();
    if (diff <= 0) return '';
    const totalMinutes = Math.floor(diff / 60000);
    const hours   = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}s ${minutes}d`;
    return `${minutes}d`;
  },

  /**
   * Get events that the user attended where the match window is now open.
   */
  async getUserActiveEventWindows(userId: string): Promise<
    Array<{ window: EventMatchWindow; eventTitle: string; eventId: string }>
  > {
    // 1. Find events user attended
    const { data: attendances } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId)
      .in('status', ['registered', 'checked_in']);

    if (!attendances || attendances.length === 0) return [];

    const eventIds = attendances.map((a) => a.event_id as string);

    // 2. Find active windows for those events
    const { data: windows } = await supabase
      .from('event_match_windows')
      .select('*, events(title)')
      .in('event_id', eventIds)
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString());

    if (!windows) return [];

    return windows.map((w) => ({
      window:     w as EventMatchWindow,
      eventTitle: (w.events as unknown as { title: string })?.title ?? 'Etkinlik',
      eventId:    w.event_id as string,
    }));
  },
};
