import React, { useEffect, useState, useCallback } from 'react';
import { availabilityService, type AvailabilitySlot, type CommonSlot } from '../services/availabilityService';
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react';

interface SlotPickerProps {
  userId: string;
  matchPartnerId?: string; // If provided, show common slots
  onChange?: (slots: AvailabilitySlot[]) => void;
}

const TIME_OPTIONS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00',
];

export const SlotPicker: React.FC<SlotPickerProps> = ({ userId, matchPartnerId, onChange }) => {
  const [mySlots, setMySlots] = useState<AvailabilitySlot[]>([]);
  const [commonSlots, setCommonSlots] = useState<CommonSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New slot form
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('18:00');
  const [newEnd, setNewEnd] = useState('22:00');
  const [showAdd, setShowAdd] = useState(false);

  // Use a ref for onChange to avoid recreating loadSlots on every render
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const loadSlots = useCallback(async () => {
    // Guard against invalid mock IDs to prevent bad Supabase requests
    if (!userId || userId === 'me') {
      setLoading(false);
      return;
    }
    setLoading(true);
    const slots = await availabilityService.getUserSlots(userId);
    setMySlots(slots);
    onChangeRef.current?.(slots);

    if (matchPartnerId) {
      const theirSlots = await availabilityService.getMatchPartnerSlots(matchPartnerId);
      setCommonSlots(availabilityService.findCommonSlots(slots, theirSlots));
    }
    setLoading(false);
  }, [userId, matchPartnerId]); // onChange intentionally removed from deps

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const handleAddSlot = async () => {
    if (newStart >= newEnd) return;
    setSaving(true);
    try {
      await availabilityService.upsertSlot(userId, {
        day_of_week: newDay,
        start_time: newStart,
        end_time: newEnd,
        is_visible_to_matches: true,
      });
      setShowAdd(false);
      await loadSlots();
    } catch {
      // silently ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    await availabilityService.deleteSlot(slotId);
    await loadSlots();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gold-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Common slots highlight */}
      {matchPartnerId && commonSlots.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-emerald-400" />
            <span className="text-emerald-400 text-sm font-bold">Ortak Müsait Zamanlar</span>
          </div>
          <div className="space-y-1">
            {commonSlots.map((slot, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">{slot.day_label}</span>
                <span className="text-emerald-400 font-mono text-xs">
                  {availabilityService.formatTimeRange(slot.start_time, slot.end_time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My slots */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Benim Müsaitliğim</span>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-gold-400 text-xs hover:text-gold-300 transition-colors"
          >
            <Plus size={14} />
            Ekle
          </button>
        </div>

        {/* Add slot form */}
        {showAdd && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 mb-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Gün</label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                >
                  {availabilityService.DAY_LABELS.map((label, i) => (
                    <option key={i} value={i}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Başlangıç</label>
                <select
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-500 text-xs mb-1 block">Bitiş</label>
                <select
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                >
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={handleAddSlot}
              disabled={saving || newStart >= newEnd}
              className="w-full py-2 rounded-lg bg-gold-500/20 border border-gold-500/40 text-gold-400 text-sm font-semibold hover:bg-gold-500/30 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Kaydet'}
            </button>
          </div>
        )}

        {/* Slot list */}
        {mySlots.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-3">Henüz müsaitlik eklenmedi</p>
        ) : (
          <div className="space-y-2">
            {mySlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm font-medium w-24">
                    {availabilityService.DAY_LABELS[slot.day_of_week]}
                  </span>
                  <span className="text-gold-400 font-mono text-xs">
                    {availabilityService.formatTimeRange(slot.start_time, slot.end_time)}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
