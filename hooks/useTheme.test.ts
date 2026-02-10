import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';
import { MedicalRole, Profile, Specialty } from '../types';

const buildProfile = (overrides: Partial<Profile>): Profile => ({
  id: '1',
  name: 'Dr. Test',
  age: 30,
  role: MedicalRole.DOCTOR,
  specialty: Specialty.CARDIOLOGY,
  subSpecialty: '',
  hospital: 'General',
  institutionHidden: false,
  bio: '',
  education: '',
  images: ['img1'],
  verified: true,
  interests: [],
  personalityTags: [],
  hasLikedUser: false,
  distance: 1,
  location: 'Boston',
  isLocationHidden: false,
  lastActive: Date.now(),
  isOnlineHidden: false,
  isAvailable: false,
  readReceiptsEnabled: true,
  stories: [],
  storyPrivacy: 'ALL_MATCHES',
  ...overrides,
});

describe('useTheme', () => {
  it('applies dark class when preference is DARK', () => {
    const { result } = renderHook(() => useTheme('DARK'));

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => result.current.setThemePreference('LIGHT'));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('syncs profile theme changes', () => {
    const { result } = renderHook(() => useTheme('LIGHT'));

    act(() => {
      result.current.syncProfileTheme(buildProfile({ themePreference: 'DARK' }));
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
