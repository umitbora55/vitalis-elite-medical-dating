import React, { useEffect, useState } from 'react';
import {
  adminPanelService,
  BadgeRevocation,
} from '../../services/adminPanelService';
import { X, BadgeCheck, Loader2, History, CheckCircle2, XCircle } from 'lucide-react';

interface RevokeBadgeModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onActionComplete: () => void;
}

const REVOKE_REASONS = [
  'Sahte doktor belgesi',
  'İş yeri doğrulanamıyor',
  'Kullanıcı şikayetleri',
  'Kimlik sahteciliği',
  'Mezun olduğu kurumdan ihraç/ayrılma',
  'Belgeler yanıltıcı',
  'Diğer',
];

export const RevokeBadgeModal: React.FC<RevokeBadgeModalProps> = ({
  userId,
  userName,
  onClose,
  onActionComplete,
}) => {
  const [tab, setTab]                 = useState<'revoke' | 'history'>('revoke');
  const [reason, setReason]           = useState('');
  const [evidenceNotes, setEvidence]  = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [history, setHistory]         = useState<BadgeRevocation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (tab === 'history') {
      setLoadingHistory(true);
      adminPanelService.getBadgeRevocationHistory(userId).then(({ data }) => {
        setHistory(data ?? []);
        setLoadingHistory(false);
      });
    }
  }, [tab, userId]);

  const handleRevoke = async () => {
    if (!reason) { setActionError('Lütfen bir sebep seçin.'); return; }
    setSubmitting(true);
    setActionError(null);

    const { error } = await adminPanelService.revokeBadge(userId, reason, evidenceNotes || undefined);
    if (error) { setActionError(error); setSubmitting(false); }
    else { onActionComplete(); onClose(); }
  };

  const handleAppeal = async (revocationId: string, approved: boolean) => {
    const { error } = await adminPanelService.handleBadgeAppeal(revocationId, approved);
    if (!error) {
      setHistory((prev) =>
        prev.map((r) =>
          r.id === revocationId
            ? { ...r, status: approved ? 'appeal_approved' : 'appeal_rejected' }
            : r
        )
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <BadgeCheck size={18} className="text-red-400" />
            <h3 className="text-base font-bold text-white">Rozet İptal</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* User summary */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs text-slate-500">Hedef kullanıcı</p>
          <p className="text-base font-bold text-white">{userName}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 mb-4">
          {(['revoke', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                tab === t
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {t === 'history' ? <><History size={11} /> Geçmiş</> : <><BadgeCheck size={11} /> İptal Et</>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">

          {tab === 'revoke' && (
            <div className="space-y-4">
              {/* Reason picker */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">İptal sebebi *</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {REVOKE_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`text-left px-3 py-2.5 rounded-xl text-sm border transition-all ${
                        reason === r
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Evidence notes */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kanıt / Notlar</p>
                <textarea
                  value={evidenceNotes}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="İptal için kanıt veya ek bilgi girin…"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
                />
              </div>

              {actionError && <p className="text-xs text-red-400">{actionError}</p>}

              {/* Warning */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-xs text-red-400">
                  ⚠️ Bu işlem kullanıcının doğrulama rozetini kaldırır ve profil durumunu <strong>REVOKED</strong> olarak günceller.
                  Kullanıcı itiraz hakkı kazanır.
                </p>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 size={20} className="animate-spin text-gold-400" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                  <History size={28} className="text-slate-600" />
                  <p className="text-sm text-slate-500">Geçmiş iptal kaydı yok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((rev) => (
                    <div key={rev.id} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          rev.status === 'appeal_approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : rev.status === 'appeal_rejected' || rev.status === 'approved'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {rev.status === 'approved' ? 'İptal Edildi'
                            : rev.status === 'appealed' ? 'İtiraz Bekliyor'
                            : rev.status === 'appeal_approved' ? 'İtiraz Kabul'
                            : rev.status === 'appeal_rejected' ? 'İtiraz Reddedildi'
                            : rev.status}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(rev.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-white">{rev.reason}</p>
                      {rev.evidence_notes && (
                        <p className="text-xs text-slate-400">{rev.evidence_notes}</p>
                      )}
                      {rev.appeal_text && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                          <p className="text-[11px] text-amber-400 font-semibold mb-0.5">İtiraz metni</p>
                          <p className="text-xs text-slate-300">{rev.appeal_text}</p>
                        </div>
                      )}
                      {rev.status === 'appealed' && (
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => void handleAppeal(rev.id, true)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all"
                          >
                            <CheckCircle2 size={12} /> Kabul
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleAppeal(rev.id, false)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all"
                          >
                            <XCircle size={12} /> Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer (revoke tab only) */}
        {tab === 'revoke' && (
          <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => void handleRevoke()}
              disabled={!reason || submitting}
              className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> İşleniyor…</> : 'Rozeti İptal Et'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
