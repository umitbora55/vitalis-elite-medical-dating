/**
 * VITALIS Profile Risk Service — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Computes a transparent risk score (0–100) for each profile.
 * Score components:
 *   - Liveness verification:        −20 (reduces risk)
 *   - Healthcare verification:      −25
 *   - Account age > 30 days:        −10
 *   - Account age > 90 days:        −5
 *   - Zero reports:                 −10
 *   - Per report received:          +15 (capped at 50)
 *   - New account (< 3 days):       +15
 *   - (Future) Stock photo match:   +30
 *   - (Future) Scam pattern bio:    +25
 *
 * Risk levels:
 *   0–20:  safe     (no badge)
 *  21–40:  normal   (no badge)
 *  41–60:  caution  (yellow badge)
 *  61–80:  high     (orange badge)
 *  81–100: critical (red badge, auto-hidden)
 */

import { supabase } from '../src/lib/supabase';
import type { ProfileRiskScore, ProfileRiskLevel } from '../types';

// ── Risk level helpers ────────────────────────────────────────────────────────

export function scoreToRiskLevel(score: number): ProfileRiskLevel {
  if (score <= 20) return 'safe';
  if (score <= 40) return 'normal';
  if (score <= 60) return 'caution';
  if (score <= 80) return 'high';
  return 'critical';
}

/** Return true if the risk level should show a UI warning */
export function shouldShowRiskWarning(level: ProfileRiskLevel): boolean {
  return level === 'caution' || level === 'high' || level === 'critical';
}

/** Return the display colour class for a risk level */
export function riskLevelColor(level: ProfileRiskLevel): { bg: string; text: string; border: string } {
  switch (level) {
    case 'safe':    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'normal':  return { bg: 'bg-slate-700/40',   text: 'text-slate-400',   border: 'border-slate-600/30' };
    case 'caution': return { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30' };
    case 'high':    return { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/30' };
    case 'critical':return { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30' };
  }
}

/** Human-readable label for a risk level */
export function riskLevelLabel(level: ProfileRiskLevel): string {
  switch (level) {
    case 'safe':     return 'Güvenli';
    case 'normal':   return 'Normal';
    case 'caution':  return 'Dikkatli ol';
    case 'high':     return 'Yüksek risk';
    case 'critical': return 'Çok yüksek risk';
  }
}

/** Reason codes → Turkish explanations for "why this warning" transparency */
const REASON_LABELS: Record<string, string> = {
  new_account:          'Hesap 3 günden yeni',
  no_liveness:          'Canlılık doğrulaması tamamlanmamış',
  no_hc_verification:   'Sağlık çalışanı belgesi henüz onaylı değil',
  reports_received:     'Başkalarından şikayet aldı',
  unverified_email:     'E-posta doğrulanmamış',
};

// ── Core Service ──────────────────────────────────────────────────────────────

export const profileRiskService = {
  /**
   * Fetch the cached risk score for a user.
   * Returns null if not yet computed.
   */
  async getRiskScore(userId: string): Promise<ProfileRiskScore | null> {
    const { data, error } = await supabase
      .from('profile_risk_scores')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      user_id:              data.user_id as string,
      risk_score:           data.risk_score as number,
      risk_level:           (data.risk_level as ProfileRiskLevel),
      risk_reasons:         (data.risk_reasons as string[]) ?? [],
      calculated_at:        data.calculated_at as string,
      is_discovery_hidden:  data.is_discovery_hidden as boolean,
    };
  },

  /**
   * Trigger a server-side risk score recomputation for a user.
   * Use after verification status changes or new reports.
   */
  async recomputeRiskScore(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('compute_profile_risk', {
      p_user_id: userId,
    });
    if (error) throw new Error('Risk skoru hesaplanamadı.');
    return data as number;
  },

  /**
   * Get risk score, computing it if not cached or if stale (> 24h).
   */
  async getOrComputeRiskScore(userId: string): Promise<ProfileRiskScore | null> {
    const cached = await this.getRiskScore(userId);

    if (cached) {
      const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
      const calculatedMs = new Date(cached.calculated_at).getTime();
      if (calculatedMs > staleCutoff) return cached;
    }

    // Recompute
    try {
      await this.recomputeRiskScore(userId);
      return await this.getRiskScore(userId);
    } catch {
      return cached; // Return stale if recompute fails
    }
  },

  /**
   * Resolve risk reason codes to user-friendly Turkish strings.
   */
  resolveReasons(codes: string[]): string[] {
    return codes.map((c) => REASON_LABELS[c] ?? c);
  },

  /**
   * Client-side fast risk estimate based on profile data available in-memory.
   * Used for immediate UI render while server data loads.
   */
  estimateRiskFromProfile(profile: {
    verified: boolean;
    verificationBadges?: { license?: boolean };
    hasLikenessVerified?: boolean;
  }): ProfileRiskLevel {
    let score = 50;
    if (profile.verified || profile.verificationBadges?.license) score -= 25;
    if (profile.hasLikenessVerified) score -= 20;
    return scoreToRiskLevel(Math.max(0, score));
  },
};
