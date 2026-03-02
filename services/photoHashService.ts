/**
 * Photo Hash Service — Perceptual-hash duplicate detection
 *
 * Computes and stores perceptual hashes of uploaded photos.
 * On each upload:
 *   ≥90% similarity → Automatic duplicate flag
 *   70-89% similarity → Soft flag (admin review)
 *
 * NOTE: True pHash computation requires server-side (Edge Function).
 * Client side stores the hash after the Edge Function computes it.
 */

import { supabase } from '../src/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotoHash {
  id: string;
  user_id: string;
  photo_path: string;
  perceptual_hash: string;
  file_hash: string | null;
  uploaded_at: string;
}

export interface DuplicateFlag {
  id: string;
  original_photo_id: string;
  duplicate_photo_id: string;
  original_user_id: string;
  duplicate_user_id: string;
  similarity_score: number;
  status: 'pending' | 'confirmed_duplicate' | 'false_positive';
  flagged_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // Joined
  original_photo_path?: string;
  duplicate_photo_path?: string;
  original_user_name?: string;
  duplicate_user_name?: string;
}

export type DuplicateCheckResult =
  | { action: 'ok'; message: null }
  | { action: 'soft_flag'; message: string; flagId: string }
  | { action: 'auto_flag'; message: string; flagId: string };

// ─── Hamming distance for hex pHash ──────────────────────────────────────────

function hexToBinary(hex: string): string {
  return hex
    .split('')
    .map((h) => parseInt(h, 16).toString(2).padStart(4, '0'))
    .join('');
}

function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Math.max(a.length, b.length);
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

/**
 * Calculate similarity score (0.0 – 1.0) from two hex pHashes.
 * Uses Hamming distance over 64-bit hash.
 */
function pHashSimilarity(hashA: string, hashB: string): number {
  try {
    const binA = hexToBinary(hashA);
    const binB = hexToBinary(hashB);
    const dist = hammingDistance(binA, binB);
    const bits = Math.max(binA.length, binB.length) || 64;
    return parseFloat((1 - dist / bits).toFixed(2));
  } catch {
    return 0;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const photoHashService = {

  /**
   * Store a new photo hash after Edge Function computes it.
   * Returns the stored record.
   */
  async storeHash(
    userId: string,
    photoPath: string,
    perceptualHash: string,
    fileHash?: string
  ): Promise<PhotoHash | null> {
    const { data, error } = await supabase
      .from('photo_hashes')
      .insert({
        user_id:         userId,
        photo_path:      photoPath,
        perceptual_hash: perceptualHash,
        file_hash:       fileHash ?? null,
      })
      .select()
      .single();

    if (error || !data) return null;
    return data as PhotoHash;
  },

  /**
   * Check for duplicates after a new hash is stored.
   * Compares against all existing hashes (excluding same user).
   */
  async checkForDuplicates(
    newHash: PhotoHash,
    userId: string
  ): Promise<DuplicateCheckResult> {
    // Fetch all other users' hashes
    const { data: existing, error } = await supabase
      .from('photo_hashes')
      .select('id, user_id, photo_path, perceptual_hash')
      .neq('user_id', userId)
      .limit(2000); // Performance cap

    if (error || !existing?.length) return { action: 'ok', message: null };

    let bestScore = 0;
    let bestMatch: typeof existing[0] | null = null;

    for (const row of existing) {
      const score = pHashSimilarity(newHash.perceptual_hash, row.perceptual_hash as string);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = row;
      }
      if (score >= 0.9) break; // Auto-flag threshold hit early
    }

    if (bestScore < 0.7 || !bestMatch) return { action: 'ok', message: null };

    const { flagId } = await photoHashService.flagDuplicatePhoto(
      bestMatch.id as string,
      newHash.id,
      bestMatch.user_id as string,
      userId,
      bestScore
    );

    if (bestScore >= 0.9) {
      return {
        action: 'auto_flag',
        message: 'Yüklenen fotoğraf başka bir hesapta kullanılıyor.',
        flagId,
      };
    }

    return {
      action: 'soft_flag',
      message: 'Fotoğraf benzerliği tespit edildi, incelemeye alındı.',
      flagId,
    };
  },

  /**
   * Create a duplicate flag record.
   */
  async flagDuplicatePhoto(
    originalPhotoId: string,
    duplicatePhotoId: string,
    originalUserId: string,
    duplicateUserId: string,
    similarityScore: number
  ): Promise<{ flagId: string }> {
    const { data } = await supabase
      .from('duplicate_photo_flags')
      .insert({
        original_photo_id:  originalPhotoId,
        duplicate_photo_id: duplicatePhotoId,
        original_user_id:   originalUserId,
        duplicate_user_id:  duplicateUserId,
        similarity_score:   similarityScore,
        status: 'pending',
      })
      .select('id')
      .single();

    return { flagId: (data as { id: string } | null)?.id ?? '' };
  },

  /**
   * Admin: get the full duplicate review queue.
   */
  async getDuplicateQueue(): Promise<DuplicateFlag[]> {
    const { data, error } = await supabase
      .from('duplicate_photo_flags')
      .select(`
        *,
        original_photo:photo_hashes!duplicate_photo_flags_original_photo_id_fkey (
          photo_path,
          profiles!photo_hashes_user_id_fkey ( full_name )
        ),
        duplicate_photo:photo_hashes!duplicate_photo_flags_duplicate_photo_id_fkey (
          photo_path,
          profiles!photo_hashes_user_id_fkey ( full_name )
        )
      `)
      .eq('status', 'pending')
      .order('flagged_at', { ascending: false });

    if (error) return [];

    return (data ?? []).map((row) => {
      const orig = row.original_photo as Record<string, unknown> | null;
      const dup  = row.duplicate_photo as Record<string, unknown> | null;
      const origProf = (orig?.['profiles'] as Record<string, string> | null);
      const dupProf  = (dup?.['profiles'] as Record<string, string> | null);

      return {
        id:                 row.id as string,
        original_photo_id:  row.original_photo_id as string,
        duplicate_photo_id: row.duplicate_photo_id as string,
        original_user_id:   row.original_user_id as string,
        duplicate_user_id:  row.duplicate_user_id as string,
        similarity_score:   row.similarity_score as number,
        status:             row.status as DuplicateFlag['status'],
        flagged_at:         row.flagged_at as string,
        reviewed_at:        row.reviewed_at as string | null,
        reviewed_by:        row.reviewed_by as string | null,
        original_photo_path: orig?.['photo_path'] as string | undefined,
        duplicate_photo_path: dup?.['photo_path'] as string | undefined,
        original_user_name:  origProf?.['full_name'] ?? undefined,
        duplicate_user_name: dupProf?.['full_name'] ?? undefined,
      } satisfies DuplicateFlag;
    });
  },

  /**
   * Admin: resolve a duplicate flag.
   */
  async resolveFlag(
    flagId: string,
    resolution: 'confirmed_duplicate' | 'false_positive',
    reviewedBy: string
  ): Promise<{ error: string | null }> {
    const { data: flag, error: fetchErr } = await supabase
      .from('duplicate_photo_flags')
      .select('duplicate_user_id')
      .eq('id', flagId)
      .single();

    if (fetchErr || !flag) return { error: fetchErr?.message ?? 'Flag bulunamadı' };

    const { error } = await supabase
      .from('duplicate_photo_flags')
      .update({
        status:      resolution,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy,
      })
      .eq('id', flagId);

    if (error) return { error: error.message };

    // If confirmed duplicate — flag the duplicate user
    if (resolution === 'confirmed_duplicate') {
      // Upsert to avoid duplicate rows if user is already flagged
      await supabase
        .from('suspicious_users')
        .upsert({
          user_id:      flag.duplicate_user_id,
          flag_reason:  'Sahte/duplicate fotoğraf kullanımı tespit edildi',
          severity:     'high',
          status:       'open',
          auto_flagged: true,
          evidence:     { duplicate_flag_id: flagId },
        }, { onConflict: 'user_id', ignoreDuplicates: true });
    }

    return { error: null };
  },
};
