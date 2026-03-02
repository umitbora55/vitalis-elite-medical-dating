/**
 * TripMode — Özellik 6: Etik Monetizasyon
 *
 * Full UI for Trip Mode: city selection, date picker, active trip card,
 * and local user preference toggle.
 *
 * States:
 *   loading → skeleton
 *   no_trip → city/date selection form
 *   active  → active trip card with cancel option
 *   setting → saving...
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  MapPin,
  CalendarDays,
  Plane,
  PlaneLanding,
  X,
  Check,
  Loader2,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Users,
} from 'lucide-react';
import {
  tripModeService,
  POPULAR_TRIP_CITIES,
  buildQuickTripOptions,
  type TripCity,
  type QuickTripOption,
} from '../../services/tripModeService';
import type { TripModeSession } from '../../types';

// ── Trip city search ───────────────────────────────────────────────────────────

interface CitySearchProps {
  onSelect: (city: TripCity) => void;
}

const CitySearch: React.FC<CitySearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const filtered = POPULAR_TRIP_CITIES.filter((c) =>
    c.city.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Şehir ara…"
          className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
        {filtered.map((city) => (
          <button
            key={city.city}
            onClick={() => onSelect(city)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:border-sky-500/40 hover:bg-sky-500/8 text-left transition-all"
          >
            <MapPin size={13} className="text-sky-400 flex-shrink-0" />
            <span className="text-sm text-slate-200 truncate">{city.city}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Active trip card ───────────────────────────────────────────────────────────

interface ActiveTripCardProps {
  session:     TripModeSession;
  onCancel:    () => void;
  cancelling:  boolean;
}

const ActiveTripCard: React.FC<ActiveTripCardProps> = ({ session, onCancel, cancelling }) => {
  const statusText = tripModeService.formatTripStatus(session);
  const startFmt = new Date(session.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const endFmt   = new Date(session.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  return (
    <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center flex-shrink-0">
          <Plane size={18} className="text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white truncate">{session.destination_city}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25 font-semibold">
              {statusText}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {startFmt} – {endFmt}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-sky-300/70">
        <Users size={11} />
        <span>Bu tarihlerde {session.destination_city}'de eşleşme önerileri alıyorsunuz</span>
      </div>

      <button
        onClick={onCancel}
        disabled={cancelling}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
      >
        {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
        Trip'i İptal Et
      </button>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export interface TripModeProps {
  className?: string;
}

type TripStep = 'overview' | 'select_city' | 'select_dates';

export const TripMode: React.FC<TripModeProps> = ({ className = '' }) => {
  const [activeTrip,    setActiveTrip]    = useState<TripModeSession | null>(null);
  const [monthlyCount,  setMonthlyCount]  = useState(0);
  const [acceptsTravelers, setAcceptsTravelers] = useState(true);

  const [step,          setStep]          = useState<TripStep>('overview');
  const [selectedCity,  setSelectedCity]  = useState<TripCity | null>(null);
  const [startDate,     setStartDate]     = useState('');
  const [endDate,       setEndDate]       = useState('');
  const [quickOptions,  setQuickOptions]  = useState<QuickTripOption[]>([]);

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [saved,         setSaved]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [trip, count, accepts] = await Promise.all([
      tripModeService.getActiveTrip(),
      tripModeService.getMonthlyTripCount(),
      tripModeService.getAcceptsTravelers(),
    ]);
    setActiveTrip(trip);
    setMonthlyCount(count);
    setAcceptsTravelers(accepts);
    setQuickOptions(buildQuickTripOptions());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCitySelect = (city: TripCity) => {
    setSelectedCity(city);
    setStep('select_dates');
  };

  const handleQuickDate = (opt: QuickTripOption) => {
    setStartDate(opt.startDate);
    setEndDate(opt.endDate);
  };

  const handleActivate = async () => {
    if (!selectedCity || !startDate || !endDate) return;
    setSaving(true);
    setError(null);
    const { error: err } = await tripModeService.activateTrip({
      city:      selectedCity.city,
      lat:       selectedCity.lat,
      lng:       selectedCity.lng,
      startDate,
      endDate,
    });
    if (err) {
      setError(err);
    } else {
      setSaved(true);
      setTimeout(() => { setSaved(false); setStep('overview'); void load(); }, 1500);
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!activeTrip) return;
    setCancelling(true);
    await tripModeService.cancelTrip(activeTrip.id);
    setActiveTrip(null);
    setMonthlyCount((c) => Math.max(0, c - 1));
    setCancelling(false);
  };

  const handleToggleTravelers = async (val: boolean) => {
    setAcceptsTravelers(val);
    await tripModeService.setAcceptsTravelers(val);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <PlaneLanding size={16} className="text-sky-400" />
        <h3 className="text-sm font-semibold text-white">Trip Modu</h3>
        <span className="ml-auto text-xs text-slate-500">{monthlyCount}/3 bu ay</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="h-32 rounded-2xl bg-slate-800/40 animate-pulse" />
      )}

      {/* Overview */}
      {!loading && step === 'overview' && (
        <div className="space-y-3">
          {activeTrip ? (
            <ActiveTripCard
              session={activeTrip}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ) : (
            <button
              onClick={() => setStep('select_city')}
              disabled={monthlyCount >= 3}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-sky-500/8 border border-sky-500/25 hover:border-sky-500/40 hover:bg-sky-500/12 disabled:opacity-40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
                  <Plane size={18} className="text-sky-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">
                    {monthlyCount >= 3 ? 'Aylık limit doldu' : 'Trip başlat'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {monthlyCount >= 3 ? 'Gelecek ay yenilenir' : 'Hangi şehire gidiyorsun?'}
                  </p>
                </div>
              </div>
              {monthlyCount < 3 && <ChevronRight size={16} className="text-sky-400" />}
            </button>
          )}

          {/* Monthly limit bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Aylık trip kullanımı</span>
              <span>{monthlyCount}/3</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${(monthlyCount / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Accept travelers toggle */}
          <div className="flex items-start gap-3 p-3.5 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-100">Seyahat edenleri göster</p>
              <p className="text-xs text-slate-400 mt-0.5">Başka şehirden gelen kullanıcılar önerilerimde görünsün</p>
            </div>
            <button
              onClick={() => handleToggleTravelers(!acceptsTravelers)}
              role="switch"
              aria-checked={acceptsTravelers}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5
                ${acceptsTravelers ? 'bg-sky-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
                ${acceptsTravelers ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Step: Select city */}
      {!loading && step === 'select_city' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep('overview')}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <p className="text-sm font-semibold text-slate-200">Nereye gidiyorsun?</p>
          </div>
          <CitySearch onSelect={handleCitySelect} />
        </div>
      )}

      {/* Step: Select dates */}
      {!loading && step === 'select_dates' && selectedCity && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep('select_city')}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
            <p className="text-sm font-semibold text-slate-200">
              ✈️ {selectedCity.city} — Tarih seç
            </p>
          </div>

          {/* Quick options */}
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleQuickDate(opt)}
                className={`text-left p-3 rounded-xl border text-xs transition-all
                  ${startDate === opt.startDate && endDate === opt.endDate
                    ? 'bg-sky-500/12 border-sky-500/40 text-sky-400'
                    : 'bg-slate-800/50 border-slate-700/40 text-slate-300 hover:border-slate-600'}`}
              >
                <p className="font-semibold">{opt.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(opt.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  {' – '}
                  {new Date(opt.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </p>
              </button>
            ))}
          </div>

          {/* Manual date inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Başlangıç</label>
              <div className="relative">
                <CalendarDays size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-white focus:outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Bitiş</label>
              <div className="relative">
                <CalendarDays size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full pl-8 pr-2 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-white focus:outline-none focus:border-sky-500/60 transition-colors"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
              <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={!startDate || !endDate || saving}
            className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {saving  ? <><Loader2 size={15} className="animate-spin" /> Başlatılıyor…</> :
             saved   ? <><Check size={15} /> Başlatıldı!</> :
             <><Plane size={15} /> Trip Başlat</>}
          </button>
        </div>
      )}
    </div>
  );
};
