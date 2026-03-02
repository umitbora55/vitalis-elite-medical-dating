/**
 * VerificationBadge — Vitalis 6-Level Professional Trust Ladder
 *
 * Level 0: No verification
 * Level 1: Email verified
 * Level 2: Phone verified
 * Level 3: Institution verified
 * Level 4: Professional claim verified
 * Level 5: License verified
 * Level 6: Identity verified (liveness)
 *
 * RULES:
 * - Badge levels are hierarchical — level N implies levels 1..N-1
 * - "Verified" label only appears at level 5+
 * - Badge is ALWAYS server-truth (trust_level from DB, not computed client-side)
 * - Clicking badge opens VerificationExplainerModal
 */

import React from 'react';
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  ScrollText,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
} from 'lucide-react';

// ─── Trust Level Config ───────────────────────────────────────────────────────

export interface TrustLevelEntry {
  level: number;
  label: string;
  shortLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
  icon: React.ReactNode;
}

export const TrustLevelConfig: TrustLevelEntry[] = [
  {
    level: 0,
    label: 'Doğrulanmamış',
    shortLabel: 'Yok',
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-800',
    borderClass: 'border-slate-600',
    dotClass: 'bg-slate-600',
    icon: <ShieldOff size={12} />,
  },
  {
    level: 1,
    label: 'E-posta Doğrulandı',
    shortLabel: 'E-posta',
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-500/40',
    dotClass: 'bg-sky-400',
    icon: <Mail size={12} />,
  },
  {
    level: 2,
    label: 'Telefon Doğrulandı',
    shortLabel: 'Telefon',
    colorClass: 'text-sky-300',
    bgClass: 'bg-sky-500/15',
    borderClass: 'border-sky-400/40',
    dotClass: 'bg-sky-300',
    icon: <Phone size={12} />,
  },
  {
    level: 3,
    label: 'Kurumsal Doğrulandı',
    shortLabel: 'Kurum',
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-500/10',
    borderClass: 'border-violet-500/40',
    dotClass: 'bg-violet-400',
    icon: <Building2 size={12} />,
  },
  {
    level: 4,
    label: 'Meslek Beyanı Doğrulandı',
    shortLabel: 'Meslek',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/40',
    dotClass: 'bg-amber-400',
    icon: <Briefcase size={12} />,
  },
  {
    level: 5,
    label: 'Lisanslı Uzman',
    shortLabel: 'Lisans',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/40',
    dotClass: 'bg-emerald-400',
    icon: <ScrollText size={12} />,
  },
  {
    level: 6,
    label: 'Kimlik Doğrulandı',
    shortLabel: 'Kimlik',
    colorClass: 'text-emerald-300',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-400/50',
    dotClass: 'bg-emerald-300',
    icon: <ShieldCheck size={12} />,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getTrustLabel = (level: number): string => {
  const clamped = Math.min(Math.max(level, 0), 6);
  return TrustLevelConfig[clamped]?.label ?? 'Doğrulanmamış';
};

const clampLevel = (level: number): number => Math.min(Math.max(Math.floor(level), 0), 6);

// ─── Component ────────────────────────────────────────────────────────────────

interface VerificationBadgeProps {
  trustLevel: number;
  compact?: boolean;
  onExplain?: () => void;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  trustLevel,
  compact = false,
  onExplain,
}) => {
  const level = clampLevel(trustLevel);
  const config = TrustLevelConfig[level];
  const isVerified = level >= 5;

  const badge = (
    <button
      type="button"
      onClick={onExplain}
      disabled={!onExplain}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all
        ${config.bgClass} ${config.borderClass} ${config.colorClass}
        ${onExplain ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'cursor-default'}
      `}
      aria-label={`Doğrulama seviyesi: ${config.label}. ${onExplain ? 'Detaylar için tıklayın.' : ''}`}
    >
      <span className="flex-shrink-0">{config.icon}</span>
      <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
        {isVerified ? `Doğrulandı · ${config.shortLabel}` : config.shortLabel}
      </span>
      {isVerified && (
        <CheckCircle2 size={11} className="flex-shrink-0" aria-hidden="true" />
      )}
      <span className={`text-[10px] opacity-60 leading-none ${config.colorClass}`}>
        Lv.{level}/6
      </span>
    </button>
  );

  if (compact) return badge;

  // Non-compact: show badge + progress strip
  return (
    <div className="inline-flex flex-col items-start gap-2">
      {badge}

      {/* Mini progress strip — 6 dots for levels 1–6 */}
      <div
        className="flex items-center gap-1 px-1"
        role="progressbar"
        aria-valuenow={level}
        aria-valuemin={0}
        aria-valuemax={6}
        aria-label={`Doğrulama ilerlemesi: ${level}/6`}
      >
        {TrustLevelConfig.slice(1).map((cfg) => (
          <span
            key={cfg.level}
            className={`w-2 h-2 rounded-full transition-all ${
              level >= cfg.level
                ? cfg.dotClass
                : 'bg-slate-700'
            }`}
            aria-hidden="true"
            title={cfg.label}
          />
        ))}
      </div>
    </div>
  );
};
