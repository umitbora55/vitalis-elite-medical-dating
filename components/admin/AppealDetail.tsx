/**
 * AppealDetail — Admin Component
 *
 * Full appeal review panel. Displays:
 *   - User statement + evidence
 *   - Related entity details
 *   - Decision controls (approve / deny / partially_approve / escalate)
 *   - Mandatory reason textarea
 *
 * Integrates with appealService.reviewAppeal and escalateAppeal.
 */

import React, { useState } from 'react';
import {
  X, FileText, CheckCircle2, XCircle, ChevronUp, Loader2, ExternalLink,
  User, Clock, AlertTriangle, Zap,
} from 'lucide-react';
import { appealService, Appeal } from '../../services/appealService';

interface AppealDetailProps {
  appeal: Appeal;
  onClose: () => void;
  onActionComplete: () => void;
}

type DecisionOption = 'approved' | 'denied' | 'partially_approved' | 'escalated';

const DECISIONS: {
  value: DecisionOption;
  label: string;
  description: string;
  icon: React.ReactNode;
  className: string;
}[] = [
  {
    value: 'approved',
    label: 'Onayla — Kısıtlamayı Kaldır',
    description: 'İtiraz kabul edildi, ban/kısıtlama derhal kaldırılacak',
    icon: <CheckCircle2 size={15} />,
    className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  {
    value: 'partially_approved',
    label: 'Kısmen Onayla',
    description: 'Kısıtlama hafifletildi veya kısalttı; aksiyon notunu belirtin',
    icon: <CheckCircle2 size={15} />,
    className: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  },
  {
    value: 'denied',
    label: 'Reddet',
    description: 'İtiraz reddedildi, kısıtlama devam edecek',
    icon: <XCircle size={15} />,
    className: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
  {
    value: 'escalated',
    label: 'Üst Yönetime İlet',
    description: 'Daha üst düzey inceleme gerekiyor',
    icon: <ChevronUp size={15} />,
    className: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  },
];

export const AppealDetail: React.FC<AppealDetailProps> = ({
  appeal,
  onClose,
  onActionComplete,
}) => {
  const [decision, setDecision]       = useState<DecisionOption | null>(null);
  const [reason, setReason]           = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const isActionable = appeal.status === 'pending' || appeal.status === 'under_review';

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!decision) { setError('Lütfen bir karar seçin.'); return; }
    if (!reason.trim()) { setError('Lütfen karar gerekçesini girin.'); return; }

    setSubmitting(true);
    setError(null);

    let err: string | null = null;

    if (decision === 'escalated') {
      const res = await appealService.escalateAppeal(appeal.id, reason);
      err = res.error;
    } else {
      const res = await appealService.reviewAppeal({
        appealId:      appeal.id,
        decision,
        decisionReason: reason,
        actionTaken:   actionTaken.trim() || undefined,
      });
      err = res.error;
    }

    setSubmitting(false);

    if (err) { setError(err); return; }
    onActionComplete();
    onClose();
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-gold-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                {appealService.getAppealTypeLabel(appeal.appeal_type)}
              </h3>
              <div className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                appealService.getStatusColor(appeal.status)
              }`}>
                {appealService.getStatusLabel(appeal.status)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              appeal.priority === 'urgent' ? 'bg-red-500/15 text-red-400' :
              appeal.priority === 'high'   ? 'bg-amber-500/15 text-amber-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              {appeal.priority.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* User info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">İtiraz Eden</p>
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-slate-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-white truncate">
                  {appeal.user_name ?? 'Bilinmiyor'}
                </p>
              </div>
              {appeal.user_email && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{appeal.user_email}</p>
              )}
            </div>

            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gönderim</p>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400 flex-shrink-0" />
                <p className="text-xs text-white">{formatDate(appeal.submitted_at)}</p>
              </div>
              {appeal.related_entity_type && (
                <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                  Konu: {appeal.related_entity_type.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </div>

          {/* User statement */}
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">İtiraz Metni</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {appeal.user_statement}
            </p>
          </div>

          {/* Evidence */}
          {appeal.evidence_paths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Kanıtlar ({appeal.evidence_paths.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {appeal.evidence_paths.map((path, i) => (
                  <a
                    key={i}
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center group"
                  >
                    <img
                      src={path}
                      alt={`Kanıt ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <ExternalLink size={16} className="text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Priority / escalation alert */}
          {appeal.priority === 'urgent' && (
            <div className="flex items-start gap-2.5 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
              <Zap size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                Bu itiraz üst öncelikli olarak işaretlendi. Mümkün olan en kısa sürede sonuçlandırın.
              </p>
            </div>
          )}

          {/* Decision section — only if actionable */}
          {isActionable && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karar *</p>

              <div className="space-y-2">
                {DECISIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDecision(d.value)}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      decision === d.value ? d.className : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className="flex-shrink-0 mt-0.5">{d.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${decision === d.value ? '' : 'text-white'}`}>{d.label}</p>
                      <p className={`text-xs mt-0.5 ${decision === d.value ? 'opacity-70' : 'text-slate-500'}`}>
                        {d.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karar Gerekçesi *</p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Kararınızı açıklayın…"
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
                />
              </div>

              {/* Action taken (for approved / partially_approved) */}
              {(decision === 'approved' || decision === 'partially_approved') && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Alınan Aksiyon (isteğe bağlı)
                  </p>
                  <input
                    type="text"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="Örn: Kısıtlama 72 saate indirildi"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
                  />
                </div>
              )}

              {/* Warning for deny */}
              {decision === 'denied' && (
                <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Red kararı geri alınamaz. Kullanıcı bu kısıtlama için tekrar itiraz edemeyecek.
                  </p>
                </div>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* Already decided */}
          {!isActionable && (
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karar</p>
              <p className="text-sm text-white capitalize">
                {appeal.decision?.replace(/_/g, ' ') ?? '—'}
              </p>
              {appeal.decision_reason && (
                <>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">Gerekçe</p>
                  <p className="text-sm text-slate-300">{appeal.decision_reason}</p>
                </>
              )}
              {appeal.reviewed_at && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {formatDate(appeal.reviewed_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isActionable && (
          <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!decision || !reason.trim() || submitting}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                decision === 'approved' || decision === 'partially_approved'
                  ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                  : decision === 'escalated'
                    ? 'bg-purple-700 text-white hover:bg-purple-600'
                    : 'bg-red-700 text-white hover:bg-red-600'
              }`}
            >
              {submitting
                ? <><Loader2 size={14} className="animate-spin" /> İşleniyor…</>
                : decision === 'escalated'
                  ? <><ChevronUp size={14} /> İlet</>
                  : <><FileText size={14} /> Karara Bağla</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
