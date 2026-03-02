/**
 * Discovery Screen (Main Swipe Screen)
 *
 * Tinder-style card swipe interface for discovering profiles
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SwipeCard } from '@/src/components/SwipeCard';
import { profileService, type Profile } from '@/src/services/profileService';
import { useAuth } from '@/src/hooks/useAuth';

export default function DiscoveryScreen() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const rewindStack = useRef<Profile[]>([]);

  const loadProfiles = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const discoveryProfiles = await profileService.getDiscoveryProfiles(user.id);
      setProfiles(discoveryProfiles);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load discovery profiles
  useEffect(() => {
    loadProfiles();
  }, [user, loadProfiles]);

  const handleSwipeLeft = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile || !user) return;

    // Save to rewind stack
    rewindStack.current.push(profile);

    // Record pass action
    await profileService.recordSwipe(user.id, profile.id, 'pass');

    // Move to next card
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, profiles, user]);

  const handleSwipeRight = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile || !user) return;

    // Save to rewind stack
    rewindStack.current.push(profile);

    // Record like action
    const result = await profileService.recordSwipe(user.id, profile.id, 'like');

    // Check for match
    if (result.isMatch) {
      setMatchedProfile(profile);
      setShowMatch(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Move to next card
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, profiles, user]);

  const handleSuperLike = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile || !user) return;

    // Save to rewind stack
    rewindStack.current.push(profile);

    // Record super like action
    const result = await profileService.recordSwipe(user.id, profile.id, 'super_like');

    // Check for match
    if (result.isMatch) {
      setMatchedProfile(profile);
      setShowMatch(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Move to next card
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, profiles, user]);

  const handleRewind = useCallback(() => {
    if (rewindStack.current.length === 0 || currentIndex === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rewindStack.current.pop();
    setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const handleBoost = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement boost (premium feature)
  }, []);

  const closeMatch = () => {
    setShowMatch(false);
    setMatchedProfile(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.loadingText}>Profiller yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No more profiles
  if (currentIndex >= profiles.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={80} color="#64748b" />
          <Text style={styles.emptyTitle}>Şimdilik Bu Kadar!</Text>
          <Text style={styles.emptySubtitle}>
            Yakınındaki tüm profilleri gördün. Daha sonra tekrar dene.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadProfiles}>
            <Text style={styles.refreshButtonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render card stack (show 3 cards max)
  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={24} color="#D4AF37" />
            <Text style={styles.logoText}>Vitalis</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Card Stack */}
        <View style={styles.cardContainer}>
          {visibleProfiles
            .map((profile, index) => (
              <SwipeCard
                key={profile.id}
                profile={profile}
                isFirst={index === 0}
                index={index}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                onSuperLike={handleSuperLike}
              />
            ))
            .reverse()}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Rewind */}
          <TouchableOpacity
            style={[styles.actionButton, styles.smallButton]}
            onPress={handleRewind}
            disabled={currentIndex === 0}
          >
            <Ionicons
              name="refresh"
              size={24}
              color={currentIndex === 0 ? '#475569' : '#f59e0b'}
            />
          </TouchableOpacity>

          {/* Pass */}
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={handleSwipeLeft}
          >
            <Ionicons name="close" size={36} color="#ef4444" />
          </TouchableOpacity>

          {/* Super Like */}
          <TouchableOpacity
            style={[styles.actionButton, styles.superLikeButton]}
            onPress={handleSuperLike}
          >
            <Ionicons name="star" size={28} color="#3b82f6" />
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={handleSwipeRight}
          >
            <Ionicons name="heart" size={36} color="#22c55e" />
          </TouchableOpacity>

          {/* Boost */}
          <TouchableOpacity
            style={[styles.actionButton, styles.smallButton]}
            onPress={handleBoost}
          >
            <Ionicons name="flash" size={24} color="#a855f7" />
          </TouchableOpacity>
        </View>

        {/* Match Modal */}
        <Modal
          visible={showMatch}
          transparent
          animationType="fade"
          onRequestClose={closeMatch}
        >
          <View style={styles.matchOverlay}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.9)', 'rgba(15, 23, 42, 0.95)']}
              style={styles.matchGradient}
            >
              <View style={styles.matchContent}>
                <Text style={styles.matchTitle}>Eşleşme!</Text>
                <Text style={styles.matchSubtitle}>
                  Sen ve {matchedProfile?.name} birbirinizi beğendiniz
                </Text>

                <View style={styles.matchButtons}>
                  <TouchableOpacity
                    style={styles.sendMessageButton}
                    onPress={closeMatch}
                  >
                    <Text style={styles.sendMessageText}>Mesaj Gönder</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.keepSwipingButton}
                    onPress={closeMatch}
                  >
                    <Text style={styles.keepSwipingText}>Keşfetmeye Devam Et</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  smallButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  passButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  superLikeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
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
  refreshButton: {
    marginTop: 32,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchContent: {
    alignItems: 'center',
    padding: 32,
  },
  matchTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  matchSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 48,
  },
  matchButtons: {
    gap: 16,
    width: '100%',
    paddingHorizontal: 32,
  },
  sendMessageButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  sendMessageText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  keepSwipingButton: {
    borderWidth: 2,
    borderColor: '#fff',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  keepSwipingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
