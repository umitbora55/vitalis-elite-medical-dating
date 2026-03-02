/**
 * AppealStatusCard — Özellik 7: Şeffaf Moderasyon
 *
 * Kullanıcının itiraz geçmişi kartı.
 * Her itiraz için: durum + zaman çizelgesi + karar.
 */

import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronUp,
  Loader2,
  Shield,
} from 'lucide-react';
import { transparentModerationService } from '../../services/transparentModerationService';
import type { UserAppeal, AppealStatus } from '../../types';

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AppealStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}> = {
  pending: {
    label: 'Bekliyor',
    icon: <Clock size={12} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
  },
  under_review: {
    label: 'İnceleniyor',
    icon: <Loader2 size={12} className="animate-spin" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
  },
  approved: {
    label: 'Kabul Edildi',
    icon: <CheckCircle2 size={12} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  denied: {
    label: 'Reddedildi',
    icon: <XCircle size={12} />,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
  },
  escalated: {
    label: 'Üst Merciye İletildi',
    icon: <ChevronUp size={12} />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
  },
};

const APPEAL_TYPE_LABELS: Record<string, string> = {
  ban_appeal:         'Hesap Engeli İtirazı',
  restriction_appeal: 'Kısıtlama İtirazı',
  report_dispute:     'Rapor İtirazı',
  badge_revocation:   'Rozet İptali İtirazı',
};

// ── Timeline step ──────────────────────────────────────────────────────────

interface TimelineStepProps {
  label: string;
  date?: string | null;
  done: boolean;
  active: boolean;
  isLast: boolean;
}
const TimelineStep: React.FC<TimelineStepProps> = ({ label, date, done, active, isLast }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        done
          ? 'border-emerald-500 bg-emerald-500'
          : active
            ? 'border-blue-500 bg-blue-500/20'
            : 'border-slate-700 bg-slate-800'
      }`}>
        {done && <div className="w-2 h-2 rounded-full bg-white" />}
        {active && !done && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
      </div>
      {!isLast && (
        <div className={`w-0.5 h-5 mt-0.5 ${done ? 'bg-emerald-500/40' : 'bg-slate-700'}`} />
      )}
    </div>
    <div className="pb-4">
      <p className={`text-xs font-semibold ${done ? 'text-slate-200' : active ? 'text-blue-300' : 'text-slate-600'}`}>
        {label}
      </p>
      {date && (
        <p className="text-[10px] text-slate-500 mt-0.5">
          {new Date(date).toLocaleString('tr-TR', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      )}
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────

interface AppealStatusCardProps {
  appeal: UserAppeal;
}

export const AppealStatusCard: React.FC<AppealStatusCardProps> = ({ appeal }) => {
  const [expanded, setExpanded] = React.useState(false);
  const statusCfg = STATUS_CONFIG[appeal.status];
  const slaBreached = transparentModerationService.isSlaBreached(appeal.sla_deadline);
  const slaLabel = transparentModerationService.formatSlaRemaining(appeal.sla_deadline);

  const isDecided = appeal.status === 'approved' || appeal.status === 'denied';
  const isApproved = appeal.status === 'approved';

  const timelineSteps: { label: string; date: string | null; done: boolean }[] = [
    { label: 'İtiraz Gönderildi', date: appeal.submitted_at, done: true },
    {
      label: 'Moderatör İncelemesinde',
      date: appeal.reviewed_at,
      done: appeal.status !== 'pending',
    },
    {
      label: isDecided ? (isApproved ? 'İtiraz Kabul Edildi' : 'İtiraz Reddedildi') : 'Karar Bekleniyor',
      date: appeal.decided_at,
      done: isDecided,
    },
  ];

  return (
    <div className={`p-4 rounded-2xl border ${statusCfg.border} ${statusCfg.bg} space-y-3`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield size={15} className={statusCfg.color} />
          <div>
            <p className="text-sm font-semibold text-slate-200">
              {APPEAL_TYPE_LABELS[appeal.appeal_type] ?? appeal.appeal_type}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {new Date(appeal.submitted_at).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color}`}>
            {statusCfg.icon} {statusCfg.label}
          </span>
          {!isDecided && (
            <span className={`text-[9px] ${slaBreached ? 'text-red-400' : 'text-slate-500'}`}>
              {slaBreached ? '⚠️ SLA aşıldı' : `SLA: ${slaLabel}`}
            </span>
          )}
        </div>
      </div>

      {/* Statement preview */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
        {appeal.user_statement}
      </p>

      {/* Decision (if decided) */}
      {isDecided && appeal.decision_reason && (
        <div className={`px-3 py-2.5 rounded-xl border ${
          isApproved
            ? 'bg-emerald-500/8 border-emerald-500/20'
            : 'bg-red-500/8 border-red-500/20'
        }`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
            isApproved ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isApproved ? '✓ Karar Gerekçesi' : '✗ Red Gerekçesi'}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">{appeal.decision_reason}</p>
          {appeal.reviewer_notes && (
            <p className="text-[10px] text-slate-500 mt-1.5 italic">{appeal.reviewer_notes}</p>
          )}
        </div>
      )}

      {/* Expand/collapse timeline */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
      >
        <AlertTriangle size={10} />
        {expanded ? 'Zaman çizelgesini gizle' : 'Zaman çizelgesini göster'}
      </button>

      {expanded && (
        <div className="pt-1">
          {timelineSteps.map((step, i) => (
            <TimelineStep
              key={i}
              label={step.label}
              date={step.date}
              done={step.done}
              active={!step.done && (i === 0 || timelineSteps[i - 1]?.done)}
              isLast={i === timelineSteps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
