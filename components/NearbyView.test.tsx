import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NearbyView } from './NearbyView';
import { MedicalRole, Profile, Specialty } from '../types';

const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'profile-id',
  name: 'Dr. Example',
  age: 32,
  role: MedicalRole.DOCTOR,
  specialty: Specialty.CARDIOLOGY,
  subSpecialty: '',
  hospital: 'City Hospital',
  institutionHidden: false,
  bio: 'Example',
  education: 'Example University',
  images: ['https://example.com/photo.jpg'],
  verified: false,
  interests: [],
  personalityTags: [],
  hasLikedUser: false,
  distance: 1.2,
  location: 'Istanbul',
  isLocationHidden: false,
  lastActive: Date.now(),
  isOnlineHidden: false,
  isAvailable: false,
  readReceiptsEnabled: true,
  stories: [],
  storyPrivacy: 'ALL_MATCHES',
  genderPreference: 'EVERYONE',
  university: 'Example University',
  city: 'Istanbul',
  ...overrides,
});

describe('NearbyView', () => {
  it('renders nearby users when current user privacy settings are missing', () => {
    const currentUser = buildProfile({ id: 'me' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (currentUser as any).privacySettings = undefined;

    const nearbyProfile = buildProfile({
      id: 'nearby-1',
      distance: 3,
      name: 'Dr. Nearby',
      lastActive: Date.now() - 1 * 60 * 1000,
    });

    render(
      <NearbyView
        currentUser={currentUser}
        profiles={[nearbyProfile]}
        onSayHi={() => { }}
        onUpdatePrivacy={() => { }}
        onViewProfile={() => { }}
        onBrowseProfiles={() => { }}
        onRetryScan={() => { }}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /toggle nearby visibility/i })).toBeChecked();
    expect(screen.getByText(/Dr\. Nearby/)).toBeInTheDocument();
  });

  it('shows hidden state when user disabled visibility', () => {
    const currentUser = buildProfile({
      id: 'me',
      privacySettings: {
        ghostMode: false,
        hideSameInstitution: false,
        hiddenProfileIds: [],
        showInNearby: false,
        recordProfileVisits: true,
      },
    });

    const onUpdatePrivacy = vi.fn();
    render(
      <NearbyView
        currentUser={currentUser}
        profiles={[buildProfile({ id: 'nearby-1' })]}
        onSayHi={() => { }}
        onUpdatePrivacy={onUpdatePrivacy}
        onViewProfile={() => { }}
        onBrowseProfiles={() => { }}
        onRetryScan={() => { }}
      />,
    );

    expect(screen.getByText('You are hidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /turn on visibility/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /turn on visibility/i }));
    expect(onUpdatePrivacy).toHaveBeenCalledWith(true);
  });
});
