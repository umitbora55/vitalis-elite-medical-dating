/**
 * MessageModerationExplanation — Feature 8: Privacy-First AI
 *
 * Shown when a chat message is blocked/warned by AI content moderation.
 * GDPR Article 22: User must understand automated decisions affecting them.
 * DSA Article 17: Transparent content moderation.
 *
 * Variants:
 *   'inline'  — Compact inline notice below the blocked message
 *   'banner'  — Full banner above the message input
 *   'sheet'   — Bottom sheet with full details
 *
 * Shows:
 *   • Why the message was blocked (category, not raw rule)
 *   • Whether it was automatic or human reviewed
 *   • What to do (edit message, appeal if wrong)
 *   • Confidence indicator (low/medium/high — not raw number)
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Bot,
  UserCheck,
  X,
  ChevronRight,
  Edit3,
  Flag,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { MessageModerationExplanationData } from '../../types';

// ── Confidence display ───────────────────────────────────────────────────────

function confidenceLabel(confidence: number | null): string {
  if (confidence === null) return 'Bilinmiyor';
  if (confidence >= 0.85) return 'Yüksek';
  if (confidence >= 0.60) return 'Orta';
  return 'Düşük';
}

function confidenceColor(confidence: number | null): string {
  if (confidence === null) return 'text-slate-500';
  if (confidence >= 0.85) return 'text-red-400';
  if (confidence >= 0.60) return 'text-amber-400';
  return 'text-emerald-400'; // Low confidence = might be wrong
}

// ── Action config ────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  block: {
    label: 'Mesaj Engellendi',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/25',
  },
  warn: {
    label: 'Uyarı',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/25',
  },
  flag: {
    label: 'İncelemeye Alındı',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/25',
  },
  allow: {
    label: 'İzin Verildi',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/25',
  },
};

// ── Inline variant ───────────────────────────────────────────────────────────

interface InlineProps {
  data: MessageModerationExplanationData;
  onExpand: () => void;
}
const InlineExplanation: React.FC<InlineProps> = ({ data, onExpand }) => {
  const cfg = ACTION_CONFIG[data.action_taken] ?? ACTION_CONFIG['block'];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.bgColor} ${cfg.borderColor}`}>
      <ShieldAlert size={12} className={cfg.color} />
      <p className={`text-[11px] font-semibold flex-1 ${cfg.color}`}>
        {cfg.label} — {data.reason_tr}
      </p>
      <button
        onClick={onExpand}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Detayları gör"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
};

// ── Banner variant ───────────────────────────────────────────────────────────

interface BannerProps {
  data: MessageModerationExplanationData;
  onExpand: () => void;
  onDismiss?: () => void;
}
const BannerExplanation: React.FC<BannerProps> = ({ data, onExpand, onDismiss }) => {
  const cfg = ACTION_CONFIG[data.action_taken] ?? ACTION_CONFIG['block'];

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b ${cfg.bgColor} ${cfg.borderColor}`}>
      <ShieldAlert size={15} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{data.reason_tr}</p>
        <button
          onClick={onExpand}
          className="text-[10px] text-slate-500 hover:text-slate-300 mt-1 font-semibold"
        >
          Açıklama ve itiraz →
        </button>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300"
          aria-label="Kapat"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};

// ── Detail sheet ─────────────────────────────────────────────────────────────

interface SheetProps {
  data: MessageModerationExplanationData;
  onClose: () => void;
  onEditMessage?: () => void;
  onAppeal?: () => void;
}
const DetailSheet: React.FC<SheetProps> = ({ data, onClose, onEditMessage, onAppeal }) => {
  const cfg = ACTION_CONFIG[data.action_taken] ?? ACTION_CONFIG['block'];
  const confLabel = confidenceLabel(data.confidence);
  const confColor = confidenceColor(data.confidence);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full sm:max-w-sm mx-auto bg-slate-900 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${cfg.bgColor} border ${cfg.borderColor} flex items-center justify-center`}>
              <ShieldAlert size={15} className={cfg.color} />
            </div>
            <div>
              <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[10px] text-slate-500">İçerik moderasyonu</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300" aria-label="Kapat">
            <X size={14} />
          </button>
        </div>

        {/* Reason */}
        <div className={`px-4 py-3 rounded-xl border ${cfg.bgColor} ${cfg.borderColor}`}>
          <p className="text-xs font-semibold text-slate-200">{data.reason_tr}</p>
          {data.reason_code && (
            <p className="text-[10px] text-slate-500 mt-1 font-mono">{data.reason_code}</p>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/30 rounded-xl">
            <p className="text-[9px] text-slate-600 uppercase tracking-wide font-semibold">Karar türü</p>
            <div className="flex items-center gap-1 mt-1">
              {data.is_automated
                ? <><Bot size={11} className="text-slate-400" /><span className="text-[11px] text-slate-300">Otomatik</span></>
                : <><UserCheck size={11} className="text-emerald-400" /><span className="text-[11px] text-slate-300">İnsan</span></>
              }
            </div>
          </div>
          <div className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/30 rounded-xl">
            <p className="text-[9px] text-slate-600 uppercase tracking-wide font-semibold">Güven seviyesi</p>
            <p className={`text-[11px] font-semibold mt-1 ${confColor}`}>{confLabel}</p>
          </div>
        </div>

        {/* What you can do */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Ne yapabilirsiniz?</p>
          <div className="space-y-1.5">
            {[
              {
                icon: <Info size={12} />,
                text: 'Bu sistem kural tabanlıdır. Fiziksel özellik veya kişisel bilginiz kullanılmamıştır.',
                color: 'text-slate-400',
              },
              ...(data.action_taken === 'block' || data.action_taken === 'flag'
                ? [{
                    icon: <Edit3 size={12} />,
                    text: 'Mesajınızı yeniden düzenleyerek tekrar gönderebilirsiniz.',
                    color: 'text-slate-400',
                  }]
                : []),
              ...(data.human_review_available
                ? [{
                    icon: <UserCheck size={12} />,
                    text: 'Bu karar insan moderatör tarafından incelenebilir.',
                    color: 'text-emerald-400',
                  }]
                : []),
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</div>
                <p className={`text-[11px] leading-relaxed ${item.color}`}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Low confidence warning */}
        {data.confidence !== null && data.confidence < 0.60 && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300 leading-relaxed">
              Güven skoru düşük — bu karar hatalı olabilir. İtiraz etmenizi öneririz.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {onEditMessage && (
            <button
              onClick={() => { onClose(); onEditMessage(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800/60 border border-slate-700/40 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-700/60 transition-colors"
            >
              <Edit3 size={13} />
              Düzenle
            </button>
          )}
          {onAppeal && (
            <button
              onClick={() => { onClose(); onAppeal(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-sm font-semibold text-blue-300 hover:bg-blue-600/30 transition-colors"
            >
              <Flag size={13} />
              İtiraz Et
            </button>
          )}
        </div>

        {/* DSA note */}
        <p className="text-[9px] text-slate-600 text-center">
          DSA Madde 17 · İçerik moderasyonu şeffaflığı
        </p>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export interface MessageModerationExplanationProps {
  data: MessageModerationExplanationData;
  variant?: 'inline' | 'banner' | 'sheet';
  onEditMessage?: () => void;
  onAppeal?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const MessageModerationExplanation: React.FC<MessageModerationExplanationProps> = ({
  data,
  variant = 'inline',
  onEditMessage,
  onAppeal,
  onDismiss,
  className = '',
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (data.action_taken === 'allow') {
    // Nothing to show for allowed messages
    return null;
  }

  return (
    <div className={className}>
      {variant === 'inline' && (
        <InlineExplanation data={data} onExpand={() => setSheetOpen(true)} />
      )}
      {variant === 'banner' && (
        <BannerExplanation
          data={data}
          onExpand={() => setSheetOpen(true)}
          onDismiss={onDismiss}
        />
      )}
      {(variant === 'sheet' || sheetOpen) && (
        <DetailSheet
          data={data}
          onClose={() => setSheetOpen(false)}
          onEditMessage={onEditMessage}
          onAppeal={onAppeal}
        />
      )}

      {/* Success state (human override approved) */}
      {data.human_review_available && data.action_taken === 'flag' && (
        <div className="flex items-center gap-1.5 mt-2">
          <CheckCircle2 size={11} className="text-emerald-400" />
          <p className="text-[10px] text-emerald-400">İnsan incelemesi talep edildi.</p>
        </div>
      )}
    </div>
  );
};

export default MessageModerationExplanation;
