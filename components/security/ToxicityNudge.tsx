/**
 * ToxicityNudge — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Pre-send warning overlay that appears when the content moderation engine
 * flags a message before it is sent.
 *
 * Behaviour by action level:
 *   soft_warn          → subtle banner, user can dismiss and send normally
 *   warn_sender        → prominent warning card, can still override and send
 *   block_with_override → hard-looking warning, requires explicit override click
 *   block_and_escalate  → cannot send; message is blocked; report triggered
 */

import React, { useState } from 'react';
import { AlertTriangle, X, Send, Edit3, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import type { ModerationResult, ModerationAction } from '../../types';

export interface ToxicityNudgeProps {
  /** Moderation result from contentModerationService.analyseMessage() */
  result: ModerationResult;
  /** Called when user confirms they still want to send */
  onSend: () => void;
  /** Called when user wants to edit the message */
  onEdit: () => void;
  /** Called when user discards the message */
  onDiscard: () => void;
  /** Optional — show inline (banner) or as modal overlay */
  variant?: 'banner' | 'modal';
}

// ── Config per action level ────────────────────────────────────────────────────

interface NudgeConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bgClass: string;
  borderClass: string;
  iconBgClass: string;
  canSend: boolean;
  sendLabel: string;
  sendClass: string;
}

function getNudgeConfig(action: ModerationAction, reasons: string[]): NudgeConfig {
  const reason = reasons[0] ?? '';

  switch (action) {
    case 'soft_warn':
      return {
        icon: <AlertTriangle size={18} className="text-amber-400" />,
        title: 'Mesajını gözden geçir',
        subtitle: reason || 'Bu mesaj uyarı işaretleri içerebilir.',
        bgClass: 'bg-amber-500/8',
        borderClass: 'border-amber-500/25',
        iconBgClass: 'bg-amber-500/15',
        canSend: true,
        sendLabel: 'Yine de Gönder',
        sendClass: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30',
      };

    case 'warn_sender':
      return {
        icon: <AlertTriangle size={18} className="text-orange-400" />,
        title: 'Dikkat: Uygunsuz içerik',
        subtitle: reason || 'Bu mesaj platformun güvenlik kurallarını ihlal edebilir.',
        bgClass: 'bg-orange-500/10',
        borderClass: 'border-orange-500/30',
        iconBgClass: 'bg-orange-500/15',
        canSend: true,
        sendLabel: 'Yine de Gönder',
        sendClass: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30',
      };

    case 'block_with_override':
      return {
        icon: <Ban size={18} className="text-red-400" />,
        title: 'Bu mesaj engellendi',
        subtitle: reason || 'Mesajın Vitalis güvenlik politikasını ihlal ettiği tespit edildi.',
        bgClass: 'bg-red-500/10',
        borderClass: 'border-red-500/35',
        iconBgClass: 'bg-red-500/20',
        canSend: true,
        sendLabel: 'Yine de Gönder (Sorumluluk Kabul Ediyorum)',
        sendClass: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs',
      };

    case 'block_and_escalate':
    default:
      return {
        icon: <Ban size={20} className="text-red-400" />,
        title: 'Mesaj gönderilemedi',
        subtitle: reason || 'Bu mesaj ağır ihlal nedeniyle engellendi ve incelemeye alındı.',
        bgClass: 'bg-red-600/12',
        borderClass: 'border-red-500/40',
        iconBgClass: 'bg-red-600/25',
        canSend: false,
        sendLabel: '',
        sendClass: '',
      };
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const ToxicityNudge: React.FC<ToxicityNudgeProps> = ({
  result,
  onSend,
  onEdit,
  onDiscard,
  variant = 'modal',
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const config = getNudgeConfig(result.action, result.reasons);

  const isHardBlock = result.action === 'block_and_escalate';

  // ── Banner variant ────────────────────────────────────────────────────────
  if (variant === 'banner') {
    return (
      <div
        className={`mx-3 mb-2 rounded-xl border ${config.bgClass} ${config.borderClass} p-3 animate-fade-in`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-2.5">
          <div className={`w-7 h-7 rounded-full ${config.iconBgClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">{config.title}</p>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{config.subtitle}</p>
          </div>
          <button
            onClick={onDiscard}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-500 flex-shrink-0"
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-2 mt-2.5">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
          >
            <Edit3 size={12} /> Düzenle
          </button>
          {config.canSend && (
            <button
              onClick={onSend}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${config.sendClass}`}
            >
              <Send size={12} /> {config.sendLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Modal variant ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={isHardBlock ? onDiscard : onEdit}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm rounded-2xl border ${config.bgClass} ${config.borderClass} bg-slate-900 shadow-2xl animate-slide-up overflow-hidden`}
        role="alertdialog"
        aria-labelledby="nudge-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl ${config.iconBgClass} flex items-center justify-center flex-shrink-0`}
            >
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="nudge-title" className="font-semibold text-white text-sm leading-snug">
                {config.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {config.subtitle}
              </p>
            </div>
            <button
              onClick={onDiscard}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 transition-colors flex-shrink-0"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Show full reason list */}
          {result.reasons.length > 1 && (
            <button
              onClick={() => setShowDetails((p) => !p)}
              className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showDetails ? 'Gizle' : `${result.reasons.length} sebep göster`}
            </button>
          )}

          {showDetails && (
            <ul className="mt-2 space-y-1">
              {result.reasons.map((r, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action buttons */}
        <div className={`px-5 pb-5 flex flex-col gap-2 ${isHardBlock ? '' : 'pt-0'}`}>
          {isHardBlock ? (
            /* Hard block — cannot send */
            <button
              onClick={onDiscard}
              className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
            >
              Mesajı Sil
            </button>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors"
              >
                <Edit3 size={15} /> Mesajı Düzenle
              </button>
              <button
                onClick={onSend}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${config.sendClass}`}
              >
                <Send size={14} /> {config.sendLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
