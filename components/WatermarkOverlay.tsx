/**
 * WatermarkOverlay
 *
 * Feature 1: Screenshot Deterrence
 * Renders a repeating, rotated watermark grid on top of sensitive content.
 * Also attaches event listeners to detect potential screenshot attempts and logs them.
 *
 * Usage:
 *   <div className="relative">
 *     <SensitiveContent />
 *     <WatermarkOverlay viewerId={currentUserId} viewedProfileId={profile.id} />
 *   </div>
 */

import React, { useEffect, useRef } from 'react';
import { watermarkService } from '../services/watermarkService';

interface WatermarkOverlayProps {
  /** The currently logged-in user viewing the profile */
  viewerId:        string;
  /** The profile being viewed */
  viewedProfileId: string;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  viewerId,
  viewedProfileId,
}) => {
  const throttleRef = useRef<number>(0);

  // Generate 20 watermark strings for the grid
  const text = watermarkService.getWatermarkText(viewerId);
  const tiles = Array.from({ length: 20 }, (_, i) => `${text}-${i}`);

  useEffect(() => {
    const log = (eventType: 'blur' | 'visibilitychange') => {
      const now = Date.now();
      // Throttle to at most one log per 5 seconds
      if (now - throttleRef.current < 5_000) return;
      throttleRef.current = now;
      void watermarkService.logScreenshotAttempt(viewerId, viewedProfileId, eventType);
    };

    const onBlur       = () => log('blur');
    const onVisChange  = () => { if (document.hidden) log('visibilitychange'); };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [viewerId, viewedProfileId]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
    >
      <div
        className="flex flex-wrap gap-8 p-4"
        style={{ transform: 'rotate(-25deg) scale(1.5)', opacity: 0.07 }}
      >
        {tiles.map((tile) => (
          <span
            key={tile}
            className="text-[10px] font-mono font-bold text-slate-100 whitespace-nowrap"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};
