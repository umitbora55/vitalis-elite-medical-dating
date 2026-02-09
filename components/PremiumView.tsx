import React, { useState } from 'react';
import { Check, X, Crown, Star, Zap, Heart, RotateCcw, Infinity, TrendingUp } from 'lucide-react';

interface PremiumViewProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export const PremiumView: React.FC<PremiumViewProps> = ({ onClose, onUpgrade }) => {
  const [selectedPlan, setSelectedPlan] = useState<'GOLD' | 'PLATINUM'>('GOLD');

  const handlePurchase = () => {
    // Simulation alert as requested
    alert("Satın alma simülasyonu başarılı!");
    onUpgrade(); // Notify parent app to unlock features
    onClose();
  };

  const features = [
    { icon: <Infinity size={18} />, text: "Unlimited Likes" },
    { icon: <Star size={18} />, text: "10 Super Likes Daily" },
    { icon: <Zap size={18} />, text: "5 Boosts per Month" },
    { icon: <Heart size={18} />, text: "See Who Likes You" },
    { icon: <RotateCcw size={18} />, text: "Rewind Last Swipe" },
    { icon: <X size={18} />, text: "Ad-free Experience" },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col animate-fade-in overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
        <button 
          onClick={onClose}
          className="p-2 bg-black/20 backdrop-blur rounded-full text-white hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative h-64 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-600 via-gold-400 to-yellow-200 opacity-20 animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        
        <div className="absolute bottom-6 left-0 right-0 text-center px-6">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-gold-500/20 border border-gold-500/50 backdrop-blur-md mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                <Crown size={32} className="text-gold-400 fill-gold-400" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Unlock Vitalis Elite</h1>
            <p className="text-slate-300 text-sm">Experience the most exclusive medical dating app without limits.</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-24 pt-4">
        
        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
            {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-gold-500">{feature.icon}</div>
                    <span className="text-xs font-bold text-slate-300">{feature.text}</span>
                </div>
            ))}
        </div>

        {/* Plans Selection */}
        <div className="space-y-4">
            {/* Gold Plan */}
            <div 
                onClick={() => setSelectedPlan('GOLD')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    selectedPlan === 'GOLD' 
                    ? 'bg-slate-900 border-gold-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]' 
                    : 'bg-slate-900/50 border-slate-800 opacity-70 hover:opacity-100'
                }`}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-serif font-bold text-gold-400">Vitalis Gold</h3>
                    {selectedPlan === 'GOLD' && <div className="w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center"><Check size={14} className="text-black"/></div>}
                </div>
                <div className="text-2xl font-bold text-white mb-1">₺149 <span className="text-sm font-normal text-slate-500">/ month</span></div>
                <p className="text-xs text-slate-400">Includes all premium features listed above.</p>
            </div>

            {/* Platinum Plan */}
            <div 
                onClick={() => setSelectedPlan('PLATINUM')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                    selectedPlan === 'PLATINUM' 
                    ? 'bg-slate-900 border-slate-300 shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
                    : 'bg-slate-900/50 border-slate-800 opacity-70 hover:opacity-100'
                }`}
            >
                {/* Platinum Shine Effect */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 blur-2xl rounded-full pointer-events-none"></div>
                
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100">Vitalis Platinum</h3>
                    {selectedPlan === 'PLATINUM' && <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"><Check size={14} className="text-black"/></div>}
                </div>
                <div className="text-2xl font-bold text-white mb-3">₺249 <span className="text-sm font-normal text-slate-500">/ month</span></div>
                
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-start gap-2">
                        <TrendingUp size={16} className="text-blue-400 mt-0.5" />
                        <div>
                            <span className="text-xs font-bold text-white block">Priority Visibility</span>
                            <span className="text-[10px] text-slate-400">Profiles you like see you first.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md z-20">
         <button 
           onClick={handlePurchase}
           className={`w-full py-4 rounded-full font-bold uppercase tracking-widest shadow-lg transition-all transform active:scale-95 ${
               selectedPlan === 'GOLD' 
               ? 'bg-gradient-to-r from-gold-600 to-gold-400 text-black hover:brightness-110'
               : 'bg-gradient-to-r from-slate-200 via-white to-slate-200 text-black hover:brightness-110'
           }`}
         >
           {selectedPlan === 'GOLD' ? 'Get Gold' : 'Get Platinum'}
         </button>
         <p className="text-[10px] text-center text-slate-600 mt-3">
            Recurring billing. Cancel anytime.
         </p>
      </div>
    </div>
  );
};