/**
 * watermarkService
 *
 * Feature 1: Screenshot Deterrence
 * - Generates a dynamic watermark text that encodes viewer identity + timestamp.
 * - Logs potential screenshot attempts (blur/visibilitychange events) to DB via RPC.
 */

import { supabase } from '../src/lib/supabase';

type ScreenshotEventType = 'blur' | 'visibilitychange' | 'devtools';

export const watermarkService = {
  /**
   * Returns a compact watermark string for overlay rendering.
   * Format: "VTL-{8-char userId}-{epoch minutes}"
   * Changes every minute so static screenshots reveal approximate time.
   */
  getWatermarkText(userId: string): string {
    const epochMin = Math.floor(Date.now() / 60_000);
    const shortId  = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `VTL-${shortId}-${epochMin}`;
  },

  /**
   * Logs a screenshot-attempt event.
   * Uses RPC to increment attempt counter on the viewed profile.
   */
  async logScreenshotAttempt(
    viewerId:         string,
    viewedProfileId:  string,
    eventType:        ScreenshotEventType,
  ): Promise<void> {
    // Insert event log
    await supabase.from('screenshot_logs').insert({
      viewer_id:         viewerId,
      viewed_profile_id: viewedProfileId,
      event_type:        eventType,
      occurred_at:       new Date().toISOString(),
    });

    // Increment the counter on the viewed user's profile
    await supabase.rpc('increment_screenshot_count', { p_user_id: viewedProfileId });
  },
};
