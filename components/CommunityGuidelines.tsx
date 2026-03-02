import React, { useState } from 'react';
import { ShieldCheck, Check, ChevronRight, X } from 'lucide-react';

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

            {/* ── Fixed Header ── */}
            <div className="flex-shrink-0 px-8 pt-14 pb-5">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <ShieldCheck size={18} className="text-gold-400" />
                            <span className="text-[10px] font-semibold text-gold-500/70 uppercase tracking-[0.25em]">Vitalis</span>
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Topluluk Standartları</h2>
                    </div>
                    {mode === 'VIEW' && onClose && (
                        <button onClick={onClose} className="p-2.5 bg-slate-800/50 rounded-xl text-slate-500 hover:text-white transition-all">
                            <X size={18} />
                        </button>
                    )}
                </div>
                <div className="mt-3 w-10 h-px bg-gold-500/40" />
            </div>

            {/* ── Scrollable Frame ── */}
            <div className="flex-1 min-h-0 px-8 pb-4">
                <div className="h-full border border-slate-800/60 rounded-2xl bg-slate-900/30 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">

                        {/* Commitments */}
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em] mb-4">Taahhüdünüz</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <h4 className="text-[14px] font-semibold text-white mb-0.5">Saygı ve Profesyonellik</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">Karşınızdaki kişinin sınırlarına, mesleki kimliğine ve kişisel tercihlerine saygı gösterin.</p>
                            </div>
                            <div className="w-full h-px bg-slate-800/60" />
                            <div>
                                <h4 className="text-[14px] font-semibold text-white mb-0.5">Doğru ve Güncel Bilgiler</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">Profilinizde yer alan isim, yaş, unvan, kurum ve fotoğraf bilgilerinizin gerçeği yansıttığından emin olun.</p>
                            </div>
                            <div className="w-full h-px bg-slate-800/60" />
                            <div>
                                <h4 className="text-[14px] font-semibold text-white mb-0.5">Güvenli Ortam Sorumluluğu</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">Bu platformda herkesin kendini güvende hissetmesi ortak sorumluluğumuzdur.</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex-1 h-px bg-slate-800/50" />
                            <span className="text-[9px] text-slate-600 uppercase tracking-[0.2em]">Yasak Davranışlar</span>
                            <div className="flex-1 h-px bg-slate-800/50" />
                        </div>

                        {/* Prohibited */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <h4 className="text-[14px] font-semibold text-white mb-0.5">Taciz ve Zorbalık</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">Israrcı mesajlar, istenmeyen cinsel içerik ve her türlü zorbalık kesinlikle tolere edilmez.</p>
                            </div>
                            <div className="w-full h-px bg-slate-800/60" />
                            <div>
                                <h4 className="text-[14px] font-semibold text-white mb-0.5">Ticari Kullanım ve Spam</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">Platformu ticari amaçla, reklam yapmak veya hasta bulmak için kullanmak yasaktır.</p>
                            </div>
                            <div className="w-full h-px bg-slate-800/60" />
                            <div>
                                <h4 className="text-[14px] font-semibold text-white mb-0.5">Sahte Profil ve Nefret Söylemi</h4>
                                <p className="text-[12px] text-slate-400 leading-relaxed">Başka birini taklit etmek veya herhangi bir gruba yönelik ayrımcılık yapmak kalıcı ihraç sebebidir.</p>
                            </div>
                        </div>

                        {/* Consequences */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex-1 h-px bg-slate-800/50" />
                            <span className="text-[9px] text-slate-600 uppercase tracking-[0.2em]">Yaptırımlar</span>
                            <div className="flex-1 h-px bg-slate-800/50" />
                        </div>

                        <div className="space-y-3 pb-2">
                            <div className="flex items-baseline gap-3">
                                <span className="text-[12px] font-semibold text-slate-500 tabular-nums">01</span>
                                <span className="text-[12px] text-slate-300">Uyarı</span>
                                <span className="text-[11px] text-slate-600">— Hafif ihlallerde ilk ikaz</span>
                            </div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-[12px] font-semibold text-slate-500 tabular-nums">02</span>
                                <span className="text-[12px] text-slate-300">Geçici Uzaklaştırma</span>
                                <span className="text-[11px] text-slate-600">— 7 gün</span>
                            </div>
                            <div className="flex items-baseline gap-3">
                                <span className="text-[12px] font-semibold text-slate-500 tabular-nums">03</span>
                                <span className="text-[12px] text-slate-300">Kalıcı Kapatma</span>
                                <span className="text-[11px] text-slate-600">— Ağır ihlaller veya 3. uyarı</span>
                            </div>
                        </div>

                        {/* Report (View Mode) */}
                        {mode === 'VIEW' && (
                            <div className="pt-4">
                                <button
                                    onClick={handleReport}
                                    className="w-full py-3 bg-slate-800/40 border border-slate-700/40 text-slate-500 hover:text-white rounded-xl text-[12px] font-medium transition-all"
                                >
                                    İhlal Bildir
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* ── Fixed Footer ── */}
            {mode === 'ONBOARDING' && (
                <div className="flex-shrink-0 px-8 py-5 border-t border-slate-800/30">
                    <label className="flex items-start gap-3 mb-4 cursor-pointer group">
                        <div className="relative flex items-center mt-0.5">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={isAccepted}
                                onChange={(e) => setIsAccepted(e.target.checked)}
                            />
                            <div className="w-[18px] h-[18px] border border-slate-600 rounded peer-checked:bg-gold-500 peer-checked:border-gold-500 transition-all" />
                            <Check size={11} className="absolute left-[3px] text-slate-950 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
                        </div>
                        <span className="text-[12px] text-slate-500 group-hover:text-slate-300 transition-colors select-none leading-relaxed">
                            Topluluk standartlarını okudum, anladım ve uyacağımı kabul ediyorum.
                        </span>
                    </label>

                    <button
                        onClick={handleAccept}
                        disabled={!isAccepted}
                        className={`w-full py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all ${isAccepted
                                ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 hover:scale-[1.01] cursor-pointer shadow-lg shadow-gold-500/15'
                                : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                            }`}
                    >
                        Kabul Et ve Devam Et <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};
