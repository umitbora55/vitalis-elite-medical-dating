import React, { useState } from 'react';
import {
  adminPanelService,
  Report,
} from '../../services/adminPanelService';
import {
  X, Flag, User, CheckCircle2, XCircle, Loader2, Zap, ExternalLink,
} from 'lucide-react';

interface ReportDetailProps {
  report: Report;
  onClose: () => void;
  onActionComplete: () => void;
  onBanUser: (userId: string) => void;
}

const RESOLUTION_OPTIONS: { value: 'resolved' | 'dismissed'; label: string; className: string }[] = [
  {
    value: 'resolved',
    label: 'Çözüldü — Aksiyon alındı',
    className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  {
    value: 'dismissed',
    label: 'Reddedildi — Şikayet geçersiz',
    className: 'bg-slate-700/40 border-slate-600/30 text-slate-400',
  },
];

export const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  onClose,
  onActionComplete,
  onBanUser,
}) => {
  const [resolution, setResolution] = useState<'resolved' | 'dismissed' | null>(null);
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!resolution) return;
    if (!notes.trim()) {
      setActionError('Lütfen bir not girin.');
      return;
    }
    setSubmitting(true);
    setActionError(null);

    const { error } = await adminPanelService.resolveReport(report.id, resolution, notes);
    if (error) {
      setActionError(error);
      setSubmitting(false);
    } else {
      onActionComplete();
      onClose();
    }
  };

  const canAct = report.status === 'pending' || report.status === 'under_review';

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{adminPanelService.getReportTypeIcon(report.report_type)}</span>
            <h3 className="text-base font-bold text-white">
              {adminPanelService.getReportTypeLabel(report.report_type)}
            </h3>
            {report.auto_actioned && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                <Zap size={9} /> Otomatik Aksiyon
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Parties */}
          <div className="grid grid-cols-2 gap-3">
            {/* Reporter */}
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Şikayetçi</p>
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-slate-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-white truncate">
                  {report.reporter_name ?? 'Anonim'}
                </p>
              </div>
            </div>

            {/* Reported */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Hedef</p>
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-red-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-white truncate">
                  {report.reported_user_name ?? 'Bilinmiyor'}
                </p>
              </div>
              {report.reported_user_email && (
                <p className="text-[11px] text-slate-500 truncate">{report.reported_user_email}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Açıklama
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">{report.description}</p>
            </div>
          )}

          {/* Evidence */}
          {report.evidence_urls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Kanıt Görselleri ({report.evidence_urls.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {report.evidence_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all flex items-center justify-center group"
                  >
                    <img
                      src={url}
                      alt={`Kanıt ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <ExternalLink size={16} className="text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Auto-action info */}
          {report.auto_actioned && (
            <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <Zap size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Bu şikayet için otomatik kısıtlama uygulandı. Kullanıcı profilini inceleyerek ek aksiyon alabilirsiniz.
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5">
              <p className="text-slate-500 mb-0.5">Tarih</p>
              <p className="text-white font-semibold">
                {new Date(report.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5">
              <p className="text-slate-500 mb-0.5">Durum</p>
              <p className="text-white font-semibold capitalize">{report.status.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Existing resolution notes */}
          {report.resolution_notes && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1">Mevcut Notlar</p>
              <p className="text-xs text-slate-300">{report.resolution_notes}</p>
            </div>
          )}

          {/* Action section */}
          {canAct && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aksiyon</p>

              {/* Ban target user button */}
              <button
                type="button"
                onClick={() => onBanUser(report.reported_user_id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all"
              >
                <XCircle size={15} /> Hedef Kullanıcıyı Yasakla
              </button>

              {/* Resolution pick */}
              <div className="space-y-2">
                {RESOLUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResolution(opt.value)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-sm font-semibold ${
                      resolution === opt.value ? opt.className : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Karar notunu girin…"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
              />

              {actionError && <p className="text-xs text-red-400">{actionError}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {canAct && (
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
              onClick={() => void handleSubmit()}
              disabled={!resolution || submitting}
              className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> İşleniyor…</>
              ) : (
                <><Flag size={14} /> Karara Bağla</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
