/**
 * Profile Service - Mobile
 *
 * Handles profile CRUD operations and discovery
 */

import { supabase } from './supabase';

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  role?: string;
  specialty?: string;
  hospital?: string;
  city?: string;
  photo_paths: string[];
  is_verified: boolean;
  is_available?: boolean;
  distance?: number;
  compatibility_score?: number;
  last_active?: string;
  likes_received?: number;
  matches_count?: number;
  profile_views?: number;
}

export const profileService = {
  /**
   * Get a specific profile by ID
   */
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to get profile:', err);
      return null;
    }
  },

  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<Profile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      return this.getProfile(user.id);
    } catch (err) {
      console.error('Failed to get my profile:', err);
      return null;
    }
  },

  /**
   * Update profile
   */
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update profile:', err);
      return false;
    }
  },

  /**
   * Get discovery profiles (for swiping)
   */
  async getDiscoveryProfiles(userId: string, limit = 20): Promise<Profile[]> {
    try {
      // Get IDs of already swiped profiles
      const { data: swipedData } = await supabase
        .from('swipes')
        .select('target_user_id')
        .eq('user_id', userId);

      const swipedIds = swipedData?.map(s => s.target_user_id) || [];
      swipedIds.push(userId); // Exclude self

      // Build query
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .limit(limit);

      // Exclude already swiped profiles
      if (swipedIds.length > 0) {
        query = query.not('id', 'in', `(${swipedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get discovery profiles:', err);
      return [];
    }
  },

  /**
   * Record a swipe action
   */
  async recordSwipe(
    userId: string,
    targetUserId: string,
    action: 'like' | 'pass' | 'super_like'
  ): Promise<{ isMatch: boolean }> {
    try {
      // Convert action to uppercase for DB
      const dbAction = action.toUpperCase();

      // Record the swipe
      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({
          user_id: userId,
          target_user_id: targetUserId,
          action: dbAction,
        });

      if (swipeError) throw swipeError;

      // Check for match if it's a like
      if (action === 'like' || action === 'super_like') {
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('action')
          .eq('user_id', targetUserId)
          .eq('target_user_id', userId)
          .in('action', ['LIKE', 'SUPER_LIKE'])
          .maybeSingle();

        if (theirSwipe) {
          // Create match - ensure consistent ordering
          const [user1, user2] = userId < targetUserId
            ? [userId, targetUserId]
            : [targetUserId, userId];

          await supabase.from('matches').insert({
            user_id_1: user1,
            user_id_2: user2,
          });

          return { isMatch: true };
        }
      }

      return { isMatch: false };
    } catch (err) {
      console.error('Failed to record swipe:', err);
      return { isMatch: false };
    }
  },

  /**
   * Get user's matches
   */
  async getMatches(userId: string): Promise<Profile[]> {
    try {
      // Get matches where user is either user_id_1 or user_id_2
      const { data: matches1 } = await supabase
        .from('matches')
        .select('user_id_2')
        .eq('user_id_1', userId);

      const { data: matches2 } = await supabase
        .from('matches')
        .select('user_id_1')
        .eq('user_id_2', userId);

      const matchedUserIds = [
        ...(matches1?.map(m => m.user_id_2) || []),
        ...(matches2?.map(m => m.user_id_1) || []),
      ];

      if (matchedUserIds.length === 0) return [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', matchedUserIds);

      if (error) throw error;
      return profiles || [];
    } catch (err) {
      console.error('Failed to get matches:', err);
      return [];
    }
  },

  /**
   * Upload profile photo
   */
  async uploadPhoto(userId: string, uri: string): Promise<string | null> {
    try {
      const fileName = `${userId}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload photo:', err);
      return null;
    }
  },
};

export default profileService;
