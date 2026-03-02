/**
 * CreateClubModal
 *
 * Feature 6: Health Social Clubs
 * Form to create a new club. Name + category required; description/city optional.
 */

import React, { useState } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { clubService, CreateClubPayload } from '../services/clubService';
import { Club, ClubCategory } from '../types';

interface CreateClubModalProps {
  userId:    string;
  userCity?: string;
  onCreated: (club: Club) => void;
  onClose:   () => void;
}

const CATEGORIES: { value: ClubCategory; label: string; emoji: string }[] = [
  { value: 'running',   label: 'Koşu',      emoji: '🏃' },
  { value: 'cycling',   label: 'Bisiklet',  emoji: '🚴' },
  { value: 'yoga',      label: 'Yoga',      emoji: '🧘' },
  { value: 'nutrition', label: 'Beslenme',  emoji: '🥗' },
  { value: 'research',  label: 'Araştırma', emoji: '🔬' },
  { value: 'social',    label: 'Sosyal',    emoji: '☕' },
];

export const CreateClubModal: React.FC<CreateClubModalProps> = ({
  userId,
  userCity,
  onCreated,
  onClose,
}) => {
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [category, setCategory]   = useState<ClubCategory | null>(null);
  const [city, setCity]           = useState(userCity ?? '');
  const [maxMembers, setMax]      = useState('50');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim())  { setError('Kulüp adı zorunludur.'); return; }
    if (!category)     { setError('Kategori seçin.'); return; }

    const max = parseInt(maxMembers, 10);
    if (isNaN(max) || max < 5 || max > 500) { setError('Üye limiti 5–500 arasında olmalıdır.'); return; }

    setSubmitting(true);
    setError(null);

    const payload: CreateClubPayload = {
      name:        name.trim(),
      description: description.trim(),
      category,
      creatorId:   userId,
      maxMembers:  max,
      city:        city.trim() || undefined,
    };

    const { error: err, club } = await clubService.createClub(payload);

    setSubmitting(false);

    if (err || !club) { setError(err ?? 'Kulüp oluşturulamadı.'); return; }
    onCreated(club);
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gold-400" />
            <span className="text-sm font-bold text-white">Kulüp Oluştur</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Name */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kulüp Adı *</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="örn. İstanbul Koşucuları"
              maxLength={60}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori *</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    category === c.value
                      ? 'bg-gold-500/15 border-gold-500/30 text-gold-400'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Açıklama</p>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Kulübünüzü kısaca tanıtın…"
              rows={3}
              maxLength={300}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
            />
          </div>

          {/* City + Max members */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şehir</p>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="İstanbul"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Üye Limiti</p>
              <input
                type="number"
                value={maxMembers}
                onChange={(e) => setMax(e.target.value)}
                min={5}
                max={500}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500 transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-all"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-gold-500 text-slate-950 text-sm font-bold hover:bg-gold-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
};
