/**
 * VITALIS Trust Badge System
 * Displays verification badges on profile cards and profile detail views.
 */

import React from 'react';
import { Video, Heart, Building2, ShieldCheck } from 'lucide-react';

export type BadgeVariant = 'liveness' | 'healthcare' | 'institution';

interface BadgeProps {
  type: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  institutionName?: string;
  showLabel?: boolean;
}

const BADGE_CONFIG = {
  liveness: {
    icon: Video,
    label: 'Canlı Doğrulandı',
    colorClass: 'bg-blue-100 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600',
    ringClass: 'ring-blue-400',
  },
  healthcare: {
    icon: Heart,
    label: 'Sağlık Çalışanı',
    colorClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600',
    ringClass: 'ring-emerald-400',
  },
  institution: {
    icon: Building2,
    label: 'Kurumsal Doğrulandı',
    colorClass: 'bg-violet-100 text-violet-700 border-violet-200',
    iconColor: 'text-violet-600',
    ringClass: 'ring-violet-400',
  },
} as const;

const SIZE_CONFIG = {
  sm: { icon: 'w-3 h-3', container: 'px-1.5 py-0.5 text-xs gap-1', pill: 'rounded' },
  md: { icon: 'w-3.5 h-3.5', container: 'px-2 py-1 text-xs gap-1.5', pill: 'rounded-md' },
  lg: { icon: 'w-4 h-4', container: 'px-2.5 py-1.5 text-sm gap-2', pill: 'rounded-lg' },
} as const;

export const TrustBadge: React.FC<BadgeProps> = ({
  type,
  size = 'md',
  institutionName,
  showLabel = true,
}) => {
  const cfg = BADGE_CONFIG[type];
  const sz = SIZE_CONFIG[size];
  const Icon = cfg.icon;
  const label = type === 'institution' && institutionName
    ? institutionName
    : cfg.label;

  return (
    <span className={`inline-flex items-center border font-medium ${cfg.colorClass} ${sz.pill} ${sz.container}`}>
      <Icon className={`${sz.icon} ${cfg.iconColor} shrink-0`} />
      {showLabel && <span className="truncate max-w-[120px]">{label}</span>}
    </span>
  );
};

// ── Profile Card Badge Strip ──────────────────────────────────────────────────

interface BadgeStripProps {
  livenessVerified: boolean;
  healthcareVerified: boolean;
  institutionVerified: boolean;
  institutionName?: string;
  photoChangedSinceLiveness?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TrustBadgeStrip: React.FC<BadgeStripProps> = ({
  livenessVerified,
  healthcareVerified,
  institutionVerified,
  institutionName,
  photoChangedSinceLiveness = false,
  size = 'sm',
}) => {
  // Liveness badge is hidden if photo changed (re-verification needed)
  const showLiveness = livenessVerified && !photoChangedSinceLiveness;

  if (!showLiveness && !healthcareVerified && !institutionVerified) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {showLiveness && <TrustBadge type="liveness" size={size} />}
      {healthcareVerified && <TrustBadge type="healthcare" size={size} />}
      {institutionVerified && (
        <TrustBadge type="institution" size={size} institutionName={institutionName} />
      )}
    </div>
  );
};

// ── Verification Status Panel (for MyProfileView) ─────────────────────────────

interface VerificationStatusPanelProps {
  livenessVerified: boolean;
  livenessVerifiedAt: string | null;
  healthcareVerified: boolean;
  healthcareVerifiedAt: string | null;
  institutionVerified: boolean;
  institutionVerifiedAt: string | null;
  institutionName: string | null;
  photoChangedSinceLiveness: boolean;
  onReliveness?: () => void;
  onVerifyHealthcare?: () => void;
}

export const VerificationStatusPanel: React.FC<VerificationStatusPanelProps> = ({
  livenessVerified,
  livenessVerifiedAt,
  healthcareVerified,
  institutionVerified,
  institutionName,
  photoChangedSinceLiveness,
  onReliveness,
  onVerifyHealthcare,
}) => {
  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const rows: {
    icon: React.ReactNode;
    label: string;
    status: boolean;
    statusLabel: string;
    date: string | null;
    warning?: string;
    action?: { label: string; onClick: () => void };
  }[] = [
    {
      icon: <Video className="w-4 h-4" />,
      label: 'Canlılık Doğrulaması',
      status: livenessVerified && !photoChangedSinceLiveness,
      statusLabel: livenessVerified
        ? photoChangedSinceLiveness ? 'Yenileme Gerekiyor' : 'Tamamlandı'
        : 'Tamamlanmadı',
      date: livenessVerifiedAt,
      warning: photoChangedSinceLiveness
        ? 'Profil fotoğrafı değiştiği için canlılık doğrulaması yenilenmeli'
        : undefined,
      action: (!livenessVerified || photoChangedSinceLiveness) && onReliveness
        ? { label: photoChangedSinceLiveness ? 'Yenile' : 'Başla', onClick: onReliveness }
        : undefined,
    },
    {
      icon: <Heart className="w-4 h-4" />,
      label: 'Sağlık Çalışanı Doğrulaması',
      status: healthcareVerified,
      statusLabel: healthcareVerified ? 'Tamamlandı' : 'Tamamlanmadı',
      date: null,
      action: !healthcareVerified && onVerifyHealthcare
        ? { label: 'Belgeni Yükle', onClick: onVerifyHealthcare }
        : undefined,
    },
    {
      icon: <Building2 className="w-4 h-4" />,
      label: 'Kurumsal Doğrulama',
      status: institutionVerified,
      statusLabel: institutionVerified ? institutionName ?? 'Doğrulandı' : 'Tamamlanmadı',
      date: null,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-semibold text-gray-800">Doğrulama Durumu</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${
            row.status ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className={`mt-0.5 shrink-0 ${row.status ? 'text-green-600' : 'text-gray-400'}`}>
            {row.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700">{row.label}</p>
            <p className={`text-xs ${row.status ? 'text-green-600' : 'text-gray-500'}`}>
              {row.statusLabel}
            </p>
            {row.date && (
              <p className="text-xs text-gray-400">{formatDate(row.date)}</p>
            )}
            {row.warning && (
              <p className="text-xs text-amber-600 mt-0.5">{row.warning}</p>
            )}
          </div>
          {row.action && (
            <button
              onClick={row.action.onClick}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0"
            >
              {row.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
