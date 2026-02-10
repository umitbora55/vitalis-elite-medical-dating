import React, { useState } from 'react';
import { Mail, Lock, ChevronLeft, Loader2 } from 'lucide-react';
import { signInWithEmail } from '../services/authService';

interface LoginViewProps {
  onBack: () => void;
  onSuccess: (email: string) => void;
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
      setErrorMessage(error.message);
      return;
    }

    onSuccess(email);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="mb-6 text-slate-500 hover:text-white flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-sm">Sign in to continue.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input
                type="email"
                placeholder="jane@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!email || !password || isSubmitting}
          className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
        </button>
      </div>
    </div>
  );
};
