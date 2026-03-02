import React, { useState } from 'react';
import { inviteService } from '../services/inviteService';
import { Loader2, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface WaitlistScreenProps {
  onInviteValidated: (code: string, ownerId?: string) => void;
}

type Mode = 'invite' | 'waitlist';

export const WaitlistScreen: React.FC<WaitlistScreenProps> = ({ onInviteValidated }) => {
  const [mode, setMode] = useState<Mode>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const result = await inviteService.validateInviteCode(inviteCode.trim());
      if (result.valid) {
        onInviteValidated(inviteCode.trim().toUpperCase(), result.ownerId);
      } else {
        setError(result.error || 'Geçersiz davet kodu.');
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setError(null);
    setLoading(true);

    try {
      await inviteService.joinWaitlist(waitlistEmail.trim(), referralCode || undefined);
      setWaitlistSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (waitlistSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="max-w-sm w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 rounded-full bg-emerald-900/30 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-serif text-white mb-3">Bekleme Listesine Eklendiniz!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Davet aldığınızda <span className="text-gold-400 font-semibold">{waitlistEmail}</span> adresinize bildirim göndereceğiz.
          </p>
          <button
            onClick={() => { setMode('invite'); setWaitlistSuccess(false); }}
            className="mt-6 text-slate-500 text-xs hover:text-slate-300 underline transition-colors"
          >
            Davet kodum var
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <BrandLogo size={80} className="mx-auto mb-5 shadow-[0_0_40px_rgba(234,179,8,0.2)]" />
          <h1 className="text-3xl font-serif text-white mb-2">Vitalis</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Sağlık Profesyonellerinin<br />Buluşma Noktası
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          {mode === 'invite' ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                  <ShieldCheck size={12} />
                  Sadece Davet ile Katılım
                </div>
                <h2 className="text-lg font-semibold text-white">Davet Kodunu Gir</h2>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => {
                      // Normalize input: uppercase and handle Turkish characters immediately
                      const val = e.target.value.toUpperCase().replace(/İ/g, 'I');
                      setInviteCode(val);
                      setError(null);
                    }}
                    placeholder="XXXX-XXXX"
                    maxLength={12}
                    className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-center text-lg font-mono tracking-widest focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {error && (
                    <p className="mt-2 text-red-400 text-xs text-center animate-fade-in">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !inviteCode.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      Devam Et
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <p className="text-slate-500 text-xs mb-2">Davet kodun yok mu?</p>
                <button
                  onClick={() => { setMode('waitlist'); setError(null); }}
                  className="text-gold-400 text-sm font-semibold hover:text-gold-300 transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <Clock size={14} />
                  Bekleme Listesine Katıl
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                  <Clock size={24} className="text-gold-400" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-1">Bekleme Listesi</h2>
                <p className="text-slate-500 text-xs">Davet hazır olduğunda bildirim alacaksınız</p>
              </div>

              <form onSubmit={handleWaitlistSubmit} className="space-y-3">
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => { setWaitlistEmail(e.target.value); setError(null); }}
                  placeholder="E-posta adresiniz"
                  required
                  className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all"
                />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Referans kodu (isteğe bağlı)"
                  className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all"
                />

                {error && (
                  <p className="text-red-400 text-xs text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !waitlistEmail.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Listeye Katıl'}
                </button>
              </form>

              <button
                onClick={() => { setMode('invite'); setError(null); }}
                className="mt-4 w-full text-slate-500 text-xs hover:text-slate-300 transition-colors text-center"
              >
                ← Davet koduma dön
              </button>
            </>
          )}
        </div>
      </div>


    </div>
  );
};
