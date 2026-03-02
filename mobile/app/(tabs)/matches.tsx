/**
 * Matches Screen
 *
 * Shows matched profiles with FlatList virtualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/services/supabase';
import { useAuth } from '@/src/hooks/useAuth';

interface Match {
  id: string;
  matched_user_id: string;
  matched_at: string;
  profile: {
    id: string;
    name: string;
    age: number;
    photo_paths: string[];
    specialty?: string;
    is_verified: boolean;
  };
}

export default function MatchesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadMatches = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          matched_user_id,
          matched_at,
          profile:profiles!matched_user_id (
            id,
            name,
            age,
            photo_paths,
            specialty,
            is_verified
          )
        `)
        .eq('user_id', user.id)
        .order('matched_at', { ascending: false });

      if (error) throw error;

      setMatches((data || []) as unknown as Match[]);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    if (user) {
      loadMatches();
    }
  }, [user, loadMatches]);

  const navigateToChat = (match: Match) => {
    router.push({
      pathname: '/(tabs)/chat',
      params: { matchId: match.id, userId: match.matched_user_id },
    });
  };

  const renderMatch = ({ item }: { item: Match }) => {
    const photoUrl = item.profile?.photo_paths?.[0] || 'https://via.placeholder.com/100';

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => navigateToChat(item)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: photoUrl }} style={styles.matchPhoto} />
        <View style={styles.matchInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.matchName}>
              {item.profile?.name}, {item.profile?.age}
            </Text>
            {item.profile?.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#000" />
              </View>
            )}
          </View>
          {item.profile?.specialty && (
            <Text style={styles.specialty}>{item.profile.specialty}</Text>
          )}
          <Text style={styles.matchedAt}>
            {new Date(item.matched_at).toLocaleDateString('tr-TR')} tarihinde eşleşti
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#64748b" />
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Eşleşmeler</Text>
      <Text style={styles.subtitle}>{matches.length} eşleşme</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color="#64748b" />
      <Text style={styles.emptyTitle}>Henüz Eşleşme Yok</Text>
      <Text style={styles.emptySubtitle}>
        Keşfet sekmesinden profillere sağa kaydırarak beğeni gönder
      </Text>
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.discoverButtonText}>Keşfetmeye Başla</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={renderMatch}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={matches.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  list: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
  matchPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  matchInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialty: {
    fontSize: 14,
    color: '#D4AF37',
    marginTop: 2,
  },
  matchedAt: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
    lineHeight: 24,
  },
  discoverButton: {
    marginTop: 32,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  discoverButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
