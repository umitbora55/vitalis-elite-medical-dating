/**
 * ClubDetailView
 *
 * Feature 6: Health Social Clubs
 * Full detail panel for a single club.
 * Shows description, members list, and join/leave action.
 */

import React, { useEffect, useState } from 'react';
import { ChevronLeft, Users, UserPlus, UserMinus, Loader2, Crown } from 'lucide-react';
import { clubService } from '../services/clubService';
import { Club, ClubMember } from '../types';

interface ClubDetailViewProps {
  club:    Club;
  userId:  string;
  onBack:  () => void;
  onUpdate?: (club: Club) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  running: '🏃', cycling: '🚴', yoga: '🧘',
  nutrition: '🥗', research: '🔬', social: '☕',
};

export const ClubDetailView: React.FC<ClubDetailViewProps> = ({
  club: initialClub,
  userId,
  onBack,
  onUpdate,
}) => {
  const [club, setClub]           = useState<Club>(initialClub);
  const [members, setMembers]     = useState<ClubMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toggling, setToggling]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [mems, isMem] = await Promise.all([
        clubService.getMembers(club.id),
        clubService.isMember(club.id, userId),
      ]);
      setMembers(mems);
      setClub((c) => ({ ...c, is_member: isMem, member_count: mems.length }));
      setLoading(false);
    };
    void load();
  }, [club.id, userId]);

  const handleToggle = async () => {
    setToggling(true);
    setError(null);

    const result = club.is_member
      ? await clubService.leaveClub(club.id, userId)
      : await clubService.joinClub(club.id, userId);

    if (result.error) { setError(result.error); setToggling(false); return; }

    // Re-fetch members
    const [mems, isMem] = await Promise.all([
      clubService.getMembers(club.id),
      clubService.isMember(club.id, userId),
    ]);
    setMembers(mems);
    const updated = { ...club, is_member: isMem, member_count: mems.length };
    setClub(updated);
    setToggling(false);
    onUpdate?.(updated);
  };

  const emoji = CATEGORY_EMOJIS[club.category] ?? '👥';
  const isFull = (club.member_count ?? 0) >= club.max_members;

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
        <span className="text-base font-bold text-white truncate mx-2 flex-1">{club.name}</span>
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={toggling || (isFull && !club.is_member)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            club.is_member
              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              : isFull
                ? 'bg-slate-800 text-slate-500'
                : 'bg-gold-500 text-slate-950 hover:bg-gold-400'
          }`}
        >
          {toggling
            ? <Loader2 size={14} className="animate-spin" />
            : club.is_member
              ? <><UserMinus size={14} /> Çık</>
              : isFull
                ? 'Dolu'
                : <><UserPlus size={14} /> Katıl</>
          }
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Club info */}
        <div className="px-5 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <p className="text-sm font-bold text-white">{club.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">{club.category}</span>
                <span className="text-xs text-slate-600">·</span>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Users size={10} />
                  <span>{club.member_count ?? 0} / {club.max_members}</span>
                </div>
                {club.city && (
                  <>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-400">{club.city}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {club.description && (
            <p className="text-sm text-slate-400 leading-relaxed">{club.description}</p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Members list */}
        <div className="border-t border-slate-800">
          <p className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Üyeler ({members.length})
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-slate-500 animate-spin" />
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/50"
              >
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-slate-500 text-sm font-bold">
                        {(member.full_name ?? '?').charAt(0).toUpperCase()}
                      </span>
                  }
                </div>
                <p className="text-sm text-white flex-1 truncate">{member.full_name ?? 'Bilinmiyor'}</p>
                {member.role === 'creator' && (
                  <Crown size={13} className="text-gold-400 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
