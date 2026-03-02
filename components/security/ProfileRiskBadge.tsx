/**
 * ProfileRiskBadge — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Renders a small coloured badge on profile cards to signal the risk level
 * of a profile.  Tapping the badge opens a detail tooltip / sheet that explains
 * the risk reasons in human-readable Turkish.
 *
 * Usage:
 *   <ProfileRiskBadge riskScore={riskScore} />
 *   <ProfileRiskBadge riskScore={null} loading />
 */

import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, X, Info } from 'lucide-react';
import {
  riskLevelColor,
  riskLevelLabel,
  shouldShowRiskWarning,
} from '../../services/profileRiskService';
import type { ProfileRiskScore, ProfileRiskLevel } from '../../types';

// ── Sub-types ──────────────────────────────────────────────────────────────────

export interface ProfileRiskBadgeProps {
  /** Full risk score record; null = not loaded yet */
  riskScore: ProfileRiskScore | null;
  /** Show loading skeleton */
  loading?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show label text next to icon */
  showLabel?: boolean;
  /** Allow tap-to-expand reasons detail sheet */
  expandable?: boolean;
  /** Extra class on the wrapper */
  className?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function RiskIcon({ level, size }: { level: ProfileRiskLevel; size: number }) {
  switch (level) {
    case 'safe':    return <ShieldCheck size={size} />;
    case 'normal':  return <Shield      size={size} />;
    case 'caution': return <ShieldAlert size={size} />;
    case 'high':    return <ShieldAlert size={size} />;
    case 'critical':return <ShieldX    size={size} />;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const ProfileRiskBadge: React.FC<ProfileRiskBadgeProps> = ({
  riskScore,
  loading = false,
  size = 'sm',
  showLabel = false,
  expandable = true,
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/60 animate-pulse ${className}`}
      >
        <span className="w-3 h-3 rounded-full bg-slate-600" />
        {showLabel && <span className="w-10 h-2.5 rounded bg-slate-600" />}
      </span>
    );
  }

  // ── No data — return nothing (don't show a badge if unknown) ───────────────
  if (!riskScore) return null;

  const level  = riskScore.risk_level;
  const colors = riskLevelColor(level);
  const label  = riskLevelLabel(level);
  const show   = shouldShowRiskWarning(level);

  // Don't render a badge for safe / normal unless showLabel is explicitly true
  if (!show && !showLabel) return null;

  const iconSize  = size === 'sm' ? 12 : 14;
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <>
      {/* Badge pill */}
      <button
        onClick={expandable ? () => setOpen(true) : undefined}
        disabled={!expandable}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border
          ${colors.bg} ${colors.text} ${colors.border}
          ${expandable ? 'cursor-pointer active:scale-95 transition-transform' : 'cursor-default'}
          font-semibold leading-none ${textClass} ${className}`}
        aria-label={`Risk seviyesi: ${label}`}
      >
        <RiskIcon level={level} size={iconSize} />
        {showLabel && <span>{label}</span>}
        {expandable && show && <Info size={iconSize - 1} className="opacity-60" />}
      </button>

      {/* Detail sheet */}
      {expandable && open && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center px-4 pb-6">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-slide-up">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}
                  >
                    <RiskIcon level={level} size={20} />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${colors.text}`}>{label}</p>
                    <p className="text-xs text-slate-500">
                      Risk skoru: {riskScore.risk_score}/100
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                  aria-label="Kapat"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Risk reasons */}
              {riskScore.risk_reasons.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Neden bu uyarı?
                  </p>
                  {riskScore.risk_reasons.map((reason, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl ${colors.bg} border ${colors.border}`}
                    >
                      <ShieldAlert size={13} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                      <p className="text-xs text-slate-300 leading-relaxed">{reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500">
                  Risk sebebi bilgisi bulunamadı.
                </p>
              )}

              {/* Info footer */}
              <p className="mt-4 text-[10px] text-slate-600 leading-relaxed">
                Bu puan doğrulama durumu, hesap yaşı ve alınan şikayetler gibi
                faktörlere göre otomatik hesaplanır.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
