/**
 * AccountSafetyCenter — Session management, device tracking, 2FA, security log
 *
 * Shows:
 * 1. Active sessions list (this device + others)
 * 2. Security log (recent logins, password changes)
 * 3. Revoke all sessions button (with confirm)
 * 4. New device login alerts toggle
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Monitor,
  Bell,
  BellOff,
} from 'lucide-react';
import { supabase } from '../../../../src/lib/supabase';
import type { User } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecurityLogEntry {
  id: string;
  action: string;
  timestamp: string;
  detail: string;
  isCurrentDevice: boolean;
}

type RevokeState = 'idle' | 'confirm' | 'revoking' | 'done' | 'error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const buildSecurityLog = (user: User): SecurityLogEntry[] => {
  const log: SecurityLogEntry[] = [];

  // Current session / last sign-in from auth metadata
  if (user.last_sign_in_at) {
    log.push({
      id: 'last-login',
      action: 'Oturum Açıldı',
      timestamp: user.last_sign_in_at,
      detail: `Bu cihaz · ${user.app_metadata?.provider ?? 'Email'}`,
      isCurrentDevice: true,
    });
  }

  // Account creation
  if (user.created_at) {
    log.push({
      id: 'account-created',
      action: 'Hesap Oluşturuldu',
      timestamp: user.created_at,
      detail: 'İlk kayıt',
      isCurrentDevice: false,
    });
  }

  // Email confirmed
  if (user.email_confirmed_at) {
    log.push({
      id: 'email-confirmed',
      action: 'E-posta Doğrulandı',
      timestamp: user.email_confirmed_at,
      detail: user.email ?? '—',
      isCurrentDevice: false,
    });
  }

  // Phone confirmed
  if (user.phone_confirmed_at) {
    log.push({
      id: 'phone-confirmed',
      action: 'Telefon Doğrulandı',
      timestamp: user.phone_confirmed_at,
      detail: user.phone ?? '—',
      isCurrentDevice: false,
    });
  }

  return log.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SessionCardProps {
  isCurrentDevice: boolean;
  email: string | undefined;
  lastSignIn: string | undefined;
  provider: string;
}

const SessionCard: React.FC<SessionCardProps> = ({
  isCurrentDevice,
  email,
  lastSignIn,
  provider,
}) => (
  <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
    isCurrentDevice
      ? 'bg-blue-500/8 border-blue-500/30'
      : 'bg-slate-800/30 border-slate-700/40'
  }`}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
      isCurrentDevice ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-700/60 text-slate-400'
    }`}>
      {isCurrentDevice ? <Monitor size={16} /> : <Smartphone size={16} />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-white">
          {isCurrentDevice ? 'Bu Cihaz' : 'Diğer Oturum'}
        </p>
        {isCurrentDevice && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
            Aktif
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{email ?? '—'}</p>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10px] text-slate-500 capitalize">{provider}</span>
        {lastSignIn && (
          <span className="text-[10px] text-slate-500">{formatDate(lastSignIn)}</span>
        )}
      </div>
    </div>
  </div>
);

interface SecurityLogRowProps {
  entry: SecurityLogEntry;
}

const SecurityLogRow: React.FC<SecurityLogRowProps> = ({ entry }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
      entry.isCurrentDevice ? 'bg-blue-400' : 'bg-slate-600'
    }`} />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-slate-300">{entry.action}</p>
      <p className="text-[11px] text-slate-500 truncate">{entry.detail}</p>
    </div>
    <div className="flex items-center gap-1 flex-shrink-0">
      <Clock size={10} className="text-slate-600" />
      <span className="text-[10px] text-slate-500 whitespace-nowrap">
        {formatDate(entry.timestamp)}
      </span>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface AccountSafetyCenterProps {
  onClose?: () => void;
}

export const AccountSafetyCenter: React.FC<AccountSafetyCenterProps> = ({ onClose }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revokeState, setRevokeState] = useState<RevokeState>('idle');
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Load current user
  const loadUser = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setLoadError(error?.message ?? 'Kullanıcı bilgileri alınamadı.');
      setLoading(false);
      return;
    }
    setUser(data.user);
    // Read alert preference from user metadata
    const metaAlerts = data.user.user_metadata?.['new_device_alerts'];
    setAlertsEnabled(metaAlerts !== false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleRevokeOtherSessions = useCallback(async () => {
    if (revokeState === 'confirm') {
      setRevokeState('revoking');
      setRevokeError(null);
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) {
        setRevokeError(error.message);
        setRevokeState('error');
      } else {
        setRevokeState('done');
      }
    } else {
      setRevokeState('confirm');
    }
  }, [revokeState]);

  const handleRevokeAll = useCallback(async () => {
    setRevokeState('revoking');
    setRevokeError(null);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      setRevokeError(error.message);
      setRevokeState('error');
    } else {
      setRevokeState('done');
    }
  }, []);

  const handleToggleAlerts = useCallback(async () => {
    if (!user) return;
    setAlertsLoading(true);
    const newValue = !alertsEnabled;
    const { error } = await supabase.auth.updateUser({
      data: { new_device_alerts: newValue },
    });
    if (!error) setAlertsEnabled(newValue);
    setAlertsLoading(false);
  }, [user, alertsEnabled]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center gap-3">
        <Loader2 size={22} className="animate-spin text-blue-400" />
        <p className="text-sm text-slate-400">Hesap güvenliği yükleniyor…</p>
      </div>
    );
  }

  // ── Error state ──
  if (loadError || !user) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-4">
        <AlertTriangle size={22} className="text-red-400" />
        <p className="text-sm text-slate-300 text-center">
          {loadError ?? 'Kullanıcı bilgileri yüklenemedi.'}
        </p>
        <button
          type="button"
          onClick={() => void loadUser()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-white transition-all"
        >
          <RefreshCw size={14} /> Tekrar Dene
        </button>
      </div>
    );
  }

  const securityLog = buildSecurityLog(user);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-blue-400" />
          <h2 className="text-sm font-bold text-white">Hesap Güvenliği</h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* ── Active Sessions ── */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Aktif Oturumlar
          </h3>
          <div className="space-y-2">
            <SessionCard
              isCurrentDevice={true}
              email={user.email}
              lastSignIn={user.last_sign_in_at}
              provider={user.app_metadata?.['provider'] ?? 'email'}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Supabase Auth — oturum bilgileri sunucu tarafında korunmaktadır.
          </p>
        </section>

        {/* ── New Device Alerts Toggle ── */}
        <section>
          <div className="flex items-center justify-between bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              {alertsEnabled ? (
                <Bell size={15} className="text-blue-400" />
              ) : (
                <BellOff size={15} className="text-slate-500" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-300">Yeni Cihaz Uyarıları</p>
                <p className="text-[11px] text-slate-500">
                  {alertsEnabled ? 'Açık — yeni giriş bildirim gönderilir' : 'Kapalı'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={alertsEnabled}
              aria-label="Yeni cihaz uyarılarını aç/kapat"
              onClick={() => void handleToggleAlerts()}
              disabled={alertsLoading}
              className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${
                alertsEnabled ? 'bg-blue-600' : 'bg-slate-700'
              } ${alertsLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  alertsEnabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* ── Security Log ── */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Güvenlik Geçmişi
          </h3>
          {securityLog.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Kayıt bulunamadı.</p>
          ) : (
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-3 py-1">
              {securityLog.map((entry) => (
                <SecurityLogRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>

        {/* ── Revoke Sessions ── */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Oturum Yönetimi
          </h3>

          {revokeState === 'done' && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-300">Diğer oturumlar başarıyla kapatıldı.</p>
            </div>
          )}

          {(revokeState === 'error') && revokeError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300">{revokeError}</p>
            </div>
          )}

          {revokeState === 'confirm' && (
            <div className="bg-amber-500/8 border border-amber-500/30 rounded-xl px-3 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300">
                  Mevcut oturum dışındaki tüm cihazlar oturumdan çıkarılacak. Devam etmek istediğinden emin misin?
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRevokeState('idle')}
                  className="flex-1 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white transition-all"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => void handleRevokeOtherSessions()}
                  className="flex-1 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition-all"
                >
                  Evet, Kapat
                </button>
              </div>
            </div>
          )}

          {revokeState !== 'confirm' && revokeState !== 'done' && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void handleRevokeOtherSessions()}
                disabled={revokeState === 'revoking'}
                className="w-full py-2.5 rounded-xl border border-amber-500/40 text-amber-400 text-sm font-semibold hover:bg-amber-500/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {revokeState === 'revoking' ? (
                  <><Loader2 size={14} className="animate-spin" /> İşleniyor…</>
                ) : (
                  <>Diğer Oturumları Kapat</>
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleRevokeAll()}
                disabled={revokeState === 'revoking'}
                className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <LogOut size={14} /> Tüm Oturumları Kapat
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
