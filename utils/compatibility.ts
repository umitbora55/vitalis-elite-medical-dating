import { Profile } from '../types';

export interface CompatibilityResult {
  score: number;
  color: string;
  labelColor: string;
  reasons: string[];
}

export const calculateCompatibility = (me: Profile | undefined, other: Profile): CompatibilityResult => {
  if (!me) {
      return { score: 0, color: 'text-slate-500', labelColor: 'bg-slate-500', reasons: [] };
  }

  let rawScore = 0;
  const reasons: string[] = [];

  // 1. Shared Interests (+20%)
  const sharedInterests = me.interests.filter(i => other.interests.includes(i));
  if (sharedInterests.length > 0) {
      const interestScore = Math.min(20, sharedInterests.length * 7); // ~3 interests to max out
      rawScore += interestScore;
      reasons.push(`${sharedInterests.length} Shared Interests`);
  }

  // 2. Age Gap (+15%)
  const ageDiff = Math.abs(me.age - other.age);
  if (ageDiff <= 3) {
      rawScore += 15;
      reasons.push("Similar Age Range");
  } else if (ageDiff <= 7) {
      rawScore += 10;
  } else if (ageDiff <= 12) {
      rawScore += 5;
  }

  // 3. Medical Role (+10%)
  if (me.role === other.role) {
      rawScore += 10;
      reasons.push(`Both are ${me.role}s`);
  }

  // 4. Distance (+15%)
  if (!other.isLocationHidden && other.distance < 10) {
      rawScore += 15;
      reasons.push("Very Close Location");
  } else if (other.distance < 30) {
      rawScore += 10;
  } else if (other.distance < 80) {
      rawScore += 5;
  }

  // 5. Activity/Shift Overlap (Simulation) (+10%)
  // Assumption: If last active times are somewhat close or both available
  const timeDiff = Math.abs(me.lastActive - other.lastActive);
  if (me.isAvailable && other.isAvailable) {
      rawScore += 10;
      reasons.push("Both Available Now");
  } else if (timeDiff < 60 * 60 * 1000 * 4) { // Active within 4 hours of each other
      rawScore += 5;
      reasons.push("Similar Shift Patterns");
  }

  // 6. Profile Completeness (+10%)
  if (other.bio.length > 20 && other.images.length >= 3) {
      rawScore += 10;
  }

  // 7. AI Prediction (Random deterministic factor based on ID) (+20%)
  // This simulates complex AI matching that finds "hidden" connections
  const idHash = (other.id.charCodeAt(0) + (me.id.charCodeAt(0) || 0)) % 20;
  rawScore += idHash; 
  if (idHash > 15) {
      reasons.push("High AI Compatibility");
  }

  // Cap at 99, Min 40 (for UX reasons, nobody likes seeing 12% match)
  const finalScore = Math.min(99, Math.max(45, Math.floor(rawScore)));

  // Determine Colors
  let color = 'text-orange-400';
  let labelColor = 'bg-orange-500'; // for badges
  
  if (finalScore >= 80) {
      color = 'text-green-400';
      labelColor = 'bg-green-500';
  } else if (finalScore >= 60) {
      color = 'text-yellow-400';
      labelColor = 'bg-yellow-500';
  }

  return {
      score: finalScore,
      color,
      labelColor,
      reasons
  };
};