/**
 * Chat Screen
 *
 * Real-time messaging with matched users
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/src/services/supabase';
import { useAuth } from '@/src/hooks/useAuth';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  match_id: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  other_user: {
    id: string;
    name: string;
    photo_paths: string[];
  };
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // If no matchId, show conversation list
  const showConversationList = !matchId;

  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          match_id,
          last_message,
          last_message_at,
          unread_count,
          other_user:profiles!other_user_id (
            id,
            name,
            photo_paths
          )
        `)
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      setConversations((data || []) as unknown as Conversation[]);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (conversationMatchId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', conversationMatchId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (showConversationList) {
      loadConversations();
    } else if (matchId) {
      loadMessages(matchId);
    }
  }, [user, matchId, loadConversations, loadMessages, showConversationList]);

  const sendMessage = async () => {
    if (!user || !matchId || !newMessage.trim() || isSending) return;

    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(matchId);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const openConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    router.setParams({ matchId: conversation.match_id, userId: undefined });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const photoUrl = item.other_user?.photo_paths?.[0] || 'https://via.placeholder.com/60';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => openConversation(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: photoUrl }} style={styles.conversationPhoto} />
        <View style={styles.conversationInfo}>
          <Text style={styles.conversationName}>{item.other_user?.name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message || 'Henüz mesaj yok'}
          </Text>
        </View>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unread_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
          {new Date(item.created_at).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  // Conversation List View
  if (showConversationList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mesajlar</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color="#64748b" />
            <Text style={styles.emptyTitle}>Henüz Mesaj Yok</Text>
            <Text style={styles.emptySubtitle}>
              Eşleşmelerinden biriyle sohbet başlat
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversation}
            contentContainerStyle={styles.conversationList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    );
  }

  // Chat View
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
          <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.setParams({ matchId: undefined, userId: undefined })}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>
            {activeConversation?.other_user?.name || 'Sohbet'}
          </Text>
        </View>
        <TouchableOpacity style={styles.chatHeaderButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={28} color="#64748b" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Mesaj yaz..."
            placeholderTextColor="#64748b"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="send" size={20} color={newMessage.trim() ? '#000' : '#64748b'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationList: {
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  conversationPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#94a3b8',
  },
  unreadBadge: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  chatHeaderButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#D4AF37',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  attachButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1e293b',
  },
});
