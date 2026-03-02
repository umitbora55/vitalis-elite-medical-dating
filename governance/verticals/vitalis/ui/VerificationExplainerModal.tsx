/**
 * VerificationExplainerModal — "Bu Doğrulama Ne Anlama Geliyor?"
 *
 * Shown when user clicks a verification badge.
 * Explains each level with:
 * - What was verified
 * - How it was verified (method)
 * - What it means for trust
 *
 * DSA Art.27 explainability requirement: modal must explain the verification
 * decision criteria and how users can advance to the next level.
 */

import React, { useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ScrollText,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Info,
} from 'lucide-react';

// ─── Level Definitions ────────────────────────────────────────────────────────

interface LevelDefinition {
  level: number;
  title: string;
  description: string;
  method: string;
  tip: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    level: 0,
    title: 'Doğrulanmamış',
    description: 'Henüz herhangi bir doğrulama yapılmamış.',
    method: '—',
    tip: 'E-posta adresini doğrulayarak başla.',
    icon: <ShieldOff size={16} />,
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-800/60',
    borderClass: 'border-slate-700',
  },
  {
    level: 1,
    title: 'E-posta Doğrulandı',
    description: 'E-posta adresin doğrulandı. Temel güven sağlandı.',
    method: 'Bağlantı gönderildi',
    tip: 'Telefon numaranı ekleyerek sonraki seviyeye geç.',
    icon: <Mail size={16} />,
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/8',
    borderClass: 'border-sky-500/30',
  },
  {
    level: 2,
    title: 'Telefon Doğrulandı',
    description: 'Telefon numaran doğrulandı. İkinci faktör güveni eklendi.',
    method: 'SMS kodu',
    tip: 'Kurumsal e-posta veya kurum belgesi ile Lv.3\'e ulaş.',
    icon: <Phone size={16} />,
    colorClass: 'text-sky-300',
    bgClass: 'bg-sky-500/10',
    borderClass: 'border-sky-400/30',
  },
  {
    level: 3,
    title: 'Kurumsal Doğrulandı',
    description: 'Kurumsal e-posta veya kurum belgesi ile doğrulandı. Sağlık kurumuna bağlılık teyit edildi.',
    method: 'Alan adı veya belge',
    tip: 'Diploma, kimlik veya oda kayıt belgesi ile mesleki kimliğini beyan et.',
    icon: <Building2 size={16} />,
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-500/8',
    borderClass: 'border-violet-500/30',
  },
  {
    level: 4,
    title: 'Meslek Beyanı Doğrulandı',
    description: 'Mesleki kimliğin beyan edildi. Diploma, kimlik ya da oda kayıt belgesi gönderildi.',
    method: 'Diploma / ID / oda kayıt belgesi',
    tip: 'Moderatörlerden ruhsat veya lisans onayı al.',
    icon: <Briefcase size={16} />,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/8',
    borderClass: 'border-amber-500/30',
  },
  {
    level: 5,
    title: 'Lisanslı Uzman',
    description: 'Ruhsat veya lisans belgen moderatörler tarafından doğrulandı. En güçlü mesleki güven.',
    method: 'Manuel inceleme',
    tip: 'Canlılık testi (video selfie) ile tam kimlik doğrulamasını tamamla.',
    icon: <ScrollText size={16} />,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/8',
    borderClass: 'border-emerald-500/30',
  },
  {
    level: 6,
    title: 'Kimlik Doğrulandı',
    description: 'Canlılık testi ile yüzün ve kimliğin eşleşti. Tam doğrulama tamamlandı.',
    method: 'Video selfie + AI',
    tip: 'Tebrikler — en yüksek güven seviyesindesin!',
    icon: <ShieldCheck size={16} />,
    colorClass: 'text-emerald-300',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-400/40',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface VerificationExplainerModalProps {
  trustLevel: number;
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationExplainerModal: React.FC<VerificationExplainerModalProps> = ({
  trustLevel,
  isOpen,
  onClose,
}) => {
  const level = Math.min(Math.max(Math.floor(trustLevel), 0), 6);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap & escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const nextLevel = level < 6 ? LEVEL_DEFINITIONS[level + 1] : null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explainer-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[88vh] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h2 id="explainer-title" className="text-sm font-bold text-white">
              Doğrulama Nedir?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {LEVEL_DEFINITIONS.map((def) => {
            const isCurrent = def.level === level;
            const isCompleted = def.level > 0 && def.level <= level;
            const isNext = def.level === level + 1;
            const isFuture = def.level > level + 1;

            return (
              <div
                key={def.level}
                className={`rounded-xl border p-3.5 transition-all ${
                  isCurrent
                    ? `${def.bgClass} ${def.borderClass} ring-1 ring-offset-1 ring-offset-slate-900 ring-current ${def.colorClass}`
                    : isCompleted
                    ? 'bg-slate-800/30 border-slate-700/40'
                    : isNext
                    ? 'bg-slate-800/20 border-slate-700/30 border-dashed'
                    : 'bg-slate-800/10 border-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon + level indicator */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    isCurrent || isCompleted ? def.bgClass : 'bg-slate-800/60'
                  } ${isCurrent || isCompleted ? def.colorClass : 'text-slate-600'}`}>
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 size={14} className="text-slate-400" />
                    ) : (
                      def.icon
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${
                        isCurrent ? def.colorClass : isCompleted ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Lv.{def.level} — {def.title}
                      </span>

                      {isCurrent && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${def.bgClass} ${def.colorClass} border ${def.borderClass}`}>
                          Mevcut Seviye
                        </span>
                      )}

                      {isNext && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40 flex items-center gap-1">
                          Sonraki Adım <ArrowRight size={9} />
                        </span>
                      )}
                    </div>

                    {!isFuture && (
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {def.description}
                      </p>
                    )}

                    {!isFuture && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Yöntem:</span>
                        <span className="text-[10px] text-slate-300 font-medium">{def.method}</span>
                      </div>
                    )}

                    {isCurrent && nextLevel && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <ChevronRight size={11} className="text-slate-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-slate-400 italic">{def.tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer — why Vitalis verifies */}
        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
          <div className="flex items-start gap-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <Info size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-slate-300 mb-0.5">
                Vitalis neden doğrulama yapar?
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Sağlık çalışanları arasında güvenilir bir topluluk kurmak için her profilin
                mesleki kimliğini doğrularız. Bu sayede sahte profilleri engeller, yüksek
                güvenilirlik sağlar ve DSA Madde 27 şeffaflık gerekliliklerini karşılarız.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
