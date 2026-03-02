import React, { useState } from 'react';
import { datePlanService, type PlanType, type DatePlan } from '../services/datePlanService';
import { X, Calendar, MapPin, Clock, Loader2, ArrowRight } from 'lucide-react';

interface DatePlanCreatorProps {
  matchId: string;
  userId: string;
  onCreated: (plan: DatePlan) => void;
  onClose: () => void;
}

const PLAN_OPTIONS: { type: PlanType; emoji: string; label: string; duration: string }[] = [
  { type: 'coffee', emoji: '☕', label: 'Kahve', duration: '30 dk' },
  { type: 'dinner', emoji: '🍽️', label: 'Yemek', duration: '60 dk' },
  { type: 'walk', emoji: '🚶', label: 'Yürüyüş', duration: '90 dk' },
  { type: 'custom', emoji: '✨', label: 'Özel', duration: 'Serbest' },
];

export const DatePlanCreator: React.FC<DatePlanCreatorProps> = ({
  matchId,
  userId,
  onCreated,
  onClose,
}) => {
  const [selectedType, setSelectedType] = useState<PlanType | null>(null);
  const [location, setLocation] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setError(null);
    setLoading(true);

    try {
      let selectedTime: string | undefined;
      if (dateStr && timeStr) {
        selectedTime = new Date(`${dateStr}T${timeStr}`).toISOString();
      }

      const defaults = datePlanService.getPlanDefaults(selectedType);
      const plan = await datePlanService.createPlan({
        matchId,
        proposerId: userId,
        planType: selectedType,
        location: location.trim() || undefined,
        selectedTime,
        durationMinutes: defaults.duration,
        title: selectedType === 'custom' ? customTitle.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
      });

      onCreated(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plan oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl shadow-2xl p-6 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-serif text-white font-bold">Mini-Date Planla</h3>
            <p className="text-slate-500 text-xs mt-0.5">Sohbet beklemeden buluşma öner</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan type selection */}
          <div className="grid grid-cols-4 gap-2">
            {PLAN_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                onClick={() => setSelectedType(opt.type)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                  selectedType === opt.type
                    ? 'bg-gold-500/10 border-gold-500/60 shadow-[0_0_12px_rgba(234,179,8,0.1)]'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className={`text-xs font-semibold ${selectedType === opt.type ? 'text-gold-400' : 'text-slate-300'}`}>
                  {opt.label}
                </span>
                <span className="text-slate-600 text-[10px]">{opt.duration}</span>
              </button>
            ))}
          </div>

          {selectedType && (
            <>
              {/* Custom title */}
              {selectedType === 'custom' && (
                <input
                  type="text"
                  placeholder="Plan başlığı (örn: Boardgame Kafesi)"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-gold-500/40 transition-all"
                />
              )}

              {/* Location */}
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Semt / Mekan (örn: Beşiktaş)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-gold-500/40 transition-all"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-8 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-gold-500/40 transition-all"
                  />
                </div>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full pl-8 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-gold-500/40 transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <textarea
                placeholder="Not ekle (isteğe bağlı)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-gold-500/40 transition-all resize-none"
              />
            </>
          )}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={!selectedType || loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Teklif Gönder
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
