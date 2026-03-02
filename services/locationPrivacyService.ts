/**
 * VITALIS Location Privacy Service — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Implements approximate location display:
 *   • Real coordinates stored encrypted; never sent to other users
 *   • Display coordinates are offset 500–1500m with a stable per-user seed
 *   • Distance shown as bands, never exact (trilateration protection)
 *   • Privacy levels: approximate (default) → city_only → hidden
 *
 * Trilateration protection: same user always gets the same offset regardless
 * of the requester's location, so multiple distance measurements from different
 * points yield consistent (but still wrong) coordinates.
 */

import { supabase } from '../src/lib/supabase';
import type {
  LocationPrivacyLevel,
  DistanceBand,
  DisplayLocation,
} from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Obfuscation radius range in metres */
const MIN_OFFSET_M = 500;
const MAX_OFFSET_M = 1500;

/** Distance band thresholds (kilometres) */
const DISTANCE_BANDS: Array<{ maxKm: number; band: DistanceBand; label: string }> = [
  { maxKm: 1,   band: 'nearby', label: '1 km\'den yakın' },
  { maxKm: 3,   band: '1_3',    label: '1–3 km' },
  { maxKm: 5,   band: '3_5',    label: '3–5 km' },
  { maxKm: 10,  band: '5_10',   label: '5–10 km' },
  { maxKm: 20,  band: '10_20',  label: '10–20 km' },
  { maxKm: Infinity, band: 'far', label: '20 km\'den uzak' },
];

// ── Maths helpers ─────────────────────────────────────────────────────────────

/** Deterministic "random" number from a seed string — for stable offset */
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  // Normalise to [0, 1)
  return ((h >>> 0) / 0xFFFFFFFF);
}

/**
 * Calculate obfuscated (display) coordinates from a real position.
 * The offset distance and angle are derived from a stable seed so
 * the same user always displaces to the same approximate point.
 */
export function obfuscateLocation(
  realLat: number,
  realLng: number,
  userId: string,
): { displayLat: number; displayLng: number; radiusM: number; seed: string } {
  const seed = `${userId}:loc_salt_v1`;

  // Stable distance between MIN and MAX
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + ':angle');
  const offsetM = MIN_OFFSET_M + r1 * (MAX_OFFSET_M - MIN_OFFSET_M);
  const angleDeg = r2 * 360;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Offset in degrees (approx 111km per degree lat)
  const offsetLat = (offsetM * Math.cos(angleRad)) / 111000;
  const offsetLng = (offsetM * Math.sin(angleRad)) / (111000 * Math.cos((realLat * Math.PI) / 180));

  return {
    displayLat: realLat + offsetLat,
    displayLng: realLng + offsetLng,
    radiusM: Math.round(offsetM + 500),  // Display circle = offset + 500m buffer
    seed,
  };
}

/**
 * Calculate straight-line distance between two coordinates (Haversine).
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convert a raw distance (km) to a privacy-safe distance band.
 * NEVER expose the exact distance — always use a band.
 */
export function getDistanceBand(exactKm: number): { band: DistanceBand; label: string } {
  for (const entry of DISTANCE_BANDS) {
    if (exactKm < entry.maxKm) return { band: entry.band, label: entry.label };
  }
  return { band: 'far', label: '20 km\'den uzak' };
}

/**
 * Get the display label for a distance band.
 */
export function distanceBandLabel(band: DistanceBand): string {
  return DISTANCE_BANDS.find((e) => e.band === band)?.label ?? '—';
}

// ── Core Service ──────────────────────────────────────────────────────────────

export const locationPrivacyService = {

  /**
   * Store the current user's real location in the DB (obfuscated display coordinates
   * are computed here and stored alongside the real ones).
   * The display coordinates are what other users see.
   */
  async updateLocation(params: {
    realLat: number;
    realLng: number;
    city?: string;
    district?: string;
    privacyLevel?: LocationPrivacyLevel;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { displayLat, displayLng, radiusM, seed } = obfuscateLocation(
      params.realLat, params.realLng, user.id,
    );

    const { error } = await supabase.rpc('update_location_privacy', {
      p_real_lat: params.realLat,
      p_real_lng: params.realLng,
      p_disp_lat: displayLat,
      p_disp_lng: displayLng,
      p_radius_m: radiusM,
      p_seed:     seed,
      p_city:     params.city ?? null,
      p_district: params.district ?? null,
      p_privacy:  params.privacyLevel ?? 'approximate',
    });

    if (error) throw new Error('Konum güncellenemedi.');
  },

  /**
   * Get the display location for a user (as shown to other users).
   * Only returns display coords, never real coords.
   */
  async getDisplayLocation(userId: string): Promise<DisplayLocation | null> {
    const { data, error } = await supabase
      .from('location_privacy')
      .select('display_latitude, display_longitude, display_radius_m, city, district, privacy_level')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      display_latitude:  data.display_latitude as number,
      display_longitude: data.display_longitude as number,
      display_radius_m:  data.display_radius_m as number,
      city:              data.city as string | null,
      district:          data.district as string | null,
      privacy_level:     (data.privacy_level as LocationPrivacyLevel) ?? 'approximate',
    };
  },

  /**
   * Get the current user's location privacy settings.
   */
  async getMyPrivacySettings(): Promise<{ privacyLevel: LocationPrivacyLevel; city: string | null; district: string | null } | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('location_privacy')
      .select('privacy_level, city, district')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) return null;
    return {
      privacyLevel: (data.privacy_level as LocationPrivacyLevel) ?? 'approximate',
      city:         data.city as string | null,
      district:     data.district as string | null,
    };
  },

  /**
   * Update just the privacy level (without changing coordinates).
   */
  async setPrivacyLevel(level: LocationPrivacyLevel): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { error } = await supabase
      .from('location_privacy')
      .update({ privacy_level: level, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) throw new Error('Konum gizlilik seviyesi güncellenemedi.');

    // Sync to user_security_settings
    await supabase
      .from('user_security_settings')
      .update({ location_privacy_level: level })
      .eq('user_id', user.id);
  },

  /**
   * Disable location sharing entirely.
   */
  async disableLocation(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    await supabase
      .from('profiles')
      .update({ location_enabled: false, is_location_hidden: true })
      .eq('id', user.id);

    await this.setPrivacyLevel('hidden');
  },

  /**
   * Format a display location as a human-readable string.
   * Examples: "Kadıköy, İstanbul" | "İstanbul" | "Konum gizli"
   */
  formatLocationLabel(loc: DisplayLocation | null, privacyLevel: LocationPrivacyLevel = 'approximate'): string {
    if (!loc || privacyLevel === 'hidden') return 'Konum gizli';
    if (privacyLevel === 'city_only') return loc.city ?? 'Konum gizli';

    // Approximate: show district + city if available
    if (loc.district && loc.city) return `${loc.district}, ${loc.city}`;
    if (loc.city) return `${loc.city} çevresi`;
    return 'Yakın çevrede';
  },
};
