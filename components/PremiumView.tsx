import React, { useState } from 'react';
import { Check, X, Crown, Star, Zap, Heart, RotateCcw, Infinity, TrendingUp, MapPin, Eye, Dna, MessageCircle, Users, BarChart3, Ban } from 'lucide-react';
import { createCheckoutSession } from '../services/checkoutService';

type PlanId = 'FREE' | 'DOSE' | 'FORTE' | 'ULTRA';

interface PlanConfig {
  id: PlanId;
  name: string;
  subtitle: string;
  price: string;
  period: string;
  tagline: string;
  color: string;
  borderColor: string;
  selectedBorder: string;
  selectedShadow: string;
  checkBg: string;
  checkText: string;
  badge?: string;
  features: { icon: React.ReactNode; text: string }[];
}

interface PremiumViewProps {
  onClose: () => void;
}

export const PremiumView: React.FC<PremiumViewProps> = ({ onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('FORTE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (selectedPlan === 'FREE') return;
    setErrorMessage(null);
    setIsProcessing(true);

    const stripeMap: Record<string, 'GOLD' | 'PLATINUM'> = {
      DOSE: 'GOLD',
      FORTE: 'PLATINUM',
      ULTRA: 'PLATINUM',
    };

    const { sessionUrl, error } = await createCheckoutSession(stripeMap[selectedPlan] || 'GOLD');
    if (error || !sessionUrl) {
      setErrorMessage(error?.message || 'Checkout could not be started.');
      setIsProcessing(false);
      return;
    }

    window.location.assign(sessionUrl);
  };

  const plans: PlanConfig[] = [
    {
      id: 'FREE',
      name: 'Vitalis',
      subtitle: 'Temel',
      price: 'Ücretsiz',
      period: '',
      tagline: 'Başlangıç noktası.',
      color: 'text-slate-400',
      borderColor: 'border-slate-800',
      selectedBorder: 'border-slate-500',
      selectedShadow: 'shadow-none',
      checkBg: 'bg-slate-500',
      checkText: 'text-white',
      features: [
        { icon: <Heart size={14} />, text: 'Günde 30 Beğeni' },
        { icon: <Ban size={14} />, text: 'Reklamlı Deneyim' },
        { icon: <Users size={14} />, text: 'Temel Profil' },
      ],
    },
    {
      id: 'DOSE',
      name: 'Vitalis Dose',
      subtitle: 'İlk Doz',
      price: '₺99',
      period: '/ ay',
      tagline: 'İlk dozunu al.',
      color: 'text-rose-400',
      borderColor: 'border-slate-800',
      selectedBorder: 'border-rose-500/60',
      selectedShadow: 'shadow-[0_0_20px_rgba(244,63,94,0.12)]',
      checkBg: 'bg-rose-500',
      checkText: 'text-white',
      features: [
        { icon: <Infinity size={14} />, text: 'Sınırsız Beğeni' },
        { icon: <X size={14} />, text: 'Reklamsız Deneyim' },
        { icon: <RotateCcw size={14} />, text: 'Son Kaydırmayı Geri Al' },
        { icon: <Star size={14} />, text: 'Günde 3 Süper Beğeni' },
      ],
    },
    {
      id: 'FORTE',
      name: 'Vitalis Forte',
      subtitle: 'Güçlendirilmiş',
      price: '₺199',
      period: '/ ay',
      tagline: 'Güçlendirilmiş formül.',
      color: 'text-amber-400',
      borderColor: 'border-slate-800',
      selectedBorder: 'border-amber-500/60',
      selectedShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      checkBg: 'bg-amber-500',
      checkText: 'text-black',
      badge: 'En Popüler',
      features: [
        { icon: <Infinity size={14} />, text: 'Sınırsız Beğeni' },
        { icon: <X size={14} />, text: 'Reklamsız Deneyim' },
        { icon: <RotateCcw size={14} />, text: 'Son Kaydırmayı Geri Al' },
        { icon: <Star size={14} />, text: 'Günde 7 Süper Beğeni' },
        { icon: <Eye size={14} />, text: 'Seni Beğenenleri Gör' },
        { icon: <Zap size={14} />, text: 'Ayda 3 Boost' },
        { icon: <MapPin size={14} />, text: 'Konum Değiştirme (Passport)' },
      ],
    },
    {
      id: 'ULTRA',
      name: 'Vitalis Ultra',
      subtitle: 'Maksimum',
      price: '₺349',
      period: '/ ay',
      tagline: 'Maksimum etki.',
      color: 'text-violet-400',
      borderColor: 'border-slate-800',
      selectedBorder: 'border-violet-500/60',
      selectedShadow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]',
      checkBg: 'bg-violet-500',
      checkText: 'text-white',
      features: [
        { icon: <Infinity size={14} />, text: 'Sınırsız Beğeni' },
        { icon: <X size={14} />, text: 'Reklamsız Deneyim' },
        { icon: <RotateCcw size={14} />, text: 'Son Kaydırmayı Geri Al' },
        { icon: <Star size={14} />, text: 'Günde 15 Süper Beğeni' },
        { icon: <Eye size={14} />, text: 'Seni Beğenenleri Gör' },
        { icon: <Zap size={14} />, text: 'Ayda 10 Boost' },
        { icon: <MapPin size={14} />, text: 'Konum Değiştirme (Passport)' },
        { icon: <TrendingUp size={14} />, text: 'Öncelikli Görünürlük' },
        { icon: <Dna size={14} />, text: 'Ultra Rozeti' },
        { icon: <MessageCircle size={14} />, text: 'Mesaj Önceliği' },
        { icon: <Users size={14} />, text: 'Profil Ziyaretçileri' },
        { icon: <BarChart3 size={14} />, text: 'Uyumluluk Skoru' },
      ],
    },
  ];

  const activePlan = plans.find(p => p.id === selectedPlan)!;

  const ctaLabel: Record<PlanId, string> = {
    FREE: 'Mevcut Plan',
    DOSE: 'Dose\'a Geç',
    FORTE: 'Forte\'ya Geç',
    ULTRA: 'Ultra\'ya Geç',
  };

  const ctaGradient: Record<PlanId, string> = {
    FREE: 'bg-slate-700 text-slate-400 cursor-not-allowed',
    DOSE: 'bg-gradient-to-r from-rose-600 to-rose-400 text-white hover:brightness-110',
    FORTE: 'bg-gradient-to-r from-amber-600 to-amber-400 text-black hover:brightness-110',
    ULTRA: 'bg-gradient-to-r from-violet-600 to-violet-400 text-white hover:brightness-110',
  };

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
      <div className="relative h-56 w-full overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-slate-950 to-amber-900/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute bottom-6 left-0 right-0 text-center px-6">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-4">
            <Crown size={28} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white mb-1">Seviyeni Seç</h1>
          <p className="text-slate-400 text-xs">Deneyimini yükselt, bağlantılarını derinleştir.</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-44 pt-4">

        {/* Plan Selector Cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-3.5 rounded-xl border-2 text-left transition-all duration-300 ${isSelected
                  ? `bg-slate-900 ${plan.selectedBorder} ${plan.selectedShadow}`
                  : `bg-slate-900/40 ${plan.borderColor} opacity-60 hover:opacity-90`
                  }`}
              >
                {plan.badge && (
                  <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-amber-500 text-[8px] font-bold text-black uppercase tracking-wider rounded-full">
                    {plan.badge}
                  </div>
                )}

                <div className="flex items-start justify-between mb-1.5">
                  <h3 className={`text-xs font-bold tracking-wide ${isSelected ? plan.color : 'text-slate-400'}`}>
                    {plan.name}
                  </h3>
                  {isSelected && (
                    <div className={`w-4 h-4 rounded-full ${plan.checkBg} flex items-center justify-center flex-shrink-0`}>
                      <Check size={10} className={plan.checkText} />
                    </div>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{plan.price}</span>
                  {plan.period && <span className="text-[10px] text-slate-500">{plan.period}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Feature List */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-1 h-4 rounded-full ${activePlan.checkBg}`}></div>
            <h2 className="text-sm font-bold text-white tracking-wide">{activePlan.name}</h2>
            <span className="text-[10px] text-slate-500 italic">— {activePlan.tagline}</span>
          </div>

          <div className="space-y-1">
            {activePlan.features.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60"
              >
                <div className={activePlan.color}>{feature.icon}</div>
                <span className="text-xs font-medium text-slate-300">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-slate-950/95 border-t border-slate-800/50 backdrop-blur-xl z-20">
        <button
          onClick={handlePurchase}
          disabled={isProcessing || selectedPlan === 'FREE'}
          className={`w-full py-3.5 rounded-full font-bold uppercase tracking-widest text-sm transition-all transform active:scale-95 ${ctaGradient[selectedPlan]}`}
        >
          {isProcessing ? 'Yönlendiriliyor...' : ctaLabel[selectedPlan]}
        </button>
        {errorMessage && (
          <p className="text-[10px] text-center text-red-400 mt-2">
            {errorMessage}
          </p>
        )}
        <p className="text-[10px] text-center text-slate-600 mt-2">
          Otomatik yenileme. İstediğin zaman iptal et.
        </p>
      </div>
    </div>
  );
};
