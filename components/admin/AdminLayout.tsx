import React, { useCallback, useEffect, useState } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar, AdminView } from './AdminSidebar';
import { adminPanelService, QueueStats } from '../../services/adminPanelService';
import { supabase } from '../../src/lib/supabase';
import { Menu } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
  onSignOut: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentView,
  onViewChange,
  onSignOut,
  onRefresh,
  refreshing = false,
}) => {
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState<
    'super_admin' | 'admin' | 'moderator' | 'support' | 'viewer'
  >('viewer');
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const loadAdminInfo = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, user_role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profile) {
      setAdminName((profile.full_name as string | null) ?? authData.user.email ?? 'Admin');
      const roleMap: Record<string, 'super_admin' | 'admin' | 'moderator' | 'support' | 'viewer'> = {
        superadmin: 'super_admin',
        admin:      'admin',
        moderator:  'moderator',
        support:    'support',
        viewer:     'viewer',
      };
      const rawRole = (profile.user_role as string | null) ?? 'viewer';
      setAdminRole(roleMap[rawRole] ?? 'viewer');
    }
  }, []);

  const loadStats = useCallback(async () => {
    const { data } = await adminPanelService.getQueueStats();
    if (data) setStats(data);
  }, []);

  useEffect(() => {
    void loadAdminInfo();
    void loadStats();
  }, [loadAdminInfo, loadStats]);

  // Refresh stats every 60s
  useEffect(() => {
    const id = setInterval(() => void loadStats(), 60_000);
    return () => clearInterval(id);
  }, [loadStats]);

  const handleRefresh = () => {
    void loadStats();
    onRefresh?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950">

      {/* Top header */}
      <AdminHeader
        adminName={adminName}
        adminRole={adminRole}
        onRefresh={handleRefresh}
        onSignOut={onSignOut}
        refreshing={refreshing}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <AdminSidebar
          currentView={currentView}
          onViewChange={onViewChange}
          stats={stats}
          collapsed={sidebarCollapsed}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 relative">

          {/* Mobile collapse toggle */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((p) => !p)}
            className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            aria-label={sidebarCollapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
          >
            <Menu size={16} />
          </button>

          <div className="pt-2">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
