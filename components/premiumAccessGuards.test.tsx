import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LikesYouView } from './LikesYouView';
import { NotificationsView } from './NotificationsView';
import { MedicalRole, Notification, NotificationType, Profile, Specialty } from '../types';

const buildProfile = (id: string, name: string): Profile => ({
  id,
  name,
  age: 32,
  role: MedicalRole.DOCTOR,
  specialty: Specialty.CARDIOLOGY,
  subSpecialty: '',
  hospital: 'City General Hospital',
  institutionHidden: false,
  bio: 'Bio',
  education: 'Med School',
  images: [`${id}.jpg`],
  verified: true,
  interests: ['music'],
  personalityTags: [],
  hasLikedUser: false,
  distance: 4,
  location: 'Boston',
  isLocationHidden: false,
  lastActive: Date.now(),
  isOnlineHidden: false,
  isAvailable: false,
  readReceiptsEnabled: true,
  stories: [],
  storyPrivacy: 'ALL_MATCHES',
  genderPreference: 'FEMALE',
  university: 'İstanbul Tıp Fakültesi',
  city: 'İstanbul',
});

describe('Premium access guards', () => {
  it('routes locked like notification to upgrade instead of opening profile', () => {
    const sender = buildProfile('p1', 'Dr. Secret');
    const notification: Notification = {
      id: 'n1',
      type: NotificationType.LIKE,
      senderProfile: sender,
      timestamp: Date.now(),
      isRead: false,
    };

    const onNotificationClick = vi.fn();
    const onUpgradeClick = vi.fn();

    render(
      <NotificationsView
        notifications={[notification]}
        onNotificationClick={onNotificationClick}
        premiumTier="FREE"
        onExplore={() => undefined}
        onUpgradeClick={onUpgradeClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to unlock this notification' }));

    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
    expect(onNotificationClick).not.toHaveBeenCalled();

    const lockedAvatar = screen.getByAltText('Locked profile') as HTMLImageElement;
    expect(lockedAvatar.src).toContain('data:image/svg+xml');
  });

  it('does not render real liker identity in free likes grid', () => {
    const profile = buildProfile('p2', 'Dr. Hidden Name');
    const onUpgradeClick = vi.fn();

    render(<LikesYouView profiles={[profile]} onUpgradeClick={onUpgradeClick} premiumTier="FREE" />);

    expect(screen.getByText('Gizli Profil')).toBeInTheDocument();
    expect(screen.queryByText(/Hidden Name/)).not.toBeInTheDocument();

    const lockedAvatar = screen.getByAltText('Locked profile') as HTMLImageElement;
    expect(lockedAvatar.src).toContain('data:image/svg+xml');

    fireEvent.click(screen.getByText('Gizli Profil'));
    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });
});
