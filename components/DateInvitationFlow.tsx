/**
 * DateInvitationFlow — Özellik 4: Date Odaklı Akış
 *
 * Full-screen modal/bottom-sheet that guides users through the date invitation funnel:
 *   Step 1: Choose date type (7 options incl. healthcare-specific)
 *   Step 2: Select preferred time slots (quick picker or calendar)
 *   Step 3: Add optional message, send invitation
 *   Step 4: Confirmation screen with 48h countdown
 *
 * Used from MatchOverlay ("Plan Oluştur") and chat header CTA.
 */

import React, { useCallback, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Clock, Calendar, Send, CheckCircle2, Stethoscope } from 'lucide-react';
import type { ExtendedPlanType, DateTypeOption } from '../types';
import {
  dateInvitationService,
  DATE_TYPE_OPTIONS,
  getDateTypeOption,
} from '../services/dateInvitationService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DateInvitationFlowProps {
  matchId: string;
  inviteeId: string;
  inviteeName: string;
  inviteeAvatar: string;
  onClose: () => void;
  onSuccess?: (invitationId: string) => void;
}

type FlowStep = 'type_select' | 'time_select' | 'message' | 'sent';

// ── Quick time slot suggestions (relative to now) ─────────────────────────────

interface TimeSlotSuggestion {
  label: string;
  sublabel: string;
  isoStart: string;
  isoEnd: string;
}

function buildQuickSlots(): TimeSlotSuggestion[] {
  const now = new Date();
  const slots: TimeSlotSuggestion[] = [];

  // "Today afternoon" (if it's before 14:00, otherwise skip)
  if (now.getHours() < 14) {
    const start = new Date(now);
    start.setHours(15, 0, 0, 0);
    const end = new Date(start);
    end.setHours(16, 0, 0, 0);
    slots.push({ label: 'Bu öğleden sonra', sublabel: '15:00 – 16:00', isoStart: start.toISOString(), isoEnd: end.toISOString() });
  }

  // "Tomorrow morning"
  const tmrMorn = new Date(now);
  tmrMorn.setDate(tmrMorn.getDate() + 1);
  tmrMorn.setHours(10, 0, 0, 0);
  const tmrMornEnd = new Date(tmrMorn);
  tmrMornEnd.setHours(11, 0, 0, 0);
  slots.push({ label: 'Yarın sabah', sublabel: '10:00 – 11:00', isoStart: tmrMorn.toISOString(), isoEnd: tmrMornEnd.toISOString() });

  // "Tomorrow afternoon"
  const tmrAft = new Date(tmrMorn);
  tmrAft.setHours(15, 0, 0, 0);
  const tmrAftEnd = new Date(tmrAft);
  tmrAftEnd.setHours(16, 30, 0, 0);
  slots.push({ label: 'Yarın öğleden sonra', sublabel: '15:00 – 16:30', isoStart: tmrAft.toISOString(), isoEnd: tmrAftEnd.toISOString() });

  // "This weekend"
  const weekend = new Date(now);
  const daysToSat = (6 - now.getDay() + 7) % 7 || 7;
  weekend.setDate(weekend.getDate() + daysToSat);
  weekend.setHours(12, 0, 0, 0);
  const weekendEnd = new Date(weekend);
  weekendEnd.setHours(14, 0, 0, 0);
  slots.push({ label: 'Bu hafta sonu', sublabel: 'Cmt 12:00 – 14:00', isoStart: weekend.toISOString(), isoEnd: weekendEnd.toISOString() });

  return slots.slice(0, 4);
}

// ── Color map ─────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/40',   text: 'text-amber-400',   badge: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/40',    text: 'text-rose-400',    badge: 'bg-rose-500' },
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/40',  text: 'text-orange-400',  badge: 'bg-orange-500' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/40',    text: 'text-blue-400',    badge: 'bg-blue-500' },
  violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/40',  text: 'text-violet-400',  badge: 'bg-violet-500' },
  slate:   { bg: 'bg-slate-700/50',   border: 'border-slate-600/40',   text: 'text-slate-300',   badge: 'bg-slate-500' },
};

function colorFor(option: DateTypeOption) {
  return COLOR_MAP[option.color] ?? COLOR_MAP['slate'];
}

// ── Sub-components ────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ step: FlowStep }> = ({ step }) => {
  const steps: FlowStep[] = ['type_select', 'time_select', 'message', 'sent'];
  const currentIdx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 px-6 pt-3 pb-1">
      {steps.slice(0, 3).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            i < currentIdx ? 'bg-gold-500' : i === currentIdx ? 'bg-gold-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
};

const DateTypeCard: React.FC<{
  option: DateTypeOption;
  selected: boolean;
  onSelect: () => void;
}> = ({ option, selected, onSelect }) => {
  const c = colorFor(option);
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 text-left ${
        selected
          ? `${c.bg} ${c.border} ring-1 ring-current ring-offset-0`
          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      <span className="text-2xl leading-none mt-0.5 flex-shrink-0">{option.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${selected ? c.text : 'text-slate-200'}`}>
            {option.label}
          </span>
          {option.isHealthcareSpecific && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/25 text-[10px] font-bold text-teal-400 leading-none">
              <Stethoscope size={9} />
              <span>Sağlık</span>
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{option.description}</p>
        <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${selected ? c.text : 'text-slate-500'}`}>
          <Clock size={11} />
          {option.duration}
        </p>
      </div>
      {selected && (
        <CheckCircle2 size={18} className={`${c.text} flex-shrink-0 mt-0.5`} />
      )}
    </button>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const DateInvitationFlow: React.FC<DateInvitationFlowProps> = ({
  matchId,
  inviteeId,
  inviteeName,
  inviteeAvatar,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<FlowStep>('type_select');
  const [selectedType, setSelectedType] = useState<ExtendedPlanType | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);   // ISO start timestamps
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentInvitationId, setSentInvitationId] = useState<string | null>(null);

  const quickSlots = React.useMemo(() => buildQuickSlots(), []);

  const selectedTypeOption = selectedType ? getDateTypeOption(selectedType) : null;

  // ── Navigation ───────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    setError(null);
    if (step === 'type_select') {
      if (!selectedType) { setError('Lütfen bir buluşma türü seç.'); return; }
      setStep('time_select');
    } else if (step === 'time_select') {
      setStep('message');
    } else if (step === 'message') {
      void handleSend();
    }
  }, [step, selectedType]);

  const goBack = useCallback(() => {
    setError(null);
    if (step === 'time_select') setStep('type_select');
    else if (step === 'message')   setStep('time_select');
  }, [step]);

  // ── Toggle slot selection ─────────────────────────────────────────────────────

  const toggleSlot = useCallback((isoStart: string) => {
    setSelectedSlots((prev) =>
      prev.includes(isoStart)
        ? prev.filter((s) => s !== isoStart)
        : prev.length < 3 ? [...prev, isoStart] : prev,
    );
  }, []);

  // ── Send invitation ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const invId = await dateInvitationService.sendInvitation({
        matchId,
        inviteeId,
        preferredType:  selectedType,
        preferredTimes: selectedSlots,
        message:        message.trim() || undefined,
      });
      setSentInvitationId(invId);
      setStep('sent');
      onSuccess?.(invId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Davet gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────────

  const standardTypes = DATE_TYPE_OPTIONS.filter((o) => !o.isHealthcareSpecific);
  const healthcareTypes = DATE_TYPE_OPTIONS.filter((o) =>  o.isHealthcareSpecific);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={inviteeAvatar}
              alt={inviteeName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-gold-500/30"
            />
            <div>
              <p className="text-xs text-slate-400 font-medium">Buluşma daveti gönder</p>
              <p className="text-sm font-semibold text-white leading-tight">{inviteeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon text-slate-500 hover:text-white hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        {step !== 'sent' && <ProgressBar step={step} />}

        {/* Error Banner */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Step 1: Date Type ─────────────────────────────────────────────── */}
          {step === 'type_select' && (
            <>
              <h3 className="text-base font-semibold text-white">Ne tür bir buluşma öneriyorsun?</h3>

              <div className="space-y-2">
                {standardTypes.map((opt) => (
                  <DateTypeCard
                    key={opt.type}
                    option={opt}
                    selected={selectedType === opt.type}
                    onSelect={() => setSelectedType(opt.type)}
                  />
                ))}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 mt-1">
                  <Stethoscope size={13} className="text-teal-400" />
                  <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider">Sağlık çalışanlarına özel</p>
                </div>
                <div className="space-y-2">
                  {healthcareTypes.map((opt) => (
                    <DateTypeCard
                      key={opt.type}
                      option={opt}
                      selected={selectedType === opt.type}
                      onSelect={() => setSelectedType(opt.type)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Time Slots ────────────────────────────────────────────── */}
          {step === 'time_select' && (
            <>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Hangi zaman dilimleri uygun?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  En fazla 3 seçenek belirtebilirsin (isteğe bağlı)
                </p>
              </div>

              <div className="space-y-2">
                {quickSlots.map((slot) => {
                  const isSelected = selectedSlots.includes(slot.isoStart);
                  return (
                    <button
                      key={slot.isoStart}
                      onClick={() => toggleSlot(slot.isoStart)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? 'bg-gold-500/10 border-gold-500/40 ring-1 ring-gold-500/30'
                          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <Calendar size={18} className={isSelected ? 'text-gold-400' : 'text-slate-500'} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-gold-300' : 'text-slate-200'}`}>
                          {slot.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{slot.sublabel}</p>
                      </div>
                      {isSelected && <CheckCircle2 size={18} className="text-gold-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-600 text-center">
                Zaman seçmeden de devam edebilirsin — {inviteeName} kendi saatini önerebilir.
              </p>
            </>
          )}

          {/* ── Step 3: Message ───────────────────────────────────────────────── */}
          {step === 'message' && selectedTypeOption && (
            <>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-2xl">{selectedTypeOption.icon}</span>
                <div>
                  <p className="text-xs text-slate-400">Seçilen buluşma</p>
                  <p className="text-sm font-semibold text-white">{selectedTypeOption.label}</p>
                  <p className="text-xs text-slate-500">{selectedTypeOption.duration}</p>
                </div>
              </div>

              {selectedSlots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSlots.map((iso) => {
                    const found = quickSlots.find((q) => q.isoStart === iso);
                    return (
                      <span
                        key={iso}
                        className="px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/25 text-xs font-medium text-gold-300"
                      >
                        {found?.label ?? dateInvitationService.formatSlotTime(iso, iso)}
                      </span>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Kısa bir not ekle <span className="text-slate-500 font-normal">(isteğe bağlı)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`${inviteeName}'e bir mesaj yazabilirsin…`}
                  maxLength={200}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/60 resize-none transition-colors"
                />
                <p className="text-xs text-slate-600 text-right mt-1">{message.length}/200</p>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 text-xs text-blue-400">
                <Clock size={12} className="inline mr-1.5 -mt-px" />
                {inviteeName} daveti 48 saat içinde yanıtlayabilir. Süre dolduğunda davet otomatik iptal olur.
              </div>
            </>
          )}

          {/* ── Step 4: Sent Confirmation ─────────────────────────────────────── */}
          {step === 'sent' && sentInvitationId && (
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-emerald-400" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Davet Gönderildi!</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  {inviteeName} daveti 48 saat içinde yanıtlarsa sana bildirim göndeririz.
                </p>
              </div>
              {selectedTypeOption && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-800 border border-slate-700">
                  <span className="text-lg">{selectedTypeOption.icon}</span>
                  <span className="text-sm font-medium text-slate-200">{selectedTypeOption.label}</span>
                </div>
              )}
              <div className="w-full p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-left space-y-1">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sonraki adımlar</p>
                <p className="text-sm text-slate-300">✓ {inviteeName} yanıtladığında bildirim alırsın</p>
                <p className="text-sm text-slate-300">✓ Kabul ederse tarih ve mekan seçersiniz</p>
                <p className="text-sm text-slate-300">✓ Buluşma günü güvenlik özelliklerini aktifleştir</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        {step !== 'sent' && (
          <div className="flex-shrink-0 px-5 pb-5 pt-3 flex gap-3 border-t border-slate-800">
            {step !== 'type_select' && (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-5 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Geri
              </button>
            )}
            <button
              onClick={goNext}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-600 text-slate-900 font-bold text-sm transition-all hover:shadow-glow-gold active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
                  Gönderiliyor…
                </>
              ) : step === 'message' ? (
                <><Send size={16} /> Daveti Gönder</>
              ) : (
                <>Devam <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {step === 'sent' && (
          <div className="flex-shrink-0 px-5 pb-5 pt-3">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gold-500 text-slate-900 font-bold text-sm hover:bg-gold-400 transition-all"
            >
              Tamam
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
