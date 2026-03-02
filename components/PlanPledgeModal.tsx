/**
 * PlanPledgeModal
 *
 * Feature 13: Plan Pledge (simulated)
 * Lets a user commit a symbolic pledge (50–500 TL) to signal reliability.
 * No real payment — amount is a social commitment.
 * Released automatically on checkout; forfeited on no-show.
 */

import React, { useEffect, useState } from 'react';
import { X, Heart, Loader2, CheckCircle2, Info } from 'lucide-react';
import { planPledgeService, PRESET_AMOUNTS } from '../services/planPledgeService';
import { PlanPledge } from '../types';

interface PlanPledgeModalProps {
  planId:     string;
  userId:     string;
  onPledged:  (pledge: PlanPledge) => void;
  onClose:    () => void;
}

export const PlanPledgeModal: React.FC<PlanPledgeModalProps> = ({
  planId,
  userId,
  onPledged,
  onClose,
}) => {
  const [selected, setSelected]       = useState<number>(100);
  const [custom, setCustom]           = useState<string>('');
  const [existing, setExisting]       = useState<PlanPledge | null>(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    planPledgeService.getMyPledge(planId, userId).then((p) => {
      setExisting(p);
      if (p) setSelected(p.amount_tl);
      setLoading(false);
    });
  }, [planId, userId]);

  const amount = custom ? parseInt(custom, 10) : selected;
  const isValid = amount >= 50 && amount <= 500;

  const handleSubmit = async () => {
    if (!isValid) { setError('Tutar 50–500 TL arasında olmalıdır.'); return; }

    setSubmitting(true);
    setError(null);

    const { error: err, pledge } = await planPledgeService.createPledge(planId, userId, amount);

    setSubmitting(false);

    if (err || !pledge) { setError(err ?? 'Pledge oluşturulamadı.'); return; }

    setDone(true);
    onPledged(pledge);
  };

  const statusColor = (s: string) =>
    s === 'released' ? 'text-emerald-400' : s === 'forfeited' ? 'text-red-400' : 'text-amber-400';

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
            <Heart size={16} className="text-rose-400" />
            <span className="text-sm font-bold text-white">Buluşma Taahhüdü</span>
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
        <div className="px-5 py-5 space-y-4">

          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={22} className="text-slate-400 animate-spin" />
            </div>
          )}

          {!loading && done && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-white">Taahhüt oluşturuldu!</p>
              <p className="text-xs text-slate-400">
                ₺{amount} Sağlık Fonu taahhüdünüz kaydedildi.
                Buluşma tamamlandığında otomatik serbest bırakılacak.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
              >
                Kapat
              </button>
            </div>
          )}

          {!loading && !done && existing && (
            <div className="space-y-3">
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mevcut Taahhüt</p>
                <p className="text-xl font-bold text-white">₺{existing.amount_tl}</p>
                <p className={`text-xs font-semibold ${statusColor(existing.status)}`}>
                  {existing.status === 'held'      ? 'Beklemede'         :
                   existing.status === 'released'  ? 'Serbest bırakıldı' :
                   'İptal edildi'}
                </p>
              </div>
              {existing.status === 'held' && (
                <p className="text-xs text-slate-500 text-center">
                  Buluşma tamamlandığında ₺{existing.amount_tl} Sağlık Fonu'na bağışlanacak.
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
              >
                Kapat
              </button>
            </div>
          )}

          {!loading && !done && !existing && (
            <>
              {/* Info note */}
              <div className="flex items-start gap-2 bg-slate-800/30 border border-slate-700/20 rounded-xl px-3 py-2.5">
                <Info size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bu tamamen sembolik bir taahhüttür. Gerçek ödeme yapılmaz.
                  Buluşmayı tamamlarsanız tutar <span className="text-emerald-400 font-semibold">Sağlık Fonu'na</span> sembolik bağış olarak kaydedilir.
                </p>
              </div>

              {/* Preset amounts */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tutar Seç (TL)</p>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => { setSelected(amt); setCustom(''); }}
                      className={`py-2 rounded-xl text-sm font-bold transition-all border ${
                        selected === amt && !custom
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₺</span>
                  <input
                    type="number"
                    min={50}
                    max={500}
                    value={custom}
                    onChange={(e) => { setCustom(e.target.value); }}
                    placeholder="Özel tutar…"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                {custom && !isValid && (
                  <p className="text-xs text-red-400">Tutar 50–500 TL arasında olmalıdır.</p>
                )}
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting || !isValid}
                  className="flex-1 py-2.5 rounded-xl bg-rose-700 text-white text-sm font-bold hover:bg-rose-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting
                    ? <Loader2 size={14} className="animate-spin" />
                    : `₺${isValid ? amount : '—'} Taahhüt Et`
                  }
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
