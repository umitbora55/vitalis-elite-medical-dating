/**
 * QRCheckinModal
 *
 * Feature 3: Partner Venue + QR Check-in
 * Flow: Enter QR token → look up venue → confirm check-in → done
 */

import React, { useState } from 'react';
import { X, QrCode, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { qrCheckinService } from '../services/qrCheckinService';
import { PartnerVenue } from '../types';

interface QRCheckinModalProps {
  userId:       string;
  planId?:      string;
  onClose:      () => void;
  onCheckedIn:  (venue: PartnerVenue) => void;
}

type Step = 'enter' | 'confirm' | 'done';

export const QRCheckinModal: React.FC<QRCheckinModalProps> = ({
  userId,
  planId,
  onClose,
  onCheckedIn,
}) => {
  const [step, setStep]       = useState<Step>('enter');
  const [token, setToken]     = useState('');
  const [venue, setVenue]     = useState<PartnerVenue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleLookup = async () => {
    const t = token.trim();
    if (!t) { setError('Lütfen QR kodunu girin.'); return; }

    setLoading(true);
    setError(null);

    const found = await qrCheckinService.getVenueByToken(t);
    setLoading(false);

    if (!found) {
      setError('Geçersiz QR kodu. Lütfen tekrar deneyin.');
      return;
    }

    setVenue(found);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!venue) return;

    setLoading(true);
    setError(null);

    const { error: err } = await qrCheckinService.checkInToVenue({
      venueId: venue.id,
      userId,
      planId,
      qrToken: token.trim(),
    });

    setLoading(false);

    if (err) { setError(err); return; }

    setStep('done');
    onCheckedIn(venue);
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode size={16} className="text-gold-400" />
            <span className="text-sm font-bold text-white">QR Check-in</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 space-y-4">

          {step === 'enter' && (
            <>
              <p className="text-sm text-slate-400 leading-relaxed">
                Partner mekânın QR kodunu tarayın veya kodu manuel olarak girin.
              </p>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="MEKÂN KODU"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors tracking-widest"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') void handleLookup(); }}
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="button"
                onClick={() => void handleLookup()}
                disabled={loading || !token.trim()}
                className="w-full py-3 rounded-xl bg-gold-500 text-slate-950 text-sm font-bold hover:bg-gold-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Mekânı Bul'}
              </button>
            </>
          )}

          {step === 'confirm' && venue && (
            <>
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gold-400 flex-shrink-0" />
                  <p className="text-sm font-bold text-white">{venue.name}</p>
                </div>
                {venue.address && (
                  <p className="text-xs text-slate-400 pl-5">{venue.address}</p>
                )}
              </div>
              <p className="text-sm text-slate-400">Bu mekâna check-in yapmak istiyor musunuz?</p>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('enter')}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Check-in Yap'}
                </button>
              </div>
            </>
          )}

          {step === 'done' && venue && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
              <p className="text-base font-bold text-white">{venue.name}</p>
              <p className="text-sm text-emerald-400">Check-in başarılı!</p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
              >
                Kapat
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
