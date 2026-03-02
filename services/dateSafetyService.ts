/**
 * VITALIS Date Safety Service — Özellik 4: Date Odaklı Akış
 *
 * Manages all safety-related features for in-person dates:
 *   • Share Date (WhatsApp / SMS / copy link)
 *   • Trusted contacts (emergency contacts notified on SOS)
 *   • SOS alert triggering
 *   • Safety alert resolution
 *
 * Privacy note: Location data is sent only on explicit SOS trigger,
 * never passively tracked. Trusted contacts stored server-side only;
 * client never receives other users' contact lists.
 */

import { supabase } from '../src/lib/supabase';
import type { TrustedContact, SafetyAlert } from '../types';

// ── Share Date Helpers ────────────────────────────────────────────────────────

export interface ShareDatePayload {
  partnerName: string;
  venue: string;
  dateTime: string;         // ISO string
  userPhone?: string;       // The user's own phone, to include in share text
}

/**
 * Build a share text string for WhatsApp / SMS.
 * Does NOT call any external API — purely client-side text generation.
 */
export function buildShareText(payload: ShareDatePayload): string {
  const dt = new Date(payload.dateTime);
  const formatted = dt.toLocaleString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    `🔒 Vitalis Güvenli Date Bildirimi`,
    ``,
    `Merhaba! Bugün bir randevum var.`,
    `👤 Kiminle: ${payload.partnerName}`,
    `📍 Yer: ${payload.venue}`,
    `🕐 Zaman: ${formatted}`,
    ``,
    `Eğer ${payload.userPhone ? payload.userPhone + ' numaralı telefonumdan' : 'benden'} 2 saat içinde haber almazsan lütfen ulaş.`,
    ``,
    `Bu mesaj Vitalis uygulaması aracılığıyla gönderilmiştir.`,
  ];

  return lines.join('\n');
}

/**
 * Open WhatsApp with a pre-filled share message.
 * Falls back to SMS if WhatsApp is not available (mobile only).
 */
export function shareViaWhatsApp(phone: string, text: string): void {
  const encoded = encodeURIComponent(text);
  const cleaned = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${cleaned}?text=${encoded}`, '_blank');
}

/**
 * Open the native SMS app (mobile only, no-op on desktop).
 */
export function shareViaSMS(phone: string, text: string): void {
  const encoded = encodeURIComponent(text);
  window.open(`sms:${phone}?body=${encoded}`);
}

/**
 * Copy share text to clipboard and return success state.
 */
export async function copyShareText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Core Safety Service ───────────────────────────────────────────────────────

export const dateSafetyService = {
  // ── Trusted Contacts ─────────────────────────────────────────────────────────

  /**
   * Fetch the current user's trusted contacts.
   */
  async getTrustedContacts(): Promise<TrustedContact[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('trusted_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });

    if (error || !data) return [];
    return data as TrustedContact[];
  },

  /**
   * Add a new trusted contact.
   * If `isPrimary = true`, existing primary is automatically demoted.
   */
  async addTrustedContact(params: {
    name: string;
    phone: string;
    relation?: string;
    isPrimary?: boolean;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('upsert_trusted_contact', {
      p_name:       params.name,
      p_phone:      params.phone,
      p_relation:   params.relation ?? 'friend',
      p_is_primary: params.isPrimary ?? false,
    });

    if (error) throw new Error('Güvenilir kişi eklenemedi.');
    return data as string;
  },

  /**
   * Update an existing trusted contact.
   */
  async updateTrustedContact(
    contactId: string,
    changes: Partial<Pick<TrustedContact, 'name' | 'phone' | 'relation' | 'is_primary' | 'notify_on_date'>>,
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    // If making primary, demote existing primary first
    if (changes.is_primary) {
      await supabase
        .from('trusted_contacts')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .neq('id', contactId);
    }

    const { error } = await supabase
      .from('trusted_contacts')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', contactId)
      .eq('user_id', user.id);

    if (error) throw new Error('Kişi güncellenemedi.');
  },

  /**
   * Remove a trusted contact.
   */
  async removeTrustedContact(contactId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { error } = await supabase
      .from('trusted_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id);

    if (error) throw new Error('Kişi silinemedi.');

    // Check if any contacts remain; if not, clear safety_contact_set flag
    const { count } = await supabase
      .from('trusted_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) === 0) {
      await supabase
        .from('profiles')
        .update({ safety_contact_set: false })
        .eq('id', user.id);
    }
  },

  // ── Safety Alerts ─────────────────────────────────────────────────────────────

  /**
   * Trigger an SOS alert.
   * Records location (if provided), notifies all trusted contacts server-side.
   * Returns the new alert id.
   */
  async triggerSOS(params: {
    planId?: string;
    lat?: number;
    lng?: number;
    message?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('trigger_sos_alert', {
      p_plan_id: params.planId ?? null,
      p_lat:     params.lat ?? null,
      p_lng:     params.lng ?? null,
      p_message: params.message ?? 'SOS — Vitalis kullanıcısı yardım istiyor',
    });

    if (error) throw new Error('SOS gönderilemedi. Lütfen doğrudan ara.');
    return data as string;
  },

  /**
   * Get the current user's active safety alerts.
   */
  async getActiveAlerts(): Promise<SafetyAlert[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('safety_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as SafetyAlert[];
  },

  /**
   * Mark a safety alert as resolved (e.g., user is safe after SOS).
   */
  async resolveAlert(alertId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { error } = await supabase
      .from('safety_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) throw new Error('Alert çözümlenemedi.');
  },

  /**
   * Mark an alert as a false alarm.
   */
  async markFalseAlarm(alertId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Oturum bulunamadı.');

    const { error } = await supabase
      .from('safety_alerts')
      .update({ status: 'false_alarm', resolved_at: new Date().toISOString() })
      .eq('id', alertId)
      .eq('user_id', user.id);

    if (error) throw new Error('Alert güncellenemedi.');
  },

  // ── Location Helpers ──────────────────────────────────────────────────────────

  /**
   * Request the browser's Geolocation API.
   * Returns coords or null on denial / error.
   */
  async getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    if (!navigator.geolocation) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()    => resolve(null),
        { timeout: 8000, maximumAge: 60000 },
      );
    });
  },
};
