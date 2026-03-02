import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number; // percentage delta vs previous period
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  subLabel?: string;
  loading?: boolean;
}

const VARIANT_STYLES: Record<string, { card: string; icon: string }> = {
  default: { card: 'border-slate-800', icon: 'bg-slate-800/60 text-slate-400' },
  danger:  { card: 'border-red-500/20 bg-red-500/3', icon: 'bg-red-500/15 text-red-400' },
  warning: { card: 'border-amber-500/20 bg-amber-500/3', icon: 'bg-amber-500/15 text-amber-400' },
  success: { card: 'border-emerald-500/20', icon: 'bg-emerald-500/15 text-emerald-400' },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  icon,
  variant = 'default',
  subLabel,
  loading = false,
}) => {
  const styles = VARIANT_STYLES[variant];

  const deltaEl = () => {
    if (delta === undefined) return null;
    const positive = delta > 0;
    const neutral   = delta === 0;
    const color = neutral ? 'text-slate-500' : positive ? 'text-emerald-400' : 'text-red-400';
    const Icon  = neutral ? Minus : positive ? TrendingUp : TrendingDown;

    return (
      <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
        <Icon size={11} />
        <span>{neutral ? '—' : `${positive ? '+' : ''}${delta}%`}</span>
      </div>
    );
  };

  return (
    <div className={`bg-slate-900 border rounded-xl p-4 flex items-start gap-3 ${styles.card}`}>
      {icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-slate-800 animate-pulse rounded-md" />
        ) : (
          <p className="text-2xl font-bold text-white leading-none">{value}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          {deltaEl()}
          {subLabel && <p className="text-[11px] text-slate-600 truncate">{subLabel}</p>}
        </div>
      </div>
    </div>
  );
};
