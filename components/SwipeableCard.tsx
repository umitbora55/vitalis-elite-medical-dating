/**
 * SwipeableCard Component - React Native (Expo)
 *
 * Tinder-style swipeable card with gesture handling.
 * Uses react-native-reanimated and react-native-gesture-handler.
 *
 * Features:
 * - Swipe left (NOPE), right (LIKE), up (SUPER LIKE)
 * - Spring physics for natural feel
 * - Haptic feedback
 * - Visual feedback (stamps)
 *
 * NOTE: This component is for React Native/Expo mobile app.
 * For web version, see ProfileCard.tsx with CSS transitions.
 */

import React, { useCallback, memo } from 'react';
import { Dimensions, StyleSheet, View, Text, Image, Pressable } from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VERTICAL_SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.15;
const ROTATION_ANGLE = 15;

export interface Profile {
  id: string;
  name: string;
  age: number;
  specialty?: string;
  role?: string;
  bio?: string;
  photo_paths: string[];
  distance?: number;
  compatibility_score?: number;
  is_verified?: boolean;
}

interface SwipeableCardProps {
  profile: Profile;
  photoUrl: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSuperLike?: () => void;
  onPress?: () => void;
  isFirst: boolean;
  index: number;
}

function SwipeableCardComponent({
  profile,
  photoUrl,
  onSwipeLeft,
  onSwipeRight,
  onSuperLike,
  onPress,
  isFirst,
  index,
}: SwipeableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isFirst ? 1 : 0.95 - index * 0.02);

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
        style={[
          styles.card,
          cardStyle,
          { zIndex: 100 - index },
        ]}
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
            colors={['transparent', 'rgba(0,0,0,0.7)']}
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
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    height: '50%',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    backgroundColor: '#D4AF37',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  specialty: {
    fontSize: 18,
    color: '#D4AF37',
    marginTop: 4,
  },
  role: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 2,
  },
  distance: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  compatibilityContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  compatibilityScore: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
  stamp: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 4,
    borderRadius: 8,
  },
  stampText: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  likeStamp: {
    left: 24,
    borderColor: '#4CAF50',
    transform: [{ rotate: '-20deg' }],
  },
  likeText: {
    color: '#4CAF50',
  },
  nopeStamp: {
    right: 24,
    borderColor: '#F44336',
    transform: [{ rotate: '20deg' }],
  },
  nopeText: {
    color: '#F44336',
  },
  superLikeStamp: {
    alignSelf: 'center',
    left: '50%',
    marginLeft: -60,
    borderColor: '#2196F3',
  },
  superLikeText: {
    color: '#2196F3',
  },
});

export const SwipeableCard = memo(SwipeableCardComponent);
export default SwipeableCard;
