/**
 * VITALIS Trip Mode Service — Özellik 6: Etik Monetizasyon
 *
 * Enables premium users to receive match suggestions in a city they are
 * visiting before they arrive.
 *
 * Rules:
 *   • Max 3 trips per calendar month
 *   • Max 7 days per trip (can book up to 30 days ahead)
 *   • Only 1 active trip at a time (new activation cancels the old one)
 *   • Locals can opt-out of seeing travellers
 */

import { supabase } from '../src/lib/supabase';
import type { TripModeSession } from '../types';

// ── Turkish city catalogue (curated) ──────────────────────────────────────────

export interface TripCity {
  city:     string;
  lat:      number;
  lng:      number;
  country:  string;
}

export const POPULAR_TRIP_CITIES: TripCity[] = [
  { city: 'Ankara',    lat: 39.9208, lng: 32.8541, country: 'TR' },
  { city: 'İzmir',     lat: 38.4237, lng: 27.1428, country: 'TR' },
  { city: 'Antalya',   lat: 36.8969, lng: 30.7133, country: 'TR' },
  { city: 'Bursa',     lat: 40.1885, lng: 29.0610, country: 'TR' },
  { city: 'Adana',     lat: 37.0000, lng: 35.3213, country: 'TR' },
  { city: 'Konya',     lat: 37.8713, lng: 32.4846, country: 'TR' },
  { city: 'Gaziantep', lat: 37.0662, lng: 37.3833, country: 'TR' },
  { city: 'Mersin',    lat: 36.8000, lng: 34.6333, country: 'TR' },
  { city: 'Eskişehir', lat: 39.7767, lng: 30.5206, country: 'TR' },
  { city: 'Diyarbakır',lat: 37.9144, lng: 40.2306, country: 'TR' },
  { city: 'Samsun',    lat: 41.2867, lng: 36.3300, country: 'TR' },
  { city: 'Trabzon',   lat: 41.0015, lng: 39.7178, country: 'TR' },
  { city: 'Erzurum',   lat: 39.9055, lng: 41.2658, country: 'TR' },
  { city: 'Kayseri',   lat: 38.7312, lng: 35.4787, country: 'TR' },
  { city: 'Bolu',      lat: 40.7359, lng: 31.6067, country: 'TR' },
];

// ── Trip quick slot generation ─────────────────────────────────────────────────

export interface QuickTripOption {
  label:    string;
  startDate: string;  // YYYY-MM-DD
  endDate:   string;
}

/**
 * Generate 4 quick-select trip date options relative to today.
 */
export function buildQuickTripOptions(): QuickTripOption[] {
  const today = new Date();
  const fmt   = (d: Date) => d.toISOString().split('T')[0];

  const options: QuickTripOption[] = [];

  // This weekend
  const friday = new Date(today);
  const dayOfWeek = today.getDay();
  friday.setDate(today.getDate() + ((5 - dayOfWeek + 7) % 7 || 7));
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  options.push({ label: 'Bu hafta sonu', startDate: fmt(friday), endDate: fmt(sunday) });

  // Next week
  const nextMon = new Date(today);
  nextMon.setDate(today.getDate() + ((8 - dayOfWeek) % 7 || 7));
  const nextFri = new Date(nextMon);
  nextFri.setDate(nextMon.getDate() + 4);
  options.push({ label: 'Gelecek hafta', startDate: fmt(nextMon), endDate: fmt(nextFri) });

  // In 2 weeks
  const twoWeekStart = new Date(today);
  twoWeekStart.setDate(today.getDate() + 14);
  const twoWeekEnd   = new Date(twoWeekStart);
  twoWeekEnd.setDate(twoWeekStart.getDate() + 3);
  options.push({ label: '2 hafta sonra', startDate: fmt(twoWeekStart), endDate: fmt(twoWeekEnd) });

  // In 1 month
  const oneMonthStart = new Date(today);
  oneMonthStart.setMonth(today.getMonth() + 1);
  const oneMonthEnd   = new Date(oneMonthStart);
  oneMonthEnd.setDate(oneMonthStart.getDate() + 3);
  options.push({ label: 'Bir ay sonra', startDate: fmt(oneMonthStart), endDate: fmt(oneMonthEnd) });

  return options;
}

// ── Core Service ───────────────────────────────────────────────────────────────

export const tripModeService = {

  /**
   * Get active or planned trip for the current user.
   */
  async getActiveTrip(): Promise<TripModeSession | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('trip_mode_sessions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['planned', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? (data as TripModeSession) : null;
  },

  /**
   * Get all trip sessions for the current user (last 3 months).
   */
  async getTripHistory(): Promise<TripModeSession[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data } = await supabase
      .from('trip_mode_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', threeMonthsAgo.toISOString())
      .order('created_at', { ascending: false });

    return (data ?? []) as TripModeSession[];
  },

  /**
   * Count trips taken this calendar month.
   */
  async getMonthlyTripCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('trip_mode_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .gte('created_at', monthStart.toISOString());

    return count ?? 0;
  },

  /**
   * Activate a trip mode session.
   * Calls the DB RPC which validates capability + monthly limit.
   */
  async activateTrip(params: {
    city:      string;
    lat:       number;
    lng:       number;
    startDate: string;   // YYYY-MM-DD
    endDate:   string;
  }): Promise<{ sessionId: string | null; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { sessionId: null, error: 'Oturum bulunamadı.' };

    const { data, error } = await supabase.rpc('activate_trip_mode', {
      p_user_id:   user.id,
      p_city:      params.city,
      p_lat:       params.lat,
      p_lng:       params.lng,
      p_start_date: params.startDate,
      p_end_date:   params.endDate,
    });

    if (error) {
      if (error.message.includes('TRIP_NOT_ALLOWED'))   return { sessionId: null, error: 'Trip Modu için premium üyelik gereklidir.' };
      if (error.message.includes('TRIP_LIMIT_REACHED')) return { sessionId: null, error: 'Bu ay için aylık trip limitine ulaştınız (3/3).' };
      return { sessionId: null, error: 'Trip başlatılamadı. Lütfen tekrar dene.' };
    }

    return { sessionId: data as string, error: null };
  },

  /**
   * Cancel the current active trip.
   */
  async cancelTrip(sessionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('trip_mode_sessions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    // Clear profile trip city
    await supabase
      .from('profiles')
      .update({ current_trip_city: null })
      .eq('id', user.id);
  },

  /**
   * Toggle the user's preference for receiving travellers in their slate.
   */
  async setAcceptsTravelers(accepts: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ accepts_travelers: accepts })
      .eq('id', user.id);
  },

  /**
   * Get the user's accepts_travelers preference.
   */
  async getAcceptsTravelers(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;

    const { data } = await supabase
      .from('profiles')
      .select('accepts_travelers')
      .eq('id', user.id)
      .maybeSingle();

    return (data as { accepts_travelers?: boolean } | null)?.accepts_travelers ?? true;
  },

  /**
   * Format trip status for display.
   */
  formatTripStatus(session: TripModeSession): string {
    const now = new Date();
    const start = new Date(session.start_date);
    const end   = new Date(session.end_date);

    if (now < start) {
      const days = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} gün sonra başlıyor`;
    }
    if (now >= start && now <= end) {
      return 'Şu an aktif';
    }
    return 'Tamamlandı';
  },
};
