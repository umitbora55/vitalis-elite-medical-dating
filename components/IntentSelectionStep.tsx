import React, { useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';

export type Intent = 'serious' | 'long_term' | 'networking' | 'friendship';

interface IntentOption {
  value: Intent;
  emoji: string;
  label: string;
  description: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    value: 'serious',
    emoji: '💍',
    label: 'Ciddi İlişki',
    description: 'Uzun vadeli, kalıcı bir birliktelik',
  },
  {
    value: 'long_term',
    emoji: '🤝',
    label: 'Uzun Vadeli',
    description: 'Gelişen, derin bir bağ',
  },
  {
    value: 'networking',
    emoji: '💼',
    label: 'Networking',
    description: 'Profesyonel ağ genişletme',
  },
  {
    value: 'friendship',
    emoji: '👋',
    label: 'Arkadaşlık',
    description: 'Dostluk ve sosyal bağlantı',
  },
];

interface IntentSelectionStepProps {
  onSelect: (intent: Intent) => void;
  loading?: boolean;
}

export const IntentSelectionStep: React.FC<IntentSelectionStepProps> = ({ onSelect, loading = false }) => {
  const [selected, setSelected] = useState<Intent | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    onSelect(selected);
  };

  return (
    <div className="flex flex-col h-full p-6 pt-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-serif text-white mb-2">Ne Arıyorsun?</h1>
        <p className="text-slate-400 text-sm">
          Bu seçim profilinde görünecek ve eşleşmelerini yönlendirecek.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {INTENT_OPTIONS.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-gold-500/10 border-gold-500/60 shadow-[0_0_20px_rgba(234,179,8,0.1)]'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              <span className="text-3xl mb-2">{option.emoji}</span>
              <span className={`text-sm font-semibold ${isSelected ? 'text-gold-400' : 'text-white'}`}>
                {option.label}
              </span>
              <span className="text-slate-500 text-xs mt-1 text-center leading-tight">
                {option.description}
              </span>
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-gold-500 flex items-center justify-center">
                  <span className="text-slate-950 text-xs font-bold">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-2 bg-slate-800/40 rounded-xl p-3 mb-6">
        <Info size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
        <p className="text-slate-500 text-xs leading-relaxed">
          Bu seçimi <span className="text-slate-400 font-medium">yılda 3 kez</span> değiştirebilirsiniz. Profilinde görünür ve diğer kullanıcılara güven verir.
        </p>
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected || loading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
        ) : (
          <>
            Devam Et
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </div>
  );
};
