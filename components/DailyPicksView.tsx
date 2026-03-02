/**
 * VITALIS DailyPicksView — Özellik 3: Sınırlı Günlük Öneri Sistemi
 *
 * Replaces the original infinite-scroll deck with a curated, limited slate:
 *  • Max 7 high-quality profiles per day (4 categories)
 *  • Pending-match throttle: fewer picks when reply queue is full
 *  • Progress indicator (dots)
 *  • Category badge per profile (Yüksek Uyum / Keşif / Sürpriz / Yeni)
 *  • Same-hospital warning badge
 *  • Grid view mode (see all picks at once)
 *  • Positive "done for today" screen with stats + countdown
 *  • +2 bonus picks after completing the slate (once/day)
 *  • Healthcare schedule compatibility hints
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, X, Clock, Crown, Loader2, RefreshCw, BadgeCheck,
  MapPin, LayoutGrid, CreditCard, AlertTriangle, MessageCircle,
  Sparkles, Star, Compass, Zap, Building2, Calendar, ChevronRight,
} from 'lucide-react';

import { slateService, getPendingRule } from '../services/slateService';
import { useSlateStore } from '../stores/slateStore';
import { useMatchStore } from '../stores/matchStore';
import { useUserStore } from '../stores/userStore';

import type { Profile, DailySlate, SlateProfile, SlateCategory } from '../types';

// ── Props (kept identical to original for zero App.tsx changes) ───────────────

interface DailyPicksViewProps {
  userId:          string;
  isPremium:       boolean;
  onUpgradeClick:  () => void;
  onViewProfile?:  (profile: Profile) => void;
  onGoToMatches?:  () => void;
}

// ── Category display metadata ─────────────────────────────────────────────────

const CATEGORY_META: Record<SlateCategory, { label: string; icon: React.ReactNode; color: string }> = {
  high_compatibility: {
    label: 'Yüksek Uyum',
    icon:  <Star size={10} className="fill-current" />,
    color: 'bg-emerald-500/90 text-white',
  },
  exploration: {
    label: 'Keşif',
    icon:  <Compass size={10} />,
    color: 'bg-blue-500/90 text-white',
  },
  serendipity: {
    label: 'Sürpriz',
    icon:  <Sparkles size={10} />,
    color: 'bg-violet-500/90 text-white',
  },
  fresh_verified: {
    label: 'Yeni',
    icon:  <Zap size={10} className="fill-current" />,
    color: 'bg-amber-500/90 text-slate-950',
  },
};

// ── Countdown helper ──────────────────────────────────────────────────────────

function useCountdown(targetIso: string) {
  const calc = () => {
    const ms = new Date(targetIso).getTime() - Date.now();
    if (ms <= 0) return { h: 0, m: 0, s: 0 };
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return { h, m, s };
  };

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIso]);

  return time;
}

// ── Progress Dots ─────────────────────────────────────────────────────────────

const ProgressDots: React.FC<{ profiles: SlateProfile[]; currentIndex: number }> = ({
  profiles, currentIndex,
}) => (
  <div className="flex items-center gap-1 justify-center">
    {profiles.map((p, i) => {
      const isDone    = p.status === 'liked' || p.status === 'passed';
      const isCurrent = i === currentIndex;
      const isLiked   = p.status === 'liked';

      return (
        <motion.div
          key={p.id}
          animate={{ scale: isCurrent ? 1.3 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={`rounded-full transition-all duration-300 ${
            isCurrent
              ? 'w-4 h-2 bg-white'
              : isDone
              ? isLiked
                ? 'w-2 h-2 bg-emerald-400'
                : 'w-2 h-2 bg-slate-600'
              : 'w-2 h-2 bg-slate-700'
          }`}
        />
      );
    })}
  </div>
);

// ── Pending Match Warning Banner ──────────────────────────────────────────────

const PendingWarning: React.FC<{
  count: number;
  onGoToMatches?: () => void;
}> = ({ count, onGoToMatches }) => {
  const rule = getPendingRule(count);

  if (rule.severity === 'none') return null;

  const cfg = {
    info: {
      bg:   'bg-blue-900/40 border-blue-700/50',
      icon: <MessageCircle size={16} className="text-blue-400 shrink-0" />,
      text: `${count} kişi sohbet açmanı bekliyor.`,
    },
    warning: {
      bg:   'bg-amber-900/40 border-amber-700/50',
      icon: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
      text: `${count} bekleyen match! Yeni öneriler azaltıldı.`,
    },
    blocked: {
      bg:   'bg-red-900/40 border-red-700/50',
      icon: <AlertTriangle size={16} className="text-red-400 shrink-0" />,
      text: `${count} kişi cevabını bekliyor. Yanıtla, sonra yeni öneriler al.`,
    },
  } as const;

  const c = cfg[rule.severity as keyof typeof cfg];

  return (
    <div className={`mx-4 mb-2 px-3 py-2.5 rounded-xl border flex items-center gap-2 ${c.bg}`}>
      {c.icon}
      <p className="text-xs text-slate-200 flex-1 leading-snug">{c.text}</p>
      {onGoToMatches && (
        <button
          onClick={onGoToMatches}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0 flex items-center gap-0.5"
        >
          Git <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
};

// ── Grid View ─────────────────────────────────────────────────────────────────

const GridView: React.FC<{
  profiles:       SlateProfile[];
  onSelect:       (index: number) => void;
  onViewProfile?: (profile: Profile) => void;
}> = ({ profiles, onSelect, onViewProfile }) => (
  <div className="flex-1 overflow-y-auto px-4 pb-4">
    <div className="grid grid-cols-2 gap-3">
      {profiles.map((sp, idx) => {
        const profile = sp.profile;
        if (!profile) return null;
        const meta    = CATEGORY_META[sp.category];
        const isLiked = sp.status === 'liked';
        const isPassed = sp.status === 'passed';

        return (
          <button
            key={sp.id}
            onClick={() => {
              if (sp.status === 'unseen' || sp.status === 'seen') {
                onSelect(idx);
              } else {
                onViewProfile?.(profile);
              }
            }}
            className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all active:scale-95"
          >
            {/* Photo */}
            {profile.images?.[0] ? (
              <img
                src={profile.images[0]}
                alt={profile.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <span className="text-4xl">👤</span>
              </div>
            )}

            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

            {/* Overlay for done cards */}
            {(isLiked || isPassed) && (
              <div className={`absolute inset-0 flex items-center justify-center ${
                isLiked ? 'bg-emerald-900/50' : 'bg-slate-900/60'
              }`}>
                {isLiked
                  ? <Heart size={32} className="text-emerald-400 fill-emerald-400 drop-shadow-lg" />
                  : <X     size={32} className="text-slate-400 drop-shadow-lg" />}
              </div>
            )}

            {/* Category badge */}
            <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>
              {meta.icon} {meta.label}
            </div>

            {/* Info */}
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-sm font-bold leading-tight">
                {profile.name}, {profile.age}
              </p>
              <p className="text-slate-400 text-xs truncate">{profile.role}</p>
            </div>

            {/* Same-hospital badge */}
            {sp.sameHospitalWarning && (
              <div className="absolute top-2 right-2">
                <Building2 size={14} className="text-amber-400" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ── Match Celebration Overlay ─────────────────────────────────────────────────

const MatchOverlay: React.FC<{
  name: string;
  onContinue: () => void;
}> = ({ name, onContinue }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm"
  >
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ repeat: 2, duration: 0.5 }}
      className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(52,211,153,0.5)]"
    >
      <Heart size={44} className="text-white fill-white" />
    </motion.div>
    <h2 className="text-2xl font-serif text-white mb-2">Eşleşme! 🎉</h2>
    <p className="text-slate-400 text-sm mb-8">
      <span className="text-emerald-400 font-semibold">{name}</span> ile eşleştin!
    </p>
    <button
      onClick={onContinue}
      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all"
    >
      Devam Et
    </button>
  </motion.div>
);

// ── Done Screen ───────────────────────────────────────────────────────────────

const DoneScreen: React.FC<{
  slate:            DailySlate;
  onGoToMatches?:   () => void;
  onRequestBonus:   () => void;
  bonusLoading:     boolean;
  isPremium:        boolean;
  onUpgradeClick:   () => void;
}> = ({ slate, onGoToMatches, onRequestBonus, bonusLoading, isPremium, onUpgradeClick }) => {
  const { h, m } = useCountdown(slate.nextRefreshAt);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center mb-5">
        <Sparkles size={36} className="text-amber-400" />
      </div>

      <h2 className="text-xl font-serif text-white mb-1">Bugünün Önerileri Bitti! ✨</h2>
      <p className="text-slate-400 text-sm mb-6">
        Yüksek kaliteli {slate.totalCount} profil gördün.
      </p>

      {/* Stats row */}
      <div className="flex gap-6 mb-6">
        {[
          { label: 'Beğeni',  value: slate.likedCount,  color: 'text-emerald-400' },
          { label: 'Geçiş',   value: slate.passedCount, color: 'text-slate-500'   },
          { label: 'Eşleşme', value: slate.likedCount,  color: 'text-amber-400'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center">
            <span className={`text-2xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-slate-500 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Go to matches CTA */}
      {onGoToMatches && slate.likedCount > 0 && (
        <button
          onClick={onGoToMatches}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all mb-3 flex items-center justify-center gap-2"
        >
          <MessageCircle size={16} />
          Eşleşmelerime Git
        </button>
      )}

      {/* Bonus picks */}
      {!slate.bonusUsed && (
        <button
          onClick={isPremium ? onRequestBonus : onUpgradeClick}
          disabled={bonusLoading}
          className={`w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 mb-4 flex items-center justify-center gap-2 ${
            isPremium
              ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
              : 'bg-slate-800/60 border border-slate-700/50 text-slate-500'
          }`}
        >
          {bonusLoading
            ? <Loader2 size={14} className="animate-spin" />
            : isPremium
            ? <><Sparkles size={14} className="text-amber-400" /> +2 Bonus Profil İste</>
            : <><Crown size={14} className="text-amber-600" /> Premium için +2 Bonus</>
          }
        </button>
      )}

      {/* Countdown */}
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <Calendar size={12} />
        <span>Yeni öneriler:</span>
        <span className="text-white font-mono font-semibold">
          {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
        </span>
        <span>sonra</span>
      </div>

      {/* Progress bar visual */}
      <div className="mt-4 flex gap-1">
        {slate.profiles.map((p) => (
          <div
            key={p.id}
            className={`h-1 rounded-full flex-1 ${
              p.status === 'liked'  ? 'bg-emerald-500' :
              p.status === 'passed' ? 'bg-slate-600'   :
              'bg-slate-800'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-slate-600 mt-4 leading-relaxed">
        💡 Match'lerinle sohbet et, buluşma planla!
      </p>
    </div>
  );
};

// ── Card View (single profile) ────────────────────────────────────────────────

const SlateCard: React.FC<{
  slateProfile:   SlateProfile;
  onLike:         () => void;
  onPass:         () => void;
  onLater?:       () => void;
  onViewProfile:  () => void;
  actionLoading:  boolean;
  isPremium:      boolean;
  onUpgradeClick: () => void;
}> = ({
  slateProfile, onLike, onPass, onLater, onViewProfile,
  actionLoading, isPremium, onUpgradeClick,
}) => {
  const profile = slateProfile.profile;
  if (!profile) return null;

  const meta = CATEGORY_META[slateProfile.category];
  const shiftLabel = profile.shiftFrequency === 'DAILY' ? 'Nöbet'
    : profile.shiftFrequency === 'WEEKLY_3_4' ? 'Sık Nöbet'
    : profile.shiftFrequency === 'WEEKLY_1_2' ? 'Az Nöbet'
    : null;

  return (
    <div className="flex-1 px-4 pb-4 flex flex-col">
      {/* Photo card */}
      <div
        className="relative flex-1 rounded-3xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-800/40 cursor-pointer"
        onClick={onViewProfile}
      >
        {/* Photo */}
        {profile.images?.[0] ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.images[0]})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
            <span className="text-6xl">👤</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

        {/* Top-left: category badge + verified */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
            {meta.icon}
            <span>{meta.label}</span>
          </div>
          {profile.verified && (
            <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-sm border border-emerald-500/30 rounded-full px-2 py-0.5">
              <BadgeCheck size={11} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-semibold">Doğrulandı</span>
            </div>
          )}
        </div>

        {/* Top-right: same hospital warning */}
        {slateProfile.sameHospitalWarning && (
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-amber-900/80 backdrop-blur-sm border border-amber-600/40 rounded-full px-2 py-0.5">
            <Building2 size={11} className="text-amber-400" />
            <span className="text-amber-300 text-xs font-semibold">Aynı Kurum</span>
          </div>
        )}

        {/* Bottom: profile info */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-0.5">
            {profile.name}, {profile.age}
          </h3>

          <div className="flex items-center gap-3 text-slate-300 text-sm mb-2 flex-wrap">
            <span className="font-medium">{profile.role}</span>
            {profile.specialty && (
              <span className="text-slate-400">{profile.specialty}</span>
            )}
            {!profile.isLocationHidden && profile.distance !== undefined && (
              <div className="flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" />
                <span className="text-slate-400">
                  {profile.distance < 50 ? `${profile.distance} km` : '50+ km'}
                </span>
              </div>
            )}
          </div>

          {/* Schedule hint */}
          {shiftLabel && (
            <div className="flex items-center gap-1 mb-2">
              <Clock size={11} className="text-slate-500" />
              <span className="text-slate-500 text-xs">{shiftLabel}</span>
            </div>
          )}

          {/* Bio snippet */}
          {profile.bio && (
            <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{profile.bio}</p>
          )}

          {/* Carried over indicator */}
          {slateProfile.carriedOver && (
            <div className="mt-1.5 flex items-center gap-1">
              <Clock size={10} className="text-slate-600" />
              <span className="text-slate-600 text-xs">Dünden taşındı</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-4 px-3">
        {/* Pass */}
        <button
          onClick={onPass}
          disabled={actionLoading}
          className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg hover:bg-slate-700 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
          aria-label="Geç"
        >
          <X size={26} className="text-slate-400" />
        </button>

        {/* Later (Premium) */}
        <button
          onClick={isPremium ? onLater : onUpgradeClick}
          disabled={actionLoading}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all active:scale-95 ${
            isPremium ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-600'
          }`}
          aria-label="Sonraya Bırak"
        >
          {!isPremium && <Crown size={12} className="text-slate-600" />}
          <Clock size={20} className={isPremium ? 'text-amber-400' : 'text-slate-600'} />
          <span className="text-xs font-semibold">Sonra</span>
        </button>

        {/* Like */}
        <button
          onClick={onLike}
          disabled={actionLoading}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
          aria-label="Beğen"
        >
          {actionLoading
            ? <Loader2 size={22} className="text-white animate-spin" />
            : <Heart size={26} className="text-white fill-white" />
          }
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const DailyPicksView: React.FC<DailyPicksViewProps> = ({
  userId,
  isPremium,
  onUpgradeClick,
  onViewProfile,
  onGoToMatches,
}) => {
  const userProfile = useUserStore((s) => s.profile);
  const matches     = useMatchStore((s) => s.matches);

  const {
    slate,
    currentIndex,
    viewMode,
    matchedName,
    isSlateComplete,
    isBonusAvailable,
    isLoading,
    error,
    setSlate,
    setIsLoading,
    setError,
    advanceToNext,
    setMatchedName,
    setViewMode,
    addBonusProfiles,
  } = useSlateStore();

  const [actionLoading, setActionLoading] = useState(false);
  const [bonusLoading,  setBonusLoading]  = useState(false);

  // Track time spent on current card
  const cardShownAt = useRef<number>(Date.now());
  useEffect(() => { cardShownAt.current = Date.now(); }, [currentIndex]);

  // ── Load slate ─────────────────────────────────────────────────────────────
  const loadSlate = useCallback(async () => {
    if (!userProfile) return;
    setIsLoading(true);
    setError(null);
    try {
      const s = await slateService.getTodaySlate(userId, userProfile, matches);
      setSlate(s);
    } catch (e) {
      console.error('[DailyPicksView] loadSlate error:', e);
      setError('Günlük öneriler yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, userProfile, matches, setSlate, setIsLoading, setError]);

  useEffect(() => {
    void loadSlate();
  }, [loadSlate]);

  // ── Current card ───────────────────────────────────────────────────────────
  const currentCard: SlateProfile | undefined = slate?.profiles[currentIndex];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!currentCard || !slate || actionLoading) return;
    setActionLoading(true);

    const timeSpent = Math.round((Date.now() - cardShownAt.current) / 1000);
    await slateService.markSeen(slate.slateId, currentCard.id, currentCard.userId, timeSpent);

    try {
      const result = await slateService.likeProfile(slate.slateId, currentCard.id, currentCard.userId);
      if (result.matched) {
        setMatchedName(currentCard.profile?.name ?? 'Biri');
        return; // Stay on same index; user must dismiss overlay first
      }
    } catch (e) {
      console.error('[DailyPicksView] like error:', e);
    } finally {
      setActionLoading(false);
    }

    advanceToNext();

    // Refresh slate state from updated DB pick
    void slateService.getTodaySlate(userId, userProfile!, matches).then(setSlate);
  };

  const handlePass = async () => {
    if (!currentCard || !slate || actionLoading) return;
    setActionLoading(true);

    const timeSpent = Math.round((Date.now() - cardShownAt.current) / 1000);
    await slateService.markSeen(slate.slateId, currentCard.id, currentCard.userId, timeSpent);

    try {
      await slateService.passProfile(slate.slateId, currentCard.id, currentCard.userId);
    } catch (e) {
      console.error('[DailyPicksView] pass error:', e);
    } finally {
      setActionLoading(false);
    }

    advanceToNext();
    void slateService.getTodaySlate(userId, userProfile!, matches).then(setSlate);
  };

  const handleDismissMatch = () => {
    setMatchedName(null);
    advanceToNext();
    void slateService.getTodaySlate(userId, userProfile!, matches).then(setSlate);
  };

  const handleRequestBonus = async () => {
    if (!userProfile || bonusLoading) return;
    setBonusLoading(true);
    try {
      const bonusPicks = await slateService.requestBonusProfiles(userId, userProfile);
      if (bonusPicks.length > 0 && slate) {
        const updatedSlate: DailySlate = {
          ...slate,
          profiles:       [...slate.profiles, ...bonusPicks],
          totalCount:     slate.totalCount + bonusPicks.length,
          remainingCount: slate.remainingCount + bonusPicks.length,
          bonusUsed:      true,
        };
        addBonusProfiles(updatedSlate);
      }
    } catch (e) {
      console.error('[DailyPicksView] bonus error:', e);
    } finally {
      setBonusLoading(false);
    }
  };

  const handleGridSelect = (index: number) => {
    // Switch to card view and jump to selected index
    setViewMode('card');
    useSlateStore.setState({ currentIndex: index });
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="text-amber-400 animate-spin" />
        <p className="text-slate-400 text-sm">Günlük öneriler hazırlanıyor…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-400 text-sm text-center">{error}</p>
        <button
          onClick={loadSlate}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-all"
        >
          <RefreshCw size={14} />
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!slate || slate.slateSize === 0) {
    // Blocked by pending matches
    const pendingCount = slate?.pendingMatchCount ?? 0;
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-red-900/30 border border-red-700/40 flex items-center justify-center">
          <MessageCircle size={36} className="text-red-400" />
        </div>
        <h2 className="text-lg font-serif text-white">Bugün Yeni Öneri Yok</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {pendingCount} kişi cevabını bekliyor. Onlara yazana kadar yeni profil göremezsin.
        </p>
        {onGoToMatches && (
          <button
            onClick={onGoToMatches}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
          >
            <MessageCircle size={16} />
            Sohbetlere Git
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Match celebration overlay */}
      <AnimatePresence>
        {matchedName && (
          <MatchOverlay name={matchedName} onContinue={handleDismissMatch} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-2">
        <div>
          <h2 className="text-base font-serif text-white leading-tight">Günün Önerileri</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'grid' : 'card')}
            className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            aria-label={viewMode === 'card' ? 'Grid görünümü' : 'Kart görünümü'}
          >
            {viewMode === 'card'
              ? <LayoutGrid size={15} />
              : <CreditCard size={15} />
            }
          </button>

          {/* Remaining counter */}
          {!isSlateComplete && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-full px-3 py-1.5">
              <Heart size={11} className="text-emerald-400 fill-emerald-400" />
              <span className="text-xs font-bold text-slate-300">
                {slate.remainingCount} kaldı
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      {!isSlateComplete && slate.profiles.length > 0 && (
        <div className="px-4 pb-2">
          <ProgressDots profiles={slate.profiles} currentIndex={currentIndex} />
        </div>
      )}

      {/* Pending match warning */}
      {slate.isRestricted && (
        <PendingWarning
          count={slate.pendingMatchCount}
          onGoToMatches={onGoToMatches}
        />
      )}

      {/* Done screen */}
      {isSlateComplete && (
        <DoneScreen
          slate={slate}
          onGoToMatches={onGoToMatches}
          onRequestBonus={handleRequestBonus}
          bonusLoading={bonusLoading}
          isPremium={isPremium}
          onUpgradeClick={onUpgradeClick}
        />
      )}

      {/* Card view */}
      {!isSlateComplete && viewMode === 'card' && currentCard && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
          >
            <SlateCard
              slateProfile={currentCard}
              onLike={handleLike}
              onPass={handlePass}
              onLater={() => {}} // Implemented via isPremium gate on button
              onViewProfile={() => currentCard.profile && onViewProfile?.(currentCard.profile)}
              actionLoading={actionLoading}
              isPremium={isPremium}
              onUpgradeClick={onUpgradeClick}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* Grid view */}
      {!isSlateComplete && viewMode === 'grid' && (
        <GridView
          profiles={slate.profiles}
          onSelect={handleGridSelect}
          onViewProfile={onViewProfile}
        />
      )}

      {/* Bonus CTA (inline, when available and on done screen not shown) */}
      {isBonusAvailable && !isSlateComplete && (
        <div className="px-4 pb-4">
          <button
            onClick={isPremium ? handleRequestBonus : onUpgradeClick}
            disabled={bonusLoading}
            className="w-full py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {bonusLoading
              ? <Loader2 size={14} className="animate-spin" />
              : isPremium
              ? <><Sparkles size={14} className="text-amber-400" /> +2 Bonus Profil</>
              : <><Crown size={14} className="text-amber-600" /> Premium'a Geç</>
            }
          </button>
        </div>
      )}
    </div>
  );
};
