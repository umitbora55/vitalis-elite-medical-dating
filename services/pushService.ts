/**
 * Push Service - Push Notification Management
 *
 * Handles push notification registration, token management, and preferences.
 * Supports both web (Firebase) and mobile (Expo Notifications) contexts.
 */

import { supabase } from '../src/lib/supabase';

// Platform detection
const isWeb = typeof window !== 'undefined' && !('ReactNative' in window);
// const isMobile = !isWeb; // Stubbed for web-only build

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  matches: boolean;
  messages: boolean;
  likes: boolean;
  superLikes: boolean;
  promotions: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string;   // HH:mm format
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  matches: true,
  messages: true,
  likes: true,
  superLikes: true,
  promotions: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export const pushService = {
  /**
   * Register for push notifications (Web - Firebase)
   */
  async registerForPushNotificationsWeb(): Promise<{ token: string | null; error: Error | null }> {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        return { token: null, error: new Error('This browser does not support notifications') };
      }

      // Check permission
      let permission = Notification.permission;

      if (permission === 'denied') {
        return { token: null, error: new Error('Notification permission denied') };
      }

      if (permission === 'default') {
        permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return { token: null, error: new Error('Notification permission not granted') };
        }
      }

      // Get Firebase messaging token
      // Note: This requires Firebase to be initialized in the app
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { firebaseApp } = await import('../src/lib/firebase');

      if (!firebaseApp) {
        return { token: null, error: new Error('Firebase not initialized') };
      }

      const messaging = getMessaging(firebaseApp);
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        return { token: null, error: new Error('VAPID key not configured') };
      }

      const token = await getToken(messaging, { vapidKey });

      if (!token) {
        return { token: null, error: new Error('Failed to get FCM token') };
      }

      // Save token to database
      await this.saveToken(token, 'web');

      return { token, error: null };
    } catch (err) {
      return { token: null, error: err as Error };
    }
  },

  async registerForPushNotificationsMobile(): Promise<{ token: string | null; error: Error | null }> {
    // AUDIT-FIX: TEAM1-P1 — Removed console.log from production stub
    // This function is a stub for mobile. In a web-only Vite environment,
    // we bypass native imports to avoid build errors.
    return { token: null, error: null };
  },

  /**
   * Register for push notifications (auto-detect platform)
   */
  async registerForPushNotifications(): Promise<{ token: string | null; error: Error | null }> {
    if (isWeb) {
      return this.registerForPushNotificationsWeb();
    } else {
      return this.registerForPushNotificationsMobile();
    }
  },

  /**
   * Save push token to database
   */
  async saveToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: user.id,
            token,
            platform,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,token',
          }
        );

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Remove push token (e.g., on logout)
   */
  async removeToken(token?: string): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      let query = supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id);

      if (token) {
        query = query.eq('token', token);
      }

      const { error } = await query;

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Deactivate all tokens for current user
   */
  async deactivateAllTokens(): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      const { error } = await supabase
        .from('push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Get current user's active tokens
   */
  async getActiveTokens(): Promise<{ tokens: PushToken[]; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { tokens: [], error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        return { tokens: [], error };
      }

      return { tokens: data || [], error: null };
    } catch (err) {
      return { tokens: [], error: err as Error };
    }
  },

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<{ preferences: NotificationPreferences; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { preferences: DEFAULT_PREFERENCES, error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .single();

      if (error) {
        return { preferences: DEFAULT_PREFERENCES, error };
      }

      const settings = data?.notification_settings || {};

      return {
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...settings,
        },
        error: null,
      };
    } catch (err) {
      return { preferences: DEFAULT_PREFERENCES, error: err as Error };
    }
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      // Get current settings
      const { data: currentData } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .single();

      const currentSettings = currentData?.notification_settings || {};

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: {
            ...currentSettings,
            ...preferences,
          },
        })
        .eq('id', user.id);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Check if current time is within quiet hours
   */
  isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { quietHoursStart, quietHoursEnd } = preferences;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (quietHoursStart > quietHoursEnd) {
      return currentTime >= quietHoursStart || currentTime < quietHoursEnd;
    }

    // Same day quiet hours (e.g., 14:00 to 16:00)
    return currentTime >= quietHoursStart && currentTime < quietHoursEnd;
  },

  /**
   * Request permission (without registering token)
   */
  async requestPermission(): Promise<{ granted: boolean; error: Error | null }> {
    try {
      if (isWeb) {
        if (!('Notification' in window)) {
          return { granted: false, error: new Error('Notifications not supported') };
        }

        const permission = await Notification.requestPermission();
        return { granted: permission === 'granted', error: null };
      } else {
        // Mobile stub
        return { granted: false, error: null };
      }
    } catch (err) {
      return { granted: false, error: err as Error };
    }
  },

  /**
   * Check current permission status
   */
  async checkPermission(): Promise<{ status: 'granted' | 'denied' | 'default'; error: Error | null }> {
    try {
      if (isWeb) {
        if (!('Notification' in window)) {
          return { status: 'denied', error: new Error('Notifications not supported') };
        }
        return { status: Notification.permission as 'granted' | 'denied' | 'default', error: null };
      } else {
        // Mobile stub
        return { status: 'default', error: null };
      }
    } catch (err) {
      return { status: 'default', error: err as Error };
    }
  },

  /**
   * Schedule daily picks notification at 19:00 local time
   * Web: Uses browser Notification API with a timed callback
   * Mobile: Uses Expo Notifications scheduling
   */
  scheduleDailyPicksNotification(): void {
    if (isWeb) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const scheduleNext = () => {
        const now = new Date();
        const target = new Date();
        target.setHours(19, 0, 0, 0);

        // If past 19:00 today, schedule for tomorrow
        if (now >= target) {
          target.setDate(target.getDate() + 1);
        }

        const delay = target.getTime() - now.getTime();

        const timerId = window.setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification('Vitalis - Bugununun Seckileri Hazir!', {
              body: 'Saglik profesyonellerinden ozel seckileriniz sizi bekliyor.',
              icon: '/icons/icon-192x192.png',
              tag: 'daily-picks',
            });
          }
          // Reschedule for next day
          scheduleNext();
        }, delay);

        // Store timer ID so it can be cancelled
        (window as Window & { _vitalisDailyPicksTimer?: number })._vitalisDailyPicksTimer = timerId;
      };

      scheduleNext();
    }
    // Mobile scheduling is handled server-side via push-worker edge function
  },

  /**
   * Cancel daily picks notification scheduler (call on logout)
   */
  cancelDailyPicksNotification(): void {
    if (isWeb) {
      const timerId = (window as Window & { _vitalisDailyPicksTimer?: number })._vitalisDailyPicksTimer;
      if (timerId) {
        window.clearTimeout(timerId);
        delete (window as Window & { _vitalisDailyPicksTimer?: number })._vitalisDailyPicksTimer;
      }
    }
  },
};

export default pushService;
