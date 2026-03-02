import { supabase } from '../src/lib/supabase';

export interface InviteCode {
  id: string;
  code: string;
  owner_id: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface ValidateInviteResult {
  valid: boolean;
  ownerId?: string;
  error?: string;
}

export const inviteService = {
  async validateInviteCode(code: string): Promise<ValidateInviteResult> {
    // Normalize: trim, remove all internal spaces, handle Turkish İ vs I
    const normalized = code.trim().toUpperCase().replace(/İ/g, 'I').replace(/\s+/g, '');

    // Master bypass for development/demo
    if (normalized === 'VITALIS-VIP' || normalized === 'VITALISVIP') {
      return { valid: true };
    }

    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, owner_id, max_uses, current_uses, is_active, expires_at')
      .eq('code', normalized)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Geçersiz davet kodu.' };
    }

    if (!data.is_active) {
      return { valid: false, error: 'Bu davet kodu artık aktif değil.' };
    }

    if (data.current_uses >= data.max_uses) {
      return { valid: false, error: 'Bu davet kodu maksimum kullanım sayısına ulaştı.' };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'Bu davet kodunun süresi dolmuş.' };
    }

    return { valid: true, ownerId: data.owner_id };
  },

  async useInviteCode(code: string, userId: string): Promise<void> {
    const normalized = code.trim().toUpperCase();
    const { data: codeData, error: fetchError } = await supabase
      .from('invite_codes')
      .select('id, current_uses, max_uses')
      .eq('code', normalized)
      .single();

    if (fetchError || !codeData) {
      throw new Error('Davet kodu bulunamadı.');
    }

    const newCount = codeData.current_uses + 1;
    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({
        current_uses: newCount,
        is_active: newCount < codeData.max_uses,
      })
      .eq('id', codeData.id);

    if (updateError) {
      throw new Error('Davet kodu güncellenemedi.');
    }

    // Store used invite code in user's profile metadata
    await supabase
      .from('profiles')
      .update({ onboarding_step: 'register' })
      .eq('id', userId);
  },

  async getUserInviteCodes(userId: string): Promise<InviteCode[]> {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data as InviteCode[]) || [];
  },

  async joinWaitlist(email: string, referralCode?: string): Promise<void> {
    const payload: Record<string, unknown> = { email, status: 'waiting' };
    if (referralCode) {
      payload.referral_code = referralCode.trim().toUpperCase();
    }

    const { error } = await supabase.from('waitlist').upsert(payload, { onConflict: 'email' });
    if (error) {
      throw new Error('Bekleme listesine eklenemedi. Lütfen tekrar deneyin.');
    }
  },
};
