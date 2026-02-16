import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileCard } from './ProfileCard';
import { MedicalRole, Specialty, Profile } from '../types';

const buildProfile = (): Profile => ({
  id: '1',
  name: 'Dr. Jane',
  age: 32,
  role: MedicalRole.DOCTOR,
  specialty: Specialty.CARDIOLOGY,
  subSpecialty: '',
  hospital: 'City General Hospital',
  institutionHidden: false,
  bio: 'Bio',
  education: 'Med School',
  images: ['photo1.jpg', 'photo2.jpg'],
  verified: true,
  interests: ['music', 'travel'],
  personalityTags: [],
  hasLikedUser: false,
  distance: 12,
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

describe('ProfileCard', () => {
  it('renders name and age', () => {
    const profile = buildProfile();
    render(<ProfileCard profile={profile} onShowDetails={() => { }} currentUser={profile} />);

    expect(screen.getByText('Dr. Jane, 32')).toBeInTheDocument();
  });

  it('shows specialty', () => {
    const profile = buildProfile();
    render(<ProfileCard profile={profile} onShowDetails={() => { }} currentUser={profile} />);

    expect(screen.getByText(/Cardiology/)).toBeInTheDocument();
  });

  it('calls onShowDetails when info button is clicked', () => {
    const profile = buildProfile();
    const onShowDetails = vi.fn();

    render(<ProfileCard profile={profile} onShowDetails={onShowDetails} currentUser={profile} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(onShowDetails).toHaveBeenCalled();
  });
});
