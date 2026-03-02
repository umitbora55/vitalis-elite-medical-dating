/**
 * ClubsView
 *
 * Feature 6: Health Social Clubs
 * Full-screen view that lists clubs and allows creating/browsing them.
 * Entry point rendered from App.tsx when currentView === 'clubs'.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, Plus, Search, Loader2, Users } from 'lucide-react';
import { clubService } from '../services/clubService';
import { Club, ClubCategory } from '../types';
import { ClubCard } from './ClubCard';
import { ClubDetailView } from './ClubDetailView';
import { CreateClubModal } from './CreateClubModal';

interface ClubsViewProps {
  userId:    string;
  userCity?: string;
  onBack:    () => void;
}

const FILTER_CATEGORIES: { value: ClubCategory | 'all'; label: string }[] = [
  { value: 'all',       label: 'Tümü'     },
  { value: 'running',   label: 'Koşu'     },
  { value: 'cycling',   label: 'Bisiklet' },
  { value: 'yoga',      label: 'Yoga'     },
  { value: 'nutrition', label: 'Beslenme' },
  { value: 'research',  label: 'Araştırma'},
  { value: 'social',    label: 'Sosyal'   },
];

export const ClubsView: React.FC<ClubsViewProps> = ({ userId, userCity, onBack }) => {
  const [clubs, setClubs]             = useState<Club[]>([]);
  const [filtered, setFiltered]       = useState<Club[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState<ClubCategory | 'all'>('all');
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clubService.getClubs({ userId });
      setClubs(data);
      setFiltered(data);
    } catch {
      setError('Kulüpler yüklenemedi. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void loadClubs(); }, [loadClubs]);

  // Client-side filter
  useEffect(() => {
    let result = clubs;
    if (category !== 'all') result = result.filter((c) => c.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }, [clubs, category, search]);

  // If a club is selected, show its detail view
  if (selectedClub) {
    return (
      <ClubDetailView
        club={selectedClub}
        userId={userId}
        onBack={() => setSelectedClub(null)}
        onUpdate={(updated) => {
          setClubs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedClub(updated);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800 pt-8 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 -ml-2 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2 flex-1 mx-2">
          <Users size={18} className="text-gold-400" />
          <span className="text-base font-bold text-white">Kulüpler</span>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-800/50 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kulüp ara…"
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 px-4 py-2.5 border-b border-slate-800/50 overflow-x-auto scrollbar-hide flex-shrink-0">
        {FILTER_CATEGORIES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setCategory(f.value)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              category === f.value
                ? 'bg-gold-500/15 border-gold-500/30 text-gold-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-slate-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
            <Users size={40} className="text-slate-700" />
            <div>
              <p className="text-base font-bold text-white">Henüz kulüp yok</p>
              <p className="text-sm text-slate-500 mt-1">İlk kulübü siz oluşturun!</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 text-slate-950 text-sm font-bold hover:bg-gold-400 transition-all"
            >
              <Plus size={16} />
              Kulüp Oluştur
            </button>
          </div>
        ) : (
          filtered.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              userId={userId}
              onSelect={setSelectedClub}
            />
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateClubModal
          userId={userId}
          userCity={userCity}
          onClose={() => setShowCreate(false)}
          onCreated={(club) => {
            setClubs((prev) => [club, ...prev]);
            setShowCreate(false);
            setSelectedClub(club);
          }}
        />
      )}
    </div>
  );
};
