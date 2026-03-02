/**
 * vouchService
 *
 * Feature 7: Peer Vouch (Meslektaş Referansı)
 * - Request, confirm, and revoke professional vouches.
 * - vouch_count is maintained by a DB trigger.
 */

import { supabase } from '../src/lib/supabase';
import { PeerVouch, VouchRelationship } from '../types';

interface RequestVouchPayload {
  voucherId:    string;
  voucheeId:    string;
  relationship: VouchRelationship;
  message:      string;
}

export const vouchService = {
  /**
   * Returns all confirmed/pending vouches for the given user (as vouchee).
   */
  async getVouchesForUser(userId: string): Promise<PeerVouch[]> {
    const { data, error } = await supabase
      .from('peer_vouches')
      .select(`
        *,
        voucher_profile:profiles!peer_vouches_voucher_id_fkey (
          full_name
        )
      `)
      .eq('vouchee_id', userId)
      .neq('status', 'revoked')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as unknown as Array<PeerVouch & {
      voucher_profile: { full_name: string | null } | null;
    }>).map((row) => ({
      id:           row.id,
      voucher_id:   row.voucher_id,
      vouchee_id:   row.vouchee_id,
      relationship: row.relationship,
      message:      row.message,
      status:       row.status,
      created_at:   row.created_at,
      voucher_name: row.voucher_profile?.full_name ?? undefined,
    }));
  },

  /**
   * Submits a vouch request from voucher → vouchee.
   * Message must be at least 20 characters (also enforced DB-side).
   */
  async requestVouch(payload: RequestVouchPayload): Promise<{ error: string | null }> {
    if (payload.message.trim().length < 20) {
      return { error: 'Referans mesajı en az 20 karakter olmalıdır.' };
    }
    if (payload.voucherId === payload.voucheeId) {
      return { error: 'Kendinize referans veremezsiniz.' };
    }

    const { error } = await supabase.from('peer_vouches').insert({
      voucher_id:   payload.voucherId,
      vouchee_id:   payload.voucheeId,
      relationship: payload.relationship,
      message:      payload.message.trim(),
      status:       'pending',
      created_at:   new Date().toISOString(),
    });

    return { error: error?.message ?? null };
  },

  /**
   * Confirms a pending vouch (called by the vouchee).
   * DB trigger increments profiles.vouch_count.
   */
  async confirmVouch(vouchId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('peer_vouches')
      .update({ status: 'confirmed' })
      .eq('id', vouchId);

    return { error: error?.message ?? null };
  },

  /**
   * Revokes a previously confirmed vouch.
   * DB trigger decrements profiles.vouch_count.
   */
  async revokeVouch(vouchId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('peer_vouches')
      .update({ status: 'revoked' })
      .eq('id', vouchId);

    return { error: error?.message ?? null };
  },

  /**
   * Returns true when the profile has at least 2 confirmed vouches.
   */
  isProfessionVouched(profile: { vouch_count?: number }): boolean {
    return (profile.vouch_count ?? 0) >= 2;
  },
};
