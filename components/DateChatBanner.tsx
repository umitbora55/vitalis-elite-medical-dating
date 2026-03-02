/**
 * DateChatBanner — Özellik 4: Date Odaklı Akış
 *
 * Sticky banner that appears at the top of a chat conversation
 * to surface the active date plan or pending invitation status.
 *
 * States:
 *   • invitation_pending_sent     — "Daveti bekliyorsun" + countdown
 *   • invitation_pending_received — "Bir davet aldın!" + Accept/Decline CTAs
 *   • plan_confirmed              — "Buluşma onaylandı" + venue + countdown
 *   • plan_today                  — "Bugün buluşuyorsunuz!" + safety CTA
 *   • feedback_ready              — "Buluşma nasıldı?" + feedback CTA
 *   • null                        — renders nothing
 *
 * Used by the chat screen component (ChatView / ChatScreen).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, Clock, Shield, MessageSquareDiff, X,
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
} from 'lucide-react';
import type { DatePlan } from '../services/datePlanService';
import type { DateInvitation } from '../types';
import { dateInvitationService, getDateTypeOption } from '../services/dateInvitationService';
import { datePlanService } from '../services/datePlanService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BannerState =
  | 'invitation_sent'
  | 'invitation_received'
  | 'plan_confirmed'
  | 'plan_today'
  | 'feedback_ready'
  | null;

export interface DateChatBannerProps {
  matchId: string;
  partnerName: string;
  partnerAvatar: string;
  currentUserId: string;
  /** Called when user wants to open DateInvitationFlow */
  onPlanDate?: () => void;
  /** Called when user clicks safety icon during plan_today */
  onOpenSafety?: () => void;
  /** Called when user clicks feedback CTA */
  onOpenFeedback?: () => void;
  /** Called when user accepts the invitation */
  onAcceptInvitation?: (planId: string) => void;
  /** Called when user declines the invitation */
  onDeclineInvitation?: () => void;
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(targetIso: string | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!targetIso) { setLabel(''); return; }

    const tick = () => {
      const msLeft = new Date(targetIso).getTime() - Date.now();
      if (msLeft <= 0) { setLabel('Süresi doldu'); return; }
      const totalMin = Math.floor(msLeft / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      setLabel(h > 0 ? `${h}s ${m}dk` : `${m}dk`);
    };

    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetIso]);

  return label;
}

// ── Main Component ────────────────────────────────────────────────────────────

export const DateChatBanner: React.FC<DateChatBannerProps> = ({
  matchId,
  partnerName,
  partnerAvatar,
  currentUserId,
  onPlanDate,
  onOpenSafety,
  onOpenFeedback,
  onAcceptInvitation,
  onDeclineInvitation,
}) => {
  const [invitation, setInvitation] = useState<DateInvitation | null>(null);
  const [plan, setPlan] = useState<DatePlan | null>(null);
  const [bannerState, setBannerState] = useState<BannerState>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      const [inv, activePlan] = await Promise.all([
        dateInvitationService.getActiveInvitationForMatch(matchId),
        datePlanService.getActivePlanForMatch(matchId),
      ]);

      setInvitation(inv);
      setPlan(activePlan);

      // Determine banner state
      if (activePlan) {
        if (activePlan.status === 'confirmed' || activePlan.status === 'modified') {
          const planDate = activePlan.selected_time ? new Date(activePlan.selected_time) : null;
          const isToday = planDate
            ? planDate.toDateString() === new Date().toDateString()
            : false;
          const isPast = planDate ? planDate.getTime() < Date.now() - 2 * 60 * 60 * 1000 : false;

          if (isPast) {
            setBannerState('feedback_ready');
          } else if (isToday) {
            setBannerState('plan_today');
          } else {
            setBannerState('plan_confirmed');
          }
        }
        return;
      }

      if (inv && inv.status === 'pending') {
        setBannerState(
          inv.inviter_id === currentUserId
            ? 'invitation_sent'
            : 'invitation_received',
        );
        return;
      }

      setBannerState(null);
    };

    void load();
  }, [matchId, currentUserId]);

  const countdown = useCountdown(
    bannerState === 'invitation_sent' || bannerState === 'invitation_received'
      ? (invitation?.expires_at ?? null)
      : bannerState === 'plan_confirmed' || bannerState === 'plan_today'
      ? (plan?.selected_time ?? null)
      : null,
  );

  // ── Invitation actions ────────────────────────────────────────────────────────

  const handleAccept = useCallback(async () => {
    if (!invitation) return;
    setIsActionLoading(true);
    try {
      const planId = await dateInvitationService.acceptInvitation(invitation.id);
      onAcceptInvitation?.(planId);
      setBannerState('plan_confirmed');
      const updatedPlan = await datePlanService.getActivePlanForMatch(matchId);
      setPlan(updatedPlan);
    } catch { /* error surfaced by service */ }
    finally { setIsActionLoading(false); }
  }, [invitation, matchId, onAcceptInvitation]);

  const handleDecline = useCallback(async () => {
    if (!invitation) return;
    setIsActionLoading(true);
    try {
      await dateInvitationService.declineInvitation(invitation.id, 'Şu an müsait değilim');
      onDeclineInvitation?.();
      setBannerState(null);
    } catch { /* silent */ }
    finally { setIsActionLoading(false); }
  }, [invitation, onDeclineInvitation]);

  // ── Render guard ──────────────────────────────────────────────────────────────

  if (!bannerState || dismissed) return null;

  // ── Style map ─────────────────────────────────────────────────────────────────

  const stateStyles: Record<NonNullable<BannerState>, { bg: string; border: string; icon: React.ReactNode }> = {
    invitation_sent:     { bg: 'bg-blue-500/8',    border: 'border-blue-500/20',    icon: <Clock size={15} className="text-blue-400" /> },
    invitation_received: { bg: 'bg-gold-500/8',    border: 'border-gold-500/25',    icon: <CalendarDays size={15} className="text-gold-400" /> },
    plan_confirmed:      { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', icon: <CalendarDays size={15} className="text-emerald-400" /> },
    plan_today:          { bg: 'bg-gold-500/10',   border: 'border-gold-500/30',    icon: <CalendarDays size={15} className="text-gold-400" /> },
    feedback_ready:      { bg: 'bg-pink-500/8',    border: 'border-pink-500/20',    icon: <MessageSquareDiff size={15} className="text-pink-400" /> },
  };

  const s = stateStyles[bannerState];

  const dateTypeLabel = invitation
    ? getDateTypeOption(invitation.preferred_type).icon + ' ' + getDateTypeOption(invitation.preferred_type).label
    : plan?.plan_type
    ? getDateTypeOption(plan.plan_type as import('../types').ExtendedPlanType).icon + ' ' + getDateTypeOption(plan.plan_type as import('../types').ExtendedPlanType).label
    : '';

  const planFormatted = plan?.selected_time
    ? datePlanService.formatPlanDateTime(plan.selected_time)
    : '';

  return (
    <div className={`w-full border-b ${s.bg} ${s.border} transition-all duration-300`}>
      {/* Main row */}
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <img src={partnerAvatar} alt={partnerName} className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10" />
        {s.icon}

        <div className="flex-1 min-w-0">
          {bannerState === 'invitation_sent' && (
            <p className="text-xs text-blue-300 font-medium truncate">
              Davet gönderildi — <span className="font-bold">{countdown}</span> kaldı
            </p>
          )}
          {bannerState === 'invitation_received' && (
            <p className="text-xs text-gold-300 font-medium truncate">
              <span className="font-bold">{partnerName}</span> seni {dateTypeLabel} için davet etti
            </p>
          )}
          {bannerState === 'plan_confirmed' && (
            <p className="text-xs text-emerald-300 font-medium truncate">
              Buluşma onaylandı — <span className="font-bold">{planFormatted || countdown}</span>
            </p>
          )}
          {bannerState === 'plan_today' && (
            <p className="text-xs text-gold-300 font-bold truncate">
              🎉 Bugün buluşuyorsunuz!{plan?.location ? ` · ${plan.location}` : ''}
            </p>
          )}
          {bannerState === 'feedback_ready' && (
            <p className="text-xs text-pink-300 font-medium truncate">
              Buluşma nasıldı? Geri bildirim ver →
            </p>
          )}
        </div>

        {/* Right side action or collapse */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {bannerState === 'plan_today' && onOpenSafety && (
            <button
              onClick={onOpenSafety}
              className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 transition-colors"
              aria-label="Güvenlik panelini aç"
            >
              <Shield size={14} className="text-emerald-400" />
            </button>
          )}
          {bannerState === 'feedback_ready' && onOpenFeedback && (
            <button
              onClick={onOpenFeedback}
              className="px-2.5 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs font-semibold transition-colors"
            >
              Değerlendir
            </button>
          )}
          {(bannerState === 'plan_confirmed' || bannerState === 'plan_today') && (
            <button
              onClick={() => setIsCollapsed((c) => !c)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={isCollapsed ? 'Genişlet' : 'Daralt'}
            >
              {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
          {(bannerState === 'invitation_sent' || bannerState === 'feedback_ready') && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-400 transition-colors"
              aria-label="Kapat"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail + actions */}
      {!isCollapsed && (
        <>
          {/* Invitation received action buttons */}
          {bannerState === 'invitation_received' && (
            <div className="flex gap-2 px-4 pb-3">
              <button
                onClick={handleDecline}
                disabled={isActionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-600/60 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                <XCircle size={13} /> Reddet
              </button>
              <button
                onClick={handleAccept}
                disabled={isActionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gold-500 text-slate-900 text-xs font-bold hover:bg-gold-400 transition-colors disabled:opacity-50"
              >
                {isActionLoading ? (
                  <span className="w-3 h-3 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
                ) : (
                  <><CheckCircle2 size={13} /> Kabul Et</>
                )}
              </button>
            </div>
          )}

          {/* Plan details (collapsed) */}
          {(bannerState === 'plan_confirmed' || bannerState === 'plan_today') && plan && (
            <div className="px-4 pb-3 flex items-center gap-4">
              {dateTypeLabel && (
                <span className="text-xs text-slate-400 font-medium">{dateTypeLabel}</span>
              )}
              {plan.location && (
                <span className="text-xs text-slate-500 truncate">📍 {plan.location}</span>
              )}
              {bannerState === 'plan_today' && onPlanDate && (
                <button
                  onClick={onPlanDate}
                  className="ml-auto text-xs text-gold-400 font-semibold hover:text-gold-300 transition-colors"
                >
                  Detay
                </button>
              )}
            </div>
          )}

          {/* No plan — nudge to send invitation */}
          {bannerState === null && onPlanDate && (
            <div className="px-4 pb-3">
              <button
                onClick={onPlanDate}
                className="w-full py-2.5 rounded-xl border border-gold-500/25 text-xs font-semibold text-gold-400 hover:bg-gold-500/8 transition-colors"
              >
                <CalendarDays size={12} className="inline mr-1.5" />
                Date planı oluştur
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
