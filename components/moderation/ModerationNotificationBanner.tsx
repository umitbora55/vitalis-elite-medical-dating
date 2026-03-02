/**
 * ModerationNotificationBanner — Özellik 7: Şeffaf Moderasyon
 *
 * Uygulama içi kompakt bildirim şeridi.
 * Okunmamış moderasyon bildirimleri olduğunda üstte görünür.
 *
 * Tıklanınca → ModerationStatusScreen açılır.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ChevronRight, X, ShieldAlert } from 'lucide-react';
import {
  transparentModerationService,
  ACTION_LABELS,
} from '../../services/transparentModerationService';
import type { ModerationNotification } from '../../types';

interface ModerationNotificationBannerProps {
  onOpenDetail: (notification: ModerationNotification) => void;
  className?: string;
}

export const ModerationNotificationBanner: React.FC<ModerationNotificationBannerProps> = ({
  onOpenDetail,
  className = '',
}) => {
  const [notifications, setNotifications] = useState<ModerationNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await transparentModerationService.getMyModerationNotifications();
    setNotifications(data.filter((n) => !n.read_at));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDismiss = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed((prev) => new Set(prev).add(id));
    await transparentModerationService.markNotificationRead(id);
  }, []);

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  if (loading || visible.length === 0) return null;

  // Göster: en son okunmamış bildirim
  const latest = visible[0];
  const actionInfo = ACTION_LABELS[latest.action_type] ?? ACTION_LABELS['warning'];

  const isSevere = latest.action_type === 'perm_ban' || latest.action_type === 'temp_ban';

  return (
    <div
      className={`w-full z-50 animate-slide-down ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <button
        onClick={() => onOpenDetail(latest)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity hover:opacity-90 ${
          isSevere
            ? 'bg-red-950/90 border-b border-red-700/60'
            : 'bg-amber-950/90 border-b border-amber-700/60'
        }`}
      >
        {/* Icon */}
        <div className={`flex-shrink-0 ${isSevere ? 'text-red-400' : 'text-amber-400'}`}>
          {isSevere ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold truncate ${isSevere ? 'text-red-300' : 'text-amber-300'}`}>
            {actionInfo.icon} {latest.title_tr}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {latest.reason_code && (
              <span className="text-slate-500 mr-1">[{latest.reason_code}]</span>
            )}
            {latest.body_tr.slice(0, 80)}…
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {visible.length > 1 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isSevere ? 'bg-red-800 text-red-200' : 'bg-amber-800 text-amber-200'
            }`}>
              +{visible.length - 1}
            </span>
          )}
          <ChevronRight size={14} className="text-slate-500" />
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => void handleDismiss(latest.id, e)}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded-md transition-colors text-slate-500 hover:text-slate-300"
          aria-label="Bildirimi kapat"
        >
          <X size={12} />
        </button>
      </button>
    </div>
  );
};
