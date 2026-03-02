/**
 * SlateExplanationTooltip — Feature 8: Privacy-First AI
 *
 * "Bu kişi neden önerildi?" tooltip for daily slate recommendations.
 * DSA Article 27: Recommender system transparency.
 * GDPR Article 22: Automated decision-making explanation.
 *
 * Triggered by a small "?" or "Bot" icon on the profile card.
 * Shows the 3-5 main factors that determined this profile's ranking.
 * Does NOT show: raw scores, other users' data, PII.
 *
 * Factor explanations come from the explanationService (rule-based, local).
 */

import React, { useState } from 'react';
import {
  Bot,
  X,
  MapPin,
  Clock,
  Star,
  Stethoscope,
  Heart,
  Briefcase,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { SlateExplanationFactor } from '../../types';

// ── Factor icon map ──────────────────────────────────────────────────────────

function factorIcon(labelTr: string): React.ReactNode {
  const l = labelTr.toLowerCase();
  if (l.includes('mesafe') || l.includes('konum')) return <MapPin size={12} />;
  if (l.includes('program') || l.includes('çalışma') || l.includes('saat')) return <Clock size={12} />;
  if (l.includes('uzmanlık') || l.includes('branş')) return <Stethoscope size={12} />;
  if (l.includes('ilgi') || l.includes('hobi')) return <Heart size={12} />;
  if (l.includes('unvan') || l.includes('kariyer') || l.includes('kıdem')) return <Briefcase size={12} />;
  if (l.includes('doğrulama') || l.includes('güven')) return <ShieldCheck size={12} />;
  if (l.includes('aktif') || l.includes('yeni')) return <TrendingUp size={12} />;
  return <Star size={12} />;
}

// ── Explanation builder ─────────────────────────────────────────────────────

/**
 * Build explanation factors from MatchExplanationItems (Feature 2 output).
 * This bridges the existing explanation system with the AI transparency layer.
 */
export function buildSlateFactors(
  matchItems: Array<{ factor_key: string; label_tr: string; value_tr: string; weight: number }>,
): SlateExplanationFactor[] {
  // Sort by weight desc, take top 5
  return matchItems
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((item) => ({
      label_tr: item.label_tr,
      weight: item.weight,
      value_tr: item.value_tr,
    }));
}

// ── Weight bar ───────────────────────────────────────────────────────────────

interface WeightBarProps {
  pct: number; // 0-100
}
const WeightBar: React.FC<WeightBarProps> = ({ pct }) => (
  <div className="h-1 bg-slate-700 rounded-full overflow-hidden flex-1">
    <div
      className="h-full bg-violet-500 rounded-full transition-all"
      style={{ width: `${Math.min(pct, 100)}%` }}
    />
  </div>
);

// ── Main tooltip sheet ───────────────────────────────────────────────────────

export interface SlateExplanationTooltipProps {
  /** Profile display name (first name only) */
  profileFirstName: string;
  /** Explanation factors — build with buildSlateFactors() or pass directly */
  factors: SlateExplanationFactor[];
  /** Whether slate recommendation AI is enabled for this user */
  aiEnabled?: boolean;
  /** Called when user wants to manage AI settings */
  onOpenAISettings?: () => void;
  className?: string;
}

export const SlateExplanationTooltip: React.FC<SlateExplanationTooltipProps> = ({
  profileFirstName,
  factors,
  aiEnabled = true,
  onOpenAISettings,
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  // Normalize weights to 0-100 for display
  const maxWeight = Math.max(...factors.map((f) => f.weight), 0.01);
  const normalized = factors.map((f) => ({
    ...f,
    pct: Math.round((f.weight / maxWeight) * 100),
  }));

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors font-medium ${className}`}
        aria-label="Bu profil neden önerildi?"
      >
        <Bot size={11} />
        <span>Neden önerildi?</span>
      </button>

      {/* Bottom sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Sheet */}
          <div className="relative w-full sm:max-w-sm mx-auto bg-slate-900 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                  <Bot size={14} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {profileFirstName} neden önerildi?
                  </p>
                  <p className="text-[10px] text-slate-500">Günlük öneri algoritması açıklaması</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Kapat"
              >
                <X size={14} />
              </button>
            </div>

            {/* AI disabled state */}
            {!aiEnabled ? (
              <div className="px-4 py-3 bg-slate-800/50 border border-slate-700/30 rounded-xl text-center space-y-2">
                <RefreshCw size={20} className="mx-auto text-slate-600" />
                <p className="text-xs text-slate-400">
                  Günlük öneri AI'yi devre dışı bıraktınız. Öneriler yalnızca temel filtrelerinize (yaş, konum) göre yapılmaktadır.
                </p>
                {onOpenAISettings && (
                  <button
                    onClick={() => { setOpen(false); onOpenAISettings(); }}
                    className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold"
                  >
                    AI tercihlerini yönet →
                  </button>
                )}
              </div>
            ) : factors.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Bu öneri için açıklama verisi mevcut değil.
              </p>
            ) : (
              <>
                {/* Factor list */}
                <div className="space-y-3">
                  {normalized.map((factor, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/40 flex items-center justify-center flex-shrink-0 text-violet-400">
                        {factorIcon(factor.label_tr)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-200">{factor.label_tr}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{factor.value_tr}</p>
                        </div>
                        <WeightBar pct={factor.pct} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* How ranking works */}
                <div className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/30 rounded-xl space-y-1">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Sıralama nasıl çalışır?</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Öneriler, randevu olasılığı, müsaitlik uyumu, doğrulama durumu ve
                    tazelik skorlarının ağırlıklı ortalamasına göre hesaplanır.
                    Hiçbir fiziksel özellik veya geçmiş davranış ifşa edilmez.
                  </p>
                </div>

                {/* GDPR note */}
                <p className="text-[9px] text-slate-600 text-center">
                  DSA Madde 27 · Öneri sistemi şeffaflığı
                </p>
              </>
            )}

            {/* Settings link */}
            {onOpenAISettings && aiEnabled && (
              <button
                onClick={() => { setOpen(false); onOpenAISettings(); }}
                className="w-full text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
              >
                AI tercihlerimi değiştir →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SlateExplanationTooltip;
