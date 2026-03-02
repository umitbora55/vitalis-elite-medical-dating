/**
 * ConferenceModeBanner
 *
 * Feature 10: Conference Mode (Kongre Modu)
 * Shown on the home screen when there is an active conference in the user's city.
 * User can opt into the conference discovery pool with one tap.
 */

import React, { useEffect, useState } from 'react';
import { X, MapPin, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { conferenceService } from '../services/conferenceService';
import { Conference } from '../types';

interface ConferenceModeBannerProps {
  userId:   string;
  userCity: string;
}

export const ConferenceModeBanner: React.FC<ConferenceModeBannerProps> = ({
  userId,
  userCity,
}) => {
  const [conference, setConference]     = useState<Conference | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [dismissed, setDismissed]       = useState(false);
  const [opting, setOpting]             = useState(false);

  useEffect(() => {
    const load = async () => {
      const conferences = await conferenceService.getActiveConferences(userCity);
      if (conferences.length === 0) { setLoading(false); return; }

      const active = conferences[0];
      setConference(active);

      const registered = await conferenceService.isRegistered(active.id, userId);
      setIsRegistered(registered);
      setLoading(false);
    };
    void load();
  }, [userId, userCity]);

  const handleOptIn = async () => {
    if (!conference) return;
    setOpting(true);

    await conferenceService.register(conference.id, userId, true);
    setIsRegistered(true);
    setOpting(false);
  };

  if (loading || dismissed || !conference) return null;

  return (
    <div className="mx-4 mb-3 bg-blue-950/40 border border-blue-500/20 rounded-2xl px-4 py-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <MapPin size={16} className="text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">
            Kongre Modu
          </p>
          <p className="text-sm font-semibold text-white truncate">{conference.name}</p>
          <p className="text-xs text-slate-400">
            {new Date(conference.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            {' – '}
            {new Date(conference.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            {conference.venue ? ` · ${conference.venue}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-400 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {!isRegistered ? (
        <button
          type="button"
          onClick={() => void handleOptIn()}
          disabled={opting}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
        >
          {opting
            ? <Loader2 size={12} className="animate-spin" />
            : <><Users size={12} /> Kongreye özel havuza katıl</>
          }
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-2 justify-center">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-semibold">Kongreye katıldınız</span>
        </div>
      )}
    </div>
  );
};
