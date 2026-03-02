/**
 * DateCheckinButton
 *
 * Feature 8: Date OS Check-in / Check-out
 * Shown on a DatePlanCard when:
 * - Plan status is 'confirmed' and check-in window is open, OR
 * - Plan status is 'ongoing' (for checkout)
 *
 * The button label transitions: Check In → Checked In → Check Out → Done
 */

import React, { useEffect, useState } from 'react';
import { MapPin, LogIn, LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import { dateCheckinService } from '../services/dateCheckinService';

interface DateCheckinButtonProps {
  planId:           string;
  userId:           string;
  /** ISO string of the plan's scheduled time */
  planSelectedTime: string;
  planStatus:       string;
  onStatusChange?:  () => void;
}

export const DateCheckinButton: React.FC<DateCheckinButtonProps> = ({
  planId,
  userId,
  planSelectedTime,
  planStatus,
  onStatusChange,
}) => {
  const [hasCheckedIn,  setHasCheckedIn]  = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [acting,  setActing]              = useState(false);
  const [error,   setError]               = useState<string | null>(null);

  const windowOpen = dateCheckinService.isCheckinWindowOpen(planSelectedTime);

  // Fetch current checkin state
  useEffect(() => {
    const load = async () => {
      const [cin, cout] = await Promise.all([
        dateCheckinService.hasUserCheckedIn(planId, userId),
        dateCheckinService.hasUserCheckedOut(planId, userId),
      ]);
      setHasCheckedIn(cin);
      setHasCheckedOut(cout);
      setLoading(false);
    };
    void load();
  }, [planId, userId]);

  // Only render during window or for ongoing plans
  const shouldShow =
    (planStatus === 'confirmed' && windowOpen && !hasCheckedIn) ||
    (planStatus === 'ongoing'   && hasCheckedIn && !hasCheckedOut) ||
    hasCheckedIn;

  if (!shouldShow || loading) return null;

  const handleAction = async () => {
    setActing(true);
    setError(null);

    const action = !hasCheckedIn
      ? dateCheckinService.checkIn(planId, userId)
      : dateCheckinService.checkOut(planId, userId);

    const { error: err } = await action;
    setActing(false);

    if (err) { setError(err); return; }

    if (!hasCheckedIn) {
      setHasCheckedIn(true);
    } else {
      setHasCheckedOut(true);
    }

    onStatusChange?.();
  };

  const isComplete = hasCheckedIn && hasCheckedOut;

  return (
    <div className="mt-3 space-y-1">
      <button
        type="button"
        onClick={() => void handleAction()}
        disabled={acting || isComplete}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:cursor-not-allowed ${
          isComplete
            ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-400'
            : hasCheckedIn
              ? 'bg-amber-600 text-white hover:bg-amber-500'
              : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-gold-500/50 hover:text-gold-400'
        }`}
      >
        {acting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isComplete ? (
          <><CheckCircle2 size={14} /> Tamamlandı</>
        ) : hasCheckedIn ? (
          <><LogOut size={14} /> Check-out</>
        ) : (
          <><LogIn size={14} /> <MapPin size={12} /> Check-in</>
        )}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
};
