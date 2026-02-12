import React from 'react';
import { Profile, PremiumTier } from '../types';
import { Lock, Crown, Heart, ShieldCheck } from 'lucide-react';

interface LikesYouViewProps {
  profiles: Profile[];
  onUpgradeClick: () => void;
  premiumTier: PremiumTier;
}

const LOCKED_AVATAR_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%230b1324'/><stop offset='100%' stop-color='%231c2a4a'/></linearGradient></defs><rect width='300' height='400' fill='url(%23g)'/><circle cx='150' cy='125' r='55' fill='%2394a3b8'/><rect x='70' y='210' width='160' height='130' rx='70' fill='%2394a3b8'/></svg>";

const LikesYouViewComponent: React.FC<LikesYouViewProps> = ({ profiles, onUpgradeClick, premiumTier }) => {
  const isForteOrAbove = premiumTier === 'FORTE' || premiumTier === 'ULTRA';

  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-5 pb-4 flex flex-col">
      {/* Header - Agent 1 & 2: Better typography and spacing */}
      <div className="flex items-center justify-between mb-5 px-1">
        <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-gold-500/10 rounded-xl">
            <Heart className="fill-gold-500 text-gold-500" size={22} />
          </div>
          Seni Beğenenler
        </h2>
        <div className="badge badge-gold">
          {profiles.length} Kişi
        </div>
      </div>

      <p className="text-slate-400 text-sm px-1 mb-6 leading-relaxed">
        {isForteOrAbove
          ? "Seni beğenen tüm sağlık profesyonellerini burada görebilir ve anında eşleşebilirsin."
          : "Seni kimlerin merak ettiğini görmek ve anında eşleşmek için Vitalis Forte'ye yükselt."}
      </p>

      {/* Grid - Agent 3 & 6: Better card styling */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        <div className="grid grid-cols-2 gap-4 pb-24">
          {profiles.map((profile, index) => (
            <div
              key={profile.id}
              onClick={!isForteOrAbove ? onUpgradeClick : undefined}
              className={`relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-300 ${!isForteOrAbove
                  ? 'border-slate-800/60 cursor-pointer group hover:border-gold-500/50 hover:shadow-glow-gold'
                  : 'border-slate-800/40'
                }`}
            >
              {/* Image with conditional blur - Agent 6 */}
              <img
                src={isForteOrAbove ? profile.images[0] : LOCKED_AVATAR_PLACEHOLDER}
                alt={isForteOrAbove ? "Profile" : "Locked profile"}
                className={`w-full h-full object-cover transition-all duration-500 ${!isForteOrAbove
                    ? `opacity-70 group-hover:scale-105 ${index % 2 === 0 ? 'blur-md' : 'blur-lg'}`
                    : 'opacity-100'
                  }`}
              />

              {/* Overlay - Agent 3 */}
              <div className={`absolute inset-0 flex flex-col items-center justify-center p-3 ${!isForteOrAbove ? 'bg-slate-950/50' : 'bg-gradient-to-t from-slate-950/90 via-transparent to-transparent'
                }`}>
                {!isForteOrAbove && (
                  <div className="w-12 h-12 rounded-full bg-gold-500/15 backdrop-blur-xl flex items-center justify-center border border-gold-500/40 mb-3 group-hover:bg-gold-500 group-hover:text-slate-950 transition-all duration-300 text-gold-400">
                    <Lock size={22} strokeWidth={2.5} />
                  </div>
                )}

                {/* Info Section - Agent 2 */}
                <div className={`text-center transition-all ${isForteOrAbove ? 'mt-auto pb-1' : ''}`}>
                  <span className={`text-white font-serif font-bold text-lg drop-shadow-md block ${!isForteOrAbove ? 'blur-[3px]' : ''
                    }`}>
                    {isForteOrAbove ? profile.name.split(' ')[0] : 'Gizli Profil'}
                  </span>
                  <span className={`text-gold-400 text-caption uppercase font-bold tracking-wider ${!isForteOrAbove ? 'blur-[1.5px]' : ''
                    }`}>
                    {isForteOrAbove ? profile.specialty : 'Medical Professional'}
                  </span>
                </div>

                {isForteOrAbove && (
                  <div className="absolute top-3 right-3">
                    <ShieldCheck size={18} className="text-gold-400" fill="currentColor" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom CTA for Non-Premium - Agent 4 */}
      {!isForteOrAbove && (
        <div className="absolute bottom-6 left-5 right-5 z-20">
          <button
            onClick={onUpgradeClick}
            className="btn-primary w-full py-4 shadow-glow-gold-lg hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-pulse-soft"
          >
            <Crown size={20} fill="currentColor" strokeWidth={0} />
            Seni Beğenenleri Gör
          </button>
        </div>
      )}
    </div>
  );
};

export const LikesYouView = React.memo(LikesYouViewComponent);
