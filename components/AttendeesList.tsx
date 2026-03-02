import React, { useEffect, useState } from 'react';
import { eventService, EventAttendee } from '../services/eventService';
import { supabase } from '../src/lib/supabase';
import { Profile } from '../types';
import { Users, Loader2 } from 'lucide-react';

interface AttendeesListProps {
  eventId: string;
  totalCount: number;
  onViewProfile?: (profile: Profile) => void;
}

interface EnrichedAttendee extends EventAttendee {
  profile: Profile | null;
}

export const AttendeesList: React.FC<AttendeesListProps> = ({
  eventId,
  totalCount,
  onViewProfile,
}) => {
  const [attendees, setAttendees] = useState<EnrichedAttendee[]>([]);
  const [loading, setLoading]     = useState(true);
  const SHOW_LIMIT                = 8;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const raw = await eventService.getEventAttendees(eventId);
        const limited = raw.slice(0, SHOW_LIMIT);

        if (limited.length === 0) {
          setAttendees([]);
          return;
        }

        const ids = limited.map((a) => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ids);

        const profileMap = new Map(
          (profiles ?? []).map((p) => [p.id, p as unknown as Profile]),
        );

        setAttendees(
          limited.map((a) => ({ ...a, profile: profileMap.get(a.user_id) ?? null })),
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [eventId]);

  const visibleCount  = attendees.filter((a) => a.is_visible).length;
  const hiddenCount   = totalCount - visibleCount;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 size={14} className="animate-spin text-slate-500" />
        <span className="text-xs text-slate-500">Katılımcılar yükleniyor…</span>
      </div>
    );
  }

  if (attendees.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Users size={14} className="text-slate-500" />
        <span className="text-xs text-slate-500">Henüz katılan yok — ilk sen ol!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users size={14} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Katılımcılar ({totalCount})
        </span>
      </div>

      <div className="flex items-center">
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {attendees.map((a, i) => {
            const p = a.profile;
            if (!p) return null;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => p && onViewProfile?.(p)}
                className="relative transition-transform hover:z-10 hover:scale-110"
                style={{ zIndex: attendees.length - i }}
                title={p.name}
              >
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            );
          })}

          {/* Hidden count bubble */}
          {hiddenCount > 0 && (
            <div className="w-9 h-9 rounded-full bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-300"
              style={{ zIndex: 0 }}
            >
              +{hiddenCount}
            </div>
          )}
        </div>

        {/* Text summary */}
        <p className="ml-3 text-xs text-slate-500">
          {visibleCount > 0 && (
            <span className="font-semibold text-slate-400">
              {attendees[0]?.profile?.name ?? 'Biri'}
            </span>
          )}
          {visibleCount > 1 && (
            <span> ve {visibleCount - 1} kişi daha</span>
          )}
          {hiddenCount > 0 && (
            <span className="text-slate-600"> · {hiddenCount} gizli</span>
          )}
        </p>
      </div>
    </div>
  );
};
