import React, { useMemo } from 'react';
import { Profile } from '../types';
import { MapPin, Clock, Hand, EyeOff, Navigation } from 'lucide-react';

interface NearbyViewProps {
  currentUser: Profile;
  profiles: Profile[];
  onSayHi: (profile: Profile) => void;
  onUpdatePrivacy: (setting: boolean) => void;
  onViewProfile: (profile: Profile) => void;
  onBrowseProfiles: () => void;
  onRetryScan: () => void;
}

export const NearbyView: React.FC<NearbyViewProps> = ({
  currentUser,
  profiles,
  onSayHi,
  onUpdatePrivacy,
  onViewProfile,
  onBrowseProfiles,
  onRetryScan,
}) => {
  const isVisible = currentUser.privacySettings?.showInNearby;

  // Filter logic: 
  // 1. Distance <= 5km
  // 2. Not hidden (online status not hidden)
  // 3. Recently active (< 20 mins) OR explicitly marked available
  // 4. Not the current user
  const nearbyUsers = useMemo(() => {
      if (!isVisible) return []; // If I'm hidden, I see no one (Reciprocity)

      return profiles.filter(p => {
          if (p.id === currentUser.id) return false;
          if (p.distance > 5) return false;
          if (p.isOnlineHidden) return false; // Respect their privacy
          
          const isRecent = (Date.now() - p.lastActive) < 20 * 60 * 1000; // 20 mins
          const isAvailable = p.isAvailable && (!p.availabilityExpiresAt || p.availabilityExpiresAt > Date.now());

          return isRecent || isAvailable;
      }).sort((a, b) => a.distance - b.distance);
  }, [profiles, currentUser.id, isVisible]);

  const formatDistance = (dist: number) => {
      if (dist < 1) return `${Math.floor(dist * 1000)} m`;
      return `${dist.toFixed(1)} km`;
  };

  const getStatusText = (p: Profile) => {
      if (p.isAvailable) return "Available Now";
      const mins = Math.floor((Date.now() - p.lastActive) / 60000);
      if (mins < 1) return "Active now";
      return `${mins}m ago`;
  };

  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-4 flex flex-col relative">
        
        {/* Header Section with Radar Effect */}
        <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-gold-500/30 text-gold-500 relative z-10">
                        <MapPin size={20} />
                    </div>
                    {/* Radar Pulse Animation */}
                    {isVisible && (
                        <>
                            <div className="absolute inset-0 rounded-full border border-gold-500/50 animate-ping opacity-75"></div>
                            <div className="absolute inset-[-4px] rounded-full border border-gold-500/20 animate-pulse"></div>
                        </>
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-serif text-white leading-none">Nearby Active</h2>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Within 5 km radius</p>
                </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex flex-col items-end">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        aria-label="Toggle nearby visibility"
                        checked={isVisible}
                        onChange={() => onUpdatePrivacy(!isVisible)}
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <span className="text-[9px] text-slate-500 mt-1">{isVisible ? 'Visible' : 'Hidden'}</span>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
            {!isVisible ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                        <EyeOff size={32} className="text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">You are hidden</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                        To see who's nearby, you must allow others to see you in this list. This promotes fairness and real connections.
                    </p>
                    <button 
                        onClick={() => onUpdatePrivacy(true)}
                        className="px-6 py-3 rounded-xl bg-gold-500 text-white font-bold shadow-lg hover:bg-gold-600 transition-colors"
                    >
                        Turn On Visibility
                    </button>
                </div>
            ) : nearbyUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <div className="relative mb-4">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 relative z-10">
                            <Navigation size={24} className="text-slate-600" />
                        </div>
                        <div className="absolute inset-0 bg-gold-500/10 rounded-full animate-ping"></div>
                    </div>
                    <p className="text-slate-400 text-sm">Scanning for colleagues nearby...</p>
                    <p className="text-slate-600 text-xs mt-2">No active users found within 5km right now.</p>
                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onRetryScan}
                        className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:border-gold-500/40 hover:text-white transition-colors"
                      >
                        Retry scan
                      </button>
                      <button
                        type="button"
                        onClick={onBrowseProfiles}
                        className="px-4 py-2 rounded-xl bg-gold-500 text-white text-xs font-semibold hover:bg-gold-600 transition-colors"
                      >
                        Browse profiles
                      </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {nearbyUsers.map(user => (
                        <div key={user.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 animate-slide-up hover:border-gold-500/30 transition-colors">
                            <button
                                type="button"
                                aria-label={`Open ${user.name} profile`}
                                className="relative cursor-pointer"
                                onClick={() => onViewProfile(user)}
                            >
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700">
                                    <img src={user.images[0]} alt={user.name} className="w-full h-full object-cover" />
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${user.isAvailable ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                            </button>

                            <button
                                type="button"
                                aria-label={`View details for ${user.name}`}
                                className="flex-1 min-w-0 cursor-pointer text-left"
                                onClick={() => onViewProfile(user)}
                            >
                                <div className="flex items-center justify-between mb-0.5">
                                    <h3 className="font-bold text-white text-sm truncate">{user.name}, {user.age}</h3>
                                    <span className="text-[10px] font-bold text-gold-500 flex items-center gap-1 bg-gold-500/10 px-1.5 py-0.5 rounded">
                                        <MapPin size={8} /> {formatDistance(user.distance)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">{user.specialty}</p>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={10} className={user.isAvailable ? "text-green-500" : "text-slate-500"} />
                                    <span className={`text-[10px] ${user.isAvailable ? "text-green-400 font-bold" : "text-slate-500"}`}>
                                        {getStatusText(user)}
                                    </span>
                                </div>
                            </button>

                            <button 
                                onClick={() => onSayHi(user)}
                                aria-label={`Say hi to ${user.name}`}
                                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-gold-500 hover:text-white text-gold-500 flex items-center justify-center transition-all border border-slate-700 shadow-sm active:scale-95"
                                title="Say Hi"
                            >
                                <Hand size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
