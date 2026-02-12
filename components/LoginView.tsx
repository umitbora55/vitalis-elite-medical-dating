import React, { useState } from 'react';
import { Mail, Lock, ChevronLeft, Loader2 } from 'lucide-react';
import { signInWithEmail } from '../services/authService';

interface LoginViewProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const { error } = await signInWithEmail(email, password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(normalizeLoginError(error.message));
      return;
    }

    onSuccess();
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void handleSubmit();
  };

  const hasError = Boolean(errorMessage);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gold-500/5 blur-[100px] rounded-full"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Back button - Agent 4 */}
        <button onClick={onBack} className="btn-ghost mb-8 -ml-2 text-slate-400 hover:text-white">
          <ChevronLeft size={20} strokeWidth={2} /> Back
        </button>

        {/* Header - Agent 2 */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-serif font-bold text-white mb-3 tracking-tight">Welcome Back</h2>
          <p className="text-slate-400 text-base">Sign in to continue.</p>
        </div>

        {/* Form - Agent 5: Premium inputs */}
        <form className="space-y-5" onSubmit={handleFormSubmit}>
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                id="login-email"
                type="email"
                placeholder="jane@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={hasError}
                aria-describedby={hasError ? 'login-error' : undefined}
                className="input-premium pl-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={hasError}
                aria-describedby={hasError ? 'login-error' : undefined}
                className="input-premium pl-12"
              />
            </div>
          </div>

          {/* Error message - Agent 5 */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p id="login-error" className="text-sm text-red-400 font-medium" role="alert">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Submit button - Agent 4 */}
          <button
            type="submit"
            disabled={!email || !password || isSubmitting}
            className="btn-primary w-full mt-6 py-4 text-lg"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
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
