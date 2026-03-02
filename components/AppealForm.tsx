/**
 * AppealForm
 *
 * Reusable appeal submission form.
 * - Min 50-char statement (enforced client + server)
 * - Evidence upload (up to 5 images)
 * - Community rules acknowledgment checkbox
 * - Handles one-appeal-per-entity gracefully (23505 → friendly error)
 */

import React, { useState } from 'react';
import { FileText, Upload, AlertTriangle, Loader2, CheckCircle2, X } from 'lucide-react';
import {
  appealService,
  AppealType,
  AppealEntityType,
} from '../services/appealService';

interface AppealFormProps {
  userId: string;
  appealType: AppealType;
  relatedEntityType: AppealEntityType;
  relatedEntityId?: string;
  /** Context shown above the form (e.g. ban reason) */
  contextInfo?: React.ReactNode;
  /** Called after successful submission */
  onSubmitted: () => void;
  /** Called to cancel / go back */
  onCancel: () => void;
}

const APPEAL_TYPE_LABELS: Record<AppealType, string> = {
  ban_appeal:         'Ban İtirazı',
  report_dispute:     'Şikayet İtirazı',
  badge_revocation:   'Rozet İptali İtirazı',
  restriction_appeal: 'Kısıtlama İtirazı',
};

const APPEAL_TYPE_HINTS: Record<AppealType, string> = {
  ban_appeal:
    'Bu yasağın neden hatalı veya haksız olduğunu ayrıntılı biçimde açıklayın. Varsa kanıt yükleyin.',
  report_dispute:
    'Bu şikayetin neden geçersiz olduğunu açıklayın. Haksız yere raporlandığınızı düşünüyorsanız belgeleyin.',
  badge_revocation:
    'Rozetinizin iptalinin neden yanlış olduğunu açıklayın. Güncel belgelerinizi ekleyin.',
  restriction_appeal:
    'Bu kısıtlamanın neden kaldırılması gerektiğini açıklayın.',
};

export const AppealForm: React.FC<AppealFormProps> = ({
  userId,
  appealType,
  relatedEntityType,
  relatedEntityId,
  contextInfo,
  onSubmitted,
  onCancel,
}) => {
  const [statement, setStatement]           = useState('');
  const [evidenceFiles, setEvidenceFiles]   = useState<File[]>([]);
  const [evidencePreviews, setEvidencePrev] = useState<string[]>([]);
  const [rulesAcknowledged, setRulesAck]    = useState(false);
  const [loading, setLoading]               = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const charCount  = statement.length;
  const charMin    = 50;
  const charLeft   = Math.max(0, charMin - charCount);

  // ── Evidence upload ─────────────────────────────────────────────────────────

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const combined = [...evidenceFiles, ...files].slice(0, 5);
    setEvidenceFiles(combined);
    setEvidencePrev(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeEvidence = (index: number) => {
    const updated = evidenceFiles.filter((_, i) => i !== index);
    setEvidenceFiles(updated);
    setEvidencePrev(updated.map((f) => URL.createObjectURL(f)));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (charCount < charMin) {
      setError(`İtiraz metnin en az ${charMin} karakter olması gerekiyor.`);
      return;
    }
    if (!rulesAcknowledged) {
      setError('Lütfen topluluk kurallarını okuduğunuzu onaylayın.');
      return;
    }

    setLoading(true);
    setError(null);

    // In a real app: upload evidenceFiles to storage first, get URLs
    // Here we pass empty paths as placeholder (real upload handled by storage service)
    const evidencePaths: string[] = evidenceFiles.map((f) => f.name);

    const { error: err } = await appealService.submitAppeal({
      userId,
      appealType,
      relatedEntityType,
      relatedEntityId,
      userStatement: statement,
      evidencePaths,
    });

    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    setSubmitted(true);
    setTimeout(onSubmitted, 2000);
  };

  // ── Success state ───────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
          <CheckCircle2 size={30} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white mb-1">İtiraz Gönderildi</p>
          <p className="text-sm text-slate-400">
            Ekibimiz inceleyecek ve kararı e-posta ile bildireceğiz.
            İtirazınızın durumunu profil ayarlarınızdan takip edebilirsiniz.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Context info (e.g. ban reason) */}
      {contextInfo && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          {contextInfo}
        </div>
      )}

      {/* Appeal type badge */}
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-gold-400" />
        <span className="text-sm font-bold text-white">{APPEAL_TYPE_LABELS[appealType]}</span>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 leading-relaxed">
        {APPEAL_TYPE_HINTS[appealType]}
      </p>

      {/* Statement */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">İtiraz Metni *</p>
          <span className={`text-xs ${charLeft > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {charLeft > 0 ? `En az ${charLeft} karakter daha` : `${charCount} karakter`}
          </span>
        </div>
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="İtiraz gerekçenizi ayrıntılı biçimde açıklayın…"
          rows={6}
          className={`w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none ${
            charLeft > 0 && charCount > 0
              ? 'border-amber-500/30 focus:border-amber-500'
              : charCount >= charMin
                ? 'border-emerald-500/30 focus:border-emerald-500'
                : 'border-slate-700 focus:border-gold-500'
          }`}
        />
      </div>

      {/* Evidence */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Kanıt (isteğe bağlı, maks. 5)
        </p>

        {/* Previews */}
        {evidencePreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {evidencePreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-800">
                <img src={src} alt={`Kanıt ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeEvidence(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-slate-900/80 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {evidenceFiles.length < 5 && (
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 cursor-pointer transition-all">
            <Upload size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">Dosya seç (JPG, PNG)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleEvidenceChange}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {/* Community rules acknowledgment */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
          rulesAcknowledged
            ? 'bg-gold-500 border-gold-500'
            : 'border-slate-600 group-hover:border-slate-400'
        }`}
          onClick={() => setRulesAck(!rulesAcknowledged)}
        >
          {rulesAcknowledged && <CheckCircle2 size={11} className="text-slate-950" />}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Topluluk kurallarını okudum ve itirazımın doğru bilgiler içerdiğini onaylıyorum.
          Yanlış bilgi vermenin hesabımı olumsuz etkileyebileceğinin farkındayım.
        </p>
      </label>

      {/* Community rules summary */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={13} className="text-amber-400" />
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Topluluk Kuralları</p>
        </div>
        <ul className="space-y-1">
          {[
            'Sağlık sektörü profesyonelleri için tasarlanmış bir platformuz',
            'Taciz, tehdit ve uygunsuz içerik kesinlikle yasaktır',
            'Gerçek kimlik ve fotoğraflarla katılım zorunludur',
            'Başkalarına saygı göstermek temel bir kuraldır',
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="text-slate-600 flex-shrink-0">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
        >
          İptal
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading || charCount < charMin || !rulesAcknowledged}
          className="flex-1 py-2.5 rounded-xl bg-gold-600 text-slate-950 text-sm font-bold hover:bg-gold-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Gönderiliyor…</>
            : <><FileText size={14} /> İtirazı Gönder</>
          }
        </button>
      </div>
    </div>
  );
};
