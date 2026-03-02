import { supabase } from '../src/lib/supabase';

export interface DutyModeStatus {
  isOnDuty: boolean;
  dutyEndsAt: string | null;
  hoursRemaining: number;
}

export interface AvailableNowStatus {
  is_available_now: boolean;
  available_until: string | null;
  available_district: string | null;
}

// In-memory mock state for dev/demo purposes with 'me' ID
let mockDutyStatus: DutyModeStatus = { isOnDuty: false, dutyEndsAt: null, hoursRemaining: 0 };
let mockAvailableStatus: AvailableNowStatus = { is_available_now: false, available_until: null, available_district: null };

export const dutyModeService = {
  /**
   * Activate duty mode for a user
   */
  async activateDutyMode(userId: string, durationHours = 12): Promise<void> {
    if (userId === 'me') {
      const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      mockDutyStatus = { isOnDuty: true, dutyEndsAt: endsAt, hoursRemaining: durationHours };
      return Promise.resolve();
    }

    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({
        is_on_duty: true,
        duty_ends_at: endsAt,
        daily_pick_limit: 2,
      })
      .eq('id', userId);

    if (error) throw new Error('Nöbet modu aktifleştirilemedi.');
  },

  /**
   * Deactivate duty mode
   */
  async deactivateDutyMode(userId: string): Promise<void> {
    if (userId === 'me') {
      mockDutyStatus = { isOnDuty: false, dutyEndsAt: null, hoursRemaining: 0 };
      return Promise.resolve();
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        is_on_duty: false,
        duty_ends_at: null,
        daily_pick_limit: 3,
      })
      .eq('id', userId);

    if (error) throw new Error('Nöbet modu kapatılamadı.');
  },

  /**
   * Get current duty status for a user
   */
  async getDutyStatus(userId: string): Promise<DutyModeStatus> {
    if (userId === 'me') {
      if (mockDutyStatus.isOnDuty && mockDutyStatus.dutyEndsAt) {
        const msLeft = new Date(mockDutyStatus.dutyEndsAt).getTime() - Date.now();
        mockDutyStatus.hoursRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
        if (msLeft <= 0) {
          mockDutyStatus = { isOnDuty: false, dutyEndsAt: null, hoursRemaining: 0 };
        }
      }
      return mockDutyStatus;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('is_on_duty, duty_ends_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { isOnDuty: false, dutyEndsAt: null, hoursRemaining: 0 };
    }

    const isOnDuty = Boolean(data.is_on_duty);
    const dutyEndsAt = data.duty_ends_at as string | null;

    let hoursRemaining = 0;
    if (isOnDuty && dutyEndsAt) {
      const msLeft = new Date(dutyEndsAt).getTime() - Date.now();
      hoursRemaining = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));

      if (msLeft <= 0) {
        void dutyModeService.deactivateDutyMode(userId);
        return { isOnDuty: false, dutyEndsAt: null, hoursRemaining: 0 };
      }
    }

    return { isOnDuty, dutyEndsAt, hoursRemaining };
  },

  /**
   * Activate "Şu an Müsaitim" mode
   */
  async activateAvailableNow(userId: string, district: string, visibility: 'all' | 'verified' | 'matches_only' = 'all'): Promise<void> {
    if (userId === 'me') {
      const availableUntil = new Date(Date.now() + 90 * 60 * 1000).toISOString();
      mockAvailableStatus = { is_available_now: true, available_until: availableUntil, available_district: district };
      return Promise.resolve();
    }

    const availableUntil = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({
        is_available_now: true,
        available_until: availableUntil,
        available_district: district,
        availability_visibility: visibility,
      })
      .eq('id', userId);

    if (error) throw new Error('"Şu an Müsaitim" modu aktifleştirilemedi.');
  },

  /**
   * Deactivate "Şu an Müsaitim"
   */
  async deactivateAvailableNow(userId: string): Promise<void> {
    if (userId === 'me') {
      mockAvailableStatus = { is_available_now: false, available_until: null, available_district: null };
      return Promise.resolve();
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_available_now: false, available_until: null, available_district: null })
      .eq('id', userId);

    if (error) throw new Error('"Şu an Müsaitim" modu kapatılamadı.');
  },

  /**
   * Get current "Available Now" status
   */
  async getAvailableStatus(userId: string): Promise<AvailableNowStatus> {
    if (userId === 'me') {
      if (mockAvailableStatus.is_available_now && mockAvailableStatus.available_until) {
        const msLeft = new Date(mockAvailableStatus.available_until).getTime() - Date.now();
        if (msLeft <= 0) {
          mockAvailableStatus = { is_available_now: false, available_until: null, available_district: null };
        }
      }
      return mockAvailableStatus;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('is_available_now, available_until, available_district')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { is_available_now: false, available_until: null, available_district: null };
    }

    const isAvailable = Boolean(data.is_available_now);
    const availableUntil = data.available_until as string | null;

    if (isAvailable && availableUntil) {
      const msLeft = new Date(availableUntil).getTime() - Date.now();
      if (msLeft <= 0) {
        void dutyModeService.deactivateAvailableNow(userId);
        return { is_available_now: false, available_until: null, available_district: null };
      }
    }

    return {
      is_available_now: isAvailable,
      available_until: availableUntil,
      available_district: data.available_district as string | null,
    };
  },

  /**
   * Get countdown string
   */
  getAvailableCountdown(availableUntilIso: string | null): string {
    if (!availableUntilIso) return '';
    const msLeft = new Date(availableUntilIso).getTime() - Date.now();
    if (msLeft <= 0) return 'Süresi doldu';
    const totalMin = Math.floor(msLeft / 60000);
    const secs = Math.floor((msLeft % 60000) / 1000);
    return `${totalMin}:${String(secs).padStart(2, '0')}`;
  },
};
