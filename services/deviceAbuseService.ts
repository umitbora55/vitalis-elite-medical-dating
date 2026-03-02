/**
 * Device Abuse Service — Multi-account fingerprint detection
 *
 * Tracks device fingerprints against registered accounts.
 * Thresholds:
 *   1 account  → Normal
 *   2 accounts → Warning (user can continue)
 *   3 accounts → Extra verification required (phone + selfie)
 *   4+ accounts → Auto-flag + admin approval required
 */

import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeviceStatus = 'normal' | 'suspicious' | 'blocked';

export type DeviceCheckResult =
  | { status: 'ok';             accountCount: number }
  | { status: 'warning';        accountCount: number; message: string }
  | { status: 'extra_verify';   accountCount: number; message: string }
  | { status: 'blocked';        accountCount: number; message: string }
  | { status: 'flag_pending';   accountCount: number; message: string };

export interface DeviceAccount {
  id: string;
  device_fingerprint: string;
  user_ids: string[];
  account_count: number;
  first_seen_at: string;
  last_seen_at: string;
  is_flagged: boolean;
  flagged_at: string | null;
  status: DeviceStatus;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const deviceAbuseService = {

  /**
   * Called on registration: record the device + return threshold result.
   * The fingerprint should be generated client-side (canvas, browser APIs, etc.)
   * or passed from the mobile SDK.
   */
  async checkDeviceOnRegister(
    fingerprint: string,
    userId: string
  ): Promise<DeviceCheckResult> {
    if (!fingerprint) {
      return { status: 'ok', accountCount: 1 };
    }

    // Upsert device record
    const { data: existing, error: fetchErr } = await supabase
      .from('device_accounts')
      .select('*')
      .eq('device_fingerprint', fingerprint)
      .maybeSingle();

    if (fetchErr) {
      // Fail open — don't block registration on DB error
      return { status: 'ok', accountCount: 1 };
    }

    if (!existing) {
      // First account on this device
      await supabase.from('device_accounts').insert({
        device_fingerprint: fingerprint,
        user_ids: [userId],
        account_count: 1,
        status: 'normal',
      });
      return { status: 'ok', accountCount: 1 };
    }

    // Device seen before — add this user_id if not already there
    const existingIds: string[] = existing.user_ids ?? [];
    const isNewUser = !existingIds.includes(userId);
    const newCount = isNewUser ? (existing.account_count ?? 1) + 1 : existing.account_count ?? 1;
    const newIds   = isNewUser ? [...existingIds, userId] : existingIds;

    // Determine new status
    let newStatus: DeviceStatus = existing.status as DeviceStatus;
    let shouldFlag = existing.is_flagged as boolean;
    let flaggedAt  = existing.flagged_at as string | null;

    if (newCount >= 4 && newStatus === 'normal') {
      newStatus = 'suspicious';
      shouldFlag = true;
      flaggedAt  = new Date().toISOString();
    }

    await supabase
      .from('device_accounts')
      .update({
        user_ids:     newIds,
        account_count: newCount,
        last_seen_at: new Date().toISOString(),
        status:       newStatus,
        is_flagged:   shouldFlag,
        flagged_at:   flaggedAt,
      })
      .eq('device_fingerprint', fingerprint);

    // Return result based on count
    if (existing.status === 'blocked') {
      return {
        status: 'blocked',
        accountCount: newCount,
        message: 'Bu cihaz güvenlik nedeniyle engellenmiştir.',
      };
    }

    if (newCount >= 4) {
      return {
        status: 'flag_pending',
        accountCount: newCount,
        message: 'Bu cihazda çok sayıda hesap tespit edildi. Hesabınız admin onayına alındı.',
      };
    }

    if (newCount === 3) {
      return {
        status: 'extra_verify',
        accountCount: newCount,
        message: 'Güvenlik nedeniyle ek doğrulama gerekli (telefon + selfie).',
      };
    }

    if (newCount === 2) {
      return {
        status: 'warning',
        accountCount: newCount,
        message: 'Bu cihazda daha önce bir hesap oluşturulmuş. Devam etmek için onaylayın.',
      };
    }

    return { status: 'ok', accountCount: newCount };
  },

  /**
   * Manually flag a device as suspicious (admin use).
   */
  async flagMultiAccountDevice(fingerprint: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('device_accounts')
      .update({
        is_flagged: true,
        flagged_at: new Date().toISOString(),
        status: 'suspicious',
      })
      .eq('device_fingerprint', fingerprint);

    return { error: error ? error.message : null };
  },

  /**
   * Get the full history for a device fingerprint.
   */
  async getDeviceHistory(fingerprint: string): Promise<DeviceAccount | null> {
    const { data, error } = await supabase
      .from('device_accounts')
      .select('*')
      .eq('device_fingerprint', fingerprint)
      .maybeSingle();

    if (error || !data) return null;
    return data as DeviceAccount;
  },

  /**
   * Block a device entirely (admin use).
   */
  async blockDevice(fingerprint: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('device_accounts')
      .update({
        status: 'blocked',
        is_flagged: true,
        flagged_at: new Date().toISOString(),
      })
      .eq('device_fingerprint', fingerprint);

    return { error: error ? error.message : null };
  },

  /**
   * Get all flagged devices (admin use).
   */
  async getFlaggedDevices(): Promise<DeviceAccount[]> {
    const { data } = await supabase
      .from('device_accounts')
      .select('*')
      .eq('is_flagged', true)
      .order('flagged_at', { ascending: false });

    return (data ?? []) as DeviceAccount[];
  },
};
