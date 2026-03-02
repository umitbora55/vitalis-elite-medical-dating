/**
 * LicenseUploadFlow — Professional License Upload (≤3 Steps)
 *
 * Step 1: Choose profession type + evidence type
 * Step 2: Upload document (drag & drop + camera)
 * Step 3: Confirmation + status
 *
 * Integrates with verificationService.uploadVerificationDocument()
 * and verificationService.createVerificationRequest()
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Clock,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import {
  uploadVerificationDocument,
  createVerificationRequest,
  upsertVerificationDocument,
} from '../../../../services/verificationService';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFESSION_TYPES = [
  { value: 'hekim', label: 'Hekim (MD)' },
  { value: 'disi', label: 'Diş Hekimi' },
  { value: 'eczaci', label: 'Eczacı' },
  { value: 'hemsire', label: 'Hemşire' },
  { value: 'fizyoterapist', label: 'Fizyoterapist' },
  { value: 'diyetisyen', label: 'Diyetisyen' },
  { value: 'psikolog', label: 'Psikolog / Psikiyatrist' },
  { value: 'radyolog', label: 'Radyoloji Teknikeri' },
  { value: 'anestezi', label: 'Anestezi Teknikeri' },
  { value: 'tibbi_ogrenci', label: 'Tıp Öğrencisi' },
  { value: 'diger', label: 'Diğer Sağlık Çalışanı' },
] as const;

const EVIDENCE_TYPES = [
  { value: 'diploma', label: 'Diploma' },
  { value: 'license', label: 'Ruhsat / Lisans' },
  { value: 'chamber', label: 'Oda Kayıt Belgesi' },
  { value: 'employment_doc', label: 'İş Yeri Belgesi' },
] as const;

type ProfessionType = typeof PROFESSION_TYPES[number]['value'];
type EvidenceType = typeof EVIDENCE_TYPES[number]['value'];

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateRequestId = (): string =>
  `vreq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Step 1: Profession & Evidence Selection ──────────────────────────────────

interface Step1Props {
  professionType: ProfessionType | '';
  evidenceType: EvidenceType | '';
  onProfessionChange: (v: ProfessionType) => void;
  onEvidenceChange: (v: EvidenceType) => void;
  onNext: () => void;
}

const Step1: React.FC<Step1Props> = ({
  professionType,
  evidenceType,
  onProfessionChange,
  onEvidenceChange,
  onNext,
}) => (
  <div className="space-y-5">
    <div className="space-y-2">
      <label htmlFor="profession-select" className="block text-xs font-semibold text-slate-300">
        Meslek Grubunu Seç *
      </label>
      <select
        id="profession-select"
        value={professionType}
        onChange={(e) => onProfessionChange(e.target.value as ProfessionType)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors appearance-none"
      >
        <option value="" disabled>Meslek seçin…</option>
        {PROFESSION_TYPES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    </div>

    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-300">Belge Türü *</p>
      <div className="grid grid-cols-2 gap-2">
        {EVIDENCE_TYPES.map((et) => (
          <button
            key={et.value}
            type="button"
            onClick={() => onEvidenceChange(et.value)}
            className={`text-left px-3 py-3 rounded-xl border transition-all text-xs ${
              evidenceType === et.value
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 font-semibold'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            {et.label}
          </button>
        ))}
      </div>
    </div>

    <button
      type="button"
      onClick={onNext}
      disabled={!professionType || !evidenceType}
      className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      Devam Et <ChevronRight size={15} />
    </button>
  </div>
);

// ─── Step 2: File Upload ──────────────────────────────────────────────────────

interface Step2Props {
  file: File | null;
  preview: string | null;
  dragOver: boolean;
  onFileAccepted: (f: File) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onRemoveFile: () => void;
  onBack: () => void;
  onUpload: () => void;
  uploading: boolean;
  uploadError: string | null;
}

const Step2: React.FC<Step2Props> = ({
  file,
  preview,
  dragOver,
  onFileAccepted,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onBack,
  onUpload,
  uploading,
  uploadError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!file ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 hover:border-slate-500 bg-slate-800/30'
          }`}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Belge yükle: tıkla veya sürükle bırak"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        >
          <Upload size={28} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-300">
            Belgeyi sürükle veya tıkla
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            JPG, PNG, WebP veya PDF · Maks. 10 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileAccepted(f);
              e.target.value = '';
            }}
            aria-label="Belge seç"
          />
        </div>
      ) : (
        /* File preview */
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {preview ? (
                <img src={preview} alt="Belge önizleme" className="w-full h-full object-cover" />
              ) : (
                <FileText size={20} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{file.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{formatFileSize(file.size)}</p>
              {file.type === 'application/pdf' && (
                <div className="mt-1 flex items-center gap-1.5">
                  <FileText size={10} className="text-slate-500" />
                  <span className="text-[10px] text-slate-500">PDF belgesi</span>
                </div>
              )}
              {preview && file.type.startsWith('image/') && (
                <div className="mt-1 flex items-center gap-1.5">
                  <ImageIcon size={10} className="text-slate-500" />
                  <span className="text-[10px] text-slate-500">Görsel önizleme aktif</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onRemoveFile}
              aria-label="Dosyayı kaldır"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-all flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
          <AlertCircle size={14} className="flex-shrink-0" />
          <p className="text-xs">{uploadError}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={uploading}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all disabled:opacity-40"
        >
          Geri
        </button>
        <button
          type="button"
          onClick={onUpload}
          disabled={!file || uploading}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <><Loader2 size={14} className="animate-spin" /> Yükleniyor…</>
          ) : (
            <>Yükle <ChevronRight size={15} /></>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Step 3: Confirmation ─────────────────────────────────────────────────────

interface Step3Props {
  claimId: string;
  onComplete: ((id: string) => void) | undefined;
}

const Step3: React.FC<Step3Props> = ({ claimId, onComplete }) => (
  <div className="space-y-5 text-center py-2">
    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto">
      <CheckCircle2 size={26} className="text-emerald-400" />
    </div>

    <div>
      <h3 className="text-base font-bold text-white mb-1">Belge Yüklendi!</h3>
      <p className="text-sm text-slate-400">
        Belgen moderatörlerimize iletildi. Kısa süre içinde incelenecek.
      </p>
    </div>

    {/* Trust progress note */}
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 text-left space-y-2">
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-amber-400" />
        <span className="text-xs font-semibold text-slate-300">Ortalama inceleme süresi: 24 saat</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Belgen onaylandığında doğrulama seviyeniz güncellenecek ve profilinde rozet görünecek.
        Bu süreçte uygulamayı kullanmaya devam edebilirsin.
      </p>
    </div>

    <p className="text-[10px] text-slate-600">Talep ID: {claimId}</p>

    {onComplete && (
      <button
        type="button"
        onClick={() => onComplete(claimId)}
        className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all"
      >
        Tamam
      </button>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface LicenseUploadFlowProps {
  onComplete?: (claimId: string) => void;
  onCancel?: () => void;
}

export const LicenseUploadFlow: React.FC<LicenseUploadFlowProps> = ({
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [professionType, setProfessionType] = useState<ProfessionType | ''>('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [completedClaimId, setCompletedClaimId] = useState('');

  const validateAndSetFile = useCallback((f: File) => {
    setUploadError(null);
    if (!ALLOWED_TYPES.has(f.type)) {
      setUploadError('Desteklenmeyen dosya türü. JPG, PNG, WebP veya PDF yükleyin.');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setUploadError('Dosya boyutu 10 MB\'ı aşıyor.');
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, [validateAndSetFile]);

  const handleRemoveFile = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setUploadError(null);
  }, [preview]);

  const handleUpload = useCallback(async () => {
    if (!file || !professionType || !evidenceType) return;
    setUploading(true);
    setUploadError(null);

    const requestId = generateRequestId();

    // 1. Upload the document file
    const { documentPath, documentSize, sha256, error: uploadErr } =
      await uploadVerificationDocument(file, requestId);

    if (uploadErr || !documentPath) {
      setUploadError(uploadErr?.message ?? 'Dosya yüklenemedi. Lütfen tekrar deneyin.');
      setUploading(false);
      return;
    }

    // 2. Create the verification request record
    const { error: createErr } = await createVerificationRequest({
      requestId,
      emailType: 'personal',
      method: 'DOCUMENTS',
      initialStatus: 'PENDING',
      documentPath,
    });

    if (createErr) {
      setUploadError(createErr.message ?? 'Doğrulama talebi oluşturulamadı.');
      setUploading(false);
      return;
    }

    // 3. Upsert verification_documents record
    const { error: docErr } = await upsertVerificationDocument(requestId, documentPath, {
      docType: evidenceType,
      size: documentSize,
      mime: file.type,
      sha256: sha256 ?? null,
    });

    if (docErr) {
      setUploadError(docErr.message ?? 'Belge kaydedilemedi.');
      setUploading(false);
      return;
    }

    setCompletedClaimId(requestId);
    setUploading(false);
    setStep(3);
  }, [file, professionType, evidenceType]);

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const STEP_LABELS = ['Meslek & Belge Türü', 'Belge Yükle', 'Onay'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Lisans Doğrulama</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Adım {step}/3 — {STEP_LABELS[step - 1]}</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="İptal"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="px-5 pt-4 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              step > s
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : step === s
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-slate-800 text-slate-600 border border-slate-700'
            }`}>
              {step > s ? <CheckCircle2 size={12} /> : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-px transition-all ${step > s ? 'bg-emerald-500/40' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {step === 1 && (
          <Step1
            professionType={professionType}
            evidenceType={evidenceType}
            onProfessionChange={setProfessionType}
            onEvidenceChange={setEvidenceType}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2
            file={file}
            preview={preview}
            dragOver={dragOver}
            onFileAccepted={validateAndSetFile}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onRemoveFile={handleRemoveFile}
            onBack={() => setStep(1)}
            onUpload={() => void handleUpload()}
            uploading={uploading}
            uploadError={uploadError}
          />
        )}
        {step === 3 && (
          <Step3
            claimId={completedClaimId}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
};
