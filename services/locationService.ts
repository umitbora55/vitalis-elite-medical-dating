import { supabase } from '../src/lib/supabase';
import type { Profile } from '../types';

export const locationService = {
  async requestLocationPermission(): Promise<boolean> {
    if (!navigator.geolocation) return false;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 10000, maximumAge: 0 },
      );
    });
  },

  async updateUserLocation(userId: string, lat: number, lng: number): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        current_lat: lat,
        current_lng: lng,
        location_enabled: true,
        location_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error('Konum güncellenemedi.');
    }
  },

  async getUsersWithinDistance(userId: string, distanceKm: number): Promise<Profile[]> {
    // Uses PostGIS earth_distance or application-level filtering via the discovery RPC
    const { data, error } = await supabase.rpc('get_users_within_distance', {
      p_user_id: userId,
      p_distance_km: distanceKm,
    });

    if (error) {
      console.error('[locationService] getUsersWithinDistance error:', error);
      return [];
    }

    return (data as Profile[]) || [];
  },

  getCurrentPosition(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation desteklenmiyor.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 10000 },
      );
    });
  },
};
