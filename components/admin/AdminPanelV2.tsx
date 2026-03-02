/**
 * AdminPanelV2 — Main admin panel router
 *
 * Wires together:
 * - AdminLayout (shell, sidebar, header)
 * - KPIDashboard
 * - VerificationQueue + VerificationDetail
 * - SuspiciousUsersQueue + SuspiciousUserDetail
 * - ReportQueue + ReportDetail
 * - RevokeBadgeModal, BanUserModal, ResolveReportModal
 *
 * Access gate: moderator / admin / superadmin only.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminView } from './AdminSidebar';
import { KPIDashboard } from './KPIDashboard';
import { VerificationQueue } from './VerificationQueue';
import { VerificationDetail } from './VerificationDetail';
import { SuspiciousUsersQueue } from './SuspiciousUsersQueue';
import { SuspiciousUserDetail } from './SuspiciousUserDetail';
import { ReportQueue } from './ReportQueue';
import { ReportDetail } from './ReportDetail';
import { DuplicatePhotosQueue } from './DuplicatePhotosQueue';
import { AppealDetail } from './AppealDetail';
import { RevokeBadgeModal } from './RevokeBadgeModal';
import { BanUserModal } from './BanUserModal';
import { ResolveReportModal } from './ResolveReportModal';
import {
  VerificationQueueItem,
  SuspiciousUser,
  Report,
} from '../../services/adminPanelService';
import { appealService, Appeal } from '../../services/appealService';
import { conferenceService } from '../../services/conferenceService';
import { voiceIntroService } from '../../services/voiceIntroService';
import { Conference, VoiceIntro } from '../../types';
import { checkAdminAccess } from '../../services/adminService';
import { Loader2, FileText, MapPin, Mic, Calendar, Trash2 } from 'lucide-react';

interface AdminPanelV2Props {
  onClose: () => void;
}

type BanTarget = { userId: string; userName: string } | null;
type RevokeBadgeTarget = { userId: string; userName: string } | null;

export const AdminPanelV2: React.FC<AdminPanelV2Props> = ({ onClose }) => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Queue detail state
  const [selectedVerification, setSelectedVerification] = useState<VerificationQueueItem | null>(null);
  const [selectedSuspicious, setSelectedSuspicious] = useState<SuspiciousUser | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  // Modal state
  const [banTarget, setBanTarget] = useState<BanTarget>(null);
  const [revokeTarget, setRevokeTarget] = useState<RevokeBadgeTarget>(null);
  const [resolveReport, setResolveReport] = useState<Report | null>(null);

  // Access gate
  useEffect(() => {
    checkAdminAccess().then(({ hasAccess: ok }) => {
      setHasAccess(ok);
      setAccessChecked(true);
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleActionComplete = useCallback(() => {
    // Close detail panels + refresh queue
    setSelectedVerification(null);
    setSelectedSuspicious(null);
    setSelectedReport(null);
    setSelectedAppeal(null);
    setBanTarget(null);
    setRevokeTarget(null);
    setResolveReport(null);
    handleRefresh();
  }, [handleRefresh]);

  const openBanModal = (userId: string, userName?: string) => {
    setBanTarget({ userId, userName: userName ?? 'Bilinmiyor' });
  };

  // ── Access guard ────────────────────────────────────────────────────────────

  if (!accessChecked) {
    // Completely blank — reveal nothing
    return <div className="fixed inset-0 z-[100] bg-slate-950" />;
  }

  if (!hasAccess) {
    // Show a generic fake 404 — never reveal admin panel exists
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div className="text-center px-6">
          <h1 style={{ fontSize: '144px', fontWeight: 700, color: '#e0e0e0', lineHeight: 1, margin: 0 }}>404</h1>
          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333', margin: '0 0 8px' }}>
              Bu sayfa bulunamadı
            </h2>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 24px', maxWidth: '400px' }}>
              Girmeye çalıştığınız adres mevcut değil veya taşınmış olabilir.
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-block',
                padding: '10px 28px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: '#333',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <KPIDashboard key={`dashboard-${refreshKey}`} />;

      case 'verification':
        return (
          <VerificationQueue
            key={`vq-${refreshKey}`}
            onSelectItem={(item) => setSelectedVerification(item)}
          />
        );

      case 'suspicious':
        return (
          <SuspiciousUsersQueue
            key={`susp-${refreshKey}`}
            onSelectUser={(user) => setSelectedSuspicious(user)}
          />
        );

      case 'reports':
        return (
          <ReportQueue
            key={`rq-${refreshKey}`}
            onSelectReport={(report) => setSelectedReport(report)}
          />
        );

      case 'duplicates':
        return <DuplicatePhotosQueue key={`dup-${refreshKey}`} />;

      case 'appeals':
        return <AppealQueue key={`ap-${refreshKey}`} onSelectAppeal={setSelectedAppeal} />;

      case 'users':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20 px-6">
            <p className="text-slate-400 text-sm">Kullanıcı yönetimi yakında eklenecek.</p>
          </div>
        );

      case 'events':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20 px-6">
            <p className="text-slate-400 text-sm">Etkinlik moderasyonu yakında eklenecek.</p>
          </div>
        );

      case 'analytics':
        return <KPIDashboard key={`analytics-${refreshKey}`} />;

      case 'settings':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20 px-6">
            <p className="text-slate-400 text-sm">Panel ayarları yakında eklenecek.</p>
          </div>
        );

      case 'conferences':
        return <ConferencesAdminView key={`conf-${refreshKey}`} />;

      case 'voice_intros':
        return <VoiceIntrosAdminView key={`vi-${refreshKey}`} />;

      default:
        return null;
    }
  };

  return (
    <>
      <AdminLayout
        currentView={currentView}
        onViewChange={setCurrentView}
        onSignOut={onClose}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      >
        {renderContent()}
      </AdminLayout>

      {/* ── Detail modals ────────────────────────────────────────────────────── */}

      {selectedVerification && (
        <VerificationDetail
          item={selectedVerification}
          onClose={() => setSelectedVerification(null)}
          onActionComplete={handleActionComplete}
        />
      )}

      {selectedSuspicious && (
        <SuspiciousUserDetail
          user={selectedSuspicious}
          onClose={() => setSelectedSuspicious(null)}
          onActionComplete={handleActionComplete}
          onBanUser={(uid) => openBanModal(uid, selectedSuspicious.user_name ?? undefined)}
        />
      )}

      {selectedReport && !resolveReport && (
        <ReportDetail
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onActionComplete={handleActionComplete}
          onBanUser={(uid) => openBanModal(uid, selectedReport.reported_user_name ?? undefined)}
        />
      )}

      {/* ── Action modals ─────────────────────────────────────────────────────── */}

      {banTarget && (
        <BanUserModal
          userId={banTarget.userId}
          userName={banTarget.userName}
          onClose={() => setBanTarget(null)}
          onActionComplete={handleActionComplete}
        />
      )}

      {revokeTarget && (
        <RevokeBadgeModal
          userId={revokeTarget.userId}
          userName={revokeTarget.userName}
          onClose={() => setRevokeTarget(null)}
          onActionComplete={handleActionComplete}
        />
      )}

      {resolveReport && (
        <ResolveReportModal
          report={resolveReport}
          onClose={() => setResolveReport(null)}
          onActionComplete={handleActionComplete}
        />
      )}

      {selectedAppeal && (
        <AppealDetail
          appeal={selectedAppeal}
          onClose={() => setSelectedAppeal(null)}
          onActionComplete={handleActionComplete}
        />
      )}
    </>
  );
};

// ── Inline AppealQueue (lightweight — no separate file needed) ─────────────────

interface AppealQueueProps {
  onSelectAppeal: (appeal: Appeal) => void;
}

const AppealQueue: React.FC<AppealQueueProps> = ({ onSelectAppeal }) => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appealService.getAppealQueue().then((data) => {
      setAppeals(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <FileText size={15} className="text-gold-400" />
        <span className="text-sm font-bold text-white">İtiraz Sırası</span>
        <span className="text-xs bg-gold-500/15 border border-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">
          {appeals.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {appeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-sm text-slate-400">Bekleyen itiraz yok</p>
          </div>
        ) : (
          appeals.map((appeal) => (
            <button
              key={appeal.id}
              type="button"
              onClick={() => onSelectAppeal(appeal)}
              className="w-full px-5 py-4 border-b border-slate-800/50 text-left hover:bg-slate-800/30 transition-all flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${appealService.getStatusColor(appeal.status)
                    }`}>
                    {appealService.getStatusLabel(appeal.status)}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${appeal.priority === 'urgent' ? 'text-red-400 bg-red-500/10' :
                    appeal.priority === 'high' ? 'text-amber-400 bg-amber-500/10' :
                      'text-slate-500'
                    }`}>
                    {appeal.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white truncate">
                  {appealService.getAppealTypeLabel(appeal.appeal_type)}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {appeal.user_name ?? appeal.user_id.slice(0, 8)} •{' '}
                  {new Date(appeal.submitted_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// ── Inline ConferencesAdminView ────────────────────────────────────────────────

const ConferencesAdminView: React.FC = () => {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    conferenceService.getActiveConferences().then((data) => {
      setConferences(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <MapPin size={15} className="text-gold-400" />
        <span className="text-sm font-bold text-white">Kongreler</span>
        <span className="text-xs bg-gold-500/15 border border-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">
          {conferences.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conferences.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-sm text-slate-400">Aktif kongre yok</p>
          </div>
        ) : (
          conferences.map((conf) => (
            <div
              key={conf.id}
              className="w-full px-5 py-4 border-b border-slate-800/50 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Calendar size={16} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{conf.name}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {conf.city}{conf.venue ? ` · ${conf.venue}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">
                    {new Date(conf.start_date).toLocaleDateString('tr-TR')}
                    {' – '}
                    {new Date(conf.end_date).toLocaleDateString('tr-TR')}
                  </span>
                  {conf.specialty_tags.length > 0 && (
                    <span className="text-[10px] text-gold-400 bg-gold-500/10 px-1.5 py-0.5 rounded-full">
                      {conf.specialty_tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500">Maks. Havuz</p>
                <p className="text-sm font-bold text-white">{conf.max_pool_size}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Inline VoiceIntrosAdminView ────────────────────────────────────────────────

type VoiceIntroAdminItem = VoiceIntro & { user_name?: string };

const VoiceIntrosAdminView: React.FC = () => {
  const [intros, setIntros] = useState<VoiceIntroAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadIntros = React.useCallback(() => {
    setLoading(true);
    // Fetch all voice intros (admin view — no filter)
    import('../../src/lib/supabase').then(({ supabase }) => {
      supabase
        .from('voice_intros')
        .select('id, user_id, storage_path, duration_seconds, created_at, updated_at, profiles!inner(full_name)')
        .order('created_at', { ascending: false })
        .limit(100)
        .then(({ data, error }) => {
          if (error || !data) {
            setIntros([]);
          } else {
            const mapped: VoiceIntroAdminItem[] = (data as Array<{
              id: string;
              user_id: string;
              storage_path: string;
              duration_seconds: number;
              created_at: string;
              updated_at: string;
              profiles: { full_name?: string } | null;
            }>).map((row) => ({
              id: row.id,
              user_id: row.user_id,
              storage_path: row.storage_path,
              duration_seconds: row.duration_seconds,
              created_at: row.created_at,
              updated_at: row.updated_at,
              user_name: row.profiles?.full_name ?? undefined,
            }));
            setIntros(mapped);
          }
          setLoading(false);
        });
    });
  }, []);

  useEffect(() => { loadIntros(); }, [loadIntros]);

  const handleDelete = async (intro: VoiceIntroAdminItem) => {
    if (!window.confirm(`${intro.user_name ?? intro.user_id} kullanıcısının sesli tanıtımı silinsin mi?`)) return;
    setDeleting(intro.id);
    await voiceIntroService.delete(intro.user_id);
    setDeleting(null);
    loadIntros();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={22} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
        <Mic size={15} className="text-gold-400" />
        <span className="text-sm font-bold text-white">Sesli Tanıtımlar</span>
        <span className="text-xs bg-gold-500/15 border border-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">
          {intros.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {intros.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <p className="text-sm text-slate-400">Yüklenen sesli tanıtım yok</p>
          </div>
        ) : (
          intros.map((intro) => (
            <div
              key={intro.id}
              className="w-full px-5 py-4 border-b border-slate-800/50 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Mic size={16} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {intro.user_name ?? intro.user_id.slice(0, 8)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {intro.duration_seconds}s · {new Date(intro.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <button
                type="button"
                disabled={deleting === intro.id}
                onClick={() => void handleDelete(intro)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                aria-label="Sil"
              >
                {deleting === intro.id
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Trash2 size={16} />
                }
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Expose helpers for parent to trigger modals from queue rows
export type { BanTarget, RevokeBadgeTarget };
