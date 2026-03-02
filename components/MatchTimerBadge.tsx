import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { matchTimerService, type MatchTimerStatus } from '../services/matchTimerService';

interface MatchTimerBadgeProps {
  deadline: string | null | undefined;
  compact?: boolean;
  className?: string;
}

const COLOR_MAP = {
  green: {
    bg: 'bg-emerald-900/30 border-emerald-500/40',
    text: 'text-emerald-400',
    icon: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  yellow: {
    bg: 'bg-amber-900/30 border-amber-500/40',
    text: 'text-amber-400',
    icon: 'text-amber-400',
    dot: 'bg-amber-400 animate-pulse',
  },
  red: {
    bg: 'bg-red-900/30 border-red-500/40',
    text: 'text-red-400',
    icon: 'text-red-400',
    dot: 'bg-red-400 animate-pulse',
  },
};

export const MatchTimerBadge: React.FC<MatchTimerBadgeProps> = ({
  deadline,
  compact = false,
  className = '',
}) => {
  const [status, setStatus] = useState<MatchTimerStatus>(() =>
    matchTimerService.getTimerStatus(deadline),
  );

  useEffect(() => {
    if (!deadline) return;

    // Update every second
    const interval = setInterval(() => {
      setStatus(matchTimerService.getTimerStatus(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  // Don't render if no deadline (first message already sent)
  if (!deadline || status.isExpired) return null;

  const colors = COLOR_MAP[status.urgency];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${colors.bg} ${className}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        <span className={`text-xs font-mono font-bold ${colors.text}`}>⏱ {status.label}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colors.bg} ${className}`}>
      <Timer size={14} className={colors.icon} />
      <div className="flex flex-col">
        <span className={`text-xs font-mono font-bold tracking-wider ${colors.text}`}>
          ⏱ {status.label}
        </span>
        {status.urgency !== 'green' && (
          <span className="text-[10px] text-slate-500 leading-tight">
            {status.urgency === 'red' ? 'İlk mesajı hemen gönder!' : 'İlk mesaj için süre azalıyor'}
          </span>
        )}
      </div>
    </div>
  );
};
