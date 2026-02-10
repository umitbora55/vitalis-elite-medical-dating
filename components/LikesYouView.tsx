import React from 'react';
import { Profile } from '../types';
import { Lock, Crown, Heart } from 'lucide-react';

interface LikesYouViewProps {
  profiles: Profile[];
  onUpgradeClick: () => void;
}

const LikesYouViewComponent: React.FC<LikesYouViewProps> = ({ profiles, onUpgradeClick }) => {
  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-2xl font-serif text-white flex items-center gap-2">
           <Heart className="fill-gold-500 text-gold-500" size={24} />
           Likes You
        </h2>
        <div className="text-gold-500 font-bold text-sm bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/30">
           {profiles.length} People
        </div>
      </div>

      <p className="text-slate-400 text-sm px-2 mb-6">
        Upgrade to Gold to see who's interested in you and match instantly.
      </p>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
          <div className="grid grid-cols-2 gap-4 pb-20">
              {profiles.map((profile, index) => (
                  <div 
                    key={profile.id} 
                    onClick={onUpgradeClick}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 cursor-pointer group hover:border-gold-500/50 transition-all"
                  >
                      {/* Image with different blur levels to tease */}
                      <img 
                        src={profile.images[0]} 
                        alt="Hidden Profile" 
                        className={`w-full h-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-110 ${index < 2 ? 'blur-sm' : 'blur-xl'}`} 
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2">
                          <div className="w-10 h-10 rounded-full bg-gold-500/20 backdrop-blur-md flex items-center justify-center border border-gold-500/50 mb-2 group-hover:bg-gold-500 group-hover:text-white transition-colors text-gold-500">
                             <Lock size={20} />
                          </div>
                          {/* Tease Info - Show Age/Specialty but hide Name */}
                          <div className="text-center">
                              <span className="text-white font-serif font-bold text-lg drop-shadow-md block blur-[2px]">
                                {profile.age}
                              </span>
                              <span className="text-gold-400 text-[10px] uppercase font-bold tracking-wider blur-[1px]">
                                {profile.specialty}
                              </span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
         <button 
            onClick={onUpgradeClick}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 text-white font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 transition-transform flex items-center justify-center gap-2 animate-pulse"
         >
             <Crown size={20} fill="currentColor" />
             See Who Likes You
         </button>
      </div>
    </div>
  );
};

export const LikesYouView = React.memo(LikesYouViewComponent);
