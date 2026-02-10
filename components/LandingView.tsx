import React from 'react';
import { Activity, ShieldCheck, FileCheck, Lock, ChevronRight } from 'lucide-react';

interface LandingViewProps {
    onEnter: () => void;
    onLogin?: () => void;
    onDevBypass?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onEnter, onLogin, onDevBypass }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-y-auto">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516549655169-df83a0833860?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-900"></div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full">

                {/* Logo */}
                <div className="mb-8 animate-fade-in">
                    <div className="w-20 h-20 bg-gradient-to-tr from-gold-600 to-gold-400 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] mx-auto mb-4">
                        <Activity size={48} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100 tracking-wide mb-2">
                        VITALIS
                    </h1>
                    <p className="text-gold-500 text-xs font-bold uppercase tracking-[0.2em]">Elite Medical Dating</p>
                </div>

                {/* Value Prop */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 w-full shadow-2xl mb-8 animate-slide-up">
                    <h2 className="text-xl font-serif text-white mb-6 flex items-center justify-center gap-2">
                        <Lock size={20} className="text-gold-500" />
                        Exclusive Access
                    </h2>

                    <div className="space-y-6 text-left">
                        <div className="flex gap-4">
                            <div className="mt-1 bg-slate-800 p-2 rounded-full h-fit">
                                <FileCheck size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-slate-200 font-bold text-sm">Strict Verification</h3>
                                <p className="text-slate-500 text-xs leading-relaxed mt-1">
                                    Registration requires a valid medical license or hospital ID upload.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="mt-1 bg-slate-800 p-2 rounded-full h-fit">
                                <ShieldCheck size={20} className="text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-slate-200 font-bold text-sm">Professionals Only</h3>
                                <p className="text-slate-500 text-xs leading-relaxed mt-1">
                                    This platform is exclusively for verified doctors, specialists, and residents.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Status</p>
                        <div className="inline-flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-green-500 text-xs font-bold">Accepting Applications</span>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="w-full space-y-3 animate-fade-in delay-200">
                    <button
                        onClick={onEnter}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 group"
                    >
                        Apply Now
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    {onLogin && (
                        <button
                            onClick={onLogin}
                            className="w-full py-3 rounded-xl border border-slate-800 text-slate-200 text-sm font-semibold hover:border-gold-500/40 hover:text-white transition-colors"
                        >
                            Sign In
                        </button>
                    )}

                    {onDevBypass && (
                        <button
                            onClick={onDevBypass}
                            className="mt-2 text-xs text-slate-600 hover:text-green-500 border border-transparent hover:border-green-500/30 px-4 py-2 rounded transition-colors"
                        >
                            [DEV: Skip to App]
                        </button>
                    )}

                    <p className="text-[10px] text-slate-600 max-w-xs mx-auto leading-relaxed">
                        By applying, you confirm that you hold a valid medical qualification. Unverified accounts will be suspended.
                    </p>
                </div>

            </div>
        </div>
    );
};
