/**
 * DateConcierge — Özellik 6: Etik Monetizasyon
 *
 * Personal date planning concierge UI. Flow:
 *   no_request  → 4-step request form (activity → datetime → budget → submit)
 *   pending     → "plan being prepared" card
 *   planning    → "concierge working" card with progress
 *   ready       → full plan card with accept / change request options
 *   accepted    → confirmed plan card
 *   completed   → completed + star rating
 *
 * Service: dateConciergeService
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarHeart,
  Loader2,
  Check,
  Star,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  MapPin,
  Clock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  dateConciergeService,
  CONCIERGE_ACTIVITIES,
  CONCIERGE_BUDGETS,
  conciergeStatusLabel,
  conciergeStatusColor,
} from '../../services/dateConciergeService';
import type { DateConciergeRequest } from '../../types';

// ── Step indicator ─────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  current: number;
  total:   number;
  labels:  string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ current, total, labels }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: total }).map((_, i) => (
      <React.Fragment key={i}>
        <div className={`flex flex-col items-center gap-0.5`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
            i < current
              ? 'bg-emerald-500 text-white'
              : i === current
              ? 'bg-rose-500 text-white'
              : 'bg-slate-700 text-slate-500'
          }`}>
            {i < current ? <Check size={10} /> : i + 1}
          </div>
          <span className={`text-[8px] leading-none ${i === current ? 'text-rose-400' : 'text-slate-600'}`}>
            {labels[i]}
          </span>
        </div>
        {i < total - 1 && (
          <div className={`flex-1 h-px mb-3 ${i < current ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── Star rating ────────────────────────────────────────────────────────────────

interface StarRatingProps {
  value:    number;
  onChange: (v: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        onClick={() => onChange(n)}
        className={`transition-transform hover:scale-110 ${n <= value ? 'text-amber-400' : 'text-slate-600'}`}
      >
        <Star size={24} fill={n <= value ? 'currentColor' : 'none'} />
      </button>
    ))}
  </div>
);

// ── Active/ready plan card ─────────────────────────────────────────────────────

interface PlanCardProps {
  request:   DateConciergeRequest;
  onAccept?: () => Promise<void>;
  onRefresh: () => void;
  refreshing: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ request, onAccept, onRefresh, refreshing }) => {
  const [accepting, setAccepting] = useState(false);
  const statusLabel = conciergeStatusLabel(request.status);
  const statusColor = conciergeStatusColor(request.status);

  const handleAccept = async () => {
    if (!onAccept) return;
    setAccepting(true);
    await onAccept();
    setAccepting(false);
  };

  interface PlanDetailsShape {
    venue_name?: string;
    venue_address?: string;
    reservation_time?: string;
    conversation_starters?: string[];
    backup_option?: string;
  }
  const planDetails = request.plan_details as PlanDetailsShape | null;

  return (
    <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/25 space-y-3">
      {/* Status header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center flex-shrink-0">
          <CalendarHeart size={18} className="text-rose-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white">Date Concierge</p>
            <span className={`text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(request.preferred_date).toLocaleDateString('tr-TR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
            {' • '}{request.time_range}
          </p>
        </div>
      </div>

      {/* Plan details (if ready or accepted) */}
      {planDetails && (request.status === 'ready' || request.status === 'accepted') && (
        <div className="space-y-2 p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
          {planDetails.venue_name && (
            <div className="flex items-start gap-2">
              <MapPin size={12} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-200">{planDetails.venue_name as string}</p>
                {planDetails.venue_address && (
                  <p className="text-[10px] text-slate-500">{planDetails.venue_address as string}</p>
                )}
              </div>
            </div>
          )}
          {planDetails.reservation_time && (
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-rose-400" />
              <p className="text-xs text-slate-300">Rezervasyon: {planDetails.reservation_time as string}</p>
            </div>
          )}
          {planDetails.conversation_starters && Array.isArray(planDetails.conversation_starters) && (
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Konuşma başlatıcılar</p>
              <ul className="space-y-1">
                {(planDetails.conversation_starters as string[]).slice(0, 3).map((q, i) => (
                  <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1">
                    <span className="text-rose-400 mt-0.5">•</span> {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {planDetails.backup_option && (
            <p className="text-[10px] text-slate-500">
              <span className="text-slate-400">Yedek plan:</span> {planDetails.backup_option as string}
            </p>
          )}
        </div>
      )}

      {/* Accept button */}
      {request.status === 'ready' && onAccept && (
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {accepting
            ? <><Loader2 size={14} className="animate-spin" /> Onaylanıyor…</>
            : <><Check size={14} /> Planı Onayla</>}
        </button>
      )}

      {/* In-progress states */}
      {(request.status === 'pending' || request.status === 'planning') && (
        <>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 size={12} className="animate-spin text-rose-400" />
            <span>
              {request.status === 'pending'
                ? 'Talebiniz concierge ekibine iletildi…'
                : 'Uzmanımız planınızı hazırlıyor…'}
            </span>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Durumu Yenile
          </button>
        </>
      )}
    </div>
  );
};

// ── Request form ───────────────────────────────────────────────────────────────

type FormStep = 0 | 1 | 2;

interface RequestFormProps {
  onSubmit:   (params: {
    preferredDate: string;
    timeRange:     string;
    dateType:      string;
    budget:        DateConciergeRequest['budget'];
    specialRequests: string | null;
  }) => Promise<void>;
  submitting: boolean;
  error:      string | null;
}

const RequestForm: React.FC<RequestFormProps> = ({ onSubmit, submitting, error }) => {
  const [step,           setStep]           = useState<FormStep>(0);
  const [selectedType,   setSelectedType]   = useState('');
  const [preferredDate,  setPreferredDate]  = useState('');
  const [timeRange,      setTimeRange]      = useState('18:00-22:00');
  const [selectedBudget, setSelectedBudget] = useState<DateConciergeRequest['budget']>('200_500');
  const [specialReqs,    setSpecialReqs]    = useState('');

  const canNext0 = selectedType !== '';
  const canNext1 = preferredDate !== '' && timeRange !== '';
  const canSubmit = canNext0 && canNext1 && selectedBudget;

  const TIME_OPTIONS = [
    '10:00-14:00', '14:00-18:00', '18:00-22:00', '12:00-15:00',
  ];

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({
      preferredDate,
      timeRange,
      dateType: selectedType,
      budget: selectedBudget,
      specialRequests: specialReqs.trim() || null,
    });
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <StepIndicator
        current={step}
        total={3}
        labels={['Aktivite', 'Tarih/Saat', 'Bütçe']}
      />

      {/* Step 0: Activity type */}
      {step === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Nasıl bir buluşma hayal ediyorsunuz?</p>
          <div className="grid grid-cols-1 gap-2">
            {CONCIERGE_ACTIVITIES.map((act) => (
              <button
                key={act.type}
                onClick={() => setSelectedType(act.type)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedType === act.type
                    ? 'bg-rose-500/12 border-rose-500/40'
                    : 'bg-slate-800/50 border-slate-700/40 hover:border-slate-600'
                }`}
              >
                <span className="text-xl">{act.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-200">{act.label}</p>
                  <p className="text-[10px] text-slate-500">{act.description} • {act.durationHint}</p>
                </div>
                {selectedType === act.type && <Check size={14} className="text-rose-400 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            disabled={!canNext0}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1"
          >
            Devam <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Step 1: Date & time */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 mb-1.5 block uppercase tracking-wide">Tercih Ettiğiniz Tarih</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white focus:outline-none focus:border-rose-500/60 transition-colors"
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wide">Uygun Saat Aralığı</p>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                    timeRange === t
                      ? 'bg-rose-500/12 border-rose-500/40 text-rose-300'
                      : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 text-sm font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <ChevronLeft size={15} /> Geri
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1"
            >
              Devam <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Budget + special requests */}
      {step === 2 && (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wide">Bütçe Tercihi</p>
            <div className="flex gap-2">
              {CONCIERGE_BUDGETS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setSelectedBudget(b.value as DateConciergeRequest['budget'])}
                  className={`flex-1 py-2.5 rounded-xl border text-center text-xs transition-all ${
                    selectedBudget === b.value
                      ? 'bg-rose-500/12 border-rose-500/40 text-rose-300'
                      : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-base mb-0.5">{b.emoji}</div>
                  <div className="font-medium leading-tight">{b.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1.5 block uppercase tracking-wide">Özel İstekler (isteğe bağlı)</label>
            <textarea
              value={specialReqs}
              onChange={(e) => setSpecialReqs(e.target.value)}
              placeholder="Alerjiler, mekan tercihleri, özel bir sürpriz…"
              rows={3}
              maxLength={300}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
              <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 text-sm font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <ChevronLeft size={15} /> Geri
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 size={14} className="animate-spin" /> Gönderiliyor…</>
                : <><Sparkles size={14} /> Talep Gönder</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface DateConciergeProps {
  /** If provided, pre-fills the match context */
  matchId?:  string;
  className?: string;
}

export const DateConcierge: React.FC<DateConciergeProps> = ({ matchId, className = '' }) => {
  const [latest,     setLatest]     = useState<DateConciergeRequest | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [rating,     setRating]     = useState(0);
  const [submitted,  setSubmitted]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const req = await dateConciergeService.getLatestRequest();
    setLatest(req);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSubmitRequest = async (params: {
    preferredDate: string;
    timeRange:     string;
    dateType:      string;
    budget:        DateConciergeRequest['budget'];
    specialRequests: string | null;
  }) => {
    setSubmitting(true);
    setError(null);
    const { requestId, error: err } = await dateConciergeService.createRequest({
      matchId: matchId ?? null,
      ...params,
    });
    if (err || !requestId) {
      setError(err ?? 'Talep oluşturulamadı.');
    } else {
      await load();
    }
    setSubmitting(false);
  };

  const handleAcceptPlan = async () => {
    if (!latest) return;
    await dateConciergeService.acceptPlan(latest.id);
    await load();
  };

  const handleSubmitRating = async () => {
    if (!latest || rating === 0) return;
    await dateConciergeService.submitRating(latest.id, rating);
    setSubmitted(true);
    await load();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <CalendarHeart size={16} className="text-rose-400" />
        <h3 className="text-sm font-semibold text-white">Date Concierge</h3>
        <span className="text-[10px] text-slate-500 ml-auto">149 TL / date</span>
      </div>

      {/* Loading */}
      {loading && <div className="h-40 rounded-2xl bg-slate-800/40 animate-pulse" />}

      {!loading && (
        <>
          {/* No request */}
          {!latest && (
            <div className="space-y-4">
              {/* Feature highlights */}
              <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                    <CalendarHeart size={18} className="text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Kişisel Date Planlaması</p>
                    <p className="text-xs text-slate-400">Uzman ekibimiz her şeyi halleder</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { emoji: '📍', text: 'Mekan seçimi ve rezervasyon' },
                    { emoji: '💬', text: 'Konuşma başlatıcılar' },
                    { emoji: '🎁', text: 'Sürpriz detaylar' },
                    { emoji: '🔄', text: 'Yedek plan hazır' },
                  ].map(({ emoji, text }) => (
                    <div key={text} className="flex items-start gap-2 text-[10px] text-slate-400">
                      <span>{emoji}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <RequestForm
                onSubmit={handleSubmitRequest}
                submitting={submitting}
                error={error}
              />
            </div>
          )}

          {/* Active request (pending / planning / ready / accepted) */}
          {latest && latest.status !== 'completed' && latest.status !== 'cancelled' && (
            <PlanCard
              request={latest}
              onAccept={latest.status === 'ready' ? handleAcceptPlan : undefined}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          )}

          {/* Completed — show rating */}
          {latest && latest.status === 'completed' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                    <Check size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Date Tamamlandı</p>
                    <p className="text-xs text-slate-400">Nasıldı?</p>
                  </div>
                </div>
                {!submitted && !latest.rating && (
                  <div className="space-y-3">
                    <StarRating value={rating} onChange={setRating} />
                    <button
                      onClick={handleSubmitRating}
                      disabled={rating === 0}
                      className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                    >
                      Değerlendirmeyi Gönder
                    </button>
                  </div>
                )}
                {(submitted || latest.rating) && (
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: latest.rating ?? rating }).map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">Teşekkürler!</span>
                  </div>
                )}
              </div>

              {/* Start new request */}
              <button
                onClick={() => setLatest(null)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/25 hover:bg-rose-600/30 text-rose-300 text-sm font-semibold transition-colors"
              >
                <CalendarHeart size={14} />
                Yeni Date Planla
              </button>
            </div>
          )}

          {/* Cancelled */}
          {latest && latest.status === 'cancelled' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-center">
                <p className="text-xs text-slate-500">Önceki talep iptal edildi.</p>
              </div>
              <RequestForm
                onSubmit={handleSubmitRequest}
                submitting={submitting}
                error={error}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
