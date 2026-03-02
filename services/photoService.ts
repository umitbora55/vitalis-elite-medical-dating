/**
 * Photo Service - Profile Photo Management
 *
 * Handles photo upload, retrieval, and management with Supabase Storage.
 * Supports both web (File API) and mobile (Expo ImagePicker) contexts.
 */

import { supabase } from '../src/lib/supabase';

const BUCKET = 'profile-photos';
const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface UploadResult {
  path: string;
  error: Error | null;
}

interface SignedUrlResult {
  url: string | null;
  error: Error | null;
}

export const photoService = {
  /**
   * Validate file before upload
   */
  validateFile(file: File | Blob): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }

    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: `File type must be one of: ${ALLOWED_TYPES.join(', ')}` };
    }

    return { valid: true };
  },

  /**
   * Upload a photo from web File input
   */
  async uploadFromFile(file: File, index: number): Promise<UploadResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { path: '', error: new Error('Not authenticated') };
      }

      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { path: '', error: new Error(validation.error) };
      }

      const timestamp = Date.now();
      const extension = file.type === 'image/png' ? 'png' : 'jpg';
      const path = `${user.id}/${timestamp}_${index}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        return { path: '', error: uploadError };
      }

      // Trigger async moderation
      this.triggerModeration(path).catch(console.error);

      return { path, error: null };
    } catch (err) {
      return { path: '', error: err as Error };
    }
  },

  /**
   * Upload a photo from a blob/base64
   */
  async uploadFromBlob(blob: Blob, index: number): Promise<UploadResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { path: '', error: new Error('Not authenticated') };
      }

      const validation = this.validateFile(blob);
      if (!validation.valid) {
        return { path: '', error: new Error(validation.error) };
      }

      const timestamp = Date.now();
      const path = `${user.id}/${timestamp}_${index}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        return { path: '', error: uploadError };
      }

      // Trigger async moderation
      this.triggerModeration(path).catch(console.error);

      return { path, error: null };
    } catch (err) {
      return { path: '', error: err as Error };
    }
  },

  /**
   * Upload from URI (for mobile/React Native)
   */
  async uploadFromUri(uri: string, index: number): Promise<UploadResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { path: '', error: new Error('Not authenticated') };
      }

      const response = await fetch(uri);
      const blob = await response.blob();

      return this.uploadFromBlob(blob, index);
    } catch (err) {
      return { path: '', error: err as Error };
    }
  },

  /**
   * Trigger image moderation via Edge Function
   */
  async triggerModeration(imagePath: string): Promise<void> {
    try {
      await supabase.functions.invoke('moderate-image', {
        body: { imagePath, bucket: BUCKET },
      });
    } catch (err) {
      console.error('Moderation trigger failed:', err);
    }
  },

  /**
   * Get a signed URL for a photo path
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<SignedUrlResult> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, expiresIn);

      if (error) {
        return { url: null, error };
      }

      return { url: data.signedUrl, error: null };
    } catch (err) {
      return { url: null, error: err as Error };
    }
  },

  /**
   * Get signed URLs for multiple paths
   */
  async getSignedUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    await Promise.all(
      paths.map(async (path) => {
        try {
          const { data } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(path, expiresIn);

          if (data?.signedUrl) {
            results[path] = data.signedUrl;
          }
        } catch (err) {
          console.error(`Failed to get signed URL for ${path}:`, err);
        }
      })
    );

    return results;
  },

  /**
   * Delete a photo by path
   */
  async deletePath(path: string): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      // Security: Ensure user owns the photo
      if (!path.startsWith(user.id)) {
        return { error: new Error('Cannot delete photos you do not own') };
      }

      const { error } = await supabase.storage.from(BUCKET).remove([path]);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Update profile photo paths in the database
   */
  async updateProfilePhotos(paths: string[]): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      if (paths.length > MAX_PHOTOS) {
        return { error: new Error(`Maximum ${MAX_PHOTOS} photos allowed`) };
      }

      // Validate all paths belong to user
      const invalidPath = paths.find(p => !p.startsWith(user.id));
      if (invalidPath) {
        return { error: new Error('Invalid photo path detected') };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ photo_paths: paths })
        .eq('id', user.id);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Reorder photos (drag and drop support)
   */
  async reorderPhotos(newOrder: string[]): Promise<{ error: Error | null }> {
    return this.updateProfilePhotos(newOrder);
  },

  /**
   * Get current user's photo paths from profile
   */
  async getMyPhotoPaths(): Promise<{ paths: string[]; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { paths: [], error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('photo_paths')
        .eq('id', user.id)
        .single();

      if (error) {
        return { paths: [], error };
      }

      return { paths: data?.photo_paths || [], error: null };
    } catch (err) {
      return { paths: [], error: err as Error };
    }
  },

  /**
   * Compress image on client side (web only)
   */
  async compressImage(file: File, maxWidth = 1080, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  },

  /**
   * Upload with automatic compression (web)
   */
  async uploadWithCompression(file: File, index: number): Promise<UploadResult> {
    try {
      const compressed = await this.compressImage(file);
      return this.uploadFromBlob(compressed, index);
    } catch (err) {
      // Fallback to original if compression fails
      return this.uploadFromFile(file, index);
    }
  },
};

export default photoService;
