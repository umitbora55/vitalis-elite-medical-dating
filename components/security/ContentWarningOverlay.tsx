/**
 * ContentWarningOverlay — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Wraps any <img> element with a blur overlay when explicit content
 * is detected or when the user has explicit_image_blur = true (default).
 *
 * Behaviour:
 *   • Blurred by default when flagged
 *   • "Göster" button reveals the image once
 *   • "Sil ve raporla" button fires the report callback
 *   • Optional: "Bu kişiden gelen görsellere güveniyorum" toggle
 */

import React, { useState } from 'react';
import { EyeOff, Eye, Flag, AlertTriangle } from 'lucide-react';
import type { ImageSafetyCategory } from '../../types';

export interface ContentWarningOverlayProps {
  /** The image element to protect */
  children: React.ReactNode;
  /** Category from image moderation */
  category: ImageSafetyCategory;
  /** If true, always show blur (user settings DEFAULT ON) */
  blurEnabled?: boolean;
  /** Called when user taps "Sil ve raporla" */
  onReport?: () => void;
  /** Called when user reveals (tracks analytics) */
  onReveal?: () => void;
  /** Class applied to the wrapper */
  className?: string;
}

export const ContentWarningOverlay: React.FC<ContentWarningOverlayProps> = ({
  children,
  category,
  blurEnabled = true,
  onReport,
  onReveal,
  className = '',
}) => {
  const [revealed, setRevealed] = useState(false);

  const shouldBlur = blurEnabled && (category === 'explicit' || category === 'violent' || category === 'suggestive');

  if (!shouldBlur || revealed) {
    return <div className={className}>{children}</div>;
  }

  const label = category === 'explicit'
    ? 'Açık içerik'
    : category === 'violent'
    ? 'Şiddet içeriği'
    : 'Hassas içerik';

  const handleReveal = () => {
    setRevealed(true);
    onReveal?.();
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Blurred image underneath */}
      <div className="blur-2xl saturate-50 pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm gap-3 p-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <EyeOff size={22} className="text-slate-400" />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-white flex items-center gap-1.5 justify-center">
            <AlertTriangle size={13} className="text-amber-400" />
            {label}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Bu görsel hassas içerik içerebilir</p>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-[200px]">
          <button
            onClick={handleReveal}
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
          >
            <Eye size={13} /> Göster
          </button>
          {onReport && (
            <button
              onClick={onReport}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors"
            >
              <Flag size={13} /> Sil ve Raporla
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
