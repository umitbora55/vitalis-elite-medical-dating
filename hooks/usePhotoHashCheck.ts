/**
 * usePhotoHashCheck
 *
 * React hook that wraps photoHashService.checkForDuplicates.
 * Call `checkPhoto(userId, photoPath, perceptualHash)` after a photo is uploaded.
 * Returns the duplicate check result and a loading flag.
 *
 * Usage:
 *   const { checkPhoto, result, loading } = usePhotoHashCheck();
 *   const r = await checkPhoto(userId, path, hash);
 *   if (r?.status === 'auto_flag') { showWarning(); }
 */

import { useState, useCallback } from 'react';
import {
  photoHashService,
  DuplicateCheckResult,
  PhotoHash,
} from '../services/photoHashService';

interface UsePhotoHashCheckReturn {
  checkPhoto: (
    userId: string,
    photoPath: string,
    perceptualHash: string,
    fileHash?: string,
  ) => Promise<DuplicateCheckResult | null>;
  result: DuplicateCheckResult | null;
  loading: boolean;
  reset: () => void;
}

export function usePhotoHashCheck(): UsePhotoHashCheckReturn {
  const [result, setResult]   = useState<DuplicateCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkPhoto = useCallback(async (
    userId: string,
    photoPath: string,
    perceptualHash: string,
    fileHash?: string,
  ): Promise<DuplicateCheckResult | null> => {
    setLoading(true);
    setResult(null);

    try {
      // 1. Store hash in DB
      await photoHashService.storeHash(userId, photoPath, perceptualHash, fileHash);

      // 2. Check for duplicates (build PhotoHash object for comparison)
      const hashObj: PhotoHash = {
        id:              '', // not used for comparison
        user_id:         userId,
        photo_path:      photoPath,
        perceptual_hash: perceptualHash,
        file_hash:       fileHash ?? null,
        uploaded_at:     new Date().toISOString(),
      };
      const dupResult = await photoHashService.checkForDuplicates(hashObj, userId);
      setResult(dupResult);
      return dupResult;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setLoading(false);
  }, []);

  return { checkPhoto, result, loading, reset };
}
