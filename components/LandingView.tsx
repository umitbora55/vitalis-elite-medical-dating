import React, { useState } from 'react';
import { Activity, ShieldCheck, FileCheck, Lock, ChevronRight, Mail, Loader2 } from 'lucide-react';
import { signInWithOAuth } from '../services/authService';

// AUDIT-FIX: FE-001 — Removed onDevBypass prop for security hardening
interface LandingViewProps {
    onEnter: () => void;
    onLogin?: () => void;
}

/* ── Inline SVG Icons (no external deps) ── */
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const AppleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
);

export const LandingView: React.FC<LandingViewProps> = ({ onEnter, onLogin }) => {
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);

    const handleOAuth = async (provider: 'google' | 'apple') => {
        setOauthLoading(provider);
        try {
            await signInWithOAuth(provider);
        } catch {
            // OAuth opens a redirect; errors are rare
        } finally {
            setOauthLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden">
            {/* Background Ambience - Agent 6: Premium image treatment */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516549655169-df83a0833860?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-15 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900"></div>
            {/* Subtle gold glow accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gold-500/5 blur-[120px] rounded-full"></div>

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full safe-bottom">

                {/* Logo - Agent 3: Premium styling */}
                <div className="mb-5 animate-fade-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-gold-500 via-gold-400 to-amber-500 rounded-3xl flex items-center justify-center shadow-glow-gold-lg mx-auto mb-4 transform rotate-3">
                        <Activity size={44} className="text-white" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-4xl font-serif font-bold text-white tracking-tight mb-2">
                        VITALIS
                    </h1>
                    <p className="text-gold-400 text-xs font-bold uppercase tracking-[0.25em]">Medical Dating</p>
                </div>

                {/* Value Prop - Agent 1, 3: Premium features card */}
                <div className="card-premium bg-slate-900/40 backdrop-blur-2xl border-white/5 p-6 w-full mb-5 animate-slide-up shadow-2xl">
                    <h2 className="text-lg font-serif font-bold text-white mb-6 flex items-center justify-center gap-3 tracking-wide">
                        <div className="p-2 bg-gradient-to-br from-gold-500/20 to-gold-600/10 rounded-xl border border-gold-500/20 shadow-glow-gold">
                            <Lock size={18} className="text-gold-400" />
                        </div>
                        Exclusive Access
                    </h2>

                    <div className="space-y-6 text-left">
                        {/* Feature 1 */}
                        <div className="flex gap-4 items-start group">
                            <div className="p-2.5 bg-slate-800/50 rounded-xl border border-white/10 flex-shrink-0 transition-colors group-hover:border-gold-500/40 group-hover:bg-gold-500/5">
                                <FileCheck size={20} className="text-gold-400 opacity-80 group-hover:opacity-100" />
                            </div>
                            <div className="pt-0.5">
                                <h3 className="text-white font-bold text-sm mb-1 tracking-tight">Strict Verification</h3>
                                <p className="text-slate-400 text-xs leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                                    Registration requires a valid medical license or hospital ID upload.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex gap-4 items-start group">
                            <div className="p-2.5 bg-slate-800/50 rounded-xl border border-white/10 flex-shrink-0 transition-colors group-hover:border-gold-500/40 group-hover:bg-gold-500/5">
                                <ShieldCheck size={20} className="text-gold-400 opacity-80 group-hover:opacity-100" />
                            </div>
                            <div className="pt-0.5">
                                <h3 className="text-white font-bold text-sm mb-1 tracking-tight">Professionals Only</h3>
                                <p className="text-slate-400 text-xs leading-relaxed opacity-90 group-hover:opacity-100 transition-opacity">
                                    Exclusively for verified doctors, specialists, and residents.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* CTA - Premium buttons */}
                <div className="w-full space-y-3 animate-fade-in">
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
                            <Mail size={18} className="opacity-70" />
                            Sign In with Email
                        </button>
                    )}

                    {/* ── Social Auth Divider ── */}
                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">or continue with</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                    </div>

                    {/* ── Social Auth Buttons ── */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {/* Google */}
                        <button
                            onClick={() => void handleOAuth('google')}
                            disabled={!!oauthLoading}
                            className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-white text-slate-800 font-semibold text-sm border border-slate-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {oauthLoading === 'google' ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                            Google
                        </button>

                        {/* Apple */}
                        <button
                            onClick={() => void handleOAuth('apple')}
                            disabled={!!oauthLoading}
                            className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-black text-white font-semibold text-sm border border-slate-700 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {oauthLoading === 'apple' ? <Loader2 size={18} className="animate-spin" /> : <AppleIcon />}
                            Apple
                        </button>
                    </div>

                    {/* Disclaimer */}
                    <div className="pt-3 mt-1 border-t border-slate-800/40">
                        <p className="text-caption text-slate-400 max-w-[280px] mx-auto leading-relaxed text-balance opacity-80">
                            By applying, you confirm that you hold a valid medical qualification. Unverified accounts will be suspended.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
