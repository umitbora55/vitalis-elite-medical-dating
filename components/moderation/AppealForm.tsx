/**
 * AppealForm — Özellik 7: Şeffaf Moderasyon
 *
 * DSA Article 20 uyumlu itiraz formu.
 * - Ücretsiz
 * - 48 saat SLA taahhüdü
 * - İnsan incelemesi zorunlu
 * - Min 100 karakter açıklama zorunlu
 * - Sonuç bildirimi garantisi
 */

import React, { useState } from 'react';
import {
  X,
  Shield,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Info,
  Loader2,
  Clock,
} from 'lucide-react';
import { transparentModerationService, ACTION_LABELS, REASON_CODE_CATALOG } from '../../services/transparentModerationService';
import type { ModerationNotification, AppealSubmitPayload } from '../../types';

// ── Appeal types ──────────────────────────────────────────────────────────

const APPEAL_TYPE_OPTIONS: {
  value: AppealSubmitPayload['appeal_type'];
  label: string;
  desc: string;
}[] = [
  { value: 'ban_appeal',          label: 'Hesap Engelini İtiraz',     desc: 'Geçici veya kalıcı hesap askıya alma kararına itiraz' },
  { value: 'restriction_appeal',  label: 'Kısıtlamayı İtiraz',        desc: 'Mesajlaşma veya eşleşme kısıtlamasına itiraz' },
  { value: 'report_dispute',      label: 'Raporu İtiraz',             desc: 'Tarafıma yapılan raporun hatalı olduğunu düşünüyorum' },
  { value: 'badge_revocation',    label: 'Rozet İptalini İtiraz',     desc: 'Doğrulama rozetimin hatalı kaldırıldığını düşünüyorum' },
];

// ── Main component ─────────────────────────────────────────────────────────

export interface AppealFormProps {
  notification: ModerationNotification;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (appealId: string) => void;
}

export const AppealForm: React.FC<AppealFormProps> = ({
  notification,
  onClose,
  onBack,
  onSuccess,
}) => {
  const [appealType, setAppealType] = useState<AppealSubmitPayload['appeal_type']>('ban_appeal');
  const [statement, setStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [appealId, setAppealId] = useState('');

  const MIN_CHARS = 100;
  const charCount = statement.trim().length;
  const charProgress = Math.min(charCount / MIN_CHARS, 1);
  const isReady = charCount >= MIN_CHARS;

  const actionInfo = ACTION_LABELS[notification.action_type] ?? ACTION_LABELS['warning'];
  const reasonInfo = notification.reason_code
    ? REASON_CODE_CATALOG[notification.reason_code]
    : null;

  const handleSubmit = async () => {
    setError(null);
    if (!isReady) {
      setError(`Açıklamanız en az ${MIN_CHARS} karakter olmalıdır.`);
      return;
    }
    setSubmitting(true);

    const result = await transparentModerationService.submitAppeal({
      notification_id: notification.id,
      appeal_type: appealType,
      user_statement: statement.trim(),
    });

    setSubmitting(false);

    if ('error' in result) {
      setError(result.error);
    } else {
      setAppealId(result.id);
      setStep('success');
      onSuccess(result.id);
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">İtirazınız Alındı</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            İtirazınız DSA Madde 20 kapsamında kaydedildi. Bir moderatör
            <span className="text-white font-semibold"> 48 saat</span> içinde inceleyecek
            ve size bildirim gönderecek.
          </p>
          <div className="bg-slate-800/50 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1">İtiraz Kimliği</p>
            <p className="text-xs font-mono text-slate-300 break-all">{appealId}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
              <Clock size={11} /> SLA: 48 saat · İnsan incelemesi zorunlu
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[310] flex items-end sm:items-center justify-center p-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-slide-up max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/60">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            aria-label="Geri"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-white">İtiraz Formu</h2>
            <p className="text-[10px] text-slate-500">DSA Art.20 — Ücretsiz · İnsan incelemesi zorunlu</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Decision summary */}
          <div className="px-4 py-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1.5">
              İtiraz edilen karar
            </p>
            <div className="flex items-center gap-2">
              <span className="text-base">{actionInfo.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${actionInfo.color}`}>
                  {notification.title_tr}
                </p>
                {notification.reason_code && reasonInfo && (
                  <p className="text-[10px] text-slate-500">
                    <span className="font-mono text-amber-500/70">{notification.reason_code}</span>
                    {' · '}{reasonInfo.title_tr}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Appeal type selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">İtiraz türü</p>
            <div className="space-y-1.5">
              {APPEAL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAppealType(opt.value)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    appealType === opt.value
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-slate-700/40 bg-slate-800/30 hover:border-slate-600/60'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                    appealType === opt.value ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                  }`}>
                    {appealType === opt.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{opt.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Statement textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-300">Açıklamanız</p>
              <span className={`text-[10px] font-mono ${
                isReady ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {charCount} / {MIN_CHARS} min
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isReady ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${charProgress * 100}%` }}
              />
            </div>

            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder={`Neden bu kararın hatalı olduğunu düşündüğünüzü açıklayın. En az ${MIN_CHARS} karakter gereklidir.\n\nÖrneğin:\n• Bu içeriği neden paylaştığınız\n• Kararın sizi nasıl etkilediği\n• Varsa ek bağlam veya kanıt`}
              rows={7}
              className="w-full text-sm bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50 leading-relaxed"
            />
          </div>

          {/* DSA commitment info */}
          <div className="px-4 py-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                İtirazınız <strong className="text-slate-300">ücretsiz</strong> ve{' '}
                <strong className="text-slate-300">zorunlu insan incelemesine</strong> tabidir.
                Karar size <strong className="text-slate-300">48 saat</strong> içinde bildirim
                olarak iletilecektir. Haksız bulduğunuz otomatik kararlara itiraz edebilirsiniz.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl">
              <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-800/60 space-y-2">
          <button
            onClick={() => void handleSubmit()}
            disabled={!isReady || submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Gönderiliyor…</>
            ) : (
              <><Shield size={15} /> İtirazı Gönder</>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-600">
            48 saat SLA · Yanıt e-posta ve bildirim ile iletilir
          </p>
        </div>
      </div>
    </div>
  );
};
