import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { DAILY_SWIPE_LIMIT, DEFAULT_MESSAGE_TEMPLATES, MOCK_PROFILES, USER_PROFILE } from './constants';
import { DEMO_PROFILES } from './constants/demoScenarios';
import { SwipeDirection, Match, Profile, FilterPreferences, Specialty, MedicalRole, Notification, NotificationType, ReportReason, SwipeHistoryItem, MessageTemplate, ChatTheme, VerificationMethod, UserStatus } from './types';
import type { ProfileCompletionData } from './components/ProfileCompletionView';
import { AppHeader } from './components/AppHeader';
import { AnimatedSwipeCard } from './components/AnimatedSwipeCard';
import { ControlPanel } from './components/ControlPanel';
import { MatchOverlay } from './components/MatchOverlay';
import { LandingView } from './components/LandingView';

import { StoryRail } from './components/StoryRail';
import { StoryViewer } from './components/StoryViewer';
import { LoginView } from './components/LoginView';
import { ShieldCheck, FilterX, Zap, Crown, CheckCircle2, Lock, Hourglass, Ghost, Snowflake, Play, Heart } from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { useUserStore } from './stores/userStore';
import { useUiStore } from './stores/uiStore';
import { useDiscoveryStore } from './stores/discoveryStore';
import { useMatchStore } from './stores/matchStore';
import { useNotificationStore } from './stores/notificationStore';
import { useTheme } from './hooks/useTheme';
import { useBoost } from './hooks/useBoost';
import { useSwipeLimit } from './hooks/useSwipeLimit';
import { signUpWithEmail, signOut, onAuthStateChange } from './services/authService';
import { blockProfile as persistBlockProfile, reportProfile as persistReportProfile } from './services/safetyService';
import { getMyProfile, mapRowToProfile, upsertProfile } from './services/profileService';
import { getActiveSubscription } from './services/subscriptionService';
import {
    AnalyticsConsent,
    getAnalyticsConsent,
    initAnalytics,
    setAnalyticsConsent,
    trackEvent,
} from './src/lib/analytics';
import { PendingVerificationView } from './components/PendingVerificationView';
import { WaitlistScreen } from './components/WaitlistScreen';
import { VerificationPendingScreen } from './components/VerificationPendingScreen';
import { OnboardingFlow } from './components/OnboardingFlow';
import { onboardingService } from './services/onboardingService';
import { pushService } from './services/pushService';
import {
    createVerificationRequest,
    getVerificationPolicy,
    getVerificationSettings,
    saveVerifiedEmail,
    updateProfileVerificationStatus,
    uploadVerificationDocument,
    upsertVerificationDocument,
} from './services/verificationService';
import { supabase } from './src/lib/supabase';
// AUDIT-FIX: SEC-004 — Verification status now set via server-side RPC (complete_email_verification)

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
const ProfileCompletionView = lazy(() => import('./components/ProfileCompletionView').then((m) => ({ default: m.ProfileCompletionView })));
const AdminPanelV2 = lazy(() => import('./components/admin/AdminPanelV2').then((m) => ({ default: m.AdminPanelV2 })));
const AdminSecurityGate = lazy(() => import('./components/admin/AdminSecurityGate').then((m) => ({ default: m.AdminSecurityGate })));
const FilterView = lazy(() => import('./components/FilterView').then((m) => ({ default: m.FilterView })));
const NearbyView = lazy(() => import('./components/NearbyView').then((m) => ({ default: m.NearbyView })));
const EventFeed = lazy(() => import('./components/EventFeed').then((m) => ({ default: m.EventFeed })));
const ClubsView = lazy(() => import('./components/ClubsView').then((m) => ({ default: m.ClubsView })));
const ConferencesView = lazy(() => import('./components/ConferencesView').then((m) => ({ default: m.ConferencesView })));

type VerificationPayload = {
    method: 'EMAIL' | 'DOCUMENT';
    workEmail?: string;
    tier?: number;
    domain?: string;
    documentFile?: File;
};

type RegistrationData = {
    name?: string;
    age?: string | number;
    email?: string;
    password?: string;
    role?: MedicalRole | string;
    specialty?: Specialty | string;
    institution?: string;
    // Tier 1
    genderPreference?: string;
    city?: string;
    current_lat?: number;
    current_lng?: number;
    university?: string;
    // Tier 2
    graduationYear?: string;
    experienceYears?: string;
    lookingFor?: string;
    smoking?: string;
    drinking?: string;
};


const LoadingScreen: React.FC = () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'system-ui', fontSize: 16, opacity: 0.8 }}>Loading Vitalis...</div>
    </div>
);

const VERIFIED_STATUSES = new Set(['VERIFIED', 'AUTO_VERIFIED']);
const RESTRICTED_DEFAULT_ACTIONS = ['swipe', 'chat', 'premium'];

const App: React.FC = () => {
    const authStep = useAuthStore((state) => state.authStep);
    const setAuthStep = useAuthStore((state) => state.setAuthStep);
    const userProfile = useUserStore((state) => state.profile);
    const setUserProfile = useUserStore((state) => state.setProfile);
    const updateUserProfile = useUserStore((state) => state.updateProfile);
    const isPremium = useUserStore((state) => state.isPremium);
    const premiumTier = useUserStore((state) => state.premiumTier);
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
    const discoveryProfiles = useDiscoveryStore((state) => state.profiles);
    const discoveryLoading = useDiscoveryStore((state) => state.isLoading);
    const discoveryError = useDiscoveryStore((state) => state.fetchError);
    const fetchProfiles = useDiscoveryStore((state) => state.fetchProfiles);
    const removeDiscoveryProfile = useDiscoveryStore((state) => state.removeProfile);
    const matches = useMatchStore((state) => state.matches);
    const setMatches = useMatchStore((state) => state.setMatches);
    const addMatch = useMatchStore((state) => state.addMatch);
    const removeMatch = useMatchStore((state) => state.removeMatch);
    const updateMatch = useMatchStore((state) => state.updateMatch);
    const expireMatches = useMatchStore((state) => state.expireMatches);
    const extendMatch = useMatchStore((state) => state.extendMatch);
    const dailyExtensions = useMatchStore((state) => state.dailyExtensions);
    const currentMatch = useMatchStore((state) => state.currentMatch);
    const setCurrentMatch = useMatchStore((state) => state.setCurrentMatch);
    const activeChatMatch = useMatchStore((state) => state.activeChatMatch);
    const setActiveChatMatch = useMatchStore((state) => state.setActiveChatMatch);
    const swipeHistory = useMatchStore((state) => state.swipeHistory);
    const setSwipeHistory = useMatchStore((state) => state.setSwipeHistory);
    const addSwipeHistory = useMatchStore((state) => state.addSwipeHistory);
    const addMessage = useMatchStore((state) => state.addMessage);
    const notifications = useNotificationStore((state) => state.notifications);
    const markAllNotificationsRead = useNotificationStore((state) => state.markAllRead);

    const { syncProfileTheme } = useTheme(userProfile.themePreference || 'SYSTEM');

    // nowMs polling removed: server-side discovery handles time-based filtering

    const hydrateProfile = useCallback(async () => {
        const { data } = await getMyProfile();
        if (data) {
            const mapped = mapRowToProfile(data as Record<string, unknown>, USER_PROFILE);
            setUserProfile(mapped);
        }
    }, [setUserProfile]);
    useEffect(() => {
        const { data: { subscription } } = onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                setAuthStep('APP');
                void hydrateProfile();
            } else if (event === 'SIGNED_OUT') {
                setAuthStep('LANDING');
            }
        });

        return () => subscription.unsubscribe();
    }, [hydrateProfile, setAuthStep]);

    useEffect(() => {
        if (authStep !== 'APP') return;
        getVerificationSettings().then((result) => {
            if (!result.error && result.limitedActions.length > 0) {
                setLimitedActions(result.limitedActions);
            }
        });
    }, [authStep]);

    const handleUpdateProfile = useCallback((updatedProfile: Profile) => {
        setUserProfile(updatedProfile);
        syncProfileTheme(updatedProfile);
        void upsertProfile(updatedProfile);
    }, [setUserProfile, syncProfileTheme]);



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

    // Swipe Limit State
    const { timeToReset } = useSwipeLimit({
        dailyLimit: DAILY_SWIPE_LIMIT,
        onReset: () => setDailySwipesRemaining(DAILY_SWIPE_LIMIT),
    });

    // Super Like State
    // Animation state
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [showChatEntryDissolve, setShowChatEntryDissolve] = useState(false);

    // --- BOOST STATE ---
    const [showBoostConfirm, setShowBoostConfirm] = useState(false);
    const [showPremiumAlert, setShowPremiumAlert] = useState(false);
    const [analyticsConsent, setAnalyticsConsentState] = useState<AnalyticsConsent | null>(() => getAnalyticsConsent());
    const [limitedActions, setLimitedActions] = useState<string[]>(RESTRICTED_DEFAULT_ACTIONS);

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    }, []);

    const verificationStatus = userProfile.verificationStatus || (userProfile.verified ? 'VERIFIED' : 'UNVERIFIED');
    const isVerificationRestricted = !VERIFIED_STATUSES.has(verificationStatus);
    const restrictedActionSet = useMemo(() => new Set((limitedActions || RESTRICTED_DEFAULT_ACTIONS).map((item) => item.toLowerCase())), [limitedActions]);
    const isActionRestricted = useCallback((action: 'swipe' | 'chat' | 'premium') => {
        return isVerificationRestricted && restrictedActionSet.has(action);
    }, [isVerificationRestricted, restrictedActionSet]);
    const guardRestrictedAction = useCallback((action: 'swipe' | 'chat' | 'premium', message: string): boolean => {
        if (!isActionRestricted(action)) return true;
        showToast(message);
        return false;
    }, [isActionRestricted, showToast]);

    const isNearbySmokeMode = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('e2eNearby') === '1'
        && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
        : false;
    useEffect(() => {
        if (!isNearbySmokeMode) return;
        // Nearby smoke mode seeds only the current user + view; NearbyView itself controls its own list.
        setAuthStep('APP');
        setCurrentView('nearby');
        setUserProfile({
            ...USER_PROFILE,
            id: 'smoke-user',
            name: 'Smoke Doctor',
            privacySettings: {
                ghostMode: false,
                hideSameInstitution: false,
                hiddenProfileIds: [],
                showInNearby: true,
                recordProfileVisits: true,
            },
        });
    }, [isNearbySmokeMode, setAuthStep, setCurrentView, setUserProfile]);

    const refreshSubscriptionStatus = useCallback(async () => {
        const { isPremium: hasPremium } = await getActiveSubscription();
        setIsPremium(hasPremium);
    }, [setIsPremium]);

    useEffect(() => {
        if (analyticsConsent !== 'granted') return;
        initAnalytics(userProfile);
    }, [analyticsConsent, userProfile]);

    useEffect(() => {
        if (authStep !== 'APP') return;
        void refreshSubscriptionStatus();
    }, [authStep, refreshSubscriptionStatus]);

    // Schedule daily picks notification at 19:00 when user enters main app
    useEffect(() => {
        if (authStep !== 'APP') return;
        pushService.scheduleDailyPicksNotification();
        return () => pushService.cancelDailyPicksNotification();
    }, [authStep]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;
            if (showBoostConfirm) setShowBoostConfirm(false);
            if (showPremiumAlert) setShowPremiumAlert(false);
        };
        window.addEventListener('keydown', handleEscape);
        return (): void => window.removeEventListener('keydown', handleEscape);
    }, [showBoostConfirm, showPremiumAlert]);

    useEffect(() => {
        if (currentView === 'premium') {
            trackEvent('premium_view', { source: 'nav' });
        }
    }, [currentView]);

    // --- Match Expiration Timer (every 60s) ---
    useEffect(() => {
        const interval = setInterval(() => {
            expireMatches();
        }, 60_000);
        return () => clearInterval(interval);
    }, [expireMatches]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const checkoutStatus = params.get('checkout');
        if (!checkoutStatus) return;

        if (checkoutStatus === 'success') {
            void refreshSubscriptionStatus();
        }
        const toastId = window.setTimeout(() => {
            if (checkoutStatus === 'success') {
                showToast('Welcome to Vitalis!');
            } else if (checkoutStatus === 'cancel') {
                showToast('Checkout canceled.');
            }
        }, 0);

        params.delete('checkout');
        const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, '', nextUrl);
        return (): void => window.clearTimeout(toastId);
    }, [refreshSubscriptionStatus, showToast]);

    // Invite code state (stored for potential use in registration flow)
    const [_validatedInviteCode, setValidatedInviteCode] = useState<string | null>(null);

    // Duplicate email overlay state
    const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null);

    // Logic to handle Login from Landing
    const handleStartApplication = () => {
        setAuthStep('WAITLIST');
    };

    const handleInviteValidated = useCallback((code: string) => {
        setValidatedInviteCode(code);
        setAuthStep('REGISTRATION');
    }, [setAuthStep]);

    const handleStartLogin = () => {
        setAuthStep('LOGIN');
    };

    // Admin access: only via secret URL, no visible entry points

    const handleConsentChoice = useCallback(async (consent: AnalyticsConsent) => {
        setAnalyticsConsent(consent);
        setAnalyticsConsentState(consent);
        // AUDIT-FIX: PRV-017 — Record analytics consent server-side for GDPR Article 7(1) compliance
        if (consent === 'granted') {
        } else {
        }
    }, []);

    const handleRegistrationComplete = useCallback(async (data: RegistrationData, verification: VerificationPayload) => {
        const policyResult = await getVerificationPolicy();
        const verificationPolicy = policyResult.policy;

        if (verification.method === 'DOCUMENT' && verificationPolicy === 'CORPORATE_ONLY') {
            showToast('Personal email signups are disabled by verification policy.');
            return;
        }

        const email = data.email?.trim();
        const password = data.password;

        if (email && password) {
            const { error } = await signUpWithEmail(email, password, {
                name: data.name,
                role: data.role,
                specialty: data.specialty,
            });

            if (error) {
                const errMsg = error.message?.toLowerCase() ?? '';
                if (errMsg.includes('already registered') || errMsg.includes('already been registered') || errMsg.includes('user already') || errMsg.includes('already exists')) {
                    setDuplicateEmailError(email ?? '');
                } else {
                    showToast(error.message);
                }
                return;
            }

            // AUDIT-FIX: PRV-001 — Record KVKK/GDPR consent at registration
            await Promise.all([
            ]);
        }

        const parsedAge = typeof data.age === 'string' ? parseInt(data.age, 10) : data.age;
        const isDocumentPath = verification.method === 'DOCUMENT';
        const shouldAutoApprove = isDocumentPath && verificationPolicy === 'AUTO_APPROVE';
        const nextVerificationStatus: Profile['verificationStatus'] = verification.method === 'EMAIL'
            ? 'AUTO_VERIFIED'
            : (shouldAutoApprove ? 'AUTO_VERIFIED' : 'PENDING');
        const nextVerificationMethod = (verification.method === 'EMAIL' ? 'CORPORATE_EMAIL' : 'DOCUMENTS') as VerificationMethod;

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
            // Tier 1
            genderPreference: (data.genderPreference as Profile['genderPreference']) || userProfile.genderPreference,
            university: data.university || userProfile.university,
            city: data.city || userProfile.city,
            current_lat: data.current_lat || userProfile.current_lat,
            current_lng: data.current_lng || userProfile.current_lng,
            // Tier 2
            graduationYear: data.graduationYear ? parseInt(data.graduationYear, 10) : userProfile.graduationYear,
            experienceYears: data.experienceYears ? parseInt(data.experienceYears, 10) : userProfile.experienceYears,
            lookingFor: (data.lookingFor as Profile['lookingFor']) || userProfile.lookingFor,
            smoking: (data.smoking as Profile['smoking']) || userProfile.smoking,
            drinking: (data.drinking as Profile['drinking']) || userProfile.drinking,
            verificationStatus: nextVerificationStatus,
            verificationMethod: nextVerificationMethod,
            verified: nextVerificationStatus === 'AUTO_VERIFIED',
            userStatus: nextVerificationStatus === 'PENDING' ? 'pending_verification' : 'profile_incomplete' as UserStatus,
        };

        updateUserProfile(nextProfile);
        const { error: profileError } = await upsertProfile(nextProfile);
        if (profileError) {
            showToast('Profile saved locally. Cloud sync failed.');
        }
        // AUDIT-FIX: BE-002/BE-008 — userId no longer passed; functions use auth.getUser() internally
        if (verification.method === 'EMAIL' && email && verification.domain && verification.tier) {
            const saveEmailResult = await saveVerifiedEmail(email, verification.domain, verification.tier);
            if (saveEmailResult.error) {
                showToast('Verified email could not be saved.');
                return;
            }

            // AUDIT-FIX: SEC-004 — Use server-side RPC instead of client-side status update
            const { error: verifyError } = await supabase.rpc('complete_email_verification');
            if (verifyError) {
                showToast('Verification status update failed.');
                return;
            }
        } else {
            if (!verification.documentFile && !shouldAutoApprove) {
                showToast('Verification document is missing.');
                return;
            }

            if (verification.documentFile && !shouldAutoApprove) {
                const requestId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `${Date.now()}`;
                const uploadResult = await uploadVerificationDocument(
                    verification.documentFile,
                    requestId,
                );
                if (uploadResult.error || !uploadResult.documentPath) {
                    showToast(uploadResult.error?.message || 'Verification document upload failed.');
                    return;
                }

                const createRequestResult = await createVerificationRequest({
                    requestId,
                    emailType: 'personal',
                    method: 'DOCUMENTS',
                    initialStatus: 'PENDING',
                    documentPath: uploadResult.documentPath,
                });
                if (createRequestResult.error) {
                    showToast('Verification request could not be created.');
                    return;
                }

                const docResult = await upsertVerificationDocument(requestId, uploadResult.documentPath, {
                    docType: 'DOCUMENT',
                    size: uploadResult.documentSize,
                    mime: verification.documentFile.type,
                    sha256: uploadResult.sha256,
                });
                if (docResult.error) {
                    showToast('Document metadata could not be saved.');
                    return;
                }
            }

            const updateStatusResult = await updateProfileVerificationStatus(
                shouldAutoApprove ? 'AUTO_VERIFIED' : 'PENDING',
                nextVerificationMethod,
            );
            if (updateStatusResult.error) {
                showToast('Verification status update failed.');
                return;
            }
        }

        // Route based on verification status
        if (nextProfile.verificationStatus === 'AUTO_VERIFIED') {
            showToast('Welcome to Vitalis!');
            setAuthStep('ONBOARDING_FLOW');
        } else {
            showToast('Verification pending. You will be notified when approved.');
            setAuthStep('PENDING_VERIFICATION');
        }
    }, [setAuthStep, showToast, updateUserProfile, userProfile]);

    const handleLoginSuccess = useCallback(async () => {
        // After login, check user status and route accordingly
        const { data } = await getMyProfile();
        if (data) {
            const userStatus = (data as Record<string, unknown>).user_status as string | undefined;
            if (userStatus === 'pending_verification') {
                setAuthStep('PENDING_VERIFICATION');
                return;
            }
            if (userStatus === 'profile_incomplete') {
                setAuthStep('ONBOARDING_FLOW');
                return;
            }
        }
        setAuthStep('APP');
    }, [setAuthStep]);

    const handleOnboardingComplete = useCallback(() => {
        setAuthStep('PROFILE_COMPLETION');
        localStorage.setItem('vitalis_onboarding_seen', 'true');
    }, [setAuthStep]);

    const handleOnboardingFlowComplete = useCallback(() => {
        void onboardingService.updateUserStatus(userProfile.id, 'active');
        setAuthStep('APP');
    }, [setAuthStep, userProfile.id]);





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

    const handleStoryReply = useCallback((text: string) => {
        if (!viewingStoryProfile) return;

        const trimmed = text.trim();

        // Ideally this would add a message to the chat
        // For demo, we just toast and maybe open chat
        showToast(trimmed ? "Reply sent! 📨" : "Reply sent! 📨");

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
    // Server already handles: swiped/blocked exclusion, age/distance/specialty/availability filtering, sorting
    // Client applies only privacy-layer filters that depend on local userProfile state

    // Determine if there are profiles left that might appear after filter change
    const hasHiddenProfiles = false;

    // Always show the first profile in the filtered list

    const visibleProfiles = useMemo(() => {
        // Base list for discovery is currently mock-backed in this build.
        // Swiped/blocked sets come from zustand store.
        const hidden = new Set([...(blockedProfileIds ? Array.from(blockedProfileIds) : []), ...(swipedProfileIds ? Array.from(swipedProfileIds) : [])]);
        return MOCK_PROFILES
            .filter((p) => !hidden.has(p.id))
            .filter((p) => {
                // Apply minimal filters that exist in FilterPreferences
                const [minAge, maxAge] = filters.ageRange;
                if ((p.age < minAge || p.age > maxAge)) return false
                return true
            });
    }, [blockedProfileIds, swipedProfileIds, filters]);
    const currentProfile = visibleProfiles[0] || null;

    const unreadNotificationsCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    // --- Safety Actions ---
    const handleBlockProfile = useCallback((profileId: string) => {
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

        void persistBlockProfile(profileId);
        showToast("User blocked successfully");
    }, [activeChatMatch?.profile.id, addBlockedProfile, removeMatch, setActiveChatMatch, setViewingProfile, showToast, viewingProfile?.id]);

    const handleReportProfile = useCallback((profileId: string, reason: ReportReason) => {
        void persistReportProfile(profileId, reason);
        showToast(`Report received (${reason}). Thank you.`);
        // Often you might also block the user automatically when reporting
        handleBlockProfile(profileId);
    }, [handleBlockProfile, showToast]);

    const handleUnmatch = useCallback((matchId: string) => {
        // 1. Remove from matches list
        removeMatch(matchId);

        // 2. Allow them to be swiped again (remove from swiped set)
        removeSwipedProfile(matchId);

        // 3. Close the chat view
        setActiveChatMatch(null);

        showToast("Unmatched successfully");
    }, [removeMatch, removeSwipedProfile, setActiveChatMatch, showToast]);

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
        if (!guardRestrictedAction('chat', 'Verification in progress. Chat is unlocked after approval.')) {
            return;
        }

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
    }, [guardRestrictedAction, matches, setActiveChatMatch, setCurrentView, showToast]);

    const handleUpdatePrivacy = useCallback((showInNearby: boolean) => {
        setUserProfile({
            ...userProfile,
            privacySettings: {
                ...userProfile.privacySettings!,
                showInNearby,
            },
        });
    }, [setUserProfile, userProfile]);

    const handleSwipe = useCallback((direction: SwipeDirection) => {
        if (!guardRestrictedAction('swipe', 'Verification in progress. Swipe is temporarily disabled.')) {
            return;
        }

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
        setTimeout(async () => {
            // Save ID for Rewind Feature
            setLastSwipedId(currentProfile.id);

            // Mark as swiped
            addSwipedProfile(currentProfile.id);

            // Add to local history
            const swipeAction = direction === SwipeDirection.LEFT ? 'PASS' as const : (direction === SwipeDirection.SUPER ? 'SUPER_LIKE' as const : 'LIKE' as const);
            const historyItem: SwipeHistoryItem = {
                id: Date.now().toString(),
                profile: currentProfile,
                action: swipeAction,
                timestamp: Date.now()
            };
            addSwipeHistory(historyItem);

            // Note: Discovery list management is handled inside the view layer; this store tracks swipe state only.
            // Match detection is currently client-side only in this build.
            if (direction !== SwipeDirection.LEFT) {
                // Server confirmed a match — build the match object
                let isFirstMessagePending = false;
                let allowedSenderId = null;

                if (userProfile.firstMessagePreference === 'ME_FIRST') {
                    isFirstMessagePending = true;
                    allowedSenderId = 'me';
                } else if (userProfile.firstMessagePreference === 'THEM_FIRST') {
                    isFirstMessagePending = true;
                    allowedSenderId = 'them';
                }

                const baseHours = userProfile.firstMessagePreference === 'ANYONE' ? 48 : 24;
                let expiresAt = Date.now() + baseHours * 60 * 60 * 1000;
                if (currentProfile.isOnCall || userProfile.isOnCall) {
                    expiresAt += 24 * 60 * 60 * 1000;
                }

                const newMatch: Match = {
                    profile: currentProfile,
                    timestamp: Date.now(),
                    isFirstMessagePending,
                    allowedSenderId,
                    expiresAt,
                    extended: false,
                    isActive: true,
                };
                addMatch(newMatch);
                setCurrentMatch(newMatch);
                trackEvent('match', { profileId: currentProfile.id });
            }

            setSwipeDirection(null);
        }, 750); // Matches premium exit transition duration (0.7s)
    }, [addMatch, addSwipeHistory, addSwipedProfile, currentProfile, dailySwipesRemaining, decrementSuperLike, decrementSwipe, guardRestrictedAction, isPremium, removeDiscoveryProfile, setCurrentMatch, setLastSwipedId, setShowPremiumAlert, setSwipeDirection, superLikesCount, swipeDirection, trackEvent, userProfile.firstMessagePreference, userProfile.isOnCall]);

    const handleRewind = useCallback(() => {
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
    }, [isPremium, lastSwipedId, removeMatch, removeSwipedProfile, setLastSwipedId, setShowPremiumAlert, setSwipeHistory, showToast, swipeHistory]);

    const handleUndoSwipeFromHistory = useCallback((item: SwipeHistoryItem) => {
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
    }, [removeMatch, removeSwipedProfile, setSwipeHistory, showToast, swipeHistory]);

    const handleSaveFilters = useCallback((newFilters: FilterPreferences) => {
        setFilters(newFilters);
        setIsFilterOpen(false);
    }, [setFilters, setIsFilterOpen]);

    const resetFilters = useCallback(() => {
        setFilters({
            ageRange: [20, 80],
            maxDistance: 150,
            specialties: Object.values(Specialty),
            showAvailableOnly: false
        });
    }, [setFilters]);

    const resetSwipes = useCallback(() => {
        clearSwipedProfiles();
    }, [clearSwipedProfiles]);

    const handleActivateAccount = useCallback(() => {
        setUserProfile({ ...userProfile, isFrozen: false });
        showToast("Account Reactivated! Welcome back.");
    }, [setUserProfile, showToast, userProfile]);

    // --- Notification Logic ---

    const handleViewChange = useCallback((view: 'home' | 'profile' | 'matches' | 'notifications' | 'likesYou' | 'premium' | 'history' | 'nearby' | 'admin' | 'events' | 'clubs' | 'conferences') => {
        if (view === 'premium' && !guardRestrictedAction('premium', 'Premium upgrades unlock after verification approval.')) {
            return;
        }

        setCurrentView(view);
        if (view === 'notifications') {
            // Mark all as read when opening notifications
            markAllNotificationsRead();
        }
    }, [guardRestrictedAction, markAllNotificationsRead, setCurrentView]);

    const isNotificationProfileLocked = useCallback((notification: Notification): boolean => {
        const requiresPremiumIdentity =
            notification.type === NotificationType.LIKE ||
            notification.type === NotificationType.SUPER_LIKE;
        if (!requiresPremiumIdentity) return false;
        return !(premiumTier === 'FORTE' || premiumTier === 'ULTRA');
    }, [premiumTier]);

    const handleNotificationClick = useCallback((notification: Notification) => {
        if (notification.type === NotificationType.MATCH && !guardRestrictedAction('chat', 'Verification in progress. Chat is locked until approval.')) {
            return;
        }

        if (isNotificationProfileLocked(notification)) {
            setCurrentView('premium');
            showToast('Bu profili gormek icin Forte veya Ultra gerekli.');
            return;
        }

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
    }, [guardRestrictedAction, isNotificationProfileLocked, matches, setActiveChatMatch, setCurrentView, setViewingProfile, showToast]);


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
                        <span className="text-xs font-bold">Likes</span>
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
                            ? 'bg-purple-900/40 border border-purple-500/50 text-purple-200 cursor-default'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(147,51,234,0.3)]'
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
                    <div className="absolute top-[10.5rem] right-4 z-10 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full animate-bounce shadow-lg">
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
                                You&apos;ve used all your free likes for today. Your swipes will refill at midnight.
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
                ) : discoveryLoading && discoveryProfiles.length === 0 ? (
                    /* LOADING STATE — first fetch in progress */
                    <div className="relative w-full aspect-[3/4] max-h-[60vh] bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center justify-center p-8 shadow-2xl mx-4 animate-pulse" role="status" aria-label="Loading profiles">
                        <div className="w-16 h-16 rounded-full bg-slate-800 mx-auto flex items-center justify-center mb-4 border border-slate-700">
                            <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <h2 className="text-xl font-serif text-white mb-2">Finding profiles...</h2>
                        <p className="text-slate-400 text-sm">Discovering verified medical professionals near you.</p>
                    </div>
                ) : discoveryError && discoveryProfiles.length === 0 ? (
                    /* ERROR STATE — Redesigned Premium Fallback */
                    <div className="relative w-full max-w-sm mx-4 aspect-[3/4] max-h-[60vh] rounded-[2rem] border border-slate-700/30 bg-transparent flex flex-col items-center justify-center p-8 overflow-hidden group animate-fade-in">
                        {/* Ambient Glows */}
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gold-500/8 rounded-full blur-3xl transition-opacity duration-1000 opacity-40 group-hover:opacity-70 pointer-events-none"></div>
                        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/8 rounded-full blur-3xl transition-opacity duration-1000 opacity-40 group-hover:opacity-70 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center w-full">
                            {/* Icon Container */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-gold-500/20 blur-xl rounded-full animate-pulse"></div>
                                <div className="w-20 h-20 rounded-full bg-slate-900/80 border border-gold-500/30 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(212,175,55,0.15)] backdrop-blur-sm">
                                    <ShieldCheck className="text-gold-400" size={32} strokeWidth={1.5} />
                                </div>
                            </div>

                            {/* Text Content */}
                            <h2 className="text-3xl font-serif text-white mb-3 text-center tracking-wide">Connection Issue</h2>
                            <p className="text-slate-400 mb-10 text-sm text-center font-light tracking-wide leading-relaxed px-2">
                                We couldn&apos;t load the profiles right now. Please check your connection to continue discovering elite matches.
                            </p>

                            {/* Buttons */}
                            <div className="flex flex-col gap-4 w-full">
                                <button
                                    onClick={() => void fetchProfiles()}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 text-slate-950 font-bold tracking-widest text-xs uppercase shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] active:scale-95 transition-all duration-300"
                                >
                                    Retry Connection
                                </button>
                                <button
                                    onClick={() => {
                                        useDiscoveryStore.setState({
                                            profiles: DEMO_PROFILES,
                                            isLoading: false,
                                            fetchError: null,
                                            hasMore: false,
                                        });
                                        showToast("Previewing Demo Profiles");
                                    }}
                                    className="w-full py-4 rounded-xl bg-transparent border border-gold-500/50 text-gold-400 hover:bg-gold-500/10 text-xs font-bold uppercase tracking-widest hover:border-gold-400 transition-all duration-300"
                                >
                                    Preview Demo
                                </button>
                            </div>
                        </div>
                    </div>
                ) : currentProfile ? (
                    <div className="relative w-full aspect-[3/4] max-h-[60vh] px-4">

                        {/* Current Card (Foreground) — key triggers premium entrance on each new profile */}
                        {/* Current Card (Foreground) — Framer Motion AnimatedSwipeCard */}
                        <AnimatedSwipeCard
                            profile={currentProfile}
                            currentUser={userProfile}
                            onShowDetails={() => setViewingProfile(currentProfile)}
                            onSwipe={handleSwipe}
                            programmaticSwipeDirection={swipeDirection}
                        />

                        {/* AUDIT-FIX: [FE-006] - Pass canRewind prop for proper disabled state */}
                        <ControlPanel
                            onSwipe={handleSwipe}
                            onRewind={handleRewind}
                            remainingSuperLikes={superLikesCount}
                            canRewind={isPremium && !!lastSwipedId}
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
                                <h2 className="text-2xl font-serif text-white mb-2">That&apos;s everyone</h2>
                                <p className="text-slate-400 mb-6">You&apos;ve reviewed all verified profiles in your area.</p>
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
        );
    };

    // SECURITY: Admin route uses a non-guessable path to prevent discovery
    const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/__v-ctrl');

    if (isAdminRoute || currentView === 'admin') {
        return (
            <Suspense fallback={<div className="fixed inset-0 bg-slate-950" />}>
                <AdminSecurityGate onClose={() => { window.location.href = '/'; }}>
                    <AdminPanelV2 onClose={() => setCurrentView('home')} />
                </AdminSecurityGate>
            </Suspense>
        );
    }

    // --- RENDER LANDING PAGE ---
    if (authStep === 'LANDING') {
        return (
            <LandingView
                onEnter={handleStartApplication}
                onLogin={handleStartLogin}
                onDevBypass={() => {
                    // Force a valid mock profile and premium state for Dev Bypass
                    import('./constants').then(({ USER_PROFILE }) => {
                        setUserProfile(USER_PROFILE);
                        setIsPremium(true);
                        setAuthStep('APP');
                    }).catch(() => {
                        setIsPremium(true);
                        setAuthStep('APP');
                    });
                }}
            />
        );
    }

    // --- RENDER WAITLIST / INVITE GATE ---
    if (authStep === 'WAITLIST') {
        return (
            <WaitlistScreen
                onInviteValidated={handleInviteValidated}
            />
        );
    }

    // --- RENDER VERIFICATION PENDING ---
    if (authStep === 'PENDING_VERIFICATION') {
        return (
            <VerificationPendingScreen
                onUpgradeToPremium={() => {
                    setAuthStep('APP');
                    setCurrentView('premium');
                }}
                onLogout={() => {
                    void signOut().finally(() => setAuthStep('LANDING'));
                }}
                isRejected={userProfile.verificationStatus === 'REJECTED'}
                onRetry={() => setAuthStep('REGISTRATION')}
            />
        );
    }

    // --- RENDER ONBOARDING FLOW (post-approval profile completion) ---
    if (authStep === 'ONBOARDING_FLOW') {
        return (
            <OnboardingFlow
                userId={userProfile.id}
                step="location"
                onComplete={handleOnboardingFlowComplete}
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
            <>
                <Suspense fallback={<LoadingScreen />}>
                    <RegistrationFlow
                        onComplete={(profileData, verification) => {
                            void handleRegistrationComplete(profileData, verification);
                        }}
                        onCancel={() => setAuthStep('LANDING')}
                    />
                </Suspense>

                {/* Premium Duplicate Email Overlay */}
                {duplicateEmailError && (
                    <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
                        {/* Background ambience */}
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 max-w-sm w-full">
                            {/* Icon */}
                            <div className="text-center mb-8">
                                <div className="w-24 h-24 rounded-full bg-red-900/20 border-2 border-red-500/25 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <line x1="17" y1="11" x2="22" y2="11" />
                                    </svg>
                                </div>

                                <h1 className="text-3xl font-serif font-bold text-white mb-3 tracking-tight">
                                    Kayıtlı Hesap Bulundu
                                </h1>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                                    <span className="text-white font-semibold">{duplicateEmailError}</span> adresi ile zaten bir hesap oluşturulmuş. Giriş yapmayı deneyin.
                                </p>
                            </div>

                            {/* Action Card */}
                            <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
                                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 mb-6">
                                    <p className="text-amber-400/90 text-xs leading-relaxed text-center">
                                        Eğer şifrenizi unuttuysanız, giriş ekranından şifre sıfırlama işlemi yapabilirsiniz.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            setDuplicateEmailError(null);
                                            setAuthStep('LOGIN');
                                        }}
                                        className="btn-primary w-full py-4 text-base group"
                                    >
                                        Giriş Yap
                                    </button>

                                    <button
                                        onClick={() => setDuplicateEmailError(null)}
                                        className="w-full py-3 rounded-xl border border-slate-700 text-slate-400 font-semibold text-sm hover:border-slate-600 hover:text-slate-300 transition-all"
                                    >
                                        Geri Dön
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
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

    // --- RENDER PROFILE COMPLETION ---
    if (authStep === 'PROFILE_COMPLETION') {
        const handleProfileComplete = (data: ProfileCompletionData) => {
            const updatedProfile: Partial<Profile> = {
                ...(data.workStyle && { workStyle: data.workStyle }),
                ...(data.shiftFrequency && { shiftFrequency: data.shiftFrequency }),
                ...(data.livingStatus && { livingStatus: data.livingStatus }),
                ...(data.salaryRange && { salaryRange: data.salaryRange }),
                ...(data.abroadExperience !== undefined && { abroadExperience: data.abroadExperience }),
            };
            updateUserProfile({ ...userProfile, ...updatedProfile });
            void upsertProfile({ ...userProfile, ...updatedProfile });
            setAuthStep('APP');
        };

        return (
            <Suspense fallback={<LoadingScreen />}>
                <ProfileCompletionView
                    onComplete={handleProfileComplete}
                    onSkip={() => setAuthStep('APP')}
                />
            </Suspense>
        );
    }

    if (authStep === 'APP' && verificationStatus === 'SUSPENDED') {
        return (
            <PendingVerificationView
                status='REJECTED'
                onRetryVerification={() => setAuthStep('REGISTRATION')}
                onLogout={() => {
                    void signOut().finally(() => setAuthStep('LANDING'));
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
        <div className="h-[100dvh] w-full overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-gold-500/30 transition-colors duration-300">

            {/* Ghost Mode Banner */}
            {userProfile.privacySettings?.ghostMode && (
                <div className="w-full bg-purple-900/40 border-b border-purple-500/30 text-purple-200 text-xs font-bold uppercase tracking-widest py-1 text-center animate-fade-in flex items-center justify-center gap-2 backdrop-blur-sm fixed top-16 z-layer-banner">
                    <Ghost size={12} />
                    Ghost Mode Active
                </div>
            )}

            {isVerificationRestricted && (
                <div className="w-full bg-amber-900/40 border-b border-amber-500/30 text-amber-200 text-xs font-semibold py-1 text-center backdrop-blur-sm fixed top-16 z-layer-banner">
                    Verification pending. Limited mode is active until approval.
                </div>
            )}

            {!activeChatMatch && !viewingProfile && !isFilterOpen && currentView !== 'premium' && (
                <AppHeader
                    currentView={currentView}
                    setView={handleViewChange}
                    unreadNotificationsCount={unreadNotificationsCount}
                />
            )}

            {/* Global Toast Notification */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-layer-toast animate-fade-in" role="status" aria-live="polite" aria-atomic="true">
                    <div className="bg-slate-900 border border-gold-500/50 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-gold-500" />
                        <span className="text-sm font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}

            {analyticsConsent === null && (
                <div className="fixed bottom-4 left-4 right-4 z-layer-toast max-w-xl mx-auto rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl p-4 shadow-2xl">
                    <p className="text-xs text-slate-300 leading-relaxed">
                        We use analytics to improve matching and app stability. See our{' '}
                        <a href="/privacy.html" target="_blank" rel="noreferrer" className="text-gold-400 underline">
                            Privacy Policy
                        </a>{' '}
                        and{' '}
                        <a href="/terms.html" target="_blank" rel="noreferrer" className="text-gold-400 underline">
                            Terms
                        </a>.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={() => handleConsentChoice('denied')}
                            className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            Decline
                        </button>
                        <button
                            onClick={() => handleConsentChoice('granted')}
                            className="flex-1 rounded-lg bg-gold-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-gold-400 transition-colors"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            )}

            {/* Skip to main content link for keyboard/screen-reader users */}
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-gold-500 focus:text-slate-950 focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm">
                Skip to main content
            </a>

            <main id="main-content" className={`flex-1 relative w-full overflow-hidden ${userProfile.privacySettings?.ghostMode ? 'pt-6' : ''}`}>
                {/* STORY VIEWER OVERLAY */}
                {viewingStoryProfile && (
                    <StoryViewer
                        profile={viewingStoryProfile}
                        onClose={() => setViewingStoryProfile(null)}
                        onSendReply={handleStoryReply}
                        onSendReaction={handleStoryReaction}
                    />
                )}



                <Suspense fallback={<LoadingScreen />}>
                    {activeChatMatch ? (
                        <ChatView
                            match={activeChatMatch}
                            onBack={() => {
                                setActiveChatMatch(null);
                                setShowChatEntryDissolve(false);
                            }}
                            onUnmatch={handleUnmatch}
                            onUpdateMatch={(matchId, updates) => updateMatch(matchId, updates)}
                            userProfile={userProfile}
                            templates={messageTemplates}
                            onAddTemplate={handleAddTemplate}
                            onDeleteTemplate={handleDeleteTemplate}
                            onUpdateMatchTheme={handleUpdateMatchTheme}
                            isPremium={isPremium}
                            enableEntryDissolve={showChatEntryDissolve}
                            onEntryDissolveDone={() => setShowChatEntryDissolve(false)}
                            onSendMessage={addMessage}
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
                            {currentView === 'matches' && <MatchesView matches={matches} onMatchSelect={setActiveChatMatch} onExtendMatch={extendMatch} isPremium={isPremium} dailyExtensions={dailyExtensions} />}
                            {currentView === 'notifications' && (
                                <NotificationsView
                                    notifications={notifications}
                                    onNotificationClick={handleNotificationClick}
                                    premiumTier={premiumTier}
                                    onExplore={() => setCurrentView('home')}
                                    onUpgradeClick={() => setCurrentView('premium')}
                                />
                            )}
                            {currentView === 'likesYou' && (
                                <LikesYouView
                                    profiles={[]}
                                    onUpgradeClick={() => setCurrentView('premium')}
                                    premiumTier={premiumTier}
                                />
                            )}
                            {currentView === 'profile' && (
                                <MyProfileView
                                    profile={userProfile}
                                    onUpdateProfile={handleUpdateProfile}
                                    isPremium={isPremium}
                                    onOpenDiscoverySettings={() => setIsFilterOpen(true)}
                                    onLogout={() => {
                                        void signOut().finally(() => setAuthStep('LANDING'));
                                    }}
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
                                <NearbyView profiles={[]}
                                    currentUser={userProfile}
                                    onSayHi={handleSayHiToNearby}
                                    onUpdatePrivacy={handleUpdatePrivacy}
                                    onViewProfile={setViewingProfile}
                                    onBrowseProfiles={() => setCurrentView('home')}
                                    onRetryScan={() => { showToast('Nearby scan refreshed.'); }}
                                />
                            )}
                            {currentView === 'events' && (
                                <EventFeed
                                    userId={userProfile.id}
                                    userCity={userProfile.city || 'Istanbul'}
                                    isPremium={isPremium}
                                    isVerified={userProfile.verified}
                                    onUpgradeClick={() => setCurrentView('premium')}
                                />
                            )}
                            {currentView === 'clubs' && (
                                <ClubsView
                                    userId={userProfile.id}
                                    userCity={userProfile.city || 'Istanbul'}
                                    onBack={() => setCurrentView('home')}
                                />
                            )}
                            {currentView === 'conferences' && (
                                <ConferencesView
                                    userId={userProfile.id}
                                    userCity={userProfile.city || 'Istanbul'}
                                    onBack={() => setCurrentView('events')}
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
                        setShowChatEntryDissolve(true);
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Boost confirmation">
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

                        <p className="text-center text-xs text-slate-500 mt-4 uppercase tracking-wider">
                            {boostCount} Free Boosts Remaining
                        </p>
                    </div>
                </div>
            )}

            {/* Premium Alert Modal */}
            {showPremiumAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Premium upsell">
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
