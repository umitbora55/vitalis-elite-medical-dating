/**
 * ConferencesView
 *
 * Feature 10: Conference Mode
 * Full-screen view listing active conferences.
 * Users can register and toggle pool opt-in.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, MapPin, Calendar, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { conferenceService } from '../services/conferenceService';
import { Conference } from '../types';

interface ConferencesViewProps {
  userId:   string;
  userCity: string;
  onBack:   () => void;
}

export const ConferencesView: React.FC<ConferencesViewProps> = ({
  userId,
  userCity,
  onBack,
}) => {
  const [conferences, setConferences]         = useState<Conference[]>([]);
  const [registrations, setRegistrations]     = useState<Set<string>>(new Set());
  const [poolOptIns, setPoolOptIns]           = useState<Set<string>>(new Set());
  const [loading, setLoading]                 = useState(true);
  const [acting, setActing]                   = useState<string | null>(null);

  const load = useCallback(async () => {
    const conf = await conferenceService.getActiveConferences();
    setConferences(conf);

    // Batch check registrations
    const regResults = await Promise.all(
      conf.map((c) => conferenceService.isRegistered(c.id, userId)),
    );
    const regSet  = new Set<string>();
    const poolSet = new Set<string>();
    conf.forEach((c, i) => { if (regResults[i]) regSet.add(c.id); });

    // Get pool opt-ins for registered conferences
    await Promise.all(
      conf.filter((_, i) => regResults[i]).map(async (c) => {
        const members = await conferenceService.getPoolMembers(c.id);
        if (members.some((m) => m.user_id === userId && m.opted_in_to_pool)) {
          poolSet.add(c.id);
        }
      }),
    );

    setRegistrations(regSet);
    setPoolOptIns(poolSet);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const handleRegister = async (conf: Conference) => {
    setActing(conf.id);
    const { error } = await conferenceService.register(conf.id, userId, false);
    if (!error) {
      setRegistrations((prev) => new Set([...prev, conf.id]));
    }
    setActing(null);
  };

  const handleTogglePool = async (conf: Conference) => {
    const currentlyIn = poolOptIns.has(conf.id);
    setActing(conf.id);
    await conferenceService.updatePoolOptIn(conf.id, userId, !currentlyIn);
    setPoolOptIns((prev) => {
      const next = new Set(prev);
      if (currentlyIn) next.delete(conf.id); else next.add(conf.id);
      return next;
    });
    setActing(null);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="flex flex-col h-full bg-slate-950">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800 pt-8 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-11 h-11 -ml-2 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-400" />
          <span className="text-base font-bold text-white">Kongreler</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-slate-500 animate-spin" />
          </div>
        ) : conferences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
            <MapPin size={36} className="text-slate-700" />
            <p className="text-base font-bold text-white">Yaklaşan kongre yok</p>
            <p className="text-sm text-slate-500">Yeni kongreler eklendikçe burada görünecek.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {conferences.map((conf) => {
              const isRegistered = registrations.has(conf.id);
              const isInPool     = poolOptIns.has(conf.id);
              const isActing     = acting === conf.id;
              const isUserCity   = conf.city.toLowerCase() === userCity.toLowerCase();

              return (
                <div key={conf.id} className="px-5 py-5 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white">{conf.name}</p>
                        {isUserCity && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-400">
                            Şehrinizde
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin size={10} />
                          <span>{conf.city}{conf.venue ? ` · ${conf.venue}` : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Calendar size={10} />
                        <span>{formatDate(conf.start_date)} – {formatDate(conf.end_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specialty tags */}
                  {conf.specialty_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-13">
                      {conf.specialty_tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!isRegistered ? (
                      <button
                        type="button"
                        onClick={() => void handleRegister(conf)}
                        disabled={isActing}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all disabled:opacity-40"
                      >
                        {isActing
                          ? <Loader2 size={12} className="animate-spin" />
                          : 'Kongreye Kaydol'
                        }
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 flex-1">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-semibold">Kayıtlısınız</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleTogglePool(conf)}
                          disabled={isActing}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 ${
                            isInPool
                              ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                              : 'border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {isActing
                            ? <Loader2 size={11} className="animate-spin" />
                            : <><Users size={11} /> {isInPool ? 'Havuzda' : 'Havuza Katıl'}</>
                          }
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
