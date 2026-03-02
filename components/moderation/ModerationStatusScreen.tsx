/**
 * ModerationStatusScreen — Özellik 7: Şeffaf Moderasyon
 *
 * Moderasyon kararı detay ekranı (DSA Article 17 uyumlu).
 * Kullanıcıya şunları net olarak gösterir:
 *   ✓ Ne yapıldı (aksiyon tipi + süre)
 *   ✓ Neden (reason code + Türkçe açıklama)
 *   ✓ Hangi içerikten dolayı (evidence_summary)
 *   ✓ Otomatik mi / insan mı
 *   ✓ İtiraz butonu (her zaman görünür)
 *   ✓ Kalan süre (temp_ban ise countdown)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  Info,
  Clock,
  Bot,
  User,
  ChevronRight,
  Star,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  transparentModerationService,
  ACTION_LABELS,
  REASON_CODE_CATALOG,
  CATEGORY_LABELS,
} from '../../services/transparentModerationService';
import type { ModerationNotification, ModerationDecisionRating } from '../../types';

// ── Sub-components ─────────────────────────────────────────────────────────

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/60 last:border-0">
    {icon && <div className="w-4 flex-shrink-0 mt-0.5 text-slate-500">{icon}</div>}
    <div className="flex-1">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
      <div className="text-sm text-slate-200 mt-0.5">{value}</div>
    </div>
  </div>
);

interface FairnessRatingProps {
  notificationId: string;
  onRated: () => void;
}
const FairnessRating: React.FC<FairnessRatingProps> = ({ notificationId, onRated }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    const ok = await transparentModerationService.rateDecision({
      notification_id: notificationId,
      rating: selected as ModerationDecisionRating['rating'],
      comment: comment.trim() || undefined,
    });
    if (ok) { setSaved(true); onRated(); }
    setSaving(false);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-sm">
        <CheckCircle2 size={14} /> Değerlendirmeniz alındı, teşekkürler.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Bu kararı adil buldunuz mu?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setSelected(n)}
            className={`p-1.5 rounded transition-colors ${
              selected && n <= selected ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
            }`}
            aria-label={`${n} yıldız`}
          >
            <Star size={16} fill={selected && n <= selected ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Yorumunuz (isteğe bağlı, max 500 karakter)"
            maxLength={500}
            rows={2}
            className="w-full text-xs bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor…' : 'Değerlendirmeyi Gönder'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export interface ModerationStatusScreenProps {
  notification: ModerationNotification;
  onClose: () => void;
  onOpenAppeal: (notification: ModerationNotification) => void;
}

export const ModerationStatusScreen: React.FC<ModerationStatusScreenProps> = ({
  notification,
  onClose,
  onOpenAppeal,
}) => {
  const [ratingDone, setRatingDone] = useState(false);

  const actionInfo = ACTION_LABELS[notification.action_type] ?? ACTION_LABELS['warning'];
  const reasonInfo = notification.reason_code
    ? REASON_CODE_CATALOG[notification.reason_code]
    : null;

  const isSevere = notification.action_type === 'perm_ban' || notification.action_type === 'temp_ban';
  const isLift  = notification.action_type === 'restriction_lifted';
  const canAppeal = !isLift && notification.action_type !== 'warning';

  // Mark as read on open
  useEffect(() => {
    if (!notification.read_at) {
      void transparentModerationService.markNotificationRead(notification.id);
    }
  }, [notification.id, notification.read_at]);

  const expiresLabel = transparentModerationService.formatExpiresIn(notification.expires_at);

  const severityColor = isLift
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : isSevere
      ? 'border-red-500/30 bg-red-500/5'
      : 'border-amber-500/30 bg-amber-500/5';

  const handleAppeal = useCallback(() => {
    onOpenAppeal(notification);
  }, [notification, onOpenAppeal]);

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b border-slate-800/60 ${severityColor}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{actionInfo.icon}</div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                  Moderasyon Kararı
                </p>
                <h2 className={`text-base font-bold mt-0.5 ${actionInfo.color}`}>
                  {notification.title_tr}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors flex-shrink-0"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Body text */}
          <p className="text-sm text-slate-300 leading-relaxed">{notification.body_tr}</p>

          {/* Key info grid */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 px-4 divide-y divide-slate-800/60">

            {/* Reason code */}
            {notification.reason_code && reasonInfo && (
              <InfoRow
                label="İhlal Kodu"
                icon={<FileText size={14} />}
                value={
                  <div>
                    <span className="font-mono text-amber-400 text-xs mr-2">{notification.reason_code}</span>
                    <span>{reasonInfo.title_tr}</span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {reasonInfo.description_tr}
                    </p>
                  </div>
                }
              />
            )}

            {/* Reason category */}
            {reasonInfo && (
              <InfoRow
                label="Kategori"
                icon={<Shield size={14} />}
                value={<span className="text-slate-300">{CATEGORY_LABELS[reasonInfo.category]}</span>}
              />
            )}

            {/* Tetikleyen içerik özeti */}
            {notification.evidence_summary && (
              <InfoRow
                label="Tetikleyen İçerik"
                icon={<AlertTriangle size={14} />}
                value={
                  <span className="text-slate-400 text-xs italic leading-relaxed">
                    {notification.evidence_summary}
                  </span>
                }
              />
            )}

            {/* Karar tipi */}
            <InfoRow
              label="Karar Veren"
              icon={notification.is_automated ? <Bot size={14} /> : <User size={14} />}
              value={
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    notification.is_automated
                      ? 'bg-slate-700/50 border-slate-600/40 text-slate-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {notification.is_automated ? 'Otomatik Sistem' : 'İnsan Moderatör'}
                  </span>
                  {notification.is_automated && (
                    <span className="text-[10px] text-slate-600">
                      (DSA Art.20 gereği insan incelemesi mümkün)
                    </span>
                  )}
                </div>
              }
            />

            {/* Bitiş tarihi */}
            {notification.expires_at && (
              <InfoRow
                label="Kısıtlama Süresi"
                icon={<Clock size={14} />}
                value={
                  <span className={`text-sm font-medium ${
                    isSevere ? 'text-orange-400' : 'text-slate-300'
                  }`}>
                    {expiresLabel}
                  </span>
                }
              />
            )}
          </div>

          {/* Kullanıcı yol gösterimi */}
          {reasonInfo && (
            <div className="px-4 py-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mb-1">
                    Ne yapmalısınız?
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{reasonInfo.user_guidance}</p>
                </div>
              </div>
            </div>
          )}

          {/* DSA bilgi notu */}
          <div className="px-3 py-2.5 bg-slate-800/30 border border-slate-700/30 rounded-xl">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Bu karar <span className="text-slate-400">DSA Madde 17</span> kapsamında verilmiştir.
              İtiraz hakkınız{' '}
              <span className="text-slate-400">6 ay</span> boyunca geçerlidir.
              İtirazlar{' '}
              <span className="text-slate-400">48 saat</span> içinde insan moderatör tarafından incelenir.
            </p>
          </div>

          {/* Fairness rating — yalnızca olumsuz kararlarda */}
          {!isLift && !ratingDone && (
            <div className="px-4 py-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
              <FairnessRating
                notificationId={notification.id}
                onRated={() => setRatingDone(true)}
              />
            </div>
          )}
        </div>

        {/* CTA Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-800/60 space-y-2">
          {canAppeal && (
            <button
              onClick={handleAppeal}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all"
            >
              <Shield size={15} /> İtiraz Et
              <span className="text-[10px] font-normal opacity-70 ml-1">(DSA Art.20 — Ücretsiz)</span>
            </button>
          )}
          {canAppeal && (
            <div className="flex items-center gap-1.5 justify-center">
              <Clock size={11} className="text-slate-600" />
              <p className="text-[10px] text-slate-600">48 saat SLA · İnsan incelemesi zorunlu</p>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight size={11} className="inline mr-1" />
            Anladım, kapat
          </button>
        </div>
      </div>
    </div>
  );
};
