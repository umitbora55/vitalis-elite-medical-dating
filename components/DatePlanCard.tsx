import React, { useState } from 'react';
import { datePlanService, type DatePlan, type PlanStatus } from '../services/datePlanService';
import { MapPin, Check, Pencil, X, Loader2, Clock, Heart } from 'lucide-react';
import { DateCheckinButton } from './DateCheckinButton';
import { PlanPledgeModal } from './PlanPledgeModal';
import { PlanPledge } from '../types';

interface DatePlanCardProps {
  plan: DatePlan;
  currentUserId: string;
  onStatusChange: (plan: DatePlan) => void;
  onModify?: (plan: DatePlan) => void;
  compact?: boolean;
}

const PLAN_EMOJI: Record<string, string> = {
  coffee: '☕',
  dinner: '🍽️',
  walk: '🚶',
  custom: '✨',
};

const STATUS_CONFIG: Record<PlanStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-900/20 border-amber-500/30', text: 'text-amber-400', label: 'Bekliyor' },
  confirmed: { bg: 'bg-emerald-900/20 border-emerald-500/30', text: 'text-emerald-400', label: 'Onaylandı ✓' },
  declined: { bg: 'bg-red-900/20 border-red-500/30', text: 'text-red-400', label: 'Reddedildi' },
  modified: { bg: 'bg-blue-900/20 border-blue-500/30', text: 'text-blue-400', label: 'Değiştirildi' },
  cancelled: { bg: 'bg-slate-800/50 border-slate-700', text: 'text-slate-500', label: 'İptal edildi' },
};

export const DatePlanCard: React.FC<DatePlanCardProps> = ({
  plan,
  currentUserId,
  onStatusChange,
  onModify,
  compact = false,
}) => {
  const [loading, setLoading]           = useState<string | null>(null);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [myPledge, setMyPledge]         = useState<PlanPledge | null>(null);

  const isProposer = plan.proposer_id === currentUserId;
  const canRespond = !isProposer && plan.status === 'pending';
  const canCancel = (isProposer || !isProposer) && ['pending', 'modified', 'confirmed'].includes(plan.status);
  const canModify = isProposer && ['pending', 'modified'].includes(plan.status);

  const statusCfg = STATUS_CONFIG[plan.status];
  const emoji = PLAN_EMOJI[plan.plan_type] ?? '📅';

  const handleAction = async (action: 'confirm' | 'decline' | 'cancel') => {
    setLoading(action);
    try {
      if (action === 'confirm') {
        await datePlanService.respondToPlan(plan.id, currentUserId, 'confirmed');
        onStatusChange({ ...plan, status: 'confirmed', responder_id: currentUserId });
      } else if (action === 'decline') {
        await datePlanService.respondToPlan(plan.id, currentUserId, 'declined');
        onStatusChange({ ...plan, status: 'declined', responder_id: currentUserId });
      } else if (action === 'cancel') {
        await datePlanService.cancelPlan(plan.id);
        onStatusChange({ ...plan, status: 'cancelled' });
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(null);
    }
  };

  if (plan.status === 'cancelled') return null;

  return (
    <div className={`rounded-2xl border ${statusCfg.bg} p-3.5 ${compact ? 'mx-2 my-1.5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl flex-shrink-0">{emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold text-sm truncate">
                {plan.title ?? `${emoji} ${plan.plan_type}`}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/60 ${statusCfg.text}`}>
                {statusCfg.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {plan.selected_time && (
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <Clock size={11} />
                  <span>{datePlanService.formatPlanDateTime(plan.selected_time)}</span>
                </div>
              )}
              {plan.location && (
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <MapPin size={11} />
                  <span className="truncate max-w-[120px]">{plan.location}</span>
                </div>
              )}
              {plan.duration_minutes && (
                <span className="text-slate-500 text-xs">{plan.duration_minutes} dk</span>
              )}
            </div>

            {plan.notes && (
              <p className="text-slate-500 text-xs mt-1 italic line-clamp-1">"{plan.notes}"</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {canRespond && (
            <>
              <button
                onClick={() => handleAction('confirm')}
                disabled={!!loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                title="Onayla"
              >
                {loading === 'confirm' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Onayla
              </button>
              <button
                onClick={() => handleAction('decline')}
                disabled={!!loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:text-white transition-all disabled:opacity-50"
                title="Reddet"
              >
                {loading === 'decline' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              </button>
            </>
          )}

          {canModify && onModify && (
            <button
              onClick={() => onModify(plan)}
              disabled={!!loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:text-white transition-all disabled:opacity-50"
              title="Değiştir"
            >
              <Pencil size={12} />
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={!!loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:text-red-400 transition-all disabled:opacity-50"
              title="İptal"
            >
              {loading === 'cancel' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            </button>
          )}

          {/* Pledge button for confirmed plans */}
          {plan.status === 'confirmed' && !myPledge && (
            <button
              type="button"
              onClick={() => setShowPledgeModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:text-rose-400 hover:border-rose-500/40 transition-all"
              title="Taahhüt Et"
            >
              <Heart size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Date OS Check-in / Check-out */}
      {plan.status === 'confirmed' && plan.selected_time && (
        <DateCheckinButton
          planId={plan.id}
          userId={currentUserId}
          planSelectedTime={plan.selected_time}
          planStatus={plan.status}
          onStatusChange={() => onStatusChange(plan)}
        />
      )}

      {/* Pledge badge (if pledged) */}
      {myPledge && (
        <div className="mt-2 flex items-center gap-1.5">
          <Heart size={10} className="text-rose-400" />
          <span className="text-[10px] text-rose-400 font-semibold">₺{myPledge.amount_tl} taahhüt</span>
        </div>
      )}

      {/* Pledge modal */}
      {showPledgeModal && (
        <PlanPledgeModal
          planId={plan.id}
          userId={currentUserId}
          onPledged={(pledge) => {
            setMyPledge(pledge);
            setShowPledgeModal(false);
          }}
          onClose={() => setShowPledgeModal(false)}
        />
      )}
    </div>
  );
};
