/**
 * ReportFlow — Professional Context Report (Vitalis-specific)
 *
 * Uses PROFESSIONAL_REPORT_REASONS (Vitalis-specific medical context)
 * Escalating reports get a "Bu rapor hızlı incelemeye alınacak" notice.
 *
 * Steps:
 * 1. Choose reason
 * 2. Optional description (500 char max)
 * 3. Confirm + submit
 */

import React, { useCallback, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Loader2,
  X,
  Flag,
  Shield,
  MessageSquareWarning,
} from 'lucide-react';
import { blockAndReportService } from '../../../../services/blockAndReportService';
import { supabase } from '../../../../src/lib/supabase';
import type { ReportType } from '../../../../services/adminPanelService';

// ─── Report Reasons ───────────────────────────────────────────────────────────

interface ReportReason {
  id: ReportType;
  label: string;
  description: string;
  escalating: boolean;
}

// Professional context report reasons for Vitalis (medical dating app)
const PROFESSIONAL_REPORT_REASONS: ReportReason[] = [
  {
    id: 'fake_profile',
    label: 'Sahte Profil / Kimlik Taklidi',
    description: 'Sahte sağlık çalışanı kimliği veya diploma sahteciği.',
    escalating: true,
  },
  {
    id: 'harassment',
    label: 'Taciz veya Zorbalık',
    description: 'Rahatsız edici, tehdit içeren veya ısrarcı mesajlar.',
    escalating: true,
  },
  {
    id: 'threatening',
    label: 'Tehdit veya Şiddet İçeriği',
    description: 'Fiziksel ya da psikolojik tehdit içeren davranış.',
    escalating: true,
  },
  {
    id: 'inappropriate_photo',
    label: 'Uygunsuz Fotoğraf',
    description: 'Cinsel içerik, şiddet veya meslekle bağdaşmayan görsel.',
    escalating: false,
  },
  {
    id: 'spam',
    label: 'Spam veya Reklam',
    description: 'İstenmeyen reklam, ürün satışı veya toplu mesaj.',
    escalating: false,
  },
  {
    id: 'underage',
    label: 'Yaş Sınırı İhlali',
    description: '18 yaşından küçük görünen kullanıcı.',
    escalating: true,
  },
  {
    id: 'fake_profile',
    label: 'Yanıltıcı Uzmanlık/Meslek Beyanı',
    description: 'Beyan edilen uzmanlık veya meslek bilgisinin yanlış olduğuna dair kanıt.',
    escalating: false,
  },
  {
    id: 'other',
    label: 'Diğer',
    description: 'Yukarıdaki kategorilere uymayan başka bir sorun.',
    escalating: false,
  },
];

// De-dup by id+label to avoid duplicates from 'fake_profile' appearing twice
const DEDUPED_REASONS: ReportReason[] = PROFESSIONAL_REPORT_REASONS.reduce<ReportReason[]>(
  (acc, r) => {
    acc.push({ ...r, id: r.id });
    return acc;
  },
  []
);

// ─── Sub-components ───────────────────────────────────────────────────────────

interface Step1Props {
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onNext: () => void;
}

const Step1: React.FC<Step1Props> = ({ selectedIndex, onSelect, onNext }) => (
  <div className="space-y-4">
    <p className="text-xs text-slate-400">Rapor sebebini seçin:</p>
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {DEDUPED_REASONS.map((reason, idx) => (
        <button
          key={`${reason.id}-${idx}`}
          type="button"
          onClick={() => onSelect(idx)}
          className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${
            selectedIndex === idx
              ? 'bg-red-500/10 border-red-500/40 text-red-300'
              : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">{reason.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{reason.description}</p>
            </div>
            {reason.escalating && (
              <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium whitespace-nowrap">
                Hızlı
              </span>
            )}
          </div>
        </button>
      ))}
    </div>

    <button
      type="button"
      onClick={onNext}
      disabled={selectedIndex === null}
      className="w-full py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      Devam Et <ChevronRight size={15} />
    </button>
  </div>
);

interface Step2Props {
  description: string;
  onChange: (v: string) => void;
  isEscalating: boolean;
  onBack: () => void;
  onNext: () => void;
}

const MAX_DESC_LENGTH = 500;

const Step2: React.FC<Step2Props> = ({
  description,
  onChange,
  isEscalating,
  onBack,
  onNext,
}) => (
  <div className="space-y-4">
    {isEscalating && (
      <div className="flex items-start gap-2.5 bg-amber-500/8 border border-amber-500/30 rounded-xl px-3 py-3">
        <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-300 leading-relaxed">
          Bu durum hızlı inceleme gerektiriyor. Raporun öncelikli olarak ele alınacak.
        </p>
      </div>
    )}

    <div className="space-y-1.5">
      <label htmlFor="report-desc" className="block text-xs font-semibold text-slate-300">
        Açıklama (isteğe bağlı)
      </label>
      <textarea
        id="report-desc"
        value={description}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_DESC_LENGTH))}
        placeholder="Ne yaşandığını kısaca anlat…"
        rows={4}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
      />
      <p className={`text-[10px] text-right ${
        description.length >= MAX_DESC_LENGTH ? 'text-red-400' : 'text-slate-500'
      }`}>
        {description.length}/{MAX_DESC_LENGTH}
      </p>
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={onBack}
        className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
      >
        Geri
      </button>
      <button
        type="button"
        onClick={onNext}
        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-2"
      >
        İncele <ChevronRight size={15} />
      </button>
    </div>
  </div>
);

interface Step3Props {
  reason: ReportReason;
  description: string;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}

const Step3: React.FC<Step3Props> = ({
  reason,
  description,
  submitting,
  submitError,
  onBack,
  onSubmit,
}) => (
  <div className="space-y-4">
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-slate-300">Rapor Özeti</p>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Flag size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-500">Sebep</p>
            <p className="text-xs text-white font-medium">{reason.label}</p>
          </div>
        </div>
        {description.trim() && (
          <div className="flex items-start gap-2">
            <MessageSquareWarning size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500">Açıklama</p>
              <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
            </div>
          </div>
        )}
        {reason.escalating && (
          <div className="flex items-center gap-2 pt-1">
            <Shield size={12} className="text-amber-400 flex-shrink-0" />
            <p className="text-[11px] text-amber-300">Bu rapor hızlı incelemeye alınacak.</p>
          </div>
        )}
      </div>
    </div>

    {submitError && (
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
        <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
        <p className="text-xs text-red-300">{submitError}</p>
      </div>
    )}

    <div className="flex gap-2">
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all disabled:opacity-40"
      >
        Geri
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <><Loader2 size={14} className="animate-spin" /> Gönderiliyor…</>
        ) : (
          'Raporu Gönder'
        )}
      </button>
    </div>
  </div>
);

interface DoneStateProps {
  onBlockOffer: () => void;
  onComplete: () => void;
}

const DoneState: React.FC<DoneStateProps> = ({ onBlockOffer, onComplete }) => (
  <div className="space-y-5 text-center py-2">
    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto">
      <CheckCircle2 size={26} className="text-emerald-400" />
    </div>
    <div>
      <h3 className="text-base font-bold text-white mb-1">Rapor Alındı</h3>
      <p className="text-sm text-slate-400">
        Moderatörlerimiz raporu inceleyecek ve gerekli işlemi yapacak.
      </p>
    </div>

    {/* Block offer */}
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 space-y-3 text-left">
      <p className="text-xs font-semibold text-slate-300">
        Bu kişiyi ayrıca engelle?
      </p>
      <p className="text-[11px] text-slate-400">
        Engellersen bu kullanıcı seni göremez, seninle eşleşemez ve mesaj gönderemez.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onComplete}
          className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white transition-all"
        >
          Hayır
        </button>
        <button
          type="button"
          onClick={onBlockOffer}
          className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-600 transition-all"
        >
          Engelle
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface ReportFlowProps {
  reportedUserId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const ReportFlow: React.FC<ReportFlowProps> = ({
  reportedUserId,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 'done'>(1);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedReason = selectedIndex !== null ? DEDUPED_REASONS[selectedIndex] : null;

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    setSubmitError(null);

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (!currentUserId) {
      setSubmitError('Oturum açık değil. Lütfen tekrar giriş yapın.');
      setSubmitting(false);
      return;
    }

    const { error } = await blockAndReportService.blockAndReport({
      blockerId: currentUserId,
      blockedId: reportedUserId,
      reportType: selectedReason.id,
      description: description.trim() || undefined,
    });

    if (error) {
      setSubmitError(error);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setStep('done');
  }, [selectedReason, reportedUserId, description]);

  const handleBlockOffer = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData.user?.id;
    if (currentUserId) {
      await blockAndReportService.blockUser(currentUserId, reportedUserId, 'post_report_block');
    }
    onComplete();
  }, [reportedUserId, onComplete]);

  const STEP_LABELS: Record<1 | 2 | 3 | 'done', string> = {
    1: 'Sebep Seç',
    2: 'Açıklama',
    3: 'Onayla',
    done: 'Tamamlandı',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Flag size={16} className="text-red-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Kullanıcıyı Raporla</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{STEP_LABELS[step]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="İptal"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Step indicator (only for steps 1-3) */}
      {step !== 'done' && (
        <div className="px-5 pt-4 flex items-center gap-2">
          {([1, 2, 3] as const).map((s) => {
            const numericStep = step as number;
            const isCompleted = numericStep > s;
            const isCurrent = step === s;
            return (
              <React.Fragment key={s}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isCurrent
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-slate-800 text-slate-600 border border-slate-700'
                }`}>
                  {isCompleted ? <CheckCircle2 size={12} /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-px transition-all ${isCompleted ? 'bg-emerald-500/40' : 'bg-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-5">
        {step === 1 && (
          <Step1
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && selectedReason && (
          <Step2
            description={description}
            onChange={setDescription}
            isEscalating={selectedReason.escalating}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && selectedReason && (
          <Step3
            reason={selectedReason}
            description={description}
            submitting={submitting}
            submitError={submitError}
            onBack={() => setStep(2)}
            onSubmit={() => void handleSubmit()}
          />
        )}
        {step === 'done' && (
          <DoneState
            onBlockOffer={() => void handleBlockOffer()}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
};
