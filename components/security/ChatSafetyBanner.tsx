/**
 * ChatSafetyBanner — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Sticky banner shown at the top of a chat window to surface safety information
 * about the conversation partner.  It combines:
 *
 *   • Verification status (liveness + healthcare badge)
 *   • Profile risk level
 *   • "New match" tip (first 24h)
 *   • Dismissal per-session (stored in component state, resets on remount)
 *
 * Design philosophy:
 *   – Only shown if there is at least one notable safety signal
 *   – Non-intrusive (collapses to a chip, not a full-page modal)
 *   – User can dismiss; they can also tap to expand for details
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Shield,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  BadgeCheck,
} from 'lucide-react';
import { profileRiskService } from '../../services/profileRiskService';
import type { ProfileRiskScore, ProfileRiskLevel } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatSafetyBannerProps {
  /** The other user in the conversation */
  partnerId: string;
  /** Whether the partner is healthcare-verified */
  partnerVerified: boolean;
  /** Whether liveness check passed */
  partnerLivenessVerified?: boolean;
  /** When the match was created (ISO string) */
  matchCreatedAt: string;
  /** Outer className */
  className?: string;
}

// Banner variant determines visual weight
type BannerVariant = 'info' | 'caution' | 'warning' | 'critical';

interface BannerData {
  variant:  BannerVariant;
  title:    string;
  subtitle: string;
  bullets:  string[];
  riskLevel: ProfileRiskLevel | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<BannerVariant, { bg: string; border: string; text: string; icon: string }> = {
  info:     { bg: 'bg-blue-500/8',    border: 'border-blue-500/20',   text: 'text-blue-400',   icon: 'text-blue-400' },
  caution:  { bg: 'bg-amber-500/8',   border: 'border-amber-500/25',  text: 'text-amber-400',  icon: 'text-amber-400' },
  warning:  { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-400' },
  critical: { bg: 'bg-red-500/10',    border: 'border-red-500/35',    text: 'text-red-400',    icon: 'text-red-400' },
};

function RiskShieldIcon({ level, size }: { level: ProfileRiskLevel; size: number }) {
  switch (level) {
    case 'safe':    return <ShieldCheck size={size} />;
    case 'normal':  return <Shield      size={size} />;
    case 'caution': return <ShieldAlert size={size} />;
    case 'high':    return <ShieldAlert size={size} />;
    case 'critical':return <ShieldX    size={size} />;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const ChatSafetyBanner: React.FC<ChatSafetyBannerProps> = ({
  partnerId,
  partnerVerified,
  partnerLivenessVerified = false,
  matchCreatedAt,
  className = '',
}) => {
  const [riskScore, setRiskScore]     = useState<ProfileRiskScore | null>(null);
  const [loading,   setLoading]       = useState(true);
  const [dismissed, setDismissed]     = useState(false);
  const [expanded,  setExpanded]      = useState(false);

  // Load partner risk score
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    profileRiskService
      .getOrComputeRiskScore(partnerId)
      .then((score) => { if (!cancelled) setRiskScore(score); })
      .catch(() => { /* non-critical */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [partnerId]);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  // ── Build banner data ──────────────────────────────────────────────────────
  const bannerData = React.useMemo<BannerData | null>(() => {
    if (loading) return null;

    const ageHours =
      (Date.now() - new Date(matchCreatedAt).getTime()) / (1000 * 60 * 60);
    const isNewMatch = ageHours < 24;

    const riskLevel = riskScore?.risk_level ?? 'normal';
    const bullets: string[] = [];

    // Verification signals
    if (!partnerVerified) {
      bullets.push('Sağlık çalışanı doğrulaması henüz tamamlanmamış');
    } else {
      bullets.push('Sağlık çalışanı doğrulaması onaylı');
    }

    if (partnerLivenessVerified) {
      bullets.push('Canlılık (selfie) doğrulaması geçildi');
    } else {
      bullets.push('Canlılık doğrulaması tamamlanmamış');
    }

    if (isNewMatch) {
      bullets.push('Yeni eşleşme — kişisel bilgileri paylaşırken dikkatli ol');
    }

    if (riskScore?.risk_reasons && riskScore.risk_reasons.length > 0) {
      riskScore.risk_reasons.slice(0, 2).forEach((r) => bullets.push(r));
    }

    // Determine variant
    let variant: BannerVariant = 'info';
    let title  = 'Güvenli Sohbet';
    let subtitle = '';

    if (riskLevel === 'critical') {
      variant  = 'critical';
      title    = 'Yüksek Risk Uyarısı';
      subtitle = 'Bu profil güvenlik ekibimizce inceleniyor.';
    } else if (riskLevel === 'high') {
      variant  = 'warning';
      title    = 'Dikkat';
      subtitle = 'Bu profil hakkında risk sinyalleri mevcut.';
    } else if (riskLevel === 'caution') {
      variant  = 'caution';
      title    = 'Dikkatli Ol';
      subtitle = 'Henüz doğrulanmamış bir hesap.';
    } else if (!partnerVerified || !partnerLivenessVerified) {
      variant  = 'caution';
      title    = 'Doğrulama Eksik';
      subtitle = 'Karşı tarafın doğrulaması tamamlanmamış.';
    } else if (isNewMatch) {
      variant  = 'info';
      title    = 'Yeni Eşleşme';
      subtitle = 'İlk 24 saat içinde kişisel bilgi paylaşmaya dikkat et.';
    } else {
      // Everything looks fine — no banner needed
      return null;
    }

    return { variant, title, subtitle, bullets, riskLevel };
  }, [loading, riskScore, partnerVerified, partnerLivenessVerified, matchCreatedAt]);

  // ── Render guards ──────────────────────────────────────────────────────────
  if (loading || dismissed || !bannerData) return null;

  const styles = VARIANT_STYLES[bannerData.variant];

  return (
    <div
      className={`mx-3 mt-2 rounded-xl border ${styles.bg} ${styles.border} overflow-hidden animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Main row */}
      <div className="flex items-start gap-2.5 p-3">
        {/* Icon */}
        <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
          {bannerData.riskLevel ? (
            <RiskShieldIcon level={bannerData.riskLevel} size={16} />
          ) : (
            <Shield size={16} />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-xs font-semibold ${styles.text}`}>
              {bannerData.title}
            </p>
            {/* Verified badge */}
            {partnerVerified && (
              <BadgeCheck size={12} className="text-emerald-400 flex-shrink-0" />
            )}
            {/* New match clock */}
            {bannerData.variant === 'info' && (
              <Clock size={11} className="text-slate-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
            {bannerData.subtitle}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {bannerData.bullets.length > 0 && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className={`p-1 rounded-md hover:bg-white/10 ${styles.text} transition-colors`}
              aria-label={expanded ? 'Daralt' : 'Genişlet'}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md hover:bg-white/10 text-slate-500 transition-colors"
            aria-label="Kapat"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Expanded detail bullets */}
      {expanded && bannerData.bullets.length > 0 && (
        <div className={`px-3 pb-3 border-t ${styles.border}`}>
          <ul className="mt-2.5 space-y-1.5">
            {bannerData.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] text-slate-400">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${
                    b.includes('onaylı') || b.includes('geçildi')
                      ? 'bg-emerald-500'
                      : b.includes('tamamlanmamış') || b.includes('eksik') || b.includes('risk')
                      ? 'bg-orange-500'
                      : 'bg-slate-600'
                  }`}
                />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[9px] text-slate-600 leading-relaxed">
            Güvenlik verileri her 24 saatte bir güncellenir.
          </p>
        </div>
      )}
    </div>
  );
};
