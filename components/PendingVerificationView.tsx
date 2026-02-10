import React from 'react';
import { ShieldCheck, Clock, Mail, LogOut } from 'lucide-react';
import { VerificationStatus } from '../types';

interface PendingVerificationViewProps {
  status: VerificationStatus;
  onLogout: () => void;
}

export const PendingVerificationView: React.FC<PendingVerificationViewProps> = ({ status, onLogout }) => {
  const statusCopy = {
    PENDING_VERIFICATION: {
      title: 'Doğrulama Bekleniyor',
      message: 'Belgeniz inceleniyor. Ortalama süre 24-48 saat.',
    },
    EMAIL_VERIFICATION_SENT: {
      title: 'Email Doğrulaması Gerekli',
      message: 'Kurumsal email adresinize gönderilen kodu girin.',
    },
    REJECTED: {
      title: 'Doğrulama Reddedildi',
      message: 'Belgeniz reddedildi. Lütfen yeniden doğrulama başlatın.',
    },
    VERIFIED: {
      title: 'Doğrulama Tamamlandı',
      message: 'Hesabınız doğrulandı.',
    },
  };

  const copy = statusCopy[status] ?? statusCopy.PENDING_VERIFICATION;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={28} className="text-gold-400" />
        </div>

        <h2 className="text-2xl font-serif text-white mb-3">{copy.title}</h2>
        <p className="text-slate-400 text-sm mb-6">{copy.message}</p>

        <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mb-8">
          <Clock size={14} />
          <span>Takip: support@vitalis.app</span>
          <Mail size={14} />
        </div>

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
