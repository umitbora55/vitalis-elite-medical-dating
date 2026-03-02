import React from 'react';
import {
  LayoutDashboard,
  BadgeCheck,
  AlertTriangle,
  Flag,
  Users,
  CalendarDays,
  BarChart2,
  Settings,
  ChevronRight,
  Copy,
  FileText,
  MapPin,
  Mic,
} from 'lucide-react';
import type { QueueStats } from '../../services/adminPanelService';

export type AdminView =
  | 'dashboard'
  | 'verification'
  | 'suspicious'
  | 'reports'
  | 'duplicates'
  | 'appeals'
  | 'users'
  | 'events'
  | 'analytics'
  | 'settings'
  | 'conferences'
  | 'voice_intros';

interface NavItem {
  view: AdminView;
  label: string;
  icon: React.ReactNode;
  badgeKey?: keyof QueueStats;
  badgeVariant?: 'red' | 'amber' | 'blue';
}

interface AdminSidebarProps {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
  stats: QueueStats | null;
  collapsed?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    view: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={17} />,
  },
  {
    view: 'verification',
    label: 'Doğrulama',
    icon: <BadgeCheck size={17} />,
    badgeKey: 'verificationPending',
    badgeVariant: 'blue',
  },
  {
    view: 'suspicious',
    label: 'Şüpheli',
    icon: <AlertTriangle size={17} />,
    badgeKey: 'suspiciousOpen',
    badgeVariant: 'amber',
  },
  {
    view: 'reports',
    label: 'Şikayetler',
    icon: <Flag size={17} />,
    badgeKey: 'reportsOpen',
    badgeVariant: 'red',
  },
  {
    view: 'duplicates',
    label: 'Duplikat Foto',
    icon: <Copy size={17} />,
  },
  {
    view: 'appeals',
    label: 'İtirazlar',
    icon: <FileText size={17} />,
  },
  {
    view: 'users',
    label: 'Kullanıcılar',
    icon: <Users size={17} />,
  },
  {
    view: 'events',
    label: 'Etkinlikler',
    icon: <CalendarDays size={17} />,
  },
  {
    view: 'analytics',
    label: 'Analitik',
    icon: <BarChart2 size={17} />,
  },
  {
    view: 'settings',
    label: 'Ayarlar',
    icon: <Settings size={17} />,
  },
  {
    view: 'conferences',
    label: 'Kongreler',
    icon: <MapPin size={17} />,
  },
  {
    view: 'voice_intros',
    label: 'Sesli Tanıtım',
    icon: <Mic size={17} />,
  },
];

const BADGE_COLORS: Record<'red' | 'amber' | 'blue', string> = {
  red:   'bg-red-500 text-white',
  amber: 'bg-amber-500 text-black',
  blue:  'bg-blue-500 text-white',
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onViewChange,
  stats,
  collapsed = false,
}) => {
  return (
    <nav
      className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      <div className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const badgeCount = item.badgeKey && stats ? stats[item.badgeKey] : 0;

          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onViewChange(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gold-500/15 text-gold-400 border border-gold-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              {/* Icon */}
              <span className={`flex-shrink-0 ${isActive ? 'text-gold-400' : ''}`}>
                {item.icon}
              </span>

              {/* Label (hidden when collapsed) */}
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>

                  {/* Badge */}
                  {item.badgeKey && badgeCount > 0 && (
                    <span
                      className={`text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 flex-shrink-0 ${
                        BADGE_COLORS[item.badgeVariant ?? 'blue']
                      }`}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}

                  {/* Active chevron */}
                  {isActive && (
                    <ChevronRight size={12} className="text-gold-400 flex-shrink-0" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* SLA breach alert strip */}
      {!collapsed && stats && stats.verificationBreached > 0 && (
        <div className="mx-2 mb-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <p className="text-[11px] text-red-400 font-semibold">
            {stats.verificationBreached} SLA ihlali
          </p>
        </div>
      )}
    </nav>
  );
};
