import React from 'react';
import { ShieldCheck, Clock, Mail, LogOut, AlertTriangle, FileText, RefreshCw, Upload } from 'lucide-react';
import { VerificationStatus } from '../types';

interface PendingVerificationViewProps {
  status: VerificationStatus;
  rejectionReason?: string;
  onLogout: () => void;
  onRetryVerification?: () => void;
}

export const PendingVerificationView: React.FC<PendingVerificationViewProps> = ({ status, rejectionReason, onLogout, onRetryVerification }) => {
  const renderPending = () => (
    <>
      <div className="w-20 h-20 rounded-full bg-gold-500/10 border-2 border-gold-500/30 flex items-center justify-center mx-auto mb-6 relative">
        <ShieldCheck size={32} className="text-gold-400" />
        <div className="absolute inset-0 border-t-2 border-gold-500 rounded-full animate-spin" />
      </div>

      <h2 className="text-2xl font-serif text-white mb-3">Doğrulama Bekleniyor</h2>
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
        Belgeniz incelemeye alındı. <strong className="text-slate-300">1-2 iş günü</strong> içinde sonuçlandırılacaktır.
      </p>

      {/* Progress Steps */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-6 text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
            <Upload size={14} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Belge Yüklendi</p>
            <p className="text-xs text-slate-500">Belgeniz başarıyla alındı</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center flex-shrink-0 animate-pulse">
            <FileText size={14} className="text-gold-400" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">İnceleniyor</p>
            <p className="text-xs text-slate-500">Ekibimiz belgenizi kontrol ediyor</p>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-40">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={14} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Onay</p>
            <p className="text-xs text-slate-600">Hesabınız aktif edilecek</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-xs text-slate-500 mb-6">
        <Clock size={14} />
        <span>Takip: support@vitalis.app</span>
        <Mail size={14} />
      </div>
    </>
  );

  const renderRejected = () => (
    <>
      <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={32} className="text-red-400" />
      </div>

      <h2 className="text-2xl font-serif text-white mb-3">Doğrulama Reddedildi</h2>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">
        Üzgünüz, belgeniz onaylanmadı. Lütfen aşağıdaki bilgileri kontrol ederek yeniden yükleyin.
      </p>

      {rejectionReason && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6 text-left">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-300 uppercase mb-1">Red Nedeni</p>
            <p className="text-sm text-red-200/80 leading-relaxed">{rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Tips for re-upload */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-6 text-left space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Belge Yükleme İpuçları</p>
        <div className="flex items-start gap-2.5">
          <span className="text-gold-400 text-sm mt-0.5">•</span>
          <p className="text-xs text-slate-400">Fotoğrafın <strong className="text-slate-300">net ve okunabilir</strong> olduğundan emin olun</p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-gold-400 text-sm mt-0.5">•</span>
          <p className="text-xs text-slate-400">Hastane kimliği, diploma veya <strong className="text-slate-300">çalışma belgesi</strong> kabul edilir</p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-gold-400 text-sm mt-0.5">•</span>
          <p className="text-xs text-slate-400">Belgedeki <strong className="text-slate-300">ad ve unvan</strong> açıkça görünmelidir</p>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-gold-400 text-sm mt-0.5">•</span>
          <p className="text-xs text-slate-400">Desteklenen formatlar: <strong className="text-slate-300">JPG, PNG, PDF</strong> (maks 10 MB)</p>
        </div>
      </div>

      {onRetryVerification && (
        <button
          onClick={onRetryVerification}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all mb-3"
        >
          <RefreshCw size={16} />
          Yeniden Belge Yükle
        </button>
      )}
    </>
  );

  const renderEmailVerification = () => (
    <>
      <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-6">
        <Mail size={28} className="text-blue-400" />
      </div>

      <h2 className="text-2xl font-serif text-white mb-3">Email Doğrulaması Gerekli</h2>
      <p className="text-slate-400 text-sm mb-6">Kurumsal email adresinize gönderilen kodu girin.</p>

      <div className="flex items-center justify-center gap-3 text-xs text-slate-500 mb-6">
        <Clock size={14} />
        <span>Takip: support@vitalis.app</span>
        <Mail size={14} />
      </div>
    </>
  );

  const renderVerified = () => (
    <>
      <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
        <ShieldCheck size={28} className="text-green-400" />
      </div>

      <h2 className="text-2xl font-serif text-white mb-3">Doğrulama Tamamlandı</h2>
      <p className="text-slate-400 text-sm mb-6">Hesabınız doğrulandı. Vitalis'e hoş geldiniz!</p>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        {status === 'PENDING_VERIFICATION' && renderPending()}
        {status === 'REJECTED' && renderRejected()}
        {status === 'EMAIL_VERIFICATION_SENT' && renderEmailVerification()}
        {status === 'VERIFIED' && renderVerified()}

        <button
          onClick={onLogout}
          className="w-full py-3 rounded-xl border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-2 hover:border-red-400 hover:text-red-200 transition-colors"
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};
