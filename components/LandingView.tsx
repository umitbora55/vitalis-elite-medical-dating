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
            {/* Background Ambience - Agent 6: Premium image treatment */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516549655169-df83a0833860?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-15 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900"></div>
            {/* Subtle gold glow accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold-500/5 blur-[120px] rounded-full"></div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full safe-bottom">

                {/* Logo - Agent 3: Premium styling */}
                <div className="mb-10 animate-fade-in">
                    <div className="w-24 h-24 bg-gradient-to-br from-gold-500 via-gold-400 to-amber-500 rounded-3xl flex items-center justify-center shadow-glow-gold-lg mx-auto mb-5 transform rotate-3">
                        <Activity size={52} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-5xl font-serif font-bold text-white tracking-tight mb-3">
                        VITALIS
                    </h1>
                    <p className="text-gold-400 text-xs font-bold uppercase tracking-[0.25em]">Elite Medical Dating</p>
                </div>

                {/* Value Prop - Agent 1, 3: Better spacing & card design */}
                <div className="card-premium bg-slate-900/60 backdrop-blur-xl border-slate-800/60 p-7 w-full mb-10 animate-slide-up">
                    <h2 className="text-xl font-serif font-semibold text-white mb-7 flex items-center justify-center gap-3">
                        <div className="p-2 bg-gold-500/10 rounded-xl">
                            <Lock size={20} className="text-gold-400" />
                        </div>
                        Exclusive Access
                    </h2>

                    <div className="space-y-5 text-left">
                        {/* Feature 1 - Agent 1: Consistent spacing */}
                        <div className="flex gap-4 items-start">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 flex-shrink-0">
                                <FileCheck size={20} className="text-blue-400" />
                            </div>
                            <div className="pt-0.5">
                                <h3 className="text-white font-semibold text-sm mb-1">Strict Verification</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Registration requires a valid medical license or hospital ID upload.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex gap-4 items-start">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex-shrink-0">
                                <ShieldCheck size={20} className="text-emerald-400" />
                            </div>
                            <div className="pt-0.5">
                                <h3 className="text-white font-semibold text-sm mb-1">Professionals Only</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Exclusively for verified doctors, specialists, and residents.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge - Agent 3 */}
                    <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
                        <p className="text-caption text-slate-500 uppercase tracking-widest mb-3">Status</p>
                        <div className="badge badge-success inline-flex">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span>Accepting Applications</span>
                        </div>
                    </div>
                </div>

                {/* CTA - Agent 4: Premium buttons */}
                <div className="w-full space-y-4 animate-fade-in">
                    <button
                        onClick={onEnter}
                        className="btn-primary w-full py-4 text-lg group"
                    >
                        Apply Now
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
                    </button>
                    {onLogin && (
                        <button
                            onClick={onLogin}
                            className="btn-secondary w-full bg-transparent border-slate-700 hover:border-gold-500/50 hover:bg-slate-800/50"
                        >
                            Sign In
                        </button>
                    )}

                    {onDevBypass && (
                        <button
                            onClick={onDevBypass}
                            className="btn-ghost w-full text-slate-500 hover:text-emerald-400 mt-2"
                        >
                            Skip to App
                        </button>
                    )}

                    <p className="text-caption text-slate-500 max-w-xs mx-auto leading-relaxed pt-2">
                        By applying, you confirm that you hold a valid medical qualification. Unverified accounts will be suspended.
                    </p>
                </div>

            </div>
        </div>
    );
};
