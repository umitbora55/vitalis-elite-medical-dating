/**
 * VITALIS Verification Appeal Modal
 *
 * Allows users to appeal:
 * - Liveness check failure
 * - Face mismatch
 * - Document rejection
 * - Duplicate detection
 * - Account suspension
 */

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Upload, Send, AlertTriangle, CheckCircle2,
  Video, Camera, FileText, Users, ShieldOff, HelpCircle, Loader2
} from 'lucide-react';
import { submitAppeal, uploadAppealDocument } from '../services/healthcareVerificationService';
import type { AppealType } from '../services/healthcareVerificationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultAppealType?: AppealType;
}

const APPEAL_OPTIONS: {
  type: AppealType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'liveness_failed',
    label: 'Canlılık Doğrulaması Başarısız',
    description: 'Fotoğraf bana ait, canlı kayıt sırasında teknik sorun yaşandı.',
    icon: <Video className="w-4 h-4" />,
  },
  {
    type: 'face_mismatch',
    label: 'Yüz Eşleşmesi Başarısız',
    description: 'Profil fotoğrafım bana ait, ama sistem uyuşmadı.',
    icon: <Camera className="w-4 h-4" />,
  },
  {
    type: 'document_rejected',
    label: 'Belge Reddedildi',
    description: 'Yüklediğim belge geçerli; yeniden incelenmesini istiyorum.',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    type: 'duplicate_detected',
    label: 'Yinelenen Hesap Tespiti',
    description: 'Başka bir hesabım yok; bu hesap benim birincil hesabım.',
    icon: <Users className="w-4 h-4" />,
  },
  {
    type: 'account_suspended',
    label: 'Hesap Askıya Alındı',
    description: 'Kural ihlali yapmadım, kararın gözden geçirilmesini istiyorum.',
    icon: <ShieldOff className="w-4 h-4" />,
  },
  {
    type: 'other',
    label: 'Diğer',
    description: 'Yukarıdakilere uymayan başka bir sorun.',
    icon: <HelpCircle className="w-4 h-4" />,
  },
];

type Phase = 'FORM' | 'SUBMITTING' | 'SUCCESS' | 'ERROR';

export const VerificationAppealModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultAppealType,
}) => {
  const [selectedType, setSelectedType] = useState<AppealType>(defaultAppealType ?? 'other');
  const [description, setDescription] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('FORM');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [appealId, setAppealId] = useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (!allowed.has(file.type)) {
      setDocError('Yalnızca JPG, PNG, WEBP veya PDF yükleyebilirsiniz.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setDocError('Dosya 10 MB\'dan büyük olamaz.');
      return;
    }
    setDocError(null);
    setDocFile(file);
  };

  const handleSubmit = async () => {
    setPhase('SUBMITTING');
    setSubmitError(null);

    try {
      let docPath: string | undefined;
      if (docFile) {
        // We need a placeholder ID for upload; use a temp UUID
        const tempId = crypto.randomUUID();
        const { storagePath, error: uploadErr } = await uploadAppealDocument(docFile, tempId);
        if (uploadErr) {
          setSubmitError('Ek dosya yüklenirken hata oluştu. Dosyasız tekrar deneyin.');
          setPhase('FORM');
          return;
        }
        docPath = storagePath ?? undefined;
      }

      const { appealId: newId, error: submitErr } = await submitAppeal({
        appealType: selectedType,
        description: description.trim() || undefined,
        additionalDocPath: docPath,
      });

      if (submitErr || !newId) {
        setSubmitError(submitErr?.message ?? 'İtiraz gönderilemedi. Lütfen tekrar deneyin.');
        setPhase('FORM');
        return;
      }

      setAppealId(newId);
      setPhase('SUCCESS');
    } catch {
      setSubmitError('Beklenmedik hata oluştu. Lütfen tekrar deneyin.');
      setPhase('FORM');
    }
  };

  const handleClose = () => {
    if (phase === 'SUBMITTING') return;
    setPhase('FORM');
    setSelectedType(defaultAppealType ?? 'other');
    setDescription('');
    setDocFile(null);
    setDocError(null);
    setSubmitError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          key="modal"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-slate-900 z-10 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">Doğrulama İtirazı</h2>
            <button
              onClick={handleClose}
              disabled={phase === 'SUBMITTING'}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-4">
            <AnimatePresence mode="wait">
              {/* ── FORM ── */}
              {phase === 'FORM' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-4"
                >
                  <p className="text-sm text-slate-400">
                    Doğrulama sürecinde hak ettiğinizi düşündüğünüz bir sonuç almadıysanız
                    itiraz edebilirsiniz. Ekibimiz 24-48 saat içinde inceleyecek.
                  </p>

                  {/* Appeal Type */}
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-2">İtiraz Konusu</p>
                    <div className="flex flex-col gap-2">
                      {APPEAL_OPTIONS.map((opt) => (
                        <button
                          key={opt.type}
                          onClick={() => setSelectedType(opt.type)}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            selectedType === opt.type
                              ? 'border-blue-500 bg-blue-900/30'
                              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                          }`}
                        >
                          <div className={`mt-0.5 shrink-0 ${selectedType === opt.type ? 'text-blue-400' : 'text-slate-500'}`}>
                            {opt.icon}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${selectedType === opt.type ? 'text-blue-300' : 'text-slate-300'}`}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1.5">
                      Açıklama <span className="text-slate-500 font-normal">(opsiyonel)</span>
                    </p>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="İtirazınızı kısaca açıklayın..."
                      maxLength={500}
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <p className="text-xs text-slate-600 text-right mt-0.5">{description.length}/500</p>
                  </div>

                  {/* Additional Document */}
                  <div>
                    <p className="text-xs font-semibold text-slate-300 mb-1.5">
                      Ek Belge <span className="text-slate-500 font-normal">(opsiyonel)</span>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {docFile ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <p className="text-xs text-white truncate">{docFile.name}</p>
                        <button
                          onClick={() => setDocFile(null)}
                          className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 w-full px-3 py-2 bg-slate-800 border border-dashed border-slate-700 rounded-xl text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Dosya seç (JPG, PNG, PDF - max 10 MB)</span>
                      </button>
                    )}
                    {docError && <p className="text-xs text-red-400 mt-1">{docError}</p>}
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">{submitError}</p>
                    </div>
                  )}

                  <button
                    onClick={() => void handleSubmit()}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    İtirazı Gönder
                  </button>
                </motion.div>
              )}

              {/* ── SUBMITTING ── */}
              {phase === 'SUBMITTING' && (
                <motion.div
                  key="submitting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-12"
                >
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-sm text-slate-300">İtirazınız gönderiliyor...</p>
                </motion.div>
              )}

              {/* ── SUCCESS ── */}
              {phase === 'SUCCESS' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-8 text-center"
                >
                  <CheckCircle2 className="w-14 h-14 text-green-400" />
                  <h3 className="text-lg font-bold text-white">İtirazınız Alındı</h3>
                  <p className="text-sm text-slate-400">
                    İtiraz numaranız: <span className="text-white font-mono text-xs">{appealId?.slice(0, 8)?.toUpperCase()}</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    Ekibimiz 24-48 saat içinde inceleyecek ve sonucu bildirim ile size iletecek.
                  </p>
                  <div className="bg-slate-800 rounded-xl px-4 py-3 text-left w-full">
                    <p className="text-xs font-semibold text-slate-300 mb-1">Süreç hakkında</p>
                    <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                      <li>İnceleme süresi: 24-48 saat</li>
                      <li>Sonuç bildirim ile iletilir</li>
                      <li>Kabul oranı ~%25-35</li>
                      <li>Reddedilirse itiraz hakkınız tükenir</li>
                    </ul>
                  </div>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 transition-colors"
                  >
                    Kapat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
