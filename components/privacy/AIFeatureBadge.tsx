/**
 * AIFeatureBadge — Feature 8: Privacy-First AI
 *
 * Reusable "AI destekli" badge placed near AI-powered UI elements.
 * Clicking opens a tooltip/bottom sheet with:
 *   • What this AI does
 *   • What data it uses
 *   • Whether it's required (security) or optional
 *   • Link to full AI settings
 *
 * Sizes: 'xs' | 'sm' | 'md'
 * Variants: 'subtle' | 'pill' | 'icon'
 */

import React, { useState } from 'react';
import { Bot, X, Info, Lock, Sliders } from 'lucide-react';
import type { AIFeatureKey } from '../../types';
import { MODEL_CARD_CACHE, getRetentionLabel } from '../../services/aiConsentService';

// ── Props ────────────────────────────────────────────────────────────────────

export interface AIFeatureBadgeProps {
  featureKey: AIFeatureKey;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'subtle' | 'pill' | 'icon';
  /** Called when user clicks "Ayarlar" to open AI consent panel */
  onOpenSettings?: () => void;
  className?: string;
}

// ── Tooltip sheet ────────────────────────────────────────────────────────────

interface TooltipSheetProps {
  featureKey: AIFeatureKey;
  onClose: () => void;
  onOpenSettings?: () => void;
}

const TooltipSheet: React.FC<TooltipSheetProps> = ({ featureKey, onClose, onOpenSettings }) => {
  const meta = MODEL_CARD_CACHE[featureKey];
  if (!meta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-sm mx-auto bg-slate-900 border border-slate-700/60 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Bot size={15} className="text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{meta.display_name_tr}</p>
              <p className="text-[10px] text-slate-500">AI destekli özellik</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Kapat"
          >
            <X size={14} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">{meta.description_tr}</p>

        {/* Details grid */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
            <Info size={11} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Kullandığı veri</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {meta.input_fields.join(' · ')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
            <Info size={11} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Veri saklama</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {getRetentionLabel(meta.data_retention_days)}
              </p>
            </div>
          </div>

          {meta.human_review_required_for && (
            <div className="flex items-start gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
              <Info size={11} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">İnsan incelemesi</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ağır kararlar ({meta.human_review_required_for}) her zaman insan moderatör tarafından onaylanır.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Security lock or settings link */}
        {meta.is_security ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Lock size={12} className="text-amber-400 flex-shrink-0" />
            <p className="text-[11px] text-amber-300 leading-relaxed">
              Bu güvenlik özelliği topluluk güvenliği için zorunludur ve devre dışı bırakılamaz.
            </p>
          </div>
        ) : (
          <button
            onClick={() => { onClose(); onOpenSettings?.(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600/20 border border-violet-500/30 rounded-xl text-sm font-semibold text-violet-300 hover:bg-violet-600/30 transition-colors"
          >
            <Sliders size={13} />
            AI Tercihlerini Yönet
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main badge component ─────────────────────────────────────────────────────

export const AIFeatureBadge: React.FC<AIFeatureBadgeProps> = ({
  featureKey,
  size = 'xs',
  variant = 'subtle',
  onOpenSettings,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const meta = MODEL_CARD_CACHE[featureKey];
  if (!meta) return null;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-1 gap-1',
    md: 'text-xs px-2.5 py-1.5 gap-1.5',
  };

  const iconSize = size === 'md' ? 11 : 9;

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowTooltip(true)}
          className={`inline-flex items-center text-violet-400 hover:text-violet-300 transition-colors ${className}`}
          aria-label={`AI özelliği: ${meta.display_name_tr}`}
          title={meta.display_name_tr}
        >
          <Bot size={iconSize} />
        </button>
        {showTooltip && (
          <TooltipSheet
            featureKey={featureKey}
            onClose={() => setShowTooltip(false)}
            onOpenSettings={onOpenSettings}
          />
        )}
      </>
    );
  }

  if (variant === 'pill') {
    return (
      <>
        <button
          onClick={() => setShowTooltip(true)}
          className={`inline-flex items-center rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-400 font-semibold hover:bg-violet-500/25 transition-colors ${sizeClasses[size]} ${className}`}
          aria-label={`AI özelliği hakkında bilgi`}
        >
          <Bot size={iconSize} />
          <span>AI</span>
        </button>
        {showTooltip && (
          <TooltipSheet
            featureKey={featureKey}
            onClose={() => setShowTooltip(false)}
            onOpenSettings={onOpenSettings}
          />
        )}
      </>
    );
  }

  // Default: subtle
  return (
    <>
      <button
        onClick={() => setShowTooltip(true)}
        className={`inline-flex items-center rounded text-violet-500 hover:text-violet-400 transition-colors ${sizeClasses[size]} ${className}`}
        aria-label={`AI özelliği: ${meta.display_name_tr}`}
      >
        <Bot size={iconSize} />
        <span className="font-medium">AI destekli</span>
      </button>
      {showTooltip && (
        <TooltipSheet
          featureKey={featureKey}
          onClose={() => setShowTooltip(false)}
          onOpenSettings={onOpenSettings}
        />
      )}
    </>
  );
};

export default AIFeatureBadge;
