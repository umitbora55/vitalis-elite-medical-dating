/**
 * VouchRequestModal
 *
 * Feature 7: Peer Vouch
 * Allows a user to vouch for a colleague.
 * Relationship picker + 20-char minimum message.
 */

import React, { useState } from 'react';
import { X, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { vouchService } from '../services/vouchService';
import { VouchRelationship } from '../types';

interface VouchRequestModalProps {
  currentUserId: string;
  targetUserId:  string;
  targetName:    string;
  onClose:       () => void;
  onSuccess?:    () => void;
}

const RELATIONSHIPS: { value: VouchRelationship; label: string }[] = [
  { value: 'colleague',  label: 'Meslektaş'   },
  { value: 'coworker',   label: 'İş Arkadaşı' },
  { value: 'classmate',  label: 'Sınıf Arkadaşı' },
  { value: 'mentor',     label: 'Mentor / Öğrenci' },
  { value: 'other',      label: 'Diğer'        },
];

export const VouchRequestModal: React.FC<VouchRequestModalProps> = ({
  currentUserId,
  targetUserId,
  targetName,
  onClose,
  onSuccess,
}) => {
  const [relationship, setRelationship] = useState<VouchRelationship | null>(null);
  const [message, setMessage]           = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [done, setDone]                 = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const charsLeft = Math.max(0, 20 - message.trim().length);

  const handleSubmit = async () => {
    if (!relationship)             { setError('Lütfen bir ilişki türü seçin.'); return; }
    if (message.trim().length < 20) { setError('Mesaj en az 20 karakter olmalıdır.'); return; }

    setSubmitting(true);
    setError(null);

    const { error: err } = await vouchService.requestVouch({
      voucherId:    currentUserId,
      voucheeId:    targetUserId,
      relationship,
      message:      message.trim(),
    });

    setSubmitting(false);
    if (err) { setError(err); return; }

    setDone(true);
    onSuccess?.();
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
            <Users size={16} className="text-purple-400" />
            <span className="text-sm font-bold text-white">Meslektaş Referansı Ver</span>
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

          {done ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 size={40} className="text-purple-400 mx-auto" />
              <p className="text-sm font-bold text-white">Referans gönderildi!</p>
              <p className="text-xs text-slate-400">
                {targetName} onayladığında profil rozeti güncellenir.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
              >
                Kapat
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                <span className="text-white font-semibold">{targetName}</span> için mesleki referans veriyorsunuz.
              </p>

              {/* Relationship picker */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">İlişki Türü *</p>
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIPS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRelationship(r.value)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        relationship === r.value
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mesaj *</p>
                  {charsLeft > 0 && (
                    <span className="text-[10px] text-slate-500">{charsLeft} karakter daha</span>
                  )}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Bu kişiyle profesyonel çalışmanızı açıklayın…"
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
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
                  disabled={submitting || !relationship || message.trim().length < 20}
                  className="flex-1 py-2.5 rounded-xl bg-purple-700 text-white text-sm font-bold hover:bg-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Referans Gönder'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
