import React, { useState } from 'react';
import { Mail, Lock, ChevronLeft, Loader2, Eye, EyeOff, Clock, CheckCircle2, Circle, Crown, ShieldCheck, ArrowRight } from 'lucide-react';
import { signInWithEmail, signInWithOAuth } from '../services/authService';
import { getMyProfile } from '../services/profileService';

interface LoginViewProps {
  onBack: () => void;
  onSuccess: () => void;
}

/* ── Inline SVG Icons ── */
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

export const LoginView: React.FC<LoginViewProps> = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Pending verification state
  const [showPendingOverlay, setShowPendingOverlay] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const { error } = await signInWithEmail(email, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(normalizeLoginError(error.message));
      return;
    }

    // After successful auth, check if user is pending verification
    const profileResult = await getMyProfile();
    if (profileResult.data) {
      const userStatus = (profileResult.data as Record<string, unknown>).user_status as string | undefined;
      if (userStatus === 'pending_verification') {
        // Show premium overlay, then route after a moment
        setShowPendingOverlay(true);
        return;
      }
    }

    onSuccess();
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void handleSubmit();
  };

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

  const hasError = Boolean(errorMessage);

  // ── Premium Pending Verification Overlay ──────────────────────────────────
  if (showPendingOverlay) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background ambience */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full animate-fade-in">
          {/* Animated Shield Icon */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-amber-900/20 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <ShieldCheck size={44} className="text-amber-400 animate-pulse" />
            </div>

            <h1 className="text-3xl font-serif font-bold text-white mb-3 tracking-tight">
              Hesabınız İnceleniyor
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              Başvurunuz ekibimiz tarafından değerlendiriliyor. Bu süreç genellikle <span className="text-amber-400 font-semibold">24 saat</span> içinde tamamlanır.
            </p>
          </div>

          {/* Premium Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
            {/* Progress Steps */}
            <div className="space-y-3 mb-6">
              {[
                { label: 'Kayıt tamamlandı', done: true },
                { label: 'Belgeler yüklendi', done: true },
                { label: 'Admin onayı bekleniyor', done: false, active: true },
                { label: 'Hesap aktifleştirme', done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.done ? (
                    <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                  ) : step.active ? (
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/60 flex items-center justify-center flex-shrink-0">
                      <Clock size={12} className="text-amber-400" />
                    </div>
                  ) : (
                    <Circle size={20} className="text-slate-700 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${step.done
                      ? 'text-slate-300'
                      : step.active
                        ? 'text-amber-400 font-medium'
                        : 'text-slate-600'
                    }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Info Box */}
            <div className="bg-slate-800/50 rounded-xl p-3.5 mb-5 border border-slate-700/50">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-400 text-xs leading-relaxed">
                  Onaylandığınızda kayıtlı e-posta adresinize ve push bildirimi ile bilgilendirileceksiniz.
                </p>
              </div>
            </div>

            {/* Premium Upsell */}
            <div className="border-t border-slate-800 pt-5 text-center">
              <p className="text-slate-500 text-xs mb-3.5">
                Premium üyeler öncelikli incelenir
              </p>
              <button
                onClick={onSuccess}
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg hover:brightness-110 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all active:scale-95"
              >
                <Crown size={16} fill="currentColor" />
                Premium'a Geç
              </button>
            </div>

            {/* Continue anyway link */}
            <button
              onClick={onSuccess}
              className="w-full mt-5 flex items-center justify-center gap-2 text-slate-500 text-xs hover:text-slate-300 transition-colors group"
            >
              Devam Et
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Login View ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gold-500/5 blur-[100px] rounded-full"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Go back to landing page"
          className="btn-ghost mb-8 -ml-2 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-gold-500 rounded-lg"
        >
          <ChevronLeft size={20} strokeWidth={2} /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif font-bold text-white mb-3 tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-base">Sign in to continue.</p>
        </div>

        {/* Form */}
        <form className="space-y-5" onSubmit={handleFormSubmit}>
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                id="login-email"
                type="email"
                inputMode="email"
                placeholder="jane@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={hasError}
                aria-describedby={hasError ? 'login-error' : undefined}
                className="input-premium pl-12"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={hasError}
                aria-describedby={hasError ? 'login-error' : undefined}
                className="input-premium pl-12 pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded-lg"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p id="login-error" className="text-sm text-red-400 font-medium" role="alert">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!email || !password || isSubmitting}
            className="btn-primary w-full mt-6 py-4 text-lg"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* ── Social Auth Divider ── */}
        <div className="flex items-center gap-4 py-5">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">or continue with</span>
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
      </div>
    </div>
  );
};

const normalizeLoginError = (rawMessage: string): string => {
  const lower = rawMessage.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Email veya şifre hatalı.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.';
  }
  if (lower.includes('rate') || lower.includes('too many')) {
    return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.';
  }
  return 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.';
};

