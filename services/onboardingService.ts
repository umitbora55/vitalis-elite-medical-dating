import { supabase } from '../src/lib/supabase';

export type UserStatus =
  | 'pending_invite'
  | 'pending_verification'
  | 'verification_rejected'
  | 'profile_incomplete'
  | 'active'
  | 'suspended'
  | 'banned';

export type OnboardingStep =
  | 'invite'
  | 'register'
  | 'verification'
  | 'waiting_approval'
  | 'location'
  | 'photos'
  | 'bio'
  | 'intent'
  | 'complete';

export interface ProfileCompletionStatus {
  photosComplete: boolean;
  bioComplete: boolean;
  intentComplete: boolean;
  locationComplete: boolean;
  overallComplete: boolean;
}

const STEP_ORDER: OnboardingStep[] = [
  'invite',
  'register',
  'verification',
  'waiting_approval',
  'location',
  'photos',
  'bio',
  'intent',
  'complete',
];

function nextStep(current: OnboardingStep): OnboardingStep {
  const idx = STEP_ORDER.indexOf(current);
  if (idx < 0 || idx >= STEP_ORDER.length - 1) return 'complete';
  return STEP_ORDER[idx + 1];
}

export const onboardingService = {
  async getCurrentStep(userId: string): Promise<OnboardingStep> {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_step, user_status')
      .eq('id', userId)
      .single();

    if (error || !data) return 'invite';
    return (data.onboarding_step as OnboardingStep) || 'invite';
  },

  async completeStep(userId: string, step: OnboardingStep): Promise<OnboardingStep> {
    const next = nextStep(step);

    const updates: Record<string, unknown> = { onboarding_step: next };

    // Auto-update user_status based on step completion
    if (step === 'verification') {
      updates.user_status = 'pending_verification';
    } else if (step === 'intent') {
      updates.user_status = 'active';
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      throw new Error(`Adım tamamlanamadı: ${step}`);
    }

    return next;
  },

  async getProfileCompletionStatus(userId: string): Promise<ProfileCompletionStatus> {
    const { data, error } = await supabase
      .from('profiles')
      .select('photo_count, bio_text, intent, location_enabled')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return {
        photosComplete: false,
        bioComplete: false,
        intentComplete: false,
        locationComplete: false,
        overallComplete: false,
      };
    }

    const photosComplete = (data.photo_count || 0) >= 3;
    const bioComplete = (data.bio_text || '').length >= 50;
    const intentComplete = Boolean(data.intent);
    const locationComplete = Boolean(data.location_enabled);
    const overallComplete = photosComplete && bioComplete && intentComplete && locationComplete;

    return {
      photosComplete,
      bioComplete,
      intentComplete,
      locationComplete,
      overallComplete,
    };
  },

  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ user_status: status })
      .eq('id', userId);

    if (error) {
      throw new Error('Kullanıcı durumu güncellenemedi.');
    }
  },

  async getUserStatus(userId: string): Promise<UserStatus> {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_status')
      .eq('id', userId)
      .single();

    if (error || !data) return 'pending_invite';
    return (data.user_status as UserStatus) || 'pending_invite';
  },
};
