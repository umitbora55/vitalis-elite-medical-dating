/**
 * Chat Service - Real-time Messaging
 *
 * Handles conversations, messages, and real-time subscriptions with Supabase.
 * Implements match-gated messaging for safety.
 */

import { supabase } from '../src/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'system';
  media_path: string | null;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  is_active: boolean;
}

export interface ConversationWithParticipant extends Conversation {
  other_user_id: string;
  other_user_name?: string;
  other_user_photo?: string;
  unread_count: number;
}

export interface SendMessageParams {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image';
  mediaPath?: string;
}

const CHAT_MEDIA_BUCKET = 'chat-media';

export const chatService = {
  /**
   * Create or get existing conversation with another user
   * Uses RPC for match-gated creation
   */
  async createConversation(otherUserId: string): Promise<{ conversationId: string | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { conversationId: null, error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase.rpc('create_conversation', {
        p_user1_id: user.id,
        p_user2_id: otherUserId,
      });

      if (error) {
        // Handle specific error messages
        if (error.message?.includes('not matched')) {
          return { conversationId: null, error: new Error('You must be matched to start a conversation') };
        }
        return { conversationId: null, error };
      }

      return { conversationId: data, error: null };
    } catch (err) {
      return { conversationId: null, error: err as Error };
    }
  },

  /**
   * Find existing conversation with another user
   */
  async findConversation(otherUserId: string): Promise<{ conversationId: string | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { conversationId: null, error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase.rpc('find_conversation', {
        p_user1: user.id,
        p_user2: otherUserId,
      });

      if (error) {
        return { conversationId: null, error };
      }

      return { conversationId: data, error: null };
    } catch (err) {
      return { conversationId: null, error: err as Error };
    }
  },

  /**
   * Send a message to a conversation
   */
  async sendMessage(params: SendMessageParams): Promise<{ message: Message | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { message: null, error: new Error('Not authenticated') };
      }

      const { conversationId, content, messageType = 'text', mediaPath } = params;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          media_path: mediaPath,
        })
        .select('*')
        .single();

      if (error) {
        return { message: null, error };
      }

      return { message: data, error: null };
    } catch (err) {
      return { message: null, error: err as Error };
    }
  },

  /**
   * Upload media for chat (images)
   */
  async uploadChatMedia(conversationId: string, file: File | Blob): Promise<{ path: string | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { path: null, error: new Error('Not authenticated') };
      }

      const timestamp = Date.now();
      const path = `${conversationId}/${user.id}_${timestamp}.jpg`;

      const { error } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .upload(path, file, { contentType: 'image/jpeg' });

      if (error) {
        return { path: null, error };
      }

      return { path, error: null };
    } catch (err) {
      return { path: null, error: err as Error };
    }
  },

  /**
   * Upload media from URI (mobile)
   */
  async uploadChatMediaFromUri(conversationId: string, uri: string): Promise<{ path: string | null; error: Error | null }> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return this.uploadChatMedia(conversationId, blob);
    } catch (err) {
      return { path: null, error: err as Error };
    }
  },

  /**
   * Get signed URL for chat media
   */
  async getChatMediaUrl(path: string): Promise<{ url: string | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(CHAT_MEDIA_BUCKET)
        .createSignedUrl(path, 3600);

      if (error) {
        return { url: null, error };
      }

      return { url: data.signedUrl, error: null };
    } catch (err) {
      return { url: null, error: err as Error };
    }
  },

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    options: { limit?: number; before?: string } = {}
  ): Promise<{ messages: Message[]; error: Error | null }> {
    try {
      const { limit = 50, before } = options;

      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) {
        return { messages: [], error };
      }

      // Return in chronological order for display
      return { messages: (data || []).reverse(), error: null };
    } catch (err) {
      return { messages: [], error: err as Error };
    }
  },

  /**
   * Get all conversations for current user
   */
  async getConversations(): Promise<{ conversations: Conversation[]; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { conversations: [], error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversations (
            id,
            created_at,
            updated_at,
            last_message_at,
            last_message_preview,
            last_message_sender_id,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('conversations(last_message_at)', { ascending: false, nullsFirst: false });

      if (error) {
        return { conversations: [], error };
      }

      const conversations = (data || [])
        .flatMap(d => d.conversations)
        .filter((c): c is Conversation => c !== null && typeof c === 'object' && 'id' in c);

      return { conversations, error: null };
    } catch (err) {
      return { conversations: [], error: err as Error };
    }
  },

  /**
   * Get conversation partner info
   */
  async getConversationPartner(conversationId: string): Promise<{ userId: string | null; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { userId: null, error: new Error('Not authenticated') };
      }

      const { data, error } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .single();

      if (error) {
        return { userId: null, error };
      }

      return { userId: data?.user_id, error: null };
    } catch (err) {
      return { userId: null, error: err as Error };
    }
  },

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(
    conversationId: string,
    onMessage: (message: Message) => void
  ): RealtimeChannel {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onMessage(payload.new as Message)
      )
      .subscribe();
  },

  /**
   * Subscribe to conversation updates (for conversation list)
   * AUDIT-FIX: BE-007 — Filter subscription to user's matches only (not all conversations)
   */
  subscribeToConversationUpdates(
    matchIds: string[],
    onUpdate: (conversation: Conversation) => void
  ): RealtimeChannel | null {
    if (matchIds.length === 0) return null;

    // Filter subscription to only the user's match/conversation IDs
    const filter = `id=in.(${matchIds.join(',')})`;

    return supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter,
        },
        (payload) => onUpdate(payload.new as Conversation)
      )
      .subscribe();
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Mute/unmute a conversation
   */
  async setMuted(conversationId: string, muted: boolean): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_muted: muted })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Delete (hide) a conversation for current user
   */
  async deleteConversation(conversationId: string): Promise<{ error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: new Error('Not authenticated') };
      }

      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_deleted: true })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  },

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
  },

  /**
   * Get unread message count for a conversation
   */
  async getUnreadCount(conversationId: string): Promise<{ count: number; error: Error | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { count: 0, error: new Error('Not authenticated') };
      }

      // Get last read timestamp
      const { data: participant, error: participantError } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (participantError) {
        return { count: 0, error: participantError };
      }

      // Count messages after last read
      let query = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .neq('sender_id', user.id);

      if (participant?.last_read_at) {
        query = query.gt('created_at', participant.last_read_at);
      }

      const { count, error } = await query;

      if (error) {
        return { count: 0, error };
      }

      return { count: count || 0, error: null };
    } catch (err) {
      return { count: 0, error: err as Error };
    }
  },
};

export default chatService;
