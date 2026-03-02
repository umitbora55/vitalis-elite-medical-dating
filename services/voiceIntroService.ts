/**
 * voiceIntroService
 *
 * Feature 11: Voice Intro (15–30s pre-recorded audio)
 * - Upload audio blob to Supabase Storage bucket 'voice-intros'.
 * - Store metadata (path, duration) in voice_intros table.
 * - Retrieve public URL for playback.
 */

import { supabase } from '../src/lib/supabase';
import { VoiceIntro } from '../types';

const BUCKET = 'voice-intros';

export const voiceIntroService = {
  /**
   * Returns the voice intro metadata for a user, or null if none exists.
   */
  async getForUser(userId: string): Promise<VoiceIntro | null> {
    const { data, error } = await supabase
      .from('voice_intros')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    const intro = data as VoiceIntro;
    intro.public_url = await voiceIntroService.getPublicUrl(intro.storage_path);
    return intro;
  },

  /**
   * Uploads an audio blob and upserts the metadata row.
   * durationSeconds must be between 1 and 30.
   */
  async upload(
    userId:          string,
    audioBlob:       Blob,
    durationSeconds: number,
  ): Promise<{ error: string | null; intro: VoiceIntro | null }> {
    if (durationSeconds < 1 || durationSeconds > 30) {
      return { error: 'Ses kaydı 1–30 saniye arasında olmalıdır.', intro: null };
    }

    const path = `${userId}/intro_${Date.now()}.webm`;

    // Delete old file if any
    const { data: existing } = await supabase
      .from('voice_intros')
      .select('storage_path')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.storage_path) {
      await supabase.storage.from(BUCKET).remove([existing.storage_path]);
    }

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, audioBlob, { contentType: 'audio/webm', upsert: true });

    if (uploadError) {
      return { error: uploadError.message, intro: null };
    }

    // Upsert metadata
    const { data, error: dbError } = await supabase
      .from('voice_intros')
      .upsert(
        {
          user_id:          userId,
          storage_path:     path,
          duration_seconds: durationSeconds,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();

    if (dbError || !data) {
      return { error: dbError?.message ?? 'Metadata kaydedilemedi.', intro: null };
    }

    const intro = data as VoiceIntro;
    intro.public_url = await voiceIntroService.getPublicUrl(intro.storage_path);
    return { error: null, intro };
  },

  /**
   * Returns the public URL for a storage path.
   */
  async getPublicUrl(storagePath: string): Promise<string> {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  },

  /**
   * Deletes the user's voice intro (DB row + storage file).
   */
  async delete(userId: string): Promise<{ error: string | null }> {
    const { data: existing } = await supabase
      .from('voice_intros')
      .select('storage_path')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.storage_path) {
      await supabase.storage.from(BUCKET).remove([existing.storage_path]);
    }

    const { error } = await supabase
      .from('voice_intros')
      .delete()
      .eq('user_id', userId);

    return { error: error?.message ?? null };
  },
};
