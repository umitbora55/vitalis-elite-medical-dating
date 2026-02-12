import React, { useState } from 'react';
import { ShieldCheck, Check, X, AlertTriangle, FileText, ChevronRight, Ban, Gavel, AlertCircle } from 'lucide-react';

interface CommunityGuidelinesProps {
  mode: 'ONBOARDING' | 'VIEW';
  onAccept?: () => void;
  onClose?: () => void;
}

export const CommunityGuidelines: React.FC<CommunityGuidelinesProps> = ({ mode, onAccept, onClose }) => {
  const [isAccepted, setIsAccepted] = useState(false);

  const handleAccept = () => {
    if (isAccepted && onAccept) {
      onAccept();
    }
  };

  const handleReport = () => {
      window.location.href = 'mailto:safety@vitalis.app?subject=Community%20Violation%20Report';
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-6 pt-12 pb-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shadow-lg relative z-10">
        <div>
            <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-gold-500" size={28} />
            Topluluk Kuralları
            </h2>
            <p className="text-xs text-slate-400 mt-1">Vitalis, saygı ve güven üzerine kuruludur.</p>
        </div>
        {mode === 'VIEW' && onClose && (
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        )}
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-950">
        
        {/* Intro */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm">
            <p className="text-sm text-slate-200 leading-relaxed font-serif italic opacity-90 text-center">
                "Meslektaşlarımızla kurduğumuz ilişkilerde dürüstlük, saygı ve profesyonellik esastır. Bu platformda herkesin kendini güvende hissetmesi sizin sorumluluğunuzdadır."
            </p>
        </div>

        {/* The Rules */}
        <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={14} /> Temel Kurallar
            </h3>
            
            <div className="grid gap-3">
                {/* DOs */}
                <div className="bg-green-900/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                        <Check className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-green-400">Saygılı Ol</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Karşındakinin sınırlarına ve mesleki kimliğine saygı duy.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 mb-3">
                        <Check className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-green-400">Dürüst Profil</h4>
                            <p className="text-xs text-slate-400 mt-0.5">İsim, yaş, unvan ve kurum bilgilerini doğru gir.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Check className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-green-400">Gerçek Fotoğraflar</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Yüzünün net göründüğü, güncel fotoğraflar kullan.</p>
                        </div>
                    </div>
                </div>

                {/* DON'Ts */}
                <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                        <X className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-red-400">Taciz Yasak</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Israrcı mesajlar, istenmeyen içerikler ve zorbalık tolere edilmez.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 mb-3">
                        <X className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-red-400">Spam & Reklam Yasak</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Platformu ticari amaçla veya hasta bulmak için kullanamazsınız.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <X className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                        <div>
                            <h4 className="text-sm font-bold text-red-400">Nefret Söylemi & Sahte Profil</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Ayrımcılık yapmak veya başkasını taklit etmek kesin ihraç sebebidir.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Consequences */}
        <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Gavel size={14} /> İhlal Sonuçları
            </h3>
            <div className="space-y-3 relative">
                {/* Connector Line */}
                <div className="absolute top-4 bottom-4 left-[19px] w-0.5 bg-slate-800"></div>

                <div className="relative flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center z-10">
                        <span className="text-sm font-bold text-slate-400">1</span>
                    </div>
                    <div className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <span className="text-sm font-bold text-white block">Uyarı</span>
                        <span className="text-[10px] text-slate-500">Hafif ihlallerde ilk ikaz.</span>
                    </div>
                </div>

                <div className="relative flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-orange-500/50 flex items-center justify-center z-10">
                        <AlertTriangle size={18} className="text-orange-500" />
                    </div>
                    <div className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <span className="text-sm font-bold text-orange-400 block">7 Gün Uzaklaştırma</span>
                        <span className="text-[10px] text-slate-500">Tekrar eden ihlallerde.</span>
                    </div>
                </div>

                <div className="relative flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-red-500 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        <Ban size={18} className="text-red-500" />
                    </div>
                    <div className="flex-1 bg-slate-900 border border-red-500/30 p-3 rounded-xl bg-red-900/10">
                        <span className="text-sm font-bold text-red-500 block">Kalıcı Ban</span>
                        <span className="text-[10px] text-slate-400">Ağır ihlaller veya 3. uyarı sonrası.</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Report Button (Only in View Mode) */}
        {mode === 'VIEW' && (
            <div className="pt-4 pb-12">
                <button 
                    onClick={handleReport}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                    <AlertCircle size={18} />
                    Bir İhlal Gördüm
                </button>
            </div>
        )}
      </div>

      {/* Footer (Actions) */}
      {mode === 'ONBOARDING' && (
          <div className="p-6 bg-slate-900 border-t border-slate-800 relative z-20">
              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                  <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="peer sr-only"
                        checked={isAccepted}
                        onChange={(e) => setIsAccepted(e.target.checked)}
                      />
                      <div className="w-6 h-6 border-2 border-slate-600 rounded-md peer-checked:bg-gold-500 peer-checked:border-gold-500 transition-all"></div>
                      <Check size={14} className="absolute left-1 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={4} />
                  </div>
                  <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors select-none">
                      Topluluk kurallarını okudum, anladım ve Vitalis standartlarına uyacağımı kabul ediyorum.
                  </span>
              </label>

              <button 
                  onClick={handleAccept}
                  disabled={!isAccepted}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                      isAccepted 
                      ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 hover:scale-[1.02] cursor-pointer' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
              >
                  Kabul Et ve Devam Et <ChevronRight size={20} />
              </button>
          </div>
      )}
    </div>
  );
};
