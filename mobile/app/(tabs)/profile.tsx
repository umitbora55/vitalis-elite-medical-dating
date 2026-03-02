/**
 * Profile Screen
 *
 * User profile with edit capabilities and settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { profileService, type Profile } from '@/src/services/profileService';
import { useAuth } from '@/src/hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const userProfile = await profileService.getProfile(user.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const handleSignOut = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabından çıkış yapmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const navigateToSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // router.push('/settings');
  };

  const navigateToEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // router.push('/edit-profile');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      </SafeAreaView>
    );
  }

  const photoUrl = profile?.photo_paths?.[0] || 'https://via.placeholder.com/150';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={navigateToSettings}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.profileGradient}
          >
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUrl }} style={styles.profilePhoto} />
              <TouchableOpacity style={styles.editPhotoButton}>
                <Ionicons name="camera" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>
                  {profile?.name || 'İsimsiz'}, {profile?.age || '?'}
                </Text>
                {profile?.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={14} color="#000" />
                  </View>
                )}
              </View>

              {profile?.specialty && (
                <Text style={styles.specialty}>{profile.specialty}</Text>
              )}

              {profile?.role && (
                <Text style={styles.role}>{profile.role}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={navigateToEditProfile}
            >
              <Ionicons name="pencil" size={18} color="#D4AF37" />
              <Text style={styles.editProfileText}>Profili Düzenle</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.likes_received || 0}</Text>
            <Text style={styles.statLabel}>Beğeni</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.matches_count || 0}</Text>
            <Text style={styles.statLabel}>Eşleşme</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.profile_views || 0}</Text>
            <Text style={styles.statLabel}>Görüntülenme</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Hesap</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(212, 175, 55, 0.2)' }]}>
              <Ionicons name="star" size={20} color="#D4AF37" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Premium&apos;a Yükselt</Text>
              <Text style={styles.menuSubtext}>Sınırsız beğeni, süper beğeni ve daha fazlası</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Doğrulama</Text>
              <Text style={styles.menuSubtext}>
                {profile?.is_verified ? 'Doğrulanmış hesap' : 'Hesabını doğrula'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
              <Ionicons name="notifications" size={20} color="#22c55e" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Bildirimler</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
              <Ionicons name="lock-closed" size={20} color="#a855f7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Gizlilik</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Destek</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(148, 163, 184, 0.2)' }]}>
              <Ionicons name="help-circle" size={20} color="#94a3b8" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Yardım Merkezi</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(148, 163, 184, 0.2)' }]}>
              <Ionicons name="document-text" size={20} color="#94a3b8" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuText}>Kullanım Şartları</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Vitalis v1.0.0</Text>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  profileGradient: {
    padding: 24,
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f172a',
  },
  profileInfo: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialty: {
    fontSize: 16,
    color: '#D4AF37',
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 20,
  },
  editProfileText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 32,
  },
});
