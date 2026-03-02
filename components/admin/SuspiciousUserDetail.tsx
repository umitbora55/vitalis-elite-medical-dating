import React, { useState } from 'react';
import {
  adminPanelService,
  SuspiciousUser,
} from '../../services/adminPanelService';
import {
  X, AlertTriangle, Bot, Flag, User, Mail,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

interface SuspiciousUserDetailProps {
  user: SuspiciousUser;
  onClose: () => void;
  onActionComplete: () => void;
  onBanUser: (userId: string) => void;
}

const RESOLUTION_OPTIONS: { value: 'resolved' | 'false_positive'; label: string; description: string }[] = [
  {
    value: 'resolved',
    label: 'Çözüldü',
    description: 'Gerekli adımlar atıldı, vaka kapatıldı',
  },
  {
    value: 'false_positive',
    label: 'Yanlış Alarm',
    description: 'Şüphe doğrulanamadı, bayrak kaldırıldı',
  },
];

export const SuspiciousUserDetail: React.FC<SuspiciousUserDetailProps> = ({
  user,
  onClose,
  onActionComplete,
  onBanUser,
}) => {
  const [resolution, setResolution]     = useState<'resolved' | 'false_positive' | null>(null);
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [actionError, setActionError]   = useState<string | null>(null);

  const handleResolve = async () => {
    if (!resolution) return;
    if (!notes.trim()) {
      setActionError('Lütfen çözüm notunu girin.');
      return;
    }
    setSubmitting(true);
    setActionError(null);

    const { error } = await adminPanelService.resolveFlag(user.id, resolution, notes);
    if (error) {
      setActionError(error);
      setSubmitting(false);
    } else {
      onActionComplete();
      onClose();
    }
  };

  const severityClass = adminPanelService.getSeverityColor(user.severity);
  const canAct = user.status === 'open' || user.status === 'investigating';

  // Evidence keys to display nicely
  const evidenceEntries = Object.entries(user.evidence);

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
            <AlertTriangle size={18} className="text-amber-400" />
            <h3 className="text-base font-bold text-white">Şüpheli Kullanıcı</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* User info */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{user.user_name ?? 'İsimsiz'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Mail size={11} className="text-slate-500" />
                  <p className="text-xs text-slate-400 truncate">{user.user_email ?? '—'}</p>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${severityClass}`}>
                {user.severity.toUpperCase()}
              </span>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2">
              {user.auto_flagged && (
                <span className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  <Bot size={10} /> Otomatik işaretlendi
                </span>
              )}
              {user.report_count > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <Flag size={10} /> {user.report_count} şikayet
                </span>
              )}
            </div>
          </div>

          {/* Flag reason */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
              İşaretleme Sebebi
            </p>
            <p className="text-sm text-white">{user.flag_reason}</p>
          </div>

          {/* Evidence */}
          {evidenceEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kanıtlar</p>
              <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 space-y-2">
                {evidenceEntries.map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3">
                    <span className="text-[11px] font-semibold text-slate-500 min-w-[120px] flex-shrink-0">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-300 break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing resolution notes */}
          {user.resolution_notes && (
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3">
              <p className="text-[10px] text-slate-500 mb-1">Mevcut Notlar</p>
              <p className="text-xs text-slate-300">{user.resolution_notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zaman Çizelgesi</p>
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">İşaretlenme</span>
                <span className="text-slate-300">
                  {new Date(user.created_at).toLocaleString('tr-TR')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Durum</span>
                <span className="text-slate-300 capitalize">{user.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canAct && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aksiyon</p>

              {/* Ban button */}
              <button
                type="button"
                onClick={() => onBanUser(user.user_id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all"
              >
                <XCircle size={15} /> Kullanıcıyı Yasakla
              </button>

              {/* Resolution options */}
              <div className="grid grid-cols-2 gap-2">
                {RESOLUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResolution(opt.value)}
                    className={`text-left p-3 rounded-xl border transition-all space-y-1 ${
                      resolution === opt.value
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    <p className="text-[11px] leading-tight opacity-70">{opt.description}</p>
                  </button>
                ))}
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Çözüm notunu girin…"
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
              onClick={() => void handleResolve()}
              disabled={!resolution || submitting}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> İşleniyor…</>
              ) : (
                'Kaydet'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
