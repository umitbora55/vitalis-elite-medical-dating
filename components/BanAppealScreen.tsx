/**
 * BanAppealScreen
 *
 * Full-screen view shown when a user's account is banned / restricted.
 * Displays:
 *   - Ban reason and type
 *   - Current appeal status (if already submitted)
 *   - AppealForm (if no appeal yet)
 *   - Status tracking timeline (if appeal submitted)
 */

import React, { useEffect, useState } from 'react';
import { ShieldOff, Clock, CheckCircle2, XCircle, ChevronUp, AlertTriangle, Loader2 } from 'lucide-react';
import { AppealForm } from './AppealForm';
import { appealService, Appeal, AppealStatus } from '../services/appealService';

interface BanInfo {
  userId: string;
  banType: 'temp_ban' | 'perm_ban' | 'restriction';
  banReason: string | null;
  restrictionId?: string;
  expiresAt?: string | null;
}

interface BanAppealScreenProps {
  banInfo: BanInfo;
  /** Called when the ban is lifted (appeal approved) */
  onBanLifted?: () => void;
  /** Called to navigate back (e.g. home / logout) */
  onBack: () => void;
}

export const BanAppealScreen: React.FC<BanAppealScreenProps> = ({
  banInfo,
  onBanLifted,
  onBack,
}) => {
  const [existingAppeal, setExistingAppeal] = useState<Appeal | null>(null);
  const [loadingAppeal, setLoadingAppeal]   = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  // ── Load existing appeal ─────────────────────────────────────────────────────

  useEffect(() => {
    void loadAppeal();
  }, []);

  const loadAppeal = async () => {
    setLoadingAppeal(true);
    const appeals = await appealService.getMyAppeals(banInfo.userId);
    const related = appeals.find(
      (a) =>
        (a.appeal_type === 'ban_appeal' || a.appeal_type === 'restriction_appeal') &&
        (banInfo.restrictionId ? a.related_entity_id === banInfo.restrictionId : true),
    );
    setExistingAppeal(related ?? null);
    setLoadingAppeal(false);

    if (related?.status === 'approved' && onBanLifted) {
      onBanLifted();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAppeal();
    setRefreshing(false);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const banTypeLabel =
    banInfo.banType === 'perm_ban'     ? '🚫 Kalıcı Yasak'    :
    banInfo.banType === 'temp_ban'     ? '⏸ Geçici Yasak'     :
    '🔒 Kısıtlama';

  const isPermanent = banInfo.banType === 'perm_ban';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <ShieldOff size={18} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">Hesap Durumu</h1>
          <p className="text-xs text-red-400">{banTypeLabel}</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 max-w-lg mx-auto w-full">

        {/* Ban details card */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-sm font-bold text-red-400">Hesabınız {isPermanent ? 'kalıcı olarak' : 'geçici olarak'} kısıtlandı</p>
          </div>

          {banInfo.banReason && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Neden</p>
              <p className="text-sm text-slate-300">{banInfo.banReason}</p>
            </div>
          )}

          {!isPermanent && banInfo.expiresAt && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Bitiş tarihi</p>
              <p className="text-sm text-white font-semibold">{formatDate(banInfo.expiresAt)}</p>
            </div>
          )}

          {isPermanent && (
            <p className="text-xs text-slate-400">
              Kalıcı yasaklar yalnızca itiraz başarılı olduğunda kaldırılabilir.
            </p>
          )}
        </div>

        {/* Loading appeal state */}
        {loadingAppeal && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-slate-400 animate-spin" />
          </div>
        )}

        {/* Existing appeal status */}
        {!loadingAppeal && existingAppeal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">İtiraz Durumu</h2>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                {refreshing && <Loader2 size={11} className="animate-spin" />}
                Yenile
              </button>
            </div>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              appealService.getStatusColor(existingAppeal.status)
            }`}>
              <StatusIcon status={existingAppeal.status} />
              {appealService.getStatusLabel(existingAppeal.status)}
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <TimelineItem
                done
                label="İtiraz Gönderildi"
                date={formatDate(existingAppeal.submitted_at)}
              />
              <TimelineItem
                done={existingAppeal.status !== 'pending'}
                active={existingAppeal.status === 'under_review'}
                label="İnceleme"
                date={existingAppeal.status !== 'pending' ? 'İnceleniyor' : undefined}
              />
              <TimelineItem
                done={existingAppeal.status === 'approved' || existingAppeal.status === 'denied'}
                label="Karar"
                date={
                  existingAppeal.reviewed_at
                    ? formatDate(existingAppeal.reviewed_at)
                    : undefined
                }
              />
            </div>

            {/* Decision reason */}
            {existingAppeal.decision_reason && (
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Admin Notu</p>
                <p className="text-sm text-slate-300">{existingAppeal.decision_reason}</p>
              </div>
            )}

            {/* Approved banner */}
            {existingAppeal.status === 'approved' && (
              <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-400 mb-0.5">İtiraz Kabul Edildi</p>
                  <p className="text-xs text-emerald-300">
                    Kısıtlama kaldırıldı. Uygulamayı yeniden başlatarak devam edebilirsiniz.
                  </p>
                </div>
              </div>
            )}

            {/* Denied banner */}
            {existingAppeal.status === 'denied' && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-400 mb-0.5">İtiraz Reddedildi</p>
                  <p className="text-xs text-red-300">
                    Kısıtlama devam edecek. Her hesap için yalnızca bir itiraz hakkı tanınır.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No appeal yet → show CTA or form */}
        {!loadingAppeal && !existingAppeal && (
          <div className="space-y-4">
            {!showForm ? (
              <>
                <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-5 space-y-3">
                  <h2 className="text-sm font-bold text-white">Haksız Yere Kısıtlandınız mı?</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kararın hatalı olduğunu düşünüyorsanız itiraz edebilirsiniz.
                    Her hesap için <span className="text-white font-semibold">yalnızca bir itiraz hakkı</span> tanınır.
                    Gerekçenizi açık ve ayrıntılı biçimde yazın.
                  </p>
                  <ul className="space-y-1">
                    {[
                      'En az 50 karakter açıklama gerekli',
                      'Varsa kanıt fotoğrafları ekleyin',
                      'İnceleme süreci genellikle 3–5 iş günü sürer',
                    ].map((tip, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-gold-400">→</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 rounded-xl bg-gold-600 text-slate-950 text-sm font-bold hover:bg-gold-500 transition-all flex items-center justify-center gap-2"
                >
                  <ChevronUp size={16} /> İtiraz Başvurusu Yap
                </button>
              </>
            ) : (
              <AppealForm
                userId={banInfo.userId}
                appealType={banInfo.banType === 'restriction' ? 'restriction_appeal' : 'ban_appeal'}
                relatedEntityType={banInfo.banType === 'restriction' ? 'restriction' : 'ban'}
                relatedEntityId={banInfo.restrictionId}
                contextInfo={
                  banInfo.banReason ? (
                    <div>
                      <p className="text-xs text-red-400 font-bold mb-1">Ban Nedeni</p>
                      <p className="text-sm text-slate-300">{banInfo.banReason}</p>
                    </div>
                  ) : undefined
                }
                onSubmitted={() => void loadAppeal()}
                onCancel={() => setShowForm(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-800 px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────────

const StatusIcon: React.FC<{ status: AppealStatus }> = ({ status }) => {
  if (status === 'approved')     return <CheckCircle2 size={11} />;
  if (status === 'denied')       return <XCircle size={11} />;
  if (status === 'under_review') return <Clock size={11} />;
  if (status === 'escalated')    return <ChevronUp size={11} />;
  return <Clock size={11} />;
};

const TimelineItem: React.FC<{
  done?: boolean;
  active?: boolean;
  label: string;
  date?: string;
}> = ({ done, active, label, date }) => (
  <div className="flex items-start gap-3">
    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
      done   ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
      active ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse' :
               'bg-slate-800 border-slate-600'
    }`}>
      {done && <CheckCircle2 size={10} />}
    </div>
    <div>
      <p className={`text-sm font-semibold ${done || active ? 'text-white' : 'text-slate-500'}`}>
        {label}
      </p>
      {date && <p className="text-xs text-slate-500 mt-0.5">{date}</p>}
    </div>
  </div>
);
