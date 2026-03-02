/**
 * VITALIS "Neden Eşleştik" UI Components
 *
 * 1. MatchExplanationChips   — Profil kartı altında 2-3 chip gösterimi
 * 2. MatchExplanationSheet   — "Daha fazla göster" bottom sheet
 * 3. ExplanationFeedbackRow  — Her açıklama için 👍/👎 butonları
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Settings2, X, ExternalLink } from 'lucide-react';
import {
  generateExplanations,
  submitFactorFeedback,
} from '../services/explanationService';
import type { ExplanationResult, MatchExplanation, FactorKey } from '../services/explanationService';
import { Profile } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChipsProps {
  currentUser: Profile | undefined;
  targetProfile: Profile;
  onOpenSheet?: () => void;
  className?: string;
}

interface SheetProps {
  currentUser: Profile | undefined;
  targetProfile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

interface FeedbackRowProps {
  explanation: MatchExplanation;
  matchId?: string;
  onFeedback?: (factorKey: FactorKey, type: 'more_like_this' | 'less_like_this') => void;
}

// ── Explanation Chip (single) ─────────────────────────────────────────────────

const ExplanationChip: React.FC<{ explanation: MatchExplanation; compact?: boolean }> = ({
  explanation,
  compact = false,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 4, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className={`inline-flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-md border border-slate-700/50 rounded-full ${
      compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
    }`}
  >
    <span className={compact ? 'text-sm' : 'text-base'}>{explanation.icon}</span>
    <span className={`text-white/90 font-medium truncate max-w-[140px] ${compact ? 'text-[10px]' : 'text-xs'}`}>
      {explanation.text}
    </span>
  </motion.div>
);

// ── Explanation Chips Strip (on ProfileCard) ──────────────────────────────────

export const MatchExplanationChips: React.FC<ChipsProps> = ({
  currentUser,
  targetProfile,
  onOpenSheet,
  className = '',
}) => {
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!currentUser || loadedRef.current) return;
    loadedRef.current = true;

    void generateExplanations(currentUser, targetProfile, true).then(setResult);
  }, [currentUser, targetProfile]);

  if (!result || result.topReasons.length === 0) return null;

  const shown = isExpanded ? result.topReasons : result.topReasons.slice(0, 2);
  const hasMore = result.allReasons.length > result.topReasons.length;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((r) => (
          <ExplanationChip key={r.id} explanation={r} compact />
        ))}

        {/* Expand / Sheet button */}
        {(result.topReasons.length > 2 || hasMore) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasMore && onOpenSheet) {
                onOpenSheet();
              } else {
                setIsExpanded(v => !v);
              }
            }}
            className="inline-flex items-center gap-1 bg-slate-800/60 backdrop-blur-md border border-slate-700/40 rounded-full px-2 py-1 text-[10px] text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {isExpanded
              ? <><ChevronUp className="w-3 h-3" /> Daha az</>
              : <><ChevronDown className="w-3 h-3" /> {hasMore ? 'Daha fazla' : 'Tümünü gör'}</>
            }
          </button>
        )}
      </div>

      {/* "Neden eşleştik?" label */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenSheet?.(); }}
        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-400 transition-colors w-fit"
      >
        <span>Neden önerildi?</span>
        <ExternalLink className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

// ── Feedback Row ──────────────────────────────────────────────────────────────

const ExplanationFeedbackRow: React.FC<FeedbackRowProps> = ({ explanation, matchId, onFeedback }) => {
  const [sent, setSent] = useState<'more' | 'less' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (type: 'more_like_this' | 'less_like_this') => {
    if (sent || loading) return;
    setLoading(true);
    const { error } = await submitFactorFeedback(explanation.factorKey, type, matchId);
    setLoading(false);
    if (!error) {
      setSent(type === 'more_like_this' ? 'more' : 'less');
      onFeedback?.(explanation.factorKey, type);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <button
        onClick={() => void handleFeedback('more_like_this')}
        disabled={sent !== null || loading}
        aria-label="Daha fazla bunun gibi"
        className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-all ${
          sent === 'more'
            ? 'border-emerald-500/50 bg-emerald-900/30 text-emerald-400'
            : 'border-slate-700/50 text-slate-500 hover:border-emerald-500/40 hover:text-emerald-400'
        } disabled:opacity-50`}
      >
        <ThumbsUp className="w-3 h-3" />
        <span>Daha fazla</span>
      </button>
      <button
        onClick={() => void handleFeedback('less_like_this')}
        disabled={sent !== null || loading}
        aria-label="Daha az bunun gibi"
        className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-all ${
          sent === 'less'
            ? 'border-rose-500/50 bg-rose-900/30 text-rose-400'
            : 'border-slate-700/50 text-slate-500 hover:border-rose-500/40 hover:text-rose-400'
        } disabled:opacity-50`}
      >
        <ThumbsDown className="w-3 h-3" />
        <span>Daha az</span>
      </button>
    </div>
  );
};

// ── Match Explanation Sheet (full detail) ────────────────────────────────────

export const MatchExplanationSheet: React.FC<SheetProps> = ({
  currentUser,
  targetProfile,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setLoading(true);
    void generateExplanations(currentUser, targetProfile, true)
      .then(setResult)
      .finally(() => setLoading(false));
  }, [isOpen, currentUser, targetProfile]);

  const handleFeedback = useCallback((factorKey: FactorKey) => {
    setFeedbackSent(prev => new Set([...prev, factorKey]));
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Neden Önerildi?</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {targetProfile.name} ile eşleşme nedenleri
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}

              {!loading && result && (
                <div className="flex flex-col gap-3">
                  {/* Main explanations */}
                  {result.allReasons.map((explanation, idx) => (
                    <motion.div
                      key={explanation.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex flex-col gap-2 px-3 py-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">{explanation.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                            {getCategoryLabel(explanation.category, explanation.factorKey)}
                          </p>
                          <p className="text-sm font-medium text-white">{explanation.text}</p>
                          {explanation.details && explanation.details.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {explanation.details.map(d => (
                                <span key={d} className="text-[10px] bg-slate-700/70 text-slate-300 px-2 py-0.5 rounded-full">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Change this */}
                        {explanation.adjustable && (
                          <button
                            onClick={() => { onNavigate(explanation.adjustPath); onClose(); }}
                            className="shrink-0 text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-0.5"
                          >
                            <Settings2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Feedback */}
                      {!feedbackSent.has(explanation.factorKey) && (
                        <ExplanationFeedbackRow
                          explanation={explanation}
                          onFeedback={(fk) => handleFeedback(fk)}
                        />
                      )}
                      {feedbackSent.has(explanation.factorKey) && (
                        <p className="text-[10px] text-slate-600">Geri bildiriminiz alındı, teşekkürler!</p>
                      )}
                    </motion.div>
                  ))}

                  {/* Empty state */}
                  {result.allReasons.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">Henüz yeterli bilgi paylaşılmamış.</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Profilinizi tamamlayarak daha iyi öneriler alabilirsiniz.
                      </p>
                    </div>
                  )}

                  {/* DSA footer */}
                  <div className="mt-2 pt-3 border-t border-slate-800/70">
                    <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                      Bu açıklamalar yalnızca profilinizde paylaştığınız bilgilere dayanır.
                      Fotoğraf analizi veya hassas veri çıkarımı yapılmaz.
                    </p>
                    <button
                      onClick={() => { onNavigate('/transparency'); onClose(); }}
                      className="flex items-center justify-center gap-1 mt-2 mx-auto text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Öneriler nasıl çalışır?
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  primary: {
    dating_intention: 'İlişki Amacı',
    work_schedule: 'Çalışma Düzeni',
    location: 'Konum',
    dealbreaker: 'Uyumluluk',
  },
  secondary: {
    values: 'Değerler',
    lifestyle: 'Yaşam Tarzı',
    interests: 'Ortak İlgiler',
  },
  healthcare_specific: {
    profession: 'Meslek',
    specialty: 'Uzmanlık',
    career_stage: 'Kariyer Aşaması',
    institution_type: 'Kurum Türü',
  },
};

const getCategoryLabel = (category: string, factorKey: string): string => {
  return CATEGORY_LABELS[category]?.[factorKey] ?? factorKey;
};
