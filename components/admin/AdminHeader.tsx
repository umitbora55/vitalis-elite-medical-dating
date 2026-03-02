import React from 'react';
import { LogOut, Shield, RefreshCw } from 'lucide-react';
import type { AdminRole } from '../../services/adminPanelService';

interface AdminHeaderProps {
  adminName: string;
  adminRole: AdminRole | 'viewer';
  onRefresh?: () => void;
  onSignOut: () => void;
  refreshing?: boolean;
}

const ROLE_LABELS: Record<AdminRole | 'viewer', string> = {
  super_admin: 'Süper Admin',
  admin:       'Admin',
  moderator:   'Moderatör',
  support:     'Destek',
  viewer:      'Görüntüleyici',
};

const ROLE_BADGE: Record<AdminRole | 'viewer', string> = {
  super_admin: 'bg-red-500/15 text-red-400 border-red-500/30',
  admin:       'bg-gold-500/15 text-gold-400 border-gold-500/30',
  moderator:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  support:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  viewer:      'bg-slate-700/60 text-slate-400 border-slate-600/30',
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  adminName,
  adminRole,
  onRefresh,
  onSignOut,
  refreshing = false,
}) => {
  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950 flex-shrink-0">

      {/* Left: branding */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500 to-amber-500 flex items-center justify-center shadow-glow-gold flex-shrink-0">
          <Shield size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-bold text-white tracking-tight hidden sm:block">
          Vitalis Admin
        </span>
      </div>

      {/* Right: actions + user */}
      <div className="flex items-center gap-3">

        {/* Refresh */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50"
            aria-label="Yenile"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        )}

        {/* Role badge */}
        <span className={`hidden sm:flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${ROLE_BADGE[adminRole]}`}>
          {ROLE_LABELS[adminRole]}
        </span>

        {/* Admin name */}
        <span className="text-xs text-slate-400 hidden md:block max-w-[120px] truncate">
          {adminName}
        </span>

        {/* Sign out */}
        <button
          type="button"
          onClick={onSignOut}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          aria-label="Çıkış yap"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
};
