import React, { useState } from 'react';
import {
  adminPanelService,
  BAN_DURATIONS,
  RestrictionType,
} from '../../services/adminPanelService';
import { X, ShieldOff, Loader2 } from 'lucide-react';

interface BanUserModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onActionComplete: () => void;
}

const RESTRICTION_TYPES: { value: RestrictionType; label: string; description: string }[] = [
  {
    value: 'shadow_limit',
    label: '👥 Gölge Kısıtlama',
    description: 'Kullanıcı habersiz şekilde arama sonuçlarından gizlenir',
  },
  {
    value: 'messaging_disabled',
    label: '🔇 Mesajlaşma Engeli',
    description: 'Yeni mesaj gönderemez, mevcut konuşmalar devam eder',
  },
  {
    value: 'matching_disabled',
    label: '❌ Eşleşme Engeli',
    description: 'Yeni eşleşme yapamaz, var olanlar etkilenmez',
  },
  {
    value: 'temp_ban',
    label: '⏸ Geçici Yasak',
    description: 'Hesap askıya alınır, tüm aktiviteler durur',
  },
  {
    value: 'perm_ban',
    label: '🚫 Kalıcı Yasak',
    description: 'Hesap kalıcı olarak kapatılır',
  },
];

export const BanUserModal: React.FC<BanUserModalProps> = ({
  userId,
  userName,
  onClose,
  onActionComplete,
}) => {
  const [restrictionType, setRestrictionType] = useState<RestrictionType | null>(null);
  const [durationHours, setDurationHours]     = useState<number | null>(24); // default 1 day
  const [reason, setReason]                   = useState('');
  const [submitting, setSubmitting]           = useState(false);
  const [actionError, setActionError]         = useState<string | null>(null);

  const isPermanent = restrictionType === 'perm_ban';

  const handleSubmit = async () => {
    if (!restrictionType) { setActionError('Lütfen kısıtlama türünü seçin.'); return; }
    if (!reason.trim()) { setActionError('Lütfen bir sebep girin.'); return; }
    if (!isPermanent && durationHours === null && restrictionType === 'temp_ban') {
      setActionError('Lütfen süre seçin.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    const hours = isPermanent ? null : durationHours;
    const { error } = await adminPanelService.banUser(userId, restrictionType, reason, hours);

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
            <ShieldOff size={18} className="text-red-400" />
            <h3 className="text-base font-bold text-white">Kullanıcı Kısıtla / Yasakla</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Target user */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-[11px] text-red-400 font-semibold uppercase tracking-wider mb-0.5">Hedef</p>
            <p className="text-sm font-bold text-white">{userName}</p>
          </div>

          {/* Restriction type */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kısıtlama Türü *</p>
            <div className="space-y-2">
              {RESTRICTION_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setRestrictionType(rt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    restrictionType === rt.value
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <p className={`text-sm font-semibold ${restrictionType === rt.value ? 'text-red-400' : 'text-white'}`}>
                    {rt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{rt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Duration (not shown for perm_ban or shadow/messaging/matching types) */}
          {(restrictionType === 'temp_ban') && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Süre *</p>
              <div className="grid grid-cols-2 gap-2">
                {BAN_DURATIONS.filter((d) => d.hours !== null).map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setDurationHours(d.hours)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      durationHours === d.hours
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sebep *</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Kısıtlama sebebini girin…"
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
            />
          </div>

          {/* Permanent warning */}
          {isPermanent && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400 font-semibold">
                ⚠️ Kalıcı yasak geri alınamaz. Emin misiniz?
              </p>
            </div>
          )}

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
            disabled={!restrictionType || !reason.trim() || submitting}
            className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={14} className="animate-spin" /> İşleniyor…</> : <><ShieldOff size={14} /> Uygula</>}
          </button>
        </div>
      </div>
    </div>
  );
};
