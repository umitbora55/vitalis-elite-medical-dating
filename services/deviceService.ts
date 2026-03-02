import { supabase } from '../src/lib/supabase';

export interface DeviceSession {
  id: string;
  device_id: string;
  platform: string;
  is_primary: boolean;
  is_verified: boolean;
  last_active_at: string;
  created_at: string;
}

export interface SuspiciousDeviceResult {
  suspicious: boolean;
  requiresVerification: boolean;
}

function generateBrowserFingerprint(): string {
  const components: string[] = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0),
  ];

  // Simple hash
  const raw = components.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export const deviceService = {
  getDeviceFingerprint(): string {
    const stored = sessionStorage.getItem('vitalis_device_fp');
    if (stored) return stored;

    const fp = generateBrowserFingerprint();
    sessionStorage.setItem('vitalis_device_fp', fp);
    return fp;
  },

  async registerDevice(userId: string, fingerprint: string): Promise<void> {
    const deviceId = `web_${fingerprint}`;

    const { error } = await supabase.from('user_devices').upsert(
      {
        user_id: userId,
        device_id: deviceId,
        device_fingerprint: fingerprint,
        platform: 'web',
        is_primary: true,
        is_verified: true,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' },
    );

    if (error) {
      console.error('[deviceService] registerDevice error:', error);
    }
  },

  async checkSuspiciousDevice(fingerprint: string): Promise<SuspiciousDeviceResult> {
    const { data, error } = await supabase
      .from('suspicious_devices')
      .select('account_count, status')
      .eq('device_fingerprint', fingerprint)
      .single();

    if (error || !data) {
      return { suspicious: false, requiresVerification: false };
    }

    const suspicious = data.account_count > 1 || data.status === 'blocked';
    return {
      suspicious,
      requiresVerification: suspicious,
    };
  },

  async getActiveSessions(userId: string): Promise<DeviceSession[]> {
    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false });

    if (error) return [];
    return (data as DeviceSession[]) || [];
  },

  async terminateOtherSessions(userId: string, currentDeviceId: string): Promise<void> {
    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', userId)
      .neq('device_id', currentDeviceId);

    if (error) {
      throw new Error('Diğer oturumlar kapatılamadı.');
    }
  },
};
