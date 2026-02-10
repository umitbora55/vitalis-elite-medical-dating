import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { MOCK_PROFILES, MOCK_LIKES_YOU_PROFILES, DAILY_SWIPE_LIMIT, DEFAULT_MESSAGE_TEMPLATES } from './constants';
import { SwipeDirection, Match, Profile, FilterPreferences, Specialty, MedicalRole, Notification, NotificationType, ReportReason, SwipeHistoryItem, MessageTemplate, ChatTheme } from './types';
import { AppHeader } from './components/AppHeader';
import { ProfileCard } from './components/ProfileCard';
import { ControlPanel } from './components/ControlPanel';
import { MatchOverlay } from './components/MatchOverlay';
import { FilterView } from './components/FilterView';
import { LandingView } from './components/LandingView';
import { Tooltip } from './components/Tooltip';
import { StoryRail } from './components/StoryRail';
import { StoryViewer } from './components/StoryViewer';
import { NearbyView } from './components/NearbyView';
import { LoginView } from './components/LoginView';
import { ShieldCheck, FilterX, Star, Zap, Crown, Heart, CheckCircle2, Lock, Hourglass, Ghost, Snowflake, Play } from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { useUserStore } from './stores/userStore';
import { useUiStore } from './stores/uiStore';
import { useDiscoveryStore } from './stores/discoveryStore';
import { useMatchStore } from './stores/matchStore';
import { useNotificationStore } from './stores/notificationStore';
import { useTheme } from './hooks/useTheme';
import { useBoost } from './hooks/useBoost';
import { useSwipeLimit } from './hooks/useSwipeLimit';
import { signUpWithEmail, signOut } from './services/authService';
import { upsertProfile } from './services/profileService';
import { getActiveSubscription } from './services/subscriptionService';
import { initAnalytics, trackEvent } from './src/lib/analytics';
import { PendingVerificationView } from './components/PendingVerificationView';
import { createVerificationRequest, saveVerifiedEmail, updateProfileVerificationStatus } from './services/verificationService';
import { supabase } from './src/lib/supabase';

const MatchesView = lazy(() => import('./components/MatchesView').then((m) => ({ default: m.MatchesView })));
const ChatView = lazy(() => import('./components/ChatView').then((m) => ({ default: m.ChatView })));
const ProfileDetailView = lazy(() => import('./components/ProfileDetailView').then((m) => ({ default: m.ProfileDetailView })));
const MyProfileView = lazy(() => import('./components/MyProfileView').then((m) => ({ default: m.MyProfileView })));
const NotificationsView = lazy(() => import('./components/NotificationsView').then((m) => ({ default: m.NotificationsView })));
const LikesYouView = lazy(() => import('./components/LikesYouView').then((m) => ({ default: m.LikesYouView })));
const PremiumView = lazy(() => import('./components/PremiumView').then((m) => ({ default: m.PremiumView })));
const OnboardingView = lazy(() => import('./components/OnboardingView').then((m) => ({ default: m.OnboardingView })));
const RegistrationFlow = lazy(() => import('./components/RegistrationFlow').then((m) => ({ default: m.RegistrationFlow })));
const SwipeHistoryView = lazy(() => import('./components/SwipeHistoryView').then((m) => ({ default: m.SwipeHistoryView })));

type VerificationPayload = {
    method: 'EMAIL' | 'DOCUMENT';
    workEmail?: string;
    tier?: number;
    domain?: string;
};

type RegistrationData = {
    name?: string;
    age?: string | number;
    email?: string;
    password?: string;
    role?: MedicalRole | string;
    specialty?: Specialty | string;
    institution?: string;
};

const App: React.FC = () => {
    const authStep = useAuthStore((state) => state.authStep);
    const setAuthStep = useAuthStore((state) => state.setAuthStep);
    const userProfile = useUserStore((state) => state.profile);
    const setUserProfile = useUserStore((state) => state.setProfile);
    const updateUserProfile = useUserStore((state) => state.updateProfile);
    const isPremium = useUserStore((state) => state.isPremium);
    const setIsPremium = useUserStore((state) => state.setPremium);
    const currentView = useUiStore((state) => state.currentView);
    const setCurrentView = useUiStore((state) => state.setCurrentView);
    const isFilterOpen = useUiStore((state) => state.isFilterOpen);
    const setIsFilterOpen = useUiStore((state) => state.setIsFilterOpen);
    const viewingProfile = useUiStore((state) => state.viewingProfile);
    const setViewingProfile = useUiStore((state) => state.setViewingProfile);
    const viewingStoryProfile = useUiStore((state) => state.viewingStoryProfile);
    const setViewingStoryProfile = useUiStore((state) => state.setViewingStoryProfile);
    const swipedProfileIds = useDiscoveryStore((state) => state.swipedProfileIds);
    const blockedProfileIds = useDiscoveryStore((state) => state.blockedProfileIds);
    const dailySwipesRemaining = useDiscoveryStore((state) => state.dailySwipesRemaining);
    const superLikesCount = useDiscoveryStore((state) => state.superLikesCount);
    const swipeDirection = useDiscoveryStore((state) => state.swipeDirection);
    const lastSwipedId = useDiscoveryStore((state) => state.lastSwipedId);
    const filters = useDiscoveryStore((state) => state.filters);
    const setFilters = useDiscoveryStore((state) => state.setFilters);
    const setDailySwipesRemaining = useDiscoveryStore((state) => state.setDailySwipesRemaining);
    const setSwipeDirection = useDiscoveryStore((state) => state.setSwipeDirection);
    const setLastSwipedId = useDiscoveryStore((state) => state.setLastSwipedId);
    const decrementSwipe = useDiscoveryStore((state) => state.decrementSwipe);
    const decrementSuperLike = useDiscoveryStore((state) => state.decrementSuperLike);
    const addSwipedProfile = useDiscoveryStore((state) => state.addSwipedProfile);
    const removeSwipedProfile = useDiscoveryStore((state) => state.removeSwipedProfile);
    const clearSwipedProfiles = useDiscoveryStore((state) => state.clearSwipedProfiles);
    const addBlockedProfile = useDiscoveryStore((state) => state.addBlockedProfile);
    const matches = useMatchStore((state) => state.matches);
    const setMatches = useMatchStore((state) => state.setMatches);
    const addMatch = useMatchStore((state) => state.addMatch);
    const removeMatch = useMatchStore((state) => state.removeMatch);
    const currentMatch = useMatchStore((state) => state.currentMatch);
    const setCurrentMatch = useMatchStore((state) => state.setCurrentMatch);
    const activeChatMatch = useMatchStore((state) => state.activeChatMatch);
    const setActiveChatMatch = useMatchStore((state) => state.setActiveChatMatch);
    const swipeHistory = useMatchStore((state) => state.swipeHistory);
    const setSwipeHistory = useMatchStore((state) => state.setSwipeHistory);
    const addSwipeHistory = useMatchStore((state) => state.addSwipeHistory);
    const notifications = useNotificationStore((state) => state.notifications);
    const markAllNotificationsRead = useNotificationStore((state) => state.markAllRead);

    const { syncProfileTheme } = useTheme(userProfile.themePreference || 'SYSTEM');

    const handleUpdateProfile = useCallback((updatedProfile: Profile) => {
        setUserProfile(updatedProfile);
        syncProfileTheme(updatedProfile);
        void upsertProfile(updatedProfile);
    }, [setUserProfile, syncProfileTheme]);

    // Tips State
    const [closedTips, setClosedTips] = useState<Set<string>>(new Set());
    const [activeTip, setActiveTip] = useState<{ id: string, message: string } | null>(null);

    // Message Templates State
    const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(DEFAULT_MESSAGE_TEMPLATES);

    const handleAddTemplate = useCallback((text: string) => {
        const newTemplate: MessageTemplate = {
            id: `custom_${Date.now()}`,
            text,
            isCustom: true
        };
        setMessageTemplates(prev => [...prev, newTemplate]);
    }, []);

    const handleDeleteTemplate = useCallback((id: string) => {
        setMessageTemplates(prev => prev.filter(t => t.id !== id));
    }, []);

    // Initialize Matches with some mock data that contains stories for demonstration
    useEffect(() => {
        // Adding some mock matches initially so stories can be seen
        const initialMatches: Match[] = [
            {
                profile: MOCK_PROFILES[0], // Dr. Sarah
                timestamp: Date.now() - 10000000,
                isFirstMessagePending: false
            },
            {
                profile: MOCK_PROFILES[1], // James
                timestamp: Date.now() - 500000,
                // DEMO: Simulate "I need to write first" logic
                isFirstMessagePending: true,
                allowedSenderId: 'me',
                expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 hours left
            },
            {
                profile: MOCK_PROFILES[2], // Elena
                timestamp: Date.now() - 200000,
                // DEMO: Simulate "They need to write first" logic
                isFirstMessagePending: true,
                allowedSenderId: 'them',
                expiresAt: Date.now() + 18 * 60 * 60 * 1000 // 18 hours left
            }
        ];
        setMatches(initialMatches);
    }, []);

    // Swipe Limit State
    const { timeToReset } = useSwipeLimit({
        dailyLimit: DAILY_SWIPE_LIMIT,
        onReset: () => setDailySwipesRemaining(DAILY_SWIPE_LIMIT),
    });

    // Super Like State
    // Animation state
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // --- BOOST STATE ---
    const [showBoostConfirm, setShowBoostConfirm] = useState(false);
    const [showPremiumAlert, setShowPremiumAlert] = useState(false);

    const LoadingScreen = () => (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 text-sm">
            Loading...
        </div>
    );

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    }, []);

    const refreshSubscriptionStatus = useCallback(async () => {
        const { isPremium: hasPremium } = await getActiveSubscription();
        setIsPremium(hasPremium);
    }, [setIsPremium]);

    useEffect(() => {
        initAnalytics(userProfile);
    }, [userProfile]);

    useEffect(() => {
        if (authStep !== 'APP') return;
        void refreshSubscriptionStatus();
    }, [authStep, refreshSubscriptionStatus]);

    useEffect(() => {
        if (currentView === 'premium') {
            trackEvent('premium_view', { source: 'nav' });
        }
    }, [currentView]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const checkoutStatus = params.get('checkout');
        if (!checkoutStatus) return;

        if (checkoutStatus === 'success') {
            void refreshSubscriptionStatus();
            showToast('Welcome to Vitalis Elite!');
        }
        if (checkoutStatus === 'cancel') {
            showToast('Checkout canceled.');
        }

        params.delete('checkout');
        const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', nextUrl);
    }, [refreshSubscriptionStatus, showToast]);

    // Logic to handle Login from Landing
    const handleStartApplication = () => {
        setAuthStep('REGISTRATION');
    };

    const handleStartLogin = () => {
        setAuthStep('LOGIN');
    };

    const handleRegistrationComplete = useCallback(async (data: RegistrationData, verification: VerificationPayload) => {
        const email = data.email?.trim();
        const password = data.password;

        if (email && password) {
            const { error } = await signUpWithEmail(email, password, {
                name: data.name,
                role: data.role,
                specialty: data.specialty,
            });

            if (error) {
                showToast(error.message);
                return;
            }
        }

        const parsedAge = typeof data.age === 'string' ? parseInt(data.age, 10) : data.age;

        // Update user profile with registered data
        const nextProfile: Profile = {
            ...userProfile,
            name: data.name || userProfile.name,
            age: Number.isFinite(parsedAge) ? (parsedAge as number) : userProfile.age,
            role:
                data.role && Object.values(MedicalRole).includes(data.role as MedicalRole)
                    ? (data.role as MedicalRole)
                    : userProfile.role,
            specialty:
                data.specialty &&
                    Object.values(Specialty).includes(data.specialty as Specialty)
                    ? (data.specialty as Specialty)
                    : userProfile.specialty,
            hospital: data.institution || userProfile.hospital,
            verificationStatus:
                verification.method === 'EMAIL' ? 'VERIFIED' : 'PENDING_VERIFICATION',
        };

        updateUserProfile(nextProfile);
        void upsertProfile(nextProfile);
        if (verification.method === 'EMAIL' && email && verification.domain && verification.tier) {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user?.id) {
                await saveVerifiedEmail(authData.user.id, email, verification.domain, verification.tier);
                await updateProfileVerificationStatus(authData.user.id, 'VERIFIED');
            }
        } else {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user?.id) {
                await createVerificationRequest(authData.user.id, 'DOCUMENT');
                await updateProfileVerificationStatus(authData.user.id, 'PENDING_VERIFICATION');
            }
        }

        // Check for onboarding status (simulated)
        const hasSeen = localStorage.getItem('vitalis_onboarding_seen');
        if (!hasSeen) {
            setAuthStep('ONBOARDING');
        } else {
            setAuthStep('APP');
        }
        showToast("Application Approved! Welcome.");
    }, [setAuthStep, showToast, updateUserProfile, userProfile]);

    const handleLoginSuccess = useCallback(() => {
        setAuthStep('APP');
    }, [setAuthStep]);

    const handleOnboardingComplete = useCallback(() => {
        setAuthStep('APP');
        localStorage.setItem('vitalis_onboarding_seen', 'true');
    }, [setAuthStep]);

    const resetTutorial = useCallback(() => {
        localStorage.removeItem('vitalis_onboarding_seen');
        setClosedTips(new Set()); // Reset tips
        setAuthStep('ONBOARDING');
        setCurrentView('home');
    }, [setAuthStep, setCurrentView]);

    // Logic for Contextual Tips
    useEffect(() => {
        if (authStep !== 'APP') return;

        const timer = setTimeout(() => {
            // Tip 1: Add Interests (Show on Home)
            if (currentView === 'home' && !closedTips.has('interests')) {
                setActiveTip({
                    id: 'interests',
                    message: "💡 Tip: Add more interests to your profile to get 2x more matches!"
                });
            }
            // Tip 2: Availability (Show on Profile)
            else if (currentView === 'profile' && !closedTips.has('availability')) {
                setActiveTip({
                    id: 'availability',
                    message: "💡 Tip: Turn on 'I'm Available' status so active users see you first."
                });
            }
            else {
                setActiveTip(null);
            }
        }, 1500); // 1.5s delay after view change

        return () => clearTimeout(timer);
    }, [currentView, closedTips, authStep]);

    const closeTip = useCallback(() => {
        if (activeTip) {
            setClosedTips(prev => new Set(prev).add(activeTip.id));
            setActiveTip(null);
        }
    }, [activeTip]);

    const { boostCount, boostEndTime, timeLeft, activateBoost: startBoost } = useBoost({
        initialCount: 1,
    });

    const handleBoostClick = useCallback(() => {
        if (boostEndTime) return; // Already active

        if (boostCount > 0) {
            setShowBoostConfirm(true);
        } else {
            setShowPremiumAlert(true);
        }
    }, [boostCount, boostEndTime]);

    const handleActivateBoost = useCallback(() => {
        const activated = startBoost();
        setShowBoostConfirm(false);
        if (activated) {
            showToast("Boost Activated! 🚀");
        }
    }, [showToast, startBoost]);

    const handleAddStory = useCallback(() => {
        // Simulation of adding a story
        showToast("Story Uploaded! 📸");
        setUserProfile({
            ...userProfile,
            stories: [
                ...(userProfile.stories || []),
                {
                    id: Date.now().toString(),
                    imageUrl:
                        'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80', // Mock image
                    timestamp: Date.now(),
                    seen: false,
                },
            ],
        });
    }, [setUserProfile, showToast, userProfile]);

    const handleStoryReply = useCallback((_text: string) => {
        if (!viewingStoryProfile) return;

        // Ideally this would add a message to the chat
        // For demo, we just toast and maybe open chat
        showToast("Reply sent! 📨");

        // Find match and open chat
        const match = matches.find(m => m.profile.id === viewingStoryProfile.id);
        if (match) {
            setActiveChatMatch(match);
        }
        setViewingStoryProfile(null);
    }, [matches, setActiveChatMatch, setViewingStoryProfile, showToast, viewingStoryProfile]);

    const handleStoryReaction = useCallback((emoji: string) => {
        showToast(`Sent ${emoji} to ${viewingStoryProfile?.name}`);
    }, [showToast, viewingStoryProfile?.name]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Filter profiles based on preferences AND exclude already swiped OR blocked ones
    const visibleProfiles = useMemo(() => {
        let filtered = MOCK_PROFILES.filter(profile => {
            // 0. Exclude blocked
            if (blockedProfileIds.has(profile.id)) return false;

            // 1. Exclude swiped
            if (swipedProfileIds.has(profile.id)) return false;

            // --- PRIVACY FILTERS (NEW) ---

            // Filter out users from the same institution if setting is enabled
            if (userProfile.privacySettings?.hideSameInstitution && profile.hospital === userProfile.hospital) {
                return false;
            }

            // Filter out specifically hidden users
            if (userProfile.privacySettings?.hiddenProfileIds.includes(profile.id)) {
                return false;
            }

            // --- END PRIVACY FILTERS ---

            // 2. Filter by Age
            if (profile.age < filters.ageRange[0] || profile.age > filters.ageRange[1]) return false;

            // 3. Filter by Distance
            if (profile.distance > filters.maxDistance) return false;

            // 4. Filter by Specialty
            if (!filters.specialties.includes(profile.specialty)) return false;

            // 5. Filter by Availability
            if (filters.showAvailableOnly) {
                if (!profile.isAvailable) return false;
                // Check if expired
                if (profile.availabilityExpiresAt && profile.availabilityExpiresAt < Date.now()) return false;
            }

            return true;
        });

        // Sort: Available users first
        filtered = filtered.sort((a, b) => {
            const aIsAvailable = a.isAvailable && (!a.availabilityExpiresAt || a.availabilityExpiresAt > Date.now());
            const bIsAvailable = b.isAvailable && (!b.availabilityExpiresAt || b.availabilityExpiresAt > Date.now());

            if (aIsAvailable === bIsAvailable) return 0;
            return aIsAvailable ? -1 : 1;
        });

        return filtered;
    }, [filters, swipedProfileIds, blockedProfileIds, userProfile.hospital, userProfile.privacySettings]);

    // Determine if there are profiles left that are just hidden by filters
    const hasHiddenProfiles = useMemo(() => {
        const unswipedCount = MOCK_PROFILES.filter(p => !swipedProfileIds.has(p.id) && !blockedProfileIds.has(p.id)).length;
        return unswipedCount > 0 && visibleProfiles.length === 0;
    }, [swipedProfileIds, visibleProfiles, blockedProfileIds]);

    // Always show the first profile in the filtered list
    const currentProfile = visibleProfiles[0] || null;
    const nextProfile = visibleProfiles[1] || null;

    const unreadNotificationsCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    // --- Safety Actions ---
    const handleBlockProfile = (profileId: string) => {
        addBlockedProfile(profileId);

        // Also remove from matches if exists
        removeMatch(profileId);

        // Close profile view if blocking from detail
        if (viewingProfile?.id === profileId) {
            setViewingProfile(null);
        }

        // Close chat if active
        if (activeChatMatch?.profile.id === profileId) {
            setActiveChatMatch(null);
        }

        showToast("User blocked successfully");
    };

    const handleReportProfile = (profileId: string, _reason: ReportReason) => {
        showToast("Report received. Thank you.");
        // Often you might also block the user automatically when reporting
        handleBlockProfile(profileId);
    };

    const handleUnmatch = (matchId: string) => {
        // 1. Remove from matches list
        removeMatch(matchId);

        // 2. Allow them to be swiped again (remove from swiped set)
        removeSwipedProfile(matchId);

        // 3. Close the chat view
        setActiveChatMatch(null);

        showToast("Unmatched successfully");
    };

    const handleUpdateMatchTheme = useCallback((matchId: string, theme: ChatTheme) => {
        setMatches(
            matches.map((m) => (m.profile.id === matchId ? { ...m, theme } : m)),
        );
        // Also update the activeChatMatch if it's the current one
        if (activeChatMatch && activeChatMatch.profile.id === matchId) {
            setActiveChatMatch({ ...activeChatMatch, theme });
        }
    }, [activeChatMatch, matches, setActiveChatMatch, setMatches]);

    // --- Nearby Logic ---
    const handleSayHiToNearby = useCallback((profile: Profile) => {
        // Create a match if not exists and open chat, OR just toast
        // For demo, we'll treat it like a "Wave" notification or start a chat if matched

        // Check if already matched
        const existingMatch = matches.find(m => m.profile.id === profile.id);

        if (existingMatch) {
            setActiveChatMatch(existingMatch);
            setCurrentView('home'); // Reset view context
        } else {
            showToast(`Waved at ${profile.name}! 👋`);
            // In real app, this sends a notification
        }
    }, [matches, setActiveChatMatch, setCurrentView, showToast]);

    const handleUpdatePrivacy = useCallback((showInNearby: boolean) => {
        setUserProfile({
            ...userProfile,
            privacySettings: {
                ...userProfile.privacySettings!,
                showInNearby,
            },
        });
    }, [setUserProfile, userProfile]);

    const handleSwipe = (direction: SwipeDirection) => {
        // 0. Check daily limit if not premium
        if (!isPremium && dailySwipesRemaining <= 0) {
            setShowPremiumAlert(true); // Or simply don't do anything, UI handles display
            return;
        }

        if (!currentProfile || swipeDirection) return;

        // Super Like Logic
        if (direction === SwipeDirection.SUPER) {
            if (superLikesCount <= 0) {
                // Guard clause if triggered by gesture when count is 0
                return;
            }
            decrementSuperLike();
        }

        // 1. Decrement Daily Swipes (for both Left and Right)
        if (!isPremium) {
            decrementSwipe();
        }

        trackEvent('swipe', { direction, isPremium });
        setSwipeDirection(direction);

        // Wait for animation to finish before updating logic
        setTimeout(() => {
            // Save ID for Rewind Feature
            setLastSwipedId(currentProfile.id);

            // Mark as swiped
            addSwipedProfile(currentProfile.id);

            // --- NEW: Add to History ---
            const historyItem: SwipeHistoryItem = {
                id: Date.now().toString(),
                profile: currentProfile,
                action: direction === SwipeDirection.LEFT ? 'PASS' : (direction === SwipeDirection.SUPER ? 'SUPER_LIKE' : 'LIKE'),
                timestamp: Date.now()
            };
            addSwipeHistory(historyItem);

            // Logic for Likes
            if (direction === SwipeDirection.RIGHT || direction === SwipeDirection.SUPER) {
                // Check for MUTUAL match logic
                if (currentProfile.hasLikedUser) {
                    // --- FIRST MESSAGE PREFERENCE LOGIC ---
                    let isFirstMessagePending = false;
                    let allowedSenderId = null;
                    let expiresAt = undefined;

                    if (userProfile.firstMessagePreference === 'ME_FIRST') {
                        isFirstMessagePending = true;
                        allowedSenderId = 'me';
                        expiresAt = Date.now() + 24 * 60 * 60 * 1000;
                    } else if (userProfile.firstMessagePreference === 'THEM_FIRST') {
                        isFirstMessagePending = true;
                        allowedSenderId = 'them'; // UI will translate this to match ID
                        expiresAt = Date.now() + 24 * 60 * 60 * 1000;
                    }

                    const newMatch: Match = {
                        profile: currentProfile,
                        timestamp: Date.now(),
                        isFirstMessagePending,
                        allowedSenderId,
                        expiresAt
                    };
                    addMatch(newMatch);
                    setCurrentMatch(newMatch); // Triggers the overlay
                    trackEvent('match', { profileId: currentProfile.id });
                }
            }

            setSwipeDirection(null);
        }, 400); // Matches transition duration
    };

    const handleRewind = () => {
        if (!lastSwipedId) return;

        if (!isPremium) {
            setShowPremiumAlert(true);
            return;
        }

        // Restore profile
        removeSwipedProfile(lastSwipedId);

        // Remove from history
        setSwipeHistory(swipeHistory.filter(item => item.profile.id !== lastSwipedId));

        // Remove from matches if it was a match
        removeMatch(lastSwipedId);

        setLastSwipedId(null);
        showToast("Last action undone");
    };

    const handleUndoSwipeFromHistory = (item: SwipeHistoryItem) => {
        // Logic to undo specific item from history
        // 1. Remove from History
        setSwipeHistory(swipeHistory.filter(h => h.id !== item.id));

        // 2. Remove from Swiped Set (so it appears in stack again)
        removeSwipedProfile(item.profile.id);

        // 3. Remove from Matches if it was a like/match
        if (item.action !== 'PASS') {
            removeMatch(item.profile.id);
        }

        showToast(item.action === 'PASS' ? "Profile restored to stack" : "Like undone");
    };

    const handleSaveFilters = (newFilters: FilterPreferences) => {
        setFilters(newFilters);
        setIsFilterOpen(false);
    };

    const resetFilters = () => {
        setFilters({
            ageRange: [20, 80],
            maxDistance: 150,
            specialties: Object.values(Specialty),
            showAvailableOnly: false
        });
    };

    const resetSwipes = () => {
        clearSwipedProfiles();
    };

    const handleActivateAccount = () => {
        setUserProfile({ ...userProfile, isFrozen: false });
        showToast("Account Reactivated! Welcome back.");
    };

    // --- Notification Logic ---

    const handleViewChange = (view: 'home' | 'profile' | 'matches' | 'notifications' | 'likesYou' | 'premium' | 'history' | 'nearby') => {
        setCurrentView(view);
        if (view === 'notifications') {
            // Mark all as read when opening notifications
            markAllNotificationsRead();
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (notification.type === NotificationType.MATCH) {
            // Try to find an existing match
            const existingMatch = matches.find(m => m.profile.id === notification.senderProfile.id);

            if (existingMatch) {
                setActiveChatMatch(existingMatch);
            } else {
                // If not in current matches list (e.g., from mock history), create a temp match object or just go to matches view
                // For better UX, let's create a temporary match object to open chat directly
                const tempMatch: Match = {
                    profile: notification.senderProfile,
                    timestamp: notification.timestamp
                };
                setActiveChatMatch(tempMatch);
            }
        } else {
            // For LIKE or SUPER_LIKE, show the profile details
            setViewingProfile(notification.senderProfile);
        }
    };


    const getCardStyle = () => {
        if (!swipeDirection) return {};

        switch (swipeDirection) {
            case SwipeDirection.LEFT:
                return { transform: 'translateX(-150%) rotate(-20deg)', opacity: 0 };
            case SwipeDirection.RIGHT:
                return { transform: 'translateX(150%) rotate(20deg)', opacity: 0 };
            case SwipeDirection.SUPER:
                return { transform: 'translateY(-150%) scale(1.1)', opacity: 0 };
            default:
                return {};
        }
    };

    const renderHome = () => {
        // Check for daily limit reached
        const isLimitReached = !isPremium && dailySwipesRemaining <= 0;

        return (
            <div className="relative w-full h-full max-w-md mx-auto pt-16 pb-4 flex flex-col items-center justify-center">

                {/* STORY RAIL (Top of Home) */}
                <div className="w-full relative z-30">
                    <StoryRail
                        currentUser={userProfile}
                        matches={matches}
                        onAddStory={handleAddStory}
                        onViewStory={setViewingStoryProfile}
                    />
                </div>

                {/* TOOLTIP FOR HOME */}
                {activeTip && activeTip.id === 'interests' && (
                    <Tooltip
                        message={activeTip.message}
                        onClose={closeTip}
                        className="top-40 left-8 z-50"
                    />
                )}

                {/* Top Controls Area (Boost & Likes You) */}
                <div className="w-full flex justify-between items-center mb-2 px-4 relative z-10 mt-2">

                    {/* Likes You Button (Left) */}
                    <button
                        onClick={() => setCurrentView('likesYou')}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/80 border border-gold-500/30 text-gold-500 shadow-lg hover:bg-slate-800 transition-all active:scale-95 group"
                    >
                        <div className="relative">
                            <Heart size={18} fill="currentColor" />
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold-500"></span>
                            </span>
                        </div>
                        <span className="text-xs font-bold">{MOCK_LIKES_YOU_PROFILES.length} Likes</span>
                    </button>

                    {/* Free Swipes Counter (Center - If not Premium) */}
                    {!isPremium && !isLimitReached && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 rounded-full border border-slate-700/50 backdrop-blur-sm animate-fade-in">
                            <span className="text-sm">💛</span>
                            <span className="text-xs font-bold text-slate-200">{dailySwipesRemaining} Left</span>
                        </div>
                    )}

                    {/* Boost Button (Right) */}
                    <button
                        onClick={handleBoostClick}
                        disabled={!!boostEndTime}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${boostEndTime
                            ? 'bg-purple-90 border border-purple-500/50 text-purple-200 cursor-default'
                            : 'bg-gradient- from-purple-600 to-pink-600 text-white hover:scale-105 active:scale-95'
                            }`}
                    >
                        <Zap size={16} className={boostEndTime ? 'text-purple-400 fill-purple-400 animate-pulse' : 'fill-white'} />
                        {boostEndTime ? (
                            <span className="font-mono text-xs font-bold w-12">{formatTime(timeLeft)}</span>
                        ) : (
                            <span className="text-xs font-bold tracking-wider uppercase">Boost</span>
                        )}
                    </button>
                </div>

                {/* Boost Active Badge Positioned below button */}
                {boostEndTime && (
                    <div className="absolute top-[10.5rem] right-4 z-10 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce shadow-lg">
                        Active 🚀
                    </div>
                )}


                {/* LIMIT REACHED VIEW */}
                {isLimitReached ? (
                    <div className="relative w-full aspect-[3/4] max-h-[60vh] bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center justify-center p-8 shadow-2xl overflow-hidden mx-4">
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black"></div>
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl animate-pulse"></div>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center mb-6 border border-slate-700 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                                <Lock size={40} className="text-gold-500" />
                            </div>

                            <h2 className="text-2xl font-serif text-white mb-2">Daily Limit Reached</h2>
                            <p className="text-slate-400 text-sm mb-8 px-4">
                                You've used all your free likes for today. Your swipes will refill at midnight.
                            </p>

                            <div className="flex items-center gap-3 mb-8 bg-slate-800/50 px-6 py-3 rounded-xl border border-slate-700/50">
                                <Hourglass size={20} className="text-blue-400 animate-spin-slow" />
                                <span className="font-mono text-xl text-white font-bold tracking-widest">{timeToReset}</span>
                            </div>

                            <button
                                onClick={() => setCurrentView('premium')}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 mb-4"
                            >
                                <Crown size={20} fill="currentColor" />
                                Go Unlimited
                            </button>

                            <button className="text-xs text-slate-500 hover:text-slate-300">
                                Wait until tomorrow
                            </button>
                        </div>
                    </div>
                ) : currentProfile ? (
                    <div className="relative w-full aspect-[3/4] max-h-[60vh] px-4">
                        {/* Next Card (Background) */}
                        {nextProfile && (
                            <div className="absolute inset-0 transform scale-95 translate-y-4 opacity-50 z-0 pointer-events-none transition-all duration-500 mx-4">
                                <ProfileCard
                                    profile={nextProfile}
                                    onShowDetails={() => { }}
                                    currentUser={userProfile}
                                />
                            </div>
                        )}

                        {/* Current Card (Foreground) */}
                        <div
                            className="absolute inset-0 z-10 transition-all duration-500 ease-out origin-bottom mx-4"
                            style={getCardStyle()}
                        >
                            <ProfileCard
                                profile={currentProfile}
                                onShowDetails={() => setViewingProfile(currentProfile)}
                                currentUser={userProfile}
                            />

                            {/* Super Like Overlay Animation */}
                            {swipeDirection === SwipeDirection.SUPER && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-500/30 backdrop-blur-[2px] rounded-3xl animate-fade-in">
                                    <div className="bg-white/20 p-6 rounded-full border border-white/30 shadow-[0_0_30px_rgba(59,130,246,0.6)] animate-bounce">
                                        <Star size={80} className="text-blue-400 fill-blue-400 drop-shadow-lg" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <ControlPanel
                            onSwipe={handleSwipe}
                            onRewind={handleRewind}
                            remainingSuperLikes={superLikesCount}
                        />
                    </div>
                ) : (
                    <div className="text-center p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in max-w-sm mx-4">
                        {hasHiddenProfiles ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto flex items-center justify-center mb-4">
                                    <FilterX className="text-gold-500" size={32} />
                                </div>
                                <h2 className="text-xl font-serif text-white mb-2">No profiles found</h2>
                                <p className="text-slate-400 mb-6 text-sm">There are no profiles matching your current filters. Try expanding your search criteria.</p>
                                <button
                                    onClick={() => setIsFilterOpen(true)}
                                    className="w-full px-6 py-3 rounded-full bg-gold-500 text-white hover:bg-gold-600 transition-all text-sm font-bold uppercase tracking-wider shadow-lg mb-3"
                                >
                                    Adjust Filters
                                </button>
                                <button
                                    onClick={resetFilters}
                                    className="text-slate-500 text-xs hover:text-slate-300 underline"
                                >
                                    Reset all filters
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto flex items-center justify-center mb-4">
                                    <ShieldCheck className="text-gold-500" size={32} />
                                </div>
                                <h2 className="text-2xl font-serif text-white mb-2">That's everyone</h2>
                                <p className="text-slate-400 mb-6">You've reviewed all verified profiles in your area.</p>
                                <button
                                    onClick={resetSwipes}
                                    className="px-6 py-3 rounded-full bg-transparent border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-white transition-all text-sm font-bold uppercase tracking-wider"
                                >
                                    Review Again
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        )
    };

    // --- RENDER LANDING PAGE ---
    if (authStep === 'LANDING') {
        return (
            <LandingView
                onEnter={handleStartApplication}
                onLogin={handleStartLogin}
                onDevBypass={() => {
                    updateUserProfile({
                        ...userProfile,
                        name: 'Dev User',
                        age: 30,
                        role: MedicalRole.DOCTOR,
                        specialty: Specialty.CARDIOLOGY,
                        hospital: 'Test Hospital',
                        bio: 'Development test account',
                        verificationStatus: 'VERIFIED',
                    });
                    localStorage.setItem('vitalis_onboarding_seen', 'true');
                    setAuthStep('APP');
                    showToast('DEV: Logged in as test user');
                }}
            />
        );
    }

    // --- RENDER LOGIN ---
    if (authStep === 'LOGIN') {
        return (
            <LoginView
                onBack={() => setAuthStep('LANDING')}
                onSuccess={handleLoginSuccess}
            />
        );
    }

    // --- RENDER REGISTRATION FLOW ---
    if (authStep === 'REGISTRATION') {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <RegistrationFlow
                    onComplete={handleRegistrationComplete}
                    onCancel={() => setAuthStep('LANDING')}
                />
            </Suspense>
        );
    }

    // --- RENDER ONBOARDING IF NEW USER ---
    if (authStep === 'ONBOARDING') {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <OnboardingView onComplete={handleOnboardingComplete} />
            </Suspense>
        );
    }

    if (authStep === 'APP' && userProfile.verificationStatus && userProfile.verificationStatus !== 'VERIFIED') {
        return (
            <PendingVerificationView
                status={userProfile.verificationStatus}
                onLogout={async () => {
                    await signOut();
                    setAuthStep('LANDING');
                }}
            />
        );
    }

    // --- FROZEN ACCOUNT SCREEN ---
    if (userProfile.isFrozen) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-900/10 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/snow.png')] opacity-10"></div>

                <div className="relative z-10 bg-slate-900/50 backdrop-blur-lg border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border border-blue-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                        <Snowflake size={40} className="text-blue-400" />
                    </div>

                    <h2 className="text-2xl font-serif text-white mb-3">Hesabın Dondurulmuş</h2>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                        Hesabını dondurduğun için kimse seni göremiyor ve sen de uygulamayı kullanamıyorsun. Geri dönmek istediğinde tek tıkla hesabını açabilirsin.
                    </p>

                    <button
                        onClick={handleActivateAccount}
                        className="w-full py-4 rounded-xl bg-blue-500 text-white font-bold tracking-wide shadow-lg hover:bg-blue-600 hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                        <Play size={18} fill="currentColor" />
                        Hesabı Aktifleştir
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN APP ---
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-gold-500/30 transition-colors duration-300">

            {/* Ghost Mode Banner */}
            {userProfile.privacySettings?.ghostMode && (
                <div className="w-full bg-purple-900/40 border-b border-purple-500/30 text-purple-200 text-[10px] font-bold uppercase tracking-widest py-1 text-center animate-fade-in flex items-center justify-center gap-2 backdrop-blur-sm fixed top-16 z-[45]">
                    <Ghost size={12} />
                    Ghost Mode Active
                </div>
            )}

            {!activeChatMatch && !viewingProfile && !isFilterOpen && currentView !== 'premium' && (
                <AppHeader
                    currentView={currentView}
                    setView={handleViewChange}
                    onOpenFilters={() => setIsFilterOpen(true)}
                    unreadNotificationsCount={unreadNotificationsCount}
                />
            )}

            {/* Global Toast Notification */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] animate-fade-in">
                    <div className="bg-slate-900 border border-gold-500/50 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-gold-500" />
                        <span className="text-sm font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}

            <main className={`h-screen w-full relative ${userProfile.privacySettings?.ghostMode ? 'pt-6' : ''}`}>
                {/* STORY VIEWER OVERLAY */}
                {viewingStoryProfile && (
                    <StoryViewer
                        profile={viewingStoryProfile}
                        onClose={() => setViewingStoryProfile(null)}
                        onSendReply={handleStoryReply}
                        onSendReaction={handleStoryReaction}
                    />
                )}

                {/* TOOLTIP FOR PROFILE */}
                {activeTip && activeTip.id === 'availability' && currentView === 'profile' && (
                    <Tooltip
                        message={activeTip.message}
                        onClose={closeTip}
                        className="top-32 right-8 z-50"
                    />
                )}

                <Suspense fallback={<LoadingScreen />}>
                    {activeChatMatch ? (
                        <ChatView
                            match={activeChatMatch}
                            onBack={() => setActiveChatMatch(null)}
                            onUnmatch={handleUnmatch}
                            userProfile={userProfile}
                            templates={messageTemplates}
                            onAddTemplate={handleAddTemplate}
                            onDeleteTemplate={handleDeleteTemplate}
                            onUpdateMatchTheme={handleUpdateMatchTheme}
                            isPremium={isPremium}
                        />
                    ) : isFilterOpen ? (
                        <FilterView
                            initialFilters={filters}
                            onClose={() => setIsFilterOpen(false)}
                            onSave={handleSaveFilters}
                        />
                    ) : viewingProfile ? (
                        <ProfileDetailView
                            profile={viewingProfile}
                            onClose={() => setViewingProfile(null)}
                            onBlock={handleBlockProfile}
                            onReport={handleReportProfile}
                            currentUser={userProfile}
                        />
                    ) : currentView === 'premium' ? (
                        <PremiumView
                            onClose={() => setCurrentView('home')}
                        />
                    ) : (
                        <>
                            {currentView === 'home' && renderHome()}
                            {currentView === 'matches' && <MatchesView matches={matches} onMatchSelect={setActiveChatMatch} />}
                            {currentView === 'notifications' && (
                                <NotificationsView
                                    notifications={notifications}
                                    onNotificationClick={handleNotificationClick}
                                />
                            )}
                            {currentView === 'likesYou' && (
                                <LikesYouView
                                    profiles={MOCK_LIKES_YOU_PROFILES}
                                    onUpgradeClick={() => setCurrentView('premium')}
                                />
                            )}
                            {currentView === 'profile' && (
                                <MyProfileView
                                    profile={userProfile}
                                    onUpdateProfile={handleUpdateProfile}
                                    onGoPremium={() => setCurrentView('premium')}
                                    isPremium={isPremium}
                                    onResetTutorial={resetTutorial}
                                    onViewProfile={setViewingProfile}
                                />
                            )}
                            {currentView === 'history' && (
                                <SwipeHistoryView
                                    history={swipeHistory}
                                    isPremium={isPremium}
                                    onUpgradeClick={() => setCurrentView('premium')}
                                    onUndoSwipe={handleUndoSwipeFromHistory}
                                    onViewProfile={setViewingProfile}
                                />
                            )}
                            {currentView === 'nearby' && (
                                <NearbyView
                                    currentUser={userProfile}
                                    profiles={MOCK_PROFILES}
                                    onSayHi={handleSayHiToNearby}
                                    onUpdatePrivacy={handleUpdatePrivacy}
                                    onViewProfile={setViewingProfile}
                                />
                            )}
                        </>
                    )}
                </Suspense>
            </main>

            {currentMatch && (
                <MatchOverlay
                    match={currentMatch}
                    onClose={() => setCurrentMatch(null)}
                    onChat={() => {
                        setCurrentMatch(null);
                        setActiveChatMatch(currentMatch);
                    }}
                    onViewProfile={() => {
                        setCurrentMatch(null);
                        setViewingProfile(currentMatch.profile);
                    }}
                    isPremium={isPremium}
                />
            )}

            {/* Boost Confirmation Modal */}
            {showBoostConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>

                        <div className="flex justify-center mb-4 mt-2">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-purple-500/30">
                                <Zap size={32} className="text-purple-400 fill-purple-400" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-serif text-white text-center mb-2">Boost Your Profile?</h3>
                        <p className="text-slate-400 text-center mb-6 text-sm leading-relaxed">
                            Be the top profile in your area for <span className="text-purple-400 font-bold">30 minutes</span>. Get up to 10x more visibility.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleActivateBoost}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold tracking-wide shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap size={18} fill="currentColor" />
                                Boost Now
                            </button>
                            <button
                                onClick={() => setShowBoostConfirm(false)}
                                className="w-full py-3.5 rounded-xl bg-slate-800 text-slate-400 font-medium hover:text-white transition-colors"
                            >
                                No thanks
                            </button>
                        </div>

                        <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-wider">
                            {boostCount} Free Boosts Remaining
                        </p>
                    </div>
                </div>
            )}

            {/* Premium Alert Modal */}
            {showPremiumAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="bg-slate-900 border border-gold-500/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-gold-500">
                                <Crown size={32} className="text-gold-500 fill-gold-500" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-serif text-white text-center mb-2">Unlock Vitalis Premium</h3>
                        <p className="text-slate-400 text-center mb-6 text-sm">
                            See exactly who likes you, use unlimited Boosts, and get more Super Likes.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowPremiumAlert(false);
                                    setCurrentView('premium');
                                }}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all"
                            >
                                Upgrade Now
                            </button>
                            <button
                                onClick={() => setShowPremiumAlert(false)}
                                className="w-full py-3.5 rounded-xl bg-slate-800 text-slate-400 font-medium hover:text-white transition-colors"
                            >
                                Maybe later
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
