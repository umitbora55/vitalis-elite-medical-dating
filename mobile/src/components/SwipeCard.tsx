/**
 * SwipeCard Component
 *
 * Tinder-style swipeable card with gesture handling
 * Uses react-native-reanimated and react-native-gesture-handler
 *
 * Features:
 * - Swipe left (NOPE), right (LIKE), up (SUPER LIKE)
 * - Spring physics for natural feel
 * - Haptic feedback
 * - Visual feedback (stamps)
 */

import React, { useCallback, memo } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { Profile } from '../services/profileService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VERTICAL_SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.15;
const ROTATION_ANGLE = 15;

interface SwipeCardProps {
  profile: Profile;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSuperLike?: () => void;
  onPress?: () => void;
  isFirst: boolean;
  index: number;
}

function SwipeCardComponent({
  profile,
  onSwipeLeft,
  onSwipeRight,
  onSuperLike,
  onPress,
  isFirst,
  index,
}: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isFirst ? 1 : 0.95 - index * 0.02);

  const photoUrl = profile.photo_paths?.[0] || 'https://via.placeholder.com/400';

  const handleSwipeComplete = useCallback(
    (direction: 'left' | 'right' | 'up') => {
      if (direction === 'right') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSwipeRight();
      } else if (direction === 'left') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSwipeLeft();
      } else if (direction === 'up' && onSuperLike) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onSuperLike();
      }
    },
    [onSwipeLeft, onSwipeRight, onSuperLike]
  );

  const gesture = Gesture.Pan()
    .enabled(isFirst)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const velocityX = event.velocityX;
      const velocityY = event.velocityY;

      // Swipe right (LIKE)
      if (translateX.value > SWIPE_THRESHOLD || velocityX > 500) {
        translateX.value = withTiming(
          SCREEN_WIDTH * 1.5,
          { duration: 300 },
          (finished) => {
            if (finished) runOnJS(handleSwipeComplete)('right');
          }
        );
        return;
      }

      // Swipe left (NOPE)
      if (translateX.value < -SWIPE_THRESHOLD || velocityX < -500) {
        translateX.value = withTiming(
          -SCREEN_WIDTH * 1.5,
          { duration: 300 },
          (finished) => {
            if (finished) runOnJS(handleSwipeComplete)('left');
          }
        );
        return;
      }

      // Swipe up (SUPER LIKE)
      if (
        (translateY.value < -VERTICAL_SWIPE_THRESHOLD || velocityY < -500) &&
        onSuperLike
      ) {
        translateY.value = withTiming(
          -SCREEN_HEIGHT,
          { duration: 300 },
          (finished) => {
            if (finished) runOnJS(handleSwipeComplete)('up');
          }
        );
        return;
      }

      // Snap back with spring physics
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const superLikeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-VERTICAL_SWIPE_THRESHOLD, -VERTICAL_SWIPE_THRESHOLD * 0.3],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.card, cardStyle, { zIndex: 100 - index }]}
      >
        <Pressable
          style={styles.cardContent}
          onPress={onPress}
          disabled={!isFirst}
        >
          {/* Profile Image */}
          <Image
            source={{ uri: photoUrl }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />

          {/* Profile Info */}
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {profile.name}, {profile.age}
              </Text>
              {profile.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>

            {profile.specialty && (
              <Text style={styles.specialty}>{profile.specialty}</Text>
            )}

            {profile.role && (
              <Text style={styles.role}>{profile.role}</Text>
            )}

            {profile.distance !== undefined && (
              <Text style={styles.distance}>{profile.distance} km uzaklıkta</Text>
            )}

            {profile.compatibility_score !== undefined && (
              <View style={styles.compatibilityContainer}>
                <Text style={styles.compatibilityScore}>
                  %{profile.compatibility_score} Uyumlu
                </Text>
              </View>
            )}
          </View>

          {/* LIKE Stamp */}
          <Animated.View style={[styles.stamp, styles.likeStamp, likeOpacity]}>
            <Text style={[styles.stampText, styles.likeText]}>LIKE</Text>
          </Animated.View>

          {/* NOPE Stamp */}
          <Animated.View style={[styles.stamp, styles.nopeStamp, nopeOpacity]}>
            <Text style={[styles.stampText, styles.nopeText]}>NOPE</Text>
          </Animated.View>

          {/* SUPER LIKE Stamp */}
          {onSuperLike && (
            <Animated.View
              style={[styles.stamp, styles.superLikeStamp, superLikeOpacity]}
            >
              <Text style={[styles.stampText, styles.superLikeText]}>SUPER</Text>
            </Animated.View>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cardContent: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    backgroundColor: '#D4AF37',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  specialty: {
    fontSize: 18,
    color: '#D4AF37',
    marginTop: 6,
    fontWeight: '600',
  },
  role: {
    fontSize: 16,
    color: '#e2e8f0',
    marginTop: 4,
  },
  distance: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 6,
  },
  compatibilityContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  compatibilityScore: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '700',
  },
  stamp: {
    position: 'absolute',
    top: 60,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 4,
    borderRadius: 10,
  },
  stampText: {
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  likeStamp: {
    left: 24,
    borderColor: '#22c55e',
    transform: [{ rotate: '-15deg' }],
  },
  likeText: {
    color: '#22c55e',
  },
  nopeStamp: {
    right: 24,
    borderColor: '#ef4444',
    transform: [{ rotate: '15deg' }],
  },
  nopeText: {
    color: '#ef4444',
  },
  superLikeStamp: {
    alignSelf: 'center',
    top: 100,
    borderColor: '#3b82f6',
  },
  superLikeText: {
    color: '#3b82f6',
  },
});

export const SwipeCard = memo(SwipeCardComponent);
export default SwipeCard;
