import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, LifeBuoy, Mail, Send, ShieldCheck, X } from 'lucide-react';

type ToggleType = 'TIP' | 'FAQ';

interface SafetyCenterProps {
  isOpen: boolean;
  expandedTip: string | null;
  expandedFaq: string | null;
  feedbackText: string;
  onClose: () => void;
  onToggle: (id: string, type: ToggleType) => void;
  onFeedbackChange: (value: string) => void;
  onSendFeedback: () => void;
  onEmergencyReport: () => void;
}

export const SafetyCenter: React.FC<SafetyCenterProps> = ({
  isOpen,
  expandedTip,
  expandedFaq,
  feedbackText,
  onClose,
  onToggle,
  onFeedbackChange,
  onSendFeedback,
  onEmergencyReport,
}) => {
  if (!isOpen) return null;

  const tips = [
    {
      id: 'tip1',
      title: 'Ilk Bulusma Onerileri',
      content:
        'Ilk bulusmayi her zaman halka acik bir yerde yapin. Bir arkadasiniza veya ailenize konumunuzu bildirin.',
    },
    {
      id: 'tip2',
      title: 'Supheli Profilleri Tanima',
      content:
        'Para isteyen, cok hizli kisisel bilgi talep eden veya goruntulu gorusmeden kacinan profillere dikkat edin.',
    },
    {
      id: 'tip3',
      title: 'Kisisel Verileri Koruma',
      content:
        'Ev adresinizi, finansal bilgilerinizi veya T.C. kimlik numaranizi asla paylasmayin.',
    },
  ];

  const faqs = [
    {
      id: 'faq1',
      title: 'Nasil dogrulanirim?',
      content:
        "Profil ayarlarinda 'Dogrulama Rozetleri' kismindan Selfie veya Belge yukleyerek onaylanabilirsiniz.",
    },
    {
      id: 'faq2',
      title: 'Premium uyelik iptali',
      content: 'App Store veya Google Play abonelik ayarlarindan uyeliginizi yonetebilirsiniz.',
    },
    {
      id: 'faq3',
      title: 'Eslesme nasil calisir?',
      content: 'Karsilikli beğeni oldugunda eslesme gerceklesir. Premium uyeler, kendilerini begenenleri gorebilir.',
    },
    {
      id: 'faq4',
      title: 'Birini nasil engellerim?',
      content: "Kullanici profilinin sag ust kosesindeki menuden 'Engelle' secenegini kullanabilirsiniz.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-gold-500" />
          <div>
            <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
              Guvenlik Merkezi
            </h3>
            <p className="text-xs text-slate-500">Yardim ve Destek</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
            <LifeBuoy size={14} /> Guvenlik Ipuclari
          </h4>
          <div className="space-y-3">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => onToggle(tip.id, 'TIP')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {tip.title}
                  </span>
                  {expandedTip === tip.id ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </button>
                {expandedTip === tip.id && (
                  <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in border-t border-slate-100 dark:border-slate-800">
                    {tip.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
            <FileText size={14} /> Sikca Sorulan Sorular
          </h4>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => onToggle(faq.id, 'FAQ')}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {faq.title}
                  </span>
                  {expandedFaq === faq.id ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </button>
                {expandedFaq === faq.id && (
                  <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in border-t border-slate-100 dark:border-slate-800">
                    {faq.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
            <Mail size={14} /> Bize Ulasin
          </h4>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Bir sorun mu yasiyorsunuz? Ekibimize mesaj gonderin.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="Mesajinizi buraya yazin..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:border-gold-500 outline-none mb-3"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={onSendFeedback}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
              >
                <Send size={16} /> Gonder
              </button>
              <a
                href="mailto:destek@medmatch.com"
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Email
              </a>
            </div>
          </div>
        </div>

        <div className="pt-4 pb-8">
          <button
            onClick={onEmergencyReport}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 animate-pulse"
          >
            <AlertTriangle size={20} fill="currentColor" className="text-white" />
            ACIL YARDIM / IHBAR
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Taciz, tehdit veya acil guvenlik durumlarinda kullanin.
          </p>
        </div>
      </div>
    </div>
  );
};
