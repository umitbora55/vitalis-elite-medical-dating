import { describe, expect, it } from 'vitest';
import { calculateCompatibility } from './compatibility';
import { MedicalRole, Specialty, Profile } from '../types';

const baseProfile = (overrides: Partial<Profile>): Profile => ({
  id: '1',
  name: 'Dr. One',
  age: 30,
  role: MedicalRole.DOCTOR,
  specialty: Specialty.CARDIOLOGY,
  subSpecialty: '',
  hospital: 'City General',
  institutionHidden: false,
  bio: 'Experienced cardiologist.',
  education: 'Medical School',
  images: ['img1', 'img2', 'img3'],
  verified: true,
  interests: ['music', 'travel'],
  personalityTags: [],
  hasLikedUser: false,
  distance: 10,
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

describe('calculateCompatibility', () => {
  it('returns zero score when current user is missing', () => {
    const result = calculateCompatibility(undefined, baseProfile({ id: '2' }));
    expect(result.score).toBe(0);
  });

  it('adds shared interests reason when interests overlap', () => {
    const me = baseProfile({ interests: ['music', 'travel', 'reading'] });
    const other = baseProfile({ id: '2', interests: ['music', 'sports'] });

    const result = calculateCompatibility(me, other);

    expect(result.reasons.some((r) => r.includes('Shared Interests'))).toBe(true);
  });

  it('adds similar age reason for close ages', () => {
    const me = baseProfile({ age: 30 });
    const other = baseProfile({ id: '2', age: 32 });

    const result = calculateCompatibility(me, other);

    expect(result.reasons).toContain('Similar Age Range');
  });

  it('caps score at 99 and floors at 45', () => {
    const me = baseProfile({ id: 'A', isAvailable: true, lastActive: Date.now() });
    const otherHigh = baseProfile({
      id: 'Z',
      interests: ['music', 'travel', 'reading', 'sports'],
      age: 30,
      role: MedicalRole.DOCTOR,
      distance: 1,
      isAvailable: true,
      bio: 'Long bio for completeness check',
      images: ['1', '2', '3', '4'],
    });

    const high = calculateCompatibility(me, otherHigh);
    expect(high.score).toBeLessThanOrEqual(99);

    const otherLow = baseProfile({
      id: 'B',
      interests: [],
      age: 55,
      distance: 200,
      isAvailable: false,
      bio: '',
      images: ['1'],
    });

    const low = calculateCompatibility(me, otherLow);
    expect(low.score).toBeGreaterThanOrEqual(45);
  });
});
