import React from 'react';
import { Clock, CheckCircle2, Circle, Crown, Mail } from 'lucide-react';

interface VerificationPendingScreenProps {
  onUpgradeToPremium?: () => void;
  onLogout?: () => void;
  isRejected?: boolean;
  onRetry?: () => void;
}

export const VerificationPendingScreen: React.FC<VerificationPendingScreenProps> = ({
  onUpgradeToPremium,
  onLogout,
  isRejected = false,
  onRetry,
}) => {
  const steps = [
    { label: 'Kayıt tamamlandı', done: true },
    { label: 'Belgeler yüklendi', done: true },
    { label: isRejected ? 'Doğrulama reddedildi' : 'Admin onayı bekleniyor', done: isRejected, rejected: isRejected },
    { label: 'Profil tamamlama', done: false },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto mb-5 ${isRejected
            ? 'bg-red-900/20 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
            : 'bg-amber-900/20 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]'
            }`}>
            <Clock size={40} className={isRejected ? 'text-red-400' : 'text-amber-400 animate-pulse'} />
          </div>

          <h1 className="text-2xl font-serif text-white mb-2">
            {isRejected ? 'Doğrulama Reddedildi' : 'Doğrulama Bekleniyor'}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            {isRejected
              ? 'Belgeleriniz doğrulama kriterlerini karşılamadı. Lütfen tekrar deneyin.'
              : 'Belgeleriniz inceleniyor. Bu işlem genellikle 24 saat içinde tamamlanır.'
            }
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {step.done && !step.rejected ? (
                  <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                ) : step.rejected ? (
                  <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/60 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-xs font-bold">✕</span>
                  </div>
                ) : i === 2 && !isRejected ? (
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center flex-shrink-0">
                    <Clock size={12} className="text-amber-400" />
                  </div>
                ) : (
                  <Circle size={20} className="text-slate-600 flex-shrink-0" />
                )}
                <span className={`text-sm ${step.done && !step.rejected
                  ? 'text-slate-300'
                  : step.rejected
                    ? 'text-red-400'
                    : i === 2 && !isRejected
                      ? 'text-amber-400 font-medium'
                      : 'text-slate-600'
                  }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {!isRejected && (
            <>
              <div className="border-t border-slate-800 pt-4">
                <div className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-3">
                  <Mail size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Onaylandığında e-posta ve push bildirimi alacaksınız.
                  </p>
                </div>
              </div>

              {onUpgradeToPremium && (
                <div className="border-t border-slate-800 pt-4">
                  <div className="text-center">
                    <p className="text-slate-500 text-xs mb-3">
                      Premium üyeler öncelikli incelenir.
                    </p>
                    <button
                      onClick={onUpgradeToPremium}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg hover:brightness-110 transition-all"
                    >
                      <Crown size={16} fill="currentColor" />
                      Premium'a Geç
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {isRejected && onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all"
            >
              Tekrar Başvur
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full text-slate-500 text-xs hover:text-slate-300 transition-colors text-center pt-1"
            >
              Çıkış Yap
            </button>
          )}


        </div>
      </div>
    </div>
  );
};
