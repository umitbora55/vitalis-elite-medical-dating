/**
 * DatePostFlow — Özellik 4: Date Odaklı Akış
 *
 * Post-date questionnaire that unlocks 24h after a confirmed date plan.
 * Four sequential screens:
 *   Screen 1: Did you actually meet? (Yes / No – no-show)
 *   Screen 2: How was it? (star-style emoji rating)
 *   Screen 3: Tags + would you see them again? + felt safe?
 *   Screen 4: Thank you / next steps
 *
 * All feedback is anonymous by default and linked to the plan, not the person.
 */

import React, { useCallback, useState } from 'react';
import { X, ChevronRight, CheckCircle2, Heart, Smile, Meh, Frown, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import type { DateFeedback, DateFeedbackPayload } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DatePostFlowProps {
  planId: string;
  aboutUserId: string;
  partnerName: string;
  partnerAvatar: string;
  onClose: () => void;
  onComplete?: () => void;
}

type FlowScreen = 'did_meet' | 'how_was_it' | 'tags_and_more' | 'done';

type HowWasIt = DateFeedback['how_was_it'];

// ── Feedback Tags ─────────────────────────────────────────────────────────────

const POSITIVE_TAGS = [
  { id: 'kind',       label: '😊 Kibarlıydı' },
  { id: 'funny',      label: '😄 Eğlenceliydi' },
  { id: 'punctual',   label: '⏰ Dakikti' },
  { id: 'genuine',    label: '💎 Samimiydi' },
  { id: 'interesting', label: '🧠 İlginçti' },
  { id: 'romantic',   label: '🌹 Romantikti' },
];

const NEGATIVE_TAGS = [
  { id: 'late',       label: '⏱️ Geç kaldı' },
  { id: 'catfished',  label: '📸 Farklı çıktı' },
  { id: 'rude',       label: '😤 Kabaydı' },
  { id: 'disrespectful', label: '⚠️ Saygısızdı' },
];

// ── Rating Options ────────────────────────────────────────────────────────────

interface RatingOption {
  value: Exclude<HowWasIt, null>;
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
}

const RATING_OPTIONS: RatingOption[] = [
  {
    value: 'great',
    icon: <Heart size={28} className="fill-pink-400 text-pink-400" />,
    label: 'Harikaydı!',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/30',
  },
  {
    value: 'good',
    icon: <Smile size={28} className="text-emerald-400" />,
    label: 'İyiydi',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  {
    value: 'okay',
    icon: <Meh size={28} className="text-amber-400" />,
    label: 'Fena değildi',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
  {
    value: 'bad',
    icon: <Frown size={28} className="text-slate-400" />,
    label: 'Kötüydü',
    color: 'text-slate-400',
    bg: 'bg-slate-700/50 border-slate-600',
  },
  {
    value: 'no_show',
    icon: <AlertCircle size={28} className="text-red-400" />,
    label: 'Gelmedi',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
  },
];

// ── Progress Dots ─────────────────────────────────────────────────────────────

const ProgressDots: React.FC<{ screen: FlowScreen }> = ({ screen }) => {
  const screens: FlowScreen[] = ['did_meet', 'how_was_it', 'tags_and_more', 'done'];
  const idx = screens.indexOf(screen);
  return (
    <div className="flex justify-center gap-2 py-2">
      {screens.slice(0, 3).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < idx ? 'w-5 h-2 bg-gold-500' :
            i === idx ? 'w-5 h-2 bg-gold-400' :
            'w-2 h-2 bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const DatePostFlow: React.FC<DatePostFlowProps> = ({
  planId,
  aboutUserId,
  partnerName,
  partnerAvatar,
  onClose,
  onComplete,
}) => {
  const [screen, setScreen] = useState<FlowScreen>('did_meet');
  const [didMeet, setDidMeet] = useState<boolean | null>(null);
  const [howWasIt, setHowWasIt] = useState<Exclude<HowWasIt, null> | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [seeAgain, setSeeAgain] = useState<boolean | null>(null);
  const [feltSafe, setFeltSafe] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Tag toggle ────────────────────────────────────────────────────────────────

  const toggleTag = useCallback((id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (didMeet === null) return;
    setIsSubmitting(true);
    setError(null);

    const payload: DateFeedbackPayload = {
      planId,
      aboutUserId,
      didMeet,
      howWasIt:       howWasIt ?? undefined,
      seeAgain:       seeAgain ?? undefined,
      feltSafe:       feltSafe ?? undefined,
      wouldRecommend: howWasIt === 'great' || howWasIt === 'good' ? true : undefined,
      tags:           selectedTags,
    };

    try {
      const { error: rpcError } = await supabase.rpc('record_date_feedback', {
        p_plan_id:         payload.planId,
        p_about_user_id:   payload.aboutUserId,
        p_did_meet:        payload.didMeet,
        p_how_was_it:      payload.howWasIt ?? null,
        p_see_again:       payload.seeAgain ?? null,
        p_felt_safe:       payload.feltSafe ?? null,
        p_would_recommend: payload.wouldRecommend ?? null,
        p_tags:            payload.tags ?? [],
        p_free_text:       null,
      });

      if (rpcError) throw new Error(rpcError.message);
      setScreen('done');
      onComplete?.();
    } catch {
      setError('Geri bildirim gönderilemedi. Lütfen tekrar dene.');
    } finally {
      setIsSubmitting(false);
    }
  }, [planId, aboutUserId, didMeet, howWasIt, seeAgain, feltSafe, selectedTags, onComplete]);

  // ── Navigation ────────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    setError(null);
    if (screen === 'did_meet') {
      if (didMeet === null) { setError('Lütfen bir seçenek işaretle.'); return; }
      if (!didMeet) { void handleSubmit(); return; }  // Short-circuit: no-show path
      setScreen('how_was_it');
    } else if (screen === 'how_was_it') {
      if (!howWasIt) { setError('Lütfen buluşmayı değerlendir.'); return; }
      setScreen('tags_and_more');
    } else if (screen === 'tags_and_more') {
      void handleSubmit();
    }
  }, [screen, didMeet, howWasIt, handleSubmit]);

  // ── Resolve positive/negative tag sets based on rating ────────────────────────

  const relevantTags = howWasIt === 'great' || howWasIt === 'good'
    ? POSITIVE_TAGS
    : howWasIt === 'bad'
    ? NEGATIVE_TAGS
    : [...POSITIVE_TAGS, ...NEGATIVE_TAGS];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={partnerAvatar}
              alt={partnerName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-gold-500/30"
            />
            <div>
              <p className="text-xs text-slate-400">{partnerName} ile buluşma sonrası</p>
              <p className="text-sm font-semibold text-white">Nasıl geçti?</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon text-slate-500 hover:text-white hover:bg-slate-800" aria-label="Kapat">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        {screen !== 'done' && <ProgressDots screen={screen} />}

        {/* Error Banner */}
        {error && (
          <div className="mx-5 mt-2 px-4 py-2.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Screen 1: Did you meet? ────────────────────────────────────────── */}
          {screen === 'did_meet' && (
            <>
              <h3 className="text-base font-semibold text-white text-center">
                {partnerName} ile buluştunuz mu?
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setDidMeet(true)}
                  className={`flex-1 py-5 rounded-2xl border text-center transition-all font-semibold ${
                    didMeet === true
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-3xl mb-1">✅</div>
                  <div className="text-sm">Evet, buluştuk</div>
                </button>
                <button
                  onClick={() => setDidMeet(false)}
                  className={`flex-1 py-5 rounded-2xl border text-center transition-all font-semibold ${
                    didMeet === false
                      ? 'bg-red-500/10 border-red-500/40 text-red-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-3xl mb-1">❌</div>
                  <div className="text-sm">Hayır, gelmedi</div>
                </button>
              </div>
              {didMeet === false && (
                <p className="text-xs text-slate-500 text-center">
                  Gönder'e tıkladığında bu bilgi kayıt altına alınacak. Tekrarlı no-show vakalar incelenecek.
                </p>
              )}
            </>
          )}

          {/* ── Screen 2: How was it? ─────────────────────────────────────────── */}
          {screen === 'how_was_it' && (
            <>
              <h3 className="text-base font-semibold text-white text-center">
                Buluşma nasıldı?
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {RATING_OPTIONS.filter((r) => r.value !== 'no_show').map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setHowWasIt(r.value)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all ${
                      howWasIt === r.value
                        ? `${r.bg} ring-1 ring-current`
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {r.icon}
                    <span className={`font-semibold text-sm ${howWasIt === r.value ? r.color : 'text-slate-200'}`}>
                      {r.label}
                    </span>
                    {howWasIt === r.value && (
                      <CheckCircle2 size={16} className={`${r.color} ml-auto`} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Screen 3: Tags + Questions ────────────────────────────────────── */}
          {screen === 'tags_and_more' && (
            <>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Daha fazla anlat</h3>
                <p className="text-xs text-slate-500">Geri bildirim anonim tutulur.</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Etiketler</p>
                <div className="flex flex-wrap gap-2">
                  {relevantTags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedTags.includes(t.id)
                          ? 'bg-gold-500/15 border-gold-500/40 text-gold-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white mb-2">Tekrar görüşmek ister miydin?</p>
                  <div className="flex gap-2">
                    {([
                      { val: true,  label: '💚 Evet' },
                      { val: false, label: '❌ Hayır' },
                    ] as const).map(({ val, label }) => (
                      <button
                        key={String(val)}
                        onClick={() => setSeeAgain(val)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          seeAgain === val
                            ? 'bg-gold-500/10 border-gold-500/40 text-gold-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white mb-2">Kendini güvende hissettin mi?</p>
                  <div className="flex gap-2">
                    {([
                      { val: true,  label: '🛡️ Evet' },
                      { val: false, label: '⚠️ Hayır' },
                    ] as const).map(({ val, label }) => (
                      <button
                        key={String(val)}
                        onClick={() => setFeltSafe(val)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          feltSafe === val
                            ? feltSafe === false ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                                 : 'bg-gold-500/10 border-gold-500/40 text-gold-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {feltSafe === false && (
                    <p className="text-xs text-red-400 mt-2">
                      Eğer bir sorun yaşandıysa destek@vitalis.app adresinden bize ulaşabilirsin.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Screen 4: Done ────────────────────────────────────────────────── */}
          {screen === 'done' && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-20 h-20 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-gold-400" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Teşekkürler!</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Geri bildirimin kaydedildi. Bu sayede Vitalis topluluğunu daha iyi yapıyorsun.
                </p>
              </div>
              {(howWasIt === 'great' || howWasIt === 'good') && seeAgain && (
                <div className="w-full p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-left space-y-1">
                  <p className="text-sm font-semibold text-pink-300">
                    💌 İkiniz de tekrar görüşmek istersen…
                  </p>
                  <p className="text-xs text-slate-400">
                    {partnerName} de tekrar görmek istediğini belirtirse seni haberdar edeceğiz!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-800">
          {screen !== 'done' ? (
            <button
              onClick={goNext}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-600 text-slate-900 font-bold text-sm disabled:opacity-50 hover:shadow-glow-gold transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin" /> Gönderiliyor…</>
              ) : screen === 'tags_and_more' || (screen === 'did_meet' && didMeet === false) ? (
                <>Gönder</>
              ) : (
                <>Devam <ChevronRight size={16} /></>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gold-500 text-slate-900 font-bold text-sm hover:bg-gold-400 transition-all"
            >
              Tamam
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
