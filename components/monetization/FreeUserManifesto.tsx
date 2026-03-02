/**
 * FreeUserManifesto — Özellik 6: Etik Monetizasyon
 *
 * "Sözümüz" (Our Promise) card that is shown to new users
 * and accessible from the profile settings.
 *
 * Communicates the ethical monetization pledge:
 *   ✓ Seeing people = FREE
 *   ✓ Matching = FREE
 *   ✓ Messaging = FREE
 *   ✓ Date planning = FREE
 *   ✓ All security = FREE
 *   Premium = only extra convenience & services
 */

import React, { useState } from 'react';
import { HandshakeIcon, Check, ChevronDown, ChevronUp, X } from 'lucide-react';

export interface FreeUserManifestoProps {
  /** Compact chip-like display for embedding in settings screens */
  variant?: 'card' | 'compact' | 'modal';
  /** When variant="modal" or the user taps the compact chip */
  onClose?: () => void;
  /** Show close button (for modal use) */
  showClose?: boolean;
}

const FREE_PROMISES = [
  { label: 'İnsanları görmek', detail: 'Günlük 7 kişilik öneriniz her zaman ücretsizdir.' },
  { label: 'Eşleşme',          detail: 'Karşılıklı beğeni olduktan sonra match ücretsiz.' },
  { label: 'Mesajlaşma',       detail: 'Sınırsız mesaj — gönderme ve alma tamamen ücretsiz.' },
  { label: 'Date planlama',    detail: 'Davet, müsaitlik ve mekan önerisini herkes kullanır.' },
  { label: 'Tüm güvenlik',     detail: 'Konum gizliliği, taciz filtreleri, SOS — hepsi ücretsiz.' },
];

const NEVER_SELLS = [
  'İnsanlara erişim için ücret',
  '"Seni kim beğendi" görmek için ücret',
  'Daha fazla beğeni için ücret',
  'Görünürlük için ücret',
  'Mesaj atmak için ücret',
  'Güvenlik özellikleri için ücret',
];

// ── Component ──────────────────────────────────────────────────────────────────

export const FreeUserManifesto: React.FC<FreeUserManifestoProps> = ({
  variant   = 'card',
  onClose,
  showClose = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  // ── Compact chip ───────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <button
        onClick={onClose}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-left hover:bg-emerald-500/12 transition-colors"
      >
        <HandshakeIcon size={14} className="text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-400">Eşleşme ve mesajlaşma sonsuza kadar ücretsiz</p>
          <p className="text-[10px] text-slate-500 truncate">Premium = sadece ekstra kolaylık</p>
        </div>
        <ChevronDown size={12} className="text-slate-500 flex-shrink-0" />
      </button>
    );
  }

  // ── Card / Modal ───────────────────────────────────────────────────────────
  return (
    <div className={`${variant === 'modal' ? 'fixed inset-0 z-[300] flex items-end sm:items-center justify-center px-4 pb-4' : ''}`}>
      {/* Modal scrim */}
      {variant === 'modal' && (
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden
          ${variant === 'modal' ? 'w-full max-w-sm shadow-2xl animate-slide-up' : ''}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-emerald-500/8 to-transparent border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                <HandshakeIcon size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sözümüz</h3>
                <p className="text-xs text-slate-400">Vitalis'ten size</p>
              </div>
            </div>
            {showClose && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Free promises */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Sonsuza Kadar Ücretsiz
          </p>
          <div className="space-y-2">
            {FREE_PROMISES.map((item, i) => (
              <button
                key={i}
                onClick={() => setExpanded(expanded === true ? false : true)}
                className="w-full flex items-start gap-2.5 text-left group"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{item.detail}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Never sells section — expandable */}
        <div className="px-5 pb-5">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Asla satmayacağımız şeyler
          </button>

          {expanded && (
            <div className="mt-2.5 space-y-1.5 animate-fade-in">
              {NEVER_SELLS.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="text-red-400 font-bold">✗</span>
                  <span>{item}</span>
                </div>
              ))}

              <p className="mt-3 text-[10px] text-slate-600 leading-relaxed border-t border-slate-800 pt-3">
                Premium özellikler <span className="text-slate-400">ekstra kolaylık ve hizmetler</span> içindir.
                Uygulama sizi eşleştirmek ister — çünkü mutlu kullanıcı = premium hizmet alan kullanıcı.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
