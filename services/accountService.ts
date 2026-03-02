/**
 * Account Service - Account Management & GDPR Compliance
 *
 * Handles account deletion, data export, and user consent management.
 * Implements GDPR/KVKK compliance requirements.
 */

import { supabase } from '../src/lib/supabase';

export interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  version: string;
  accepted_at: string;
  ip_hash: string | null;
  user_agent: string | null;
}

export interface ExportedData {
  exportDate: string;
  profile: Record<string, unknown> | null;
  photos: Record<string, unknown>[];
  interests: Record<string, unknown>[];
  personalityTags: Record<string, unknown>[];
  questions: Record<string, unknown>[];
  sentMessages: Record<string, unknown>[];
  receivedMessages: Record<string, unknown>[];
  matches: Record<string, unknown>[];
  swipes: Record<string, unknown>[];
  blocks: Record<string, unknown>[];
  verifications: Record<string, unknown>[];
  consents: ConsentRecord[];
  notifications: Record<string, unknown>[];
}

export const accountService = {
  /**
   * Delete account completely via Edge Function
   * This handles:
   * - Storage file deletion (photos, documents)
   * - Database record deletion via RPC
   * - Auth user deletion
   */
  async deleteAccount(): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('Not authenticated') };
      }

      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });

      if (error) {
        return { success: false, error };
      }

      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }

      // Sign out
      await supabase.auth.signOut();

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },

  /**
   * Request data export (GDPR Article 20 - Right to Data Portability)
   */
  async exportData(): Promise<{ data: ExportedData | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('Not authenticated') };
      }

      // AUDIT-FIX: PRV-005 — Complete GDPR Article 20 data export
      // Fetch all user data in parallel, including received messages and missing tables

      // First get user's match IDs so we can fetch received messages
      const matchIdsResult = await supabase
        .from('matches')
        .select('id')
        .or(`profile_1_id.eq.${user.id},profile_2_id.eq.${user.id}`);
      const matchIds = (matchIdsResult.data || []).map((m: { id: string }) => m.id);

      const [
        profileResult,
        photosResult,
        interestsResult,
        tagsResult,
        questionsResult,
        sentMessagesResult,
        receivedMessagesResult,
        matchesResult,
        swipesResult,
        blocksResult,
        verificationsResult,
        consentsResult,
        notificationsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('profile_photos').select('*').eq('profile_id', user.id),
        supabase.from('profile_interests').select('*, interests(name)').eq('profile_id', user.id),
        supabase.from('profile_personality_tags').select('*').eq('profile_id', user.id),
        supabase.from('profile_questions').select('*').eq('profile_id', user.id),
        supabase.from('messages').select('*').eq('sender_id', user.id),
        // Received messages: query via match_id IN user's matches, excluding sent
        matchIds.length > 0
          ? supabase.from('messages').select('*').in('match_id', matchIds).neq('sender_id', user.id)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('matches').select('*').or(`profile_1_id.eq.${user.id},profile_2_id.eq.${user.id}`),
        supabase.from('swipes').select('*').eq('swiper_id', user.id),
        supabase.from('blocks').select('*').eq('blocker_id', user.id),
        supabase.from('verifications').select('*').eq('profile_id', user.id),
        supabase.from('user_consents').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('recipient_id', user.id),
      ]);

      const exportedData: ExportedData = {
        exportDate: new Date().toISOString(),
        profile: profileResult.data,
        photos: photosResult.data || [],
        interests: interestsResult.data || [],
        personalityTags: tagsResult.data || [],
        questions: questionsResult.data || [],
        sentMessages: sentMessagesResult.data || [],
        receivedMessages: receivedMessagesResult.data || [],
        matches: matchesResult.data || [],
        swipes: swipesResult.data || [],
        blocks: blocksResult.data || [],
        verifications: verificationsResult.data || [],
        consents: consentsResult.data || [],
        notifications: notificationsResult.data || [],
      };

      return { data: exportedData, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Download exported data as JSON file
   */
  async downloadExportedData(): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data, error } = await this.exportData();

      if (error || !data) {
        return { success: false, error: error || new Error('No data to export') };
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vitalis-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },

  /**
   * Record user consent
   */
  async recordConsent(
    consentType: string,
    version: string
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('Not authenticated') };
      }

      // Get IP hash (for compliance tracking — SHA-256 one-way hash)
      let ipHash: string | null = null;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const { ip } = await response.json();
        const encoder = new TextEncoder();
        const data = encoder.encode(ip);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 40);
      } catch {
        // IP hash not critical for consent record, continue without
      }

      const { error } = await supabase.from('user_consents').upsert(
        {
          user_id: user.id,
          consent_type: consentType,
          version,
          accepted_at: new Date().toISOString(),
          ip_hash: ipHash,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
        {
          onConflict: 'user_id,consent_type,version',
        }
      );

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },

  /**
   * Get user's consent records
   */
  async getConsents(): Promise<{ consents: ConsentRecord[]; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { consents: [], error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id)
        .order('accepted_at', { ascending: false });

      if (error) {
        return { consents: [], error };
      }

      return { consents: data || [], error: null };
    } catch (err) {
      return { consents: [], error: err as Error };
    }
  },

  /**
   * Check if user has accepted a specific consent
   */
  async hasConsent(consentType: string, minVersion?: string): Promise<{ hasConsent: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { hasConsent: false, error: new Error('Not authenticated') };
      }

      let query = supabase
        .from('user_consents')
        .select('version')
        .eq('user_id', user.id)
        .eq('consent_type', consentType);

      if (minVersion) {
        query = query.gte('version', minVersion);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        return { hasConsent: false, error };
      }

      return { hasConsent: (data?.length || 0) > 0, error: null };
    } catch (err) {
      return { hasConsent: false, error: err as Error };
    }
  },

  /**
   * Deactivate account (soft delete - hide profile)
   */
  async deactivateAccount(): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('Not authenticated') };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', user.id);

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },

  /**
   * Reactivate account
   */
  async reactivateAccount(): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: new Error('Not authenticated') };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true, last_active_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },

  /**
   * Update last active timestamp
   */
  async updateLastActive(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch {
      // Silent fail - not critical
    }
  },

  /**
   * Get account status
   */
  async getAccountStatus(): Promise<{
    isActive: boolean;
    isVerified: boolean;
    lastActive: string | null;
    error: Error | null;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isActive: false, isVerified: false, lastActive: null, error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_active, verification_status, last_active_at')
        .eq('id', user.id)
        .single();

      if (error) {
        return { isActive: false, isVerified: false, lastActive: null, error };
      }

      return {
        isActive: data?.is_active ?? false,
        isVerified: data?.verification_status === 'VERIFIED',
        lastActive: data?.last_active_at ?? null,
        error: null,
      };
    } catch (err) {
      return { isActive: false, isVerified: false, lastActive: null, error: err as Error };
    }
  },
};

export default accountService;

// Alias exports for backward compatibility
export const requestAccountDeletion = accountService.deleteAccount.bind(accountService);
export const requestDataExport = accountService.exportData.bind(accountService);
