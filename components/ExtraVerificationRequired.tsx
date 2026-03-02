/**
 * ExtraVerificationRequired
 *
 * Shown during registration when device fingerprint check returns
 * status === 'extra_verify' (3 accounts on the same device).
 *
 * Steps:
 *   1. Phone OTP verification
 *   2. Live selfie upload
 *   3. Waiting / under review state
 */

import React, { useState } from 'react';
import { ShieldCheck, Phone, Camera, Clock, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type Step = 'phone' | 'selfie' | 'waiting';

interface ExtraVerificationRequiredProps {
  /** The device fingerprint that triggered the check */
  deviceFingerprint: string;
  /** Called when user successfully passes all steps */
  onVerified: () => void;
  /** Called when user chooses to cancel / go back */
  onCancel: () => void;
}

export const ExtraVerificationRequired: React.FC<ExtraVerificationRequiredProps> = ({
  deviceFingerprint: _deviceFingerprint,
  onVerified,
  onCancel,
}) => {
  const [step, setStep]                   = useState<Step>('phone');
  const [phone, setPhone]                 = useState('');
  const [otp, setOtp]                     = useState('');
  const [otpSent, setOtpSent]             = useState(false);
  const [selfieFile, setSelfieFile]       = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // ── Phone step ──────────────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    if (!phone.trim()) { setError('Lütfen telefon numaranızı girin.'); return; }
    setLoading(true);
    setError(null);
    // Simulate OTP send (integrate real SMS provider here)
    await new Promise((r) => setTimeout(r, 1000));
    setOtpSent(true);
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) { setError('Lütfen doğrulama kodunu girin.'); return; }
    setLoading(true);
    setError(null);
    // Simulate OTP verify
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setStep('selfie');
    setError(null);
  };

  // ── Selfie step ─────────────────────────────────────────────────────────────

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  const handleSubmitSelfie = async () => {
    if (!selfieFile) { setError('Lütfen selfie yükleyin.'); return; }
    setLoading(true);
    setError(null);
    // Simulate upload
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep('waiting');
  };

  // ── Waiting step ────────────────────────────────────────────────────────────

  const handleCheckStatus = () => {
    // In real app: poll verification status, then call onVerified()
    onVerified();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Ek Doğrulama Gerekli</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Güvenliğiniz için bu cihazdan kayıt olurken ek doğrulama istiyoruz.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['phone', 'selfie', 'waiting'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s
                  ? 'bg-amber-500 text-slate-950'
                  : ['phone', 'selfie', 'waiting'].indexOf(step) > i
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
              }`}>
                {['phone', 'selfie', 'waiting'].indexOf(step) > i
                  ? <CheckCircle2 size={14} />
                  : i + 1}
              </div>
              {i < 2 && <div className={`h-px w-8 ${['phone', 'selfie', 'waiting'].indexOf(step) > i ? 'bg-emerald-500/40' : 'bg-slate-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step: Phone ── */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
              <Phone size={16} className="text-amber-400" />
              Telefon Doğrulama
            </div>

            <div className="space-y-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                disabled={otpSent}
              />

              {!otpSent ? (
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Kod Gönder
                </button>
              ) : (
                <>
                  <p className="text-xs text-emerald-400 text-center">✓ Kod gönderildi</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Doğrulama kodu"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-center tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyOtp()}
                    disabled={loading || otp.length < 4}
                    className="w-full py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                    Doğrula <ChevronRight size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Step: Selfie ── */}
        {step === 'selfie' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
              <Camera size={16} className="text-amber-400" />
              Canlı Fotoğraf
            </div>

            <p className="text-xs text-slate-400">
              Hesabınızın size ait olduğunu doğrulamak için yüzünüzü net görecek şekilde bir selfie yükleyin.
            </p>

            <label className="block w-full aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden relative bg-slate-800/50">
              {selfiePreview ? (
                <img src={selfiePreview} alt="Selfie önizleme" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Camera size={36} className="text-slate-500" />
                  <p className="text-xs text-slate-500">Fotoğraf seçmek için dokunun</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleSelfieChange}
                className="sr-only"
              />
            </label>

            {selfiePreview && (
              <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300">
                  Yüzünüzün net göründüğünden emin olun. Güneş gözlüğü veya maske takmayın.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSubmitSelfie()}
              disabled={!selfieFile || loading}
              className="w-full py-3 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              Gönder <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Step: Waiting ── */}
        {step === 'waiting' && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <Clock size={28} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">İnceleme Süreci</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Bilgileriniz inceleniyor. Bu işlem genellikle <span className="text-white font-semibold">24 saat</span> içinde tamamlanır.
                Sonuç e-posta ile bildirilecektir.
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 size={12} /> Telefon doğrulandı
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 size={12} /> Selfie yüklendi
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Clock size={12} /> Admin incelemesi bekleniyor
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckStatus}
              className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-600 transition-all"
            >
              Durumu Kontrol Et
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
        )}

        {/* Cancel */}
        {step !== 'waiting' && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Vazgeç
          </button>
        )}
      </div>
    </div>
  );
};
