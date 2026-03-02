/**
 * VITALIS Slate Service — Özellik 3: Sınırlı Günlük Öneri Sistemi
 *
 * Responsibilities:
 *  • Date-conversion-first scoring (NOT session-length)
 *  • Slate composition: 3 high_compat + 2 exploration + 1 serendipity + 1 fresh
 *  • Healthcare-specific rules: schedule compat, same-hospital warning, specialty diversity
 *  • Pending-match throttling: fewer picks when pending queue is full
 *  • Fairness: exposure penalty prevents popularity bias
 *  • Carry-over: unseen yesterday → today's queue (max +3)
 */

import { supabase } from '../src/lib/supabase';
import { picksService, type DailyPick } from './picksService';
import type {
  Profile, Match,
  SlateCategory, SlateProfile, DailySlate,
  PendingLimitRule, SlateSessionStats,
  ShiftFrequency,
} from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default slate size when no pending matches */
const DEFAULT_SLATE_SIZE = 7;

/**
 * Pending-match throttle rules.
 * Ordered: first matching rule wins.
 */
const PENDING_RULES: PendingLimitRule[] = [
  { minPending: 8,  maxPending: Infinity, slateSize: 0, severity: 'blocked'  },
  { minPending: 6,  maxPending: 7,        slateSize: 3, severity: 'warning'  },
  { minPending: 4,  maxPending: 5,        slateSize: 5, severity: 'info'     },
  { minPending: 0,  maxPending: 3,        slateSize: DEFAULT_SLATE_SIZE, severity: 'none' },
];

/** Hours of inactivity after which a match is considered "dead" */
const DEAD_MATCH_HOURS = 7 * 24;

// ── Scoring helpers ───────────────────────────────────────────────────────────

/** Sigmoid: maps any real number → (0, 1) */
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Shift-frequency numeric weight for compatibility distance */
const SHIFT_WEIGHT: Record<ShiftFrequency, number> = {
  NONE: 0, WEEKLY_1_2: 1, WEEKLY_3_4: 2, DAILY: 3,
};

/**
 * Schedule compatibility score (0–1).
 * Shift frequency distance × 0.4, work-style match × 0.4, mutual availability × 0.2.
 */
function calcScheduleCompat(me: Profile, other: Profile): number {
  let score = 0.5;

  if (me.shiftFrequency && other.shiftFrequency) {
    const diff = Math.abs(SHIFT_WEIGHT[me.shiftFrequency] - SHIFT_WEIGHT[other.shiftFrequency]);
    score = diff === 0 ? 1.0 : diff === 1 ? 0.7 : 0.35;
  }

  // Workstyle bonus
  if (me.workStyle && other.workStyle && me.workStyle === other.workStyle) {
    score = Math.min(1, score + 0.15);
  }

  // Both available right now → strong schedule signal
  if (me.isAvailable && other.isAvailable) score = Math.min(1, score + 0.2);

  return score;
}

/** Profile completeness score (0–1). Measures "seriousness" proxy. */
function calcCompleteness(p: Profile): number {
  let score = 0;
  if (p.bio.length > 20)           score += 0.25;
  if (p.images.length >= 2)        score += 0.2;
  if (p.images.length >= 4)        score += 0.1;
  if (p.interests.length > 0)      score += 0.15;
  if (p.lookingFor)                 score += 0.1;
  if (p.workStyle)                  score += 0.1;
  if (p.shiftFrequency)             score += 0.05;
  if (p.questions && p.questions.length > 0) score += 0.05;
  return Math.min(1, score);
}

/**
 * Date probability (0–1): will these two people actually meet?
 *
 * Factors + weights:
 *  • Relationship intention match   0.30
 *  • Distance (location proximity)  0.25
 *  • Schedule compatibility         0.25
 *  • Profile completeness           0.10
 *  • Recency / last active          0.10
 */
export function calcDateProb(me: Profile, other: Profile): number {
  let score = 0;

  // 1. Intention match (0.30)
  if (me.lookingFor && other.lookingFor) {
    if (me.lookingFor === other.lookingFor)                         score += 0.30;
    else if (me.lookingFor === 'OPEN' || other.lookingFor === 'OPEN') score += 0.15;
    else                                                             score += 0.05;
  } else {
    score += 0.15; // Unknown → neutral
  }

  // 2. Distance (0.25)
  if (other.isLocationHidden) {
    score += 0.10;
  } else {
    if      (other.distance < 5)  score += 0.25;
    else if (other.distance < 15) score += 0.20;
    else if (other.distance < 30) score += 0.15;
    else if (other.distance < 50) score += 0.10;
    else if (other.distance < 80) score += 0.05;
  }

  // 3. Schedule compatibility (0.25)
  score += calcScheduleCompat(me, other) * 0.25;

  // 4. Profile completeness (0.10)
  score += calcCompleteness(other) * 0.10;

  // 5. Recency (0.10)
  const hrs = (Date.now() - other.lastActive) / 3_600_000;
  if      (hrs < 4)   score += 0.10;
  else if (hrs < 24)  score += 0.07;
  else if (hrs < 72)  score += 0.04;

  return Math.min(1, score);
}

/**
 * Response probability (0–1): will they reply to a first message?
 *
 * Simplified because we lack historical per-user reply data.
 * Uses proxies: verification, recency, quick-reply badge, profile richness.
 */
export function calcResponseProb(other: Profile): number {
  let score = 0.50;

  if (other.verified)          score += 0.15;
  if (other.quickReplyBadge)   score += 0.10;

  const hrs = (Date.now() - other.lastActive) / 3_600_000;
  if      (hrs < 4)    score += 0.20;
  else if (hrs < 24)   score += 0.10;
  else if (hrs < 72)   score += 0.02;
  else if (hrs > 168)  score -= 0.20; // dormant profile

  if (other.images.length === 0)  score -= 0.30;
  if (other.isOnlineHidden)       score -= 0.05;
  if (other.bio.length === 0)     score -= 0.10;

  return Math.max(0, Math.min(1, score));
}

/**
 * Trust score (0–1): how trustworthy / verified is this profile?
 * Integrates Feature 1 liveness badges when available.
 */
export function calcTrustScore(p: Profile): number {
  let score = 0.40;

  if (p.verified)                          score += 0.20;
  if (p.verificationBadges?.license)       score += 0.15;
  if (p.verificationBadges?.photo)         score += 0.10;
  if (p.verificationBadges?.email)         score += 0.05;
  if (p.verificationStatus === 'VERIFIED' || p.verificationStatus === 'AUTO_VERIFIED') score += 0.10;

  return Math.min(1, score);
}

/**
 * Freshness score (0–1): recency + anti-overexposure.
 * New users get 1.0; dormant or overexposed profiles are penalised.
 */
export function calcFreshnessScore(p: Profile, exposureCount = 0): number {
  const hrs = (Date.now() - p.lastActive) / 3_600_000;
  let score = hrs < 24 ? 1.0 : hrs < 72 ? 0.9 : hrs < 168 ? 0.8 : 0.7;

  // Penalise over-exposure (> 10 impressions above average)
  if (exposureCount > 10) {
    score = Math.max(0.3, score - (exposureCount - 10) * 0.03);
  }

  return score;
}

/** Final composite score: date × response × trust × freshness */
function compositeScore(dateProb: number, responseProb: number, trust: number, freshness: number): number {
  return sigmoid((dateProb * responseProb * trust * freshness) * 6 - 3);
}

// ── Category classification ───────────────────────────────────────────────────

/**
 * Determines which slot category a profile falls into.
 *
 * fresh_verified  → joined ≤ 7 days ago (low/no impressions proxy)
 * high_compat     → date_prob ≥ 0.70 AND response ≥ 0.60 AND trust ≥ 0.80
 * exploration     → date_prob ≥ 0.40
 * serendipity     → date_prob ≥ 0.30 AND trust ≥ 0.90 (surprise pick)
 */
function determineCategory(
  _me: Profile,
  _other: Profile,
  dateProb: number,
  responseProb: number,
  trust: number,
  exposureCount: number,
): SlateCategory {
  const isFreshUser = exposureCount === 0 && trust >= 0.65;
  if (isFreshUser) return 'fresh_verified';
  if (dateProb >= 0.70 && responseProb >= 0.60 && trust >= 0.80) return 'high_compatibility';
  if (dateProb >= 0.40) return 'exploration';
  return 'serendipity';
}

// ── Healthcare-specific scoring ───────────────────────────────────────────────

const SPECIALTY_GROUPS: Record<string, string[]> = {
  internal:  ['Cardiology','Neurology','Pediatrics','Psychiatry','Dermatology'],
  surgical:  ['General Surgery','Anesthesiology','Emergency Medicine'],
  allied:    ['Physiotherapy','Pharmacy','Dentistry','Dietetics','Nursing','Radiology'],
};

function specialtyGroup(specialty: string): string {
  for (const [grp, specs] of Object.entries(SPECIALTY_GROUPS)) {
    if (specs.includes(specialty)) return grp;
  }
  return 'other';
}

/** Returns true if two profiles work at the same hospital */
function sameHospital(me: Profile, other: Profile): boolean {
  if (!me.hospital || !other.hospital) return false;
  if (me.institutionHidden || other.institutionHidden) return false;
  return me.hospital.trim().toLowerCase() === other.hospital.trim().toLowerCase();
}

// ── Pending-match helpers ─────────────────────────────────────────────────────

/**
 * Counts matches that are "pending reply" from the viewer's perspective.
 *
 * A match is pending if:
 *  • It is active (not expired / unmatched), AND
 *  • The viewer has never sent a message, OR
 *  • The most recent message was sent BY the other person (viewer owes reply)
 *  • AND last message was > 24 hours ago
 */
export function countPendingMatches(matches: Match[], myId: string): number {
  const now = Date.now();
  const H24 = 24 * 3_600_000;

  return matches.filter((m) => {
    if (m.isActive === false) return false;

    const msgs = m.messages ?? [];
    if (msgs.length === 0) {
      // No messages at all → pending (match sitting without first message)
      return m.timestamp < now - H24;
    }

    const last = msgs[msgs.length - 1];
    const lastIsOther = last.senderId !== myId;
    const isOld = last.timestamp < now - H24;

    return lastIsOther && isOld;
  }).length;
}

/** Returns count of "dead" matches (7+ days no activity) */
export function countDeadMatches(matches: Match[]): number {
  const cutoff = Date.now() - DEAD_MATCH_HOURS * 3_600_000;
  return matches.filter((m) => {
    if (m.isActive === false) return false;
    const msgs = m.messages ?? [];
    if (msgs.length === 0) return m.timestamp < cutoff;
    return msgs[msgs.length - 1].timestamp < cutoff;
  }).length;
}

/** Selects the correct PENDING_RULES entry for a given pending count */
export function getPendingRule(pendingCount: number): PendingLimitRule {
  return (
    PENDING_RULES.find(
      (r) => pendingCount >= r.minPending && pendingCount <= r.maxPending,
    ) ?? PENDING_RULES[PENDING_RULES.length - 1]
  );
}

// ── Interleaved shuffle ───────────────────────────────────────────────────────

/**
 * Assembles the 7-pick slate with a fixed positional strategy:
 *  [0] Best high_compat  (hook — users see this first)
 *  [1] Second high_compat
 *  [2-5] Shuffled mix: remaining high_compat + exploration + serendipity
 *  [6] Fresh user (cold-start slot)
 */
function interleavedShuffle(scored: ScoredCandidate[]): ScoredCandidate[] {
  const hc   = scored.filter((p) => p.category === 'high_compatibility');
  const ex   = scored.filter((p) => p.category === 'exploration');
  const ser  = scored.filter((p) => p.category === 'serendipity');
  const fr   = scored.filter((p) => p.category === 'fresh_verified');

  const result: ScoredCandidate[] = [];

  // Slots 0-1: two best high-compat profiles
  if (hc[0]) result.push(hc[0]);
  if (hc[1]) result.push(hc[1]);

  // Slots 2-5: middle mix (shuffled)
  const middle: ScoredCandidate[] = [
    hc[2], ex[0], ex[1], ser[0],
  ].filter((x): x is ScoredCandidate => x !== undefined);

  for (let i = middle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }
  result.push(...middle);

  // Slot 6: fresh user
  if (fr[0]) result.push(fr[0]);

  return result;
}

// ── Exposure data ─────────────────────────────────────────────────────────────

async function fetchExposureCounts(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();

  const { data } = await supabase
    .from('user_exposure_tracking')
    .select('target_user_id, impressions_count')
    .in('target_user_id', userIds);

  const map = new Map<string, number>();
  (data ?? []).forEach((r: { target_user_id: string; impressions_count: number }) => {
    map.set(r.target_user_id, r.impressions_count);
  });
  return map;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface ScoredCandidate {
  pickId: string;
  userId: string;
  category: SlateCategory;
  dateScore: number;
  responseScore: number;
  trustScore: number;
  freshnessScore: number;
  finalScore: number;
  sameHospitalWarning: boolean;
  profile: Profile;
  carriedOver: boolean;
  isBonus: boolean;
}

// ── Specialty diversity enforcement ──────────────────────────────────────────

/**
 * Ensures max 3 profiles share the same specialty AND at least 2 different
 * specialty groups exist in the slate.
 */
function enforceDiversity(candidates: ScoredCandidate[], slateSize: number): ScoredCandidate[] {
  const selected: ScoredCandidate[] = [];
  const specialtyCounts = new Map<string, number>();
  const groupsSeen = new Set<string>();

  for (const c of candidates) {
    if (selected.length >= slateSize) break;

    const spec = c.profile.specialty;
    const grp  = specialtyGroup(spec);
    const cnt  = specialtyCounts.get(spec) ?? 0;

    if (cnt >= 3) continue; // Max 3 per specialty

    selected.push(c);
    specialtyCounts.set(spec, cnt + 1);
    groupsSeen.add(grp);
  }

  return selected;
}

// ── Slate ID persistence ──────────────────────────────────────────────────────

interface SlateMetaRow {
  slate_id: string;
  slate_date: string;
  bonus_used: boolean;
  seen_count: number;
  liked_count: number;
  match_count: number;
  expires_at: string;
}

async function getOrCreateSlateMeta(
  userId: string,
  pendingCount: number,
  slateSize: number,
): Promise<SlateMetaRow | null> {
  const { data, error } = await supabase.rpc('get_or_create_daily_slate', {
    p_user_id: userId,
    p_pending_count: pendingCount,
    p_slate_size: slateSize,
  });

  if (error) {
    console.error('[slateService] getOrCreateSlateMeta error:', error);
    return null;
  }

  const rows = data as SlateMetaRow[] | null;
  return rows?.[0] ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const slateService = {
  /**
   * Returns today's fully scored, composed, and enriched DailySlate.
   *
   * Steps:
   *  1. Count pending matches → determine restricted slate size
   *  2. Fetch/generate daily_picks from DB
   *  3. Enrich with profile data from `profiles` table
   *  4. Fetch exposure counts (fairness)
   *  5. Score each candidate (date_prob × response × trust × freshness)
   *  6. Classify into categories
   *  7. Interleaved shuffle to final ordered slate
   *  8. Save scores back to DB (async, non-blocking)
   *  9. Return DailySlate object
   */
  async getTodaySlate(
    userId: string,
    currentUser: Profile,
    matches: Match[],
  ): Promise<DailySlate> {
    const today = new Date().toISOString().split('T')[0];

    // ── 1. Pending match count & slate size ─────────────────────────────────
    const pendingCount = countPendingMatches(matches, userId);
    const rule = getPendingRule(pendingCount);
    const slateSize = rule.slateSize;

    // ── 2. Fetch today's picks ───────────────────────────────────────────────
    const rawPicks = await picksService.getDailyPicks(userId);
    const todayPicks = rawPicks.filter((p) => p.pick_date === today);

    // ── 3. Enrich with profile data ──────────────────────────────────────────
    const profileIds = todayPicks.map((p) => p.picked_user_id);
    const { data: profileRows } = profileIds.length > 0
      ? await supabase.from('profiles').select('*').in('id', profileIds)
      : { data: [] };

    const profileMap = new Map<string, Profile>(
      (profileRows ?? []).map((r: unknown) => [(r as Profile).id, r as Profile]),
    );

    // ── 4. Fetch exposure counts ─────────────────────────────────────────────
    const exposureMap = await fetchExposureCounts(profileIds);

    // ── 5 & 6. Score and categorise ──────────────────────────────────────────
    const candidates: ScoredCandidate[] = [];

    for (const pick of todayPicks) {
      const profile = profileMap.get(pick.picked_user_id);
      if (!profile) continue;

      const exposureCount = exposureMap.get(profile.id) ?? 0;
      const dateScore      = calcDateProb(currentUser, profile);
      const responseScore  = calcResponseProb(profile);
      const trustScore     = calcTrustScore(profile);
      const freshnessScore = calcFreshnessScore(profile, exposureCount);
      const finalScore     = compositeScore(dateScore, responseScore, trustScore, freshnessScore);

      // Reciprocal interest bonus
      const boostedScore = pick.is_liked === null && profile.hasLikedUser
        ? Math.min(1, finalScore * 1.5)
        : finalScore;

      const category = determineCategory(
        currentUser, profile, dateScore, responseScore, trustScore, exposureCount,
      );

      candidates.push({
        pickId: pick.id,
        userId: profile.id,
        category,
        dateScore,
        responseScore,
        trustScore,
        freshnessScore,
        finalScore: boostedScore,
        sameHospitalWarning: sameHospital(currentUser, profile),
        profile,
        carriedOver: Boolean((pick as DailyPick & { carried_over?: boolean }).carried_over),
        isBonus: Boolean((pick as DailyPick & { is_bonus?: boolean }).is_bonus),
      });
    }

    // Sort within each category by finalScore descending
    candidates.sort((a, b) => b.finalScore - a.finalScore);

    // ── 7. Enforce specialty diversity + interleaved shuffle ─────────────────
    const diverse   = enforceDiversity(candidates, DEFAULT_SLATE_SIZE * 2);
    const shuffled  = interleavedShuffle(diverse).slice(0, slateSize);

    // ── 8. Save scores to DB async ───────────────────────────────────────────
    void slateService._saveScoresToDB(userId, shuffled, today);

    // ── 9. Get or create slate metadata row ─────────────────────────────────
    const meta = await getOrCreateSlateMeta(userId, pendingCount, slateSize);

    const nextRefreshAt = meta?.expires_at
      ?? (() => {
           const d = new Date();
           d.setDate(d.getDate() + 1);
           d.setHours(6, 0, 0, 0);
           return d.toISOString();
         })();

    // ── 10. Build SlateProfile list (include all picks for status display) ──
    const allSlateProfiles: SlateProfile[] = shuffled.map((c, idx) => ({
      id:                 c.pickId,
      userId:             c.userId,
      category:           c.category,
      position:           idx + 1,
      status:             'unseen' as const,
      dateScore:          c.dateScore,
      responseScore:      c.responseScore,
      trustScore:         c.trustScore,
      freshnessScore:     c.freshnessScore,
      finalScore:         c.finalScore,
      carriedOver:        c.carriedOver,
      isBonus:            c.isBonus,
      sameHospitalWarning: c.sameHospitalWarning,
      profile:            c.profile,
    }));

    // Merge action status from DB picks
    const actionMap = new Map(todayPicks.map((p) => [p.picked_user_id, p]));
    const enrichedProfiles = allSlateProfiles.map((sp) => {
      const dbPick = actionMap.get(sp.userId);
      let status: SlateProfile['status'] = 'unseen';
      if (dbPick) {
        if (dbPick.is_liked === true)       status = 'liked';
        else if (dbPick.is_passed === true) status = 'passed';
        else if (dbPick.is_viewed)          status = 'seen';
      }
      return { ...sp, status };
    });

    const seenCount    = enrichedProfiles.filter((p) => p.status !== 'unseen').length;
    const likedCount   = enrichedProfiles.filter((p) => p.status === 'liked').length;
    const passedCount  = enrichedProfiles.filter((p) => p.status === 'passed').length;
    const remaining    = enrichedProfiles.filter((p) => p.status === 'unseen').length;
    const carriedOver  = enrichedProfiles.filter((p) => p.carriedOver).length;

    return {
      slateId:           meta?.slate_id ?? null,
      date:              today,
      slateSize,
      profiles:          enrichedProfiles,
      totalCount:        enrichedProfiles.length,
      seenCount,
      likedCount,
      passedCount,
      remainingCount:    remaining,
      carriedOverCount:  carriedOver,
      pendingMatchCount: pendingCount,
      isRestricted:      rule.severity !== 'none',
      bonusUsed:         meta?.bonus_used ?? false,
      nextRefreshAt,
    };
  },

  /** Like a profile in the slate; returns whether a match occurred */
  async likeProfile(
    slateId: string | null,
    pickId: string,
    targetUserId: string,
  ): Promise<{ matched: boolean }> {
    // Record interaction for fairness tracking
    if (slateId) {
      await supabase.rpc('record_slate_interaction', {
        p_slate_id:       slateId,
        p_target_user_id: targetUserId,
        p_action:         'liked',
        p_time_spent:     null,
      }).then(() => {/* fire-and-forget */});
    }

    return picksService.likePick(pickId);
  },

  /** Pass on a profile in the slate */
  async passProfile(
    slateId: string | null,
    pickId: string,
    targetUserId: string,
  ): Promise<void> {
    if (slateId) {
      void supabase.rpc('record_slate_interaction', {
        p_slate_id:       slateId,
        p_target_user_id: targetUserId,
        p_action:         'passed',
        p_time_spent:     null,
      });
    }

    await picksService.passPick(pickId);
  },

  /** Mark a profile as seen (on card view) */
  async markSeen(
    slateId: string | null,
    pickId: string,
    targetUserId: string,
    timeSpentSeconds?: number,
  ): Promise<void> {
    await picksService.markPickViewed(pickId);

    if (slateId) {
      void supabase.rpc('record_slate_interaction', {
        p_slate_id:       slateId,
        p_target_user_id: targetUserId,
        p_action:         'seen',
        p_time_spent:     timeSpentSeconds ?? null,
      });
    }
  },

  /**
   * Request 2 bonus profiles after completing today's slate.
   * Returns new SlateProfile[] or [] if bonus already used.
   */
  async requestBonusProfiles(
    userId: string,
    currentUser: Profile,
  ): Promise<SlateProfile[]> {
    const { data: granted } = await supabase.rpc('consume_daily_bonus', {
      p_user_id: userId,
    });

    if (!granted) return [];

    // Generate 2 more picks via existing picksService
    const today = new Date().toISOString().split('T')[0];
    const allPicks = await picksService.getDailyPicks(userId);
    const newPicks = allPicks.filter(
      (p) =>
        p.pick_date === today &&
        p.is_liked === null &&
        p.is_passed === null &&
        Boolean((p as DailyPick & { is_bonus?: boolean }).is_bonus),
    ).slice(0, 2);

    if (newPicks.length === 0) return [];

    const profileIds = newPicks.map((p) => p.picked_user_id);
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('*')
      .in('id', profileIds);

    const profileMap = new Map<string, Profile>(
      (profileRows ?? []).map((r: unknown) => [(r as Profile).id, r as Profile]),
    );
    const exposureMap = await fetchExposureCounts(profileIds);

    return newPicks
      .map((pick, idx) => {
        const profile = profileMap.get(pick.picked_user_id);
        if (!profile) return null;

        const exposureCount = exposureMap.get(profile.id) ?? 0;
        const dateScore     = calcDateProb(currentUser, profile);
        const responseScore = calcResponseProb(profile);
        const trustScore    = calcTrustScore(profile);
        const freshnessScore = calcFreshnessScore(profile, exposureCount);
        const finalScore    = compositeScore(dateScore, responseScore, trustScore, freshnessScore);

        const sp: SlateProfile = {
          id:                  pick.id,
          userId:              profile.id,
          category:            'high_compatibility',
          position:            DEFAULT_SLATE_SIZE + 1 + idx,
          status:              'unseen',
          dateScore,
          responseScore,
          trustScore,
          freshnessScore,
          finalScore,
          carriedOver:         false,
          isBonus:             true,
          sameHospitalWarning: sameHospital(currentUser, profile),
          profile,
        };
        return sp;
      })
      .filter((x): x is SlateProfile => x !== null);
  },

  /**
   * Build session stats for the "done" screen.
   * Derived from the slate object; no extra DB call needed.
   */
  getSessionStats(slate: DailySlate, prevLiked: number, prevMatches: number): SlateSessionStats {
    return {
      likesSent:     slate.likedCount  - prevLiked,
      passesDone:    slate.passedCount,
      matchesGained: slate.likedCount  - prevLiked - prevMatches, // approximate
    };
  },

  /** Async: saves per-pick scores back to daily_picks for analytics */
  async _saveScoresToDB(
    _userId: string,
    candidates: ScoredCandidate[],
    _today: string,
  ): Promise<void> {
    if (candidates.length === 0) return;

    for (const [idx, c] of candidates.entries()) {
      void supabase
        .from('daily_picks')
        .update({
          slate_category:  c.category,
          slate_position:  idx + 1,
          date_score:      c.dateScore,
          response_score:  c.responseScore,
          trust_score:     c.trustScore,
          freshness_score: c.freshnessScore,
          final_score:     c.finalScore,
          same_hospital:   c.sameHospitalWarning,
        })
        .eq('id', c.pickId);
    }
  },
};

export type { ScoredCandidate };
