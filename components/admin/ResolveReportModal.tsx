import React, { useState } from 'react';
import { adminPanelService, Report } from '../../services/adminPanelService';
import { X, Flag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface ResolveReportModalProps {
  report: Report;
  onClose: () => void;
  onActionComplete: () => void;
}

const RESOLUTION_OPTIONS: {
  value: 'resolved' | 'dismissed';
  label: string;
  description: string;
  icon: React.ReactNode;
  className: string;
}[] = [
  {
    value: 'resolved',
    label: 'Çözüldü',
    description: 'Gerekli aksiyon alındı, kullanıcı uyarıldı veya kısıtlandı',
    icon: <CheckCircle2 size={16} />,
    className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  {
    value: 'dismissed',
    label: 'Reddedildi',
    description: 'Şikayet geçersiz, kural ihlali tespit edilmedi',
    icon: <XCircle size={16} />,
    className: 'bg-slate-700/40 border-slate-600/30 text-slate-400',
  },
];

export const ResolveReportModal: React.FC<ResolveReportModalProps> = ({
  report,
  onClose,
  onActionComplete,
}) => {
  const [resolution, setResolution] = useState<'resolved' | 'dismissed' | null>(null);
  const [notes, setNotes]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!resolution) { setActionError('Lütfen bir karar seçin.'); return; }
    if (!notes.trim()) { setActionError('Lütfen karar notunu girin.'); return; }

    setSubmitting(true);
    setActionError(null);

    const { error } = await adminPanelService.resolveReport(report.id, resolution, notes);
    if (error) { setActionError(error); setSubmitting(false); }
    else { onActionComplete(); onClose(); }
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
            <span className="text-xl">{adminPanelService.getReportTypeIcon(report.report_type)}</span>
            <div>
              <h3 className="text-base font-bold text-white">Şikayeti Karara Bağla</h3>
              <p className="text-[11px] text-slate-500">
                {adminPanelService.getReportTypeLabel(report.report_type)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Report summary */}
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="truncate max-w-[100px]">{report.reporter_name ?? 'Anonim'}</span>
              <span className="text-slate-600">→</span>
              <span className="font-bold text-white truncate max-w-[100px]">{report.reported_user_name ?? 'Bilinmiyor'}</span>
            </div>
            {report.description && (
              <p className="text-xs text-slate-400 line-clamp-3">{report.description}</p>
            )}
          </div>

          {/* Resolution picker */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karar *</p>
            {RESOLUTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setResolution(opt.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border transition-all ${
                  resolution === opt.value ? opt.className : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <span className="flex-shrink-0 mt-0.5">{opt.icon}</span>
                <div className="text-left">
                  <p className={`text-sm font-bold ${resolution === opt.value ? '' : 'text-white'}`}>{opt.label}</p>
                  <p className={`text-xs mt-0.5 ${resolution === opt.value ? 'opacity-70' : 'text-slate-500'}`}>
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Karar Notu *</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alınan aksiyon veya karar gerekçesini girin…"
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
            />
          </div>

          {actionError && <p className="text-xs text-red-400">{actionError}</p>}
        </div>

        {/* Footer */}
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
            disabled={!resolution || !notes.trim() || submitting}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              resolution === 'resolved'
                ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> İşleniyor…</>
              : <><Flag size={14} /> Karara Bağla</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};
