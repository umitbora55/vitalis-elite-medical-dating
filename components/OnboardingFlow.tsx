import React, { useState, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { onboardingService, type OnboardingStep } from '../services/onboardingService';
import { supabase } from '../src/lib/supabase';
import { IntentSelectionStep, type Intent } from './IntentSelectionStep';
import { MapPin, Camera, FileText, Heart, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

interface OnboardingFlowProps {
  userId: string;
  step: OnboardingStep;
  onComplete: () => void;
}

type FlowStep = 'location' | 'photos' | 'bio' | 'intent' | 'complete';

const STEP_CONFIG: Record<FlowStep, { icon: React.ReactNode; title: string; subtitle: string }> = {
  location: {
    icon: <MapPin size={32} className="text-gold-400" />,
    title: 'Konum İzni',
    subtitle: 'Yakınındaki sağlık profesyonellerini keşfetmek için konum iznine ihtiyacımız var.',
  },
  photos: {
    icon: <Camera size={32} className="text-gold-400" />,
    title: 'Fotoğraflarını Ekle',
    subtitle: 'En az 3 fotoğraf yükle. İlk fotoğrafın yüz içermeli.',
  },
  bio: {
    icon: <FileText size={32} className="text-gold-400" />,
    title: 'Kendini Tanıt',
    subtitle: 'En az 50 karakter bio yaz. Kim olduğunu ve ne aradığını anlat.',
  },
  intent: {
    icon: <Heart size={32} className="text-gold-400" />,
    title: 'Ne Arıyorsun?',
    subtitle: 'Niyetini belirle.',
  },
  complete: {
    icon: <CheckCircle2 size={32} className="text-emerald-400" />,
    title: 'Hazırsın!',
    subtitle: 'Profilin tamamlandı. Vitalis\'e hoş geldin.',
  },
};

const FLOW_ORDER: FlowStep[] = ['location', 'photos', 'bio', 'intent', 'complete'];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userId, step: initialStep, onComplete }) => {
  const startIndex = FLOW_ORDER.indexOf(initialStep as FlowStep);
  const [currentIndex, setCurrentIndex] = useState(startIndex >= 0 ? startIndex : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);

  const currentStep = FLOW_ORDER[currentIndex];
  const config = STEP_CONFIG[currentStep];

  const advanceStep = useCallback(async () => {
    const next = currentIndex + 1;
    if (next >= FLOW_ORDER.length) {
      await onboardingService.completeStep(userId, 'intent');
      onComplete();
      return;
    }
    setCurrentIndex(next);
    setError(null);
  }, [currentIndex, userId, onComplete]);

  const handleLocationStep = async () => {
    setLoading(true);
    setError(null);
    try {
      const granted = await locationService.requestLocationPermission();
      if (granted) {
        const pos = await locationService.getCurrentPosition();
        await locationService.updateUserLocation(userId, pos.lat, pos.lng);
        setLocationGranted(true);
        await onboardingService.completeStep(userId, 'location');
        await advanceStep();
      } else {
        // Allow skipping location
        setLocationGranted(false);
        await advanceStep();
      }
    } catch {
      setError('Konum alınamadı. Devam etmek için atlayabilirsiniz.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoStep = async () => {
    if (photoUrls.length < 3) {
      setError('En az 3 fotoğraf yüklemeniz gerekiyor.');
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ photo_count: photoUrls.length, has_face_photo: true })
        .eq('id', userId);
      await onboardingService.completeStep(userId, 'photos');
      await advanceStep();
    } catch {
      setError('Fotoğraflar kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleBioStep = async () => {
    if (bio.trim().length < 50) {
      setError('Bio en az 50 karakter olmalı.');
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ bio_text: bio.trim() })
        .eq('id', userId);
      await onboardingService.completeStep(userId, 'bio');
      await advanceStep();
    } catch {
      setError('Bio kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleIntentSelect = async (intent: Intent) => {
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ intent, intent_last_changed_at: new Date().toISOString() })
        .eq('id', userId);
      await advanceStep();
    } catch {
      setError('Seçim kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const progressPct = Math.round(((currentIndex) / (FLOW_ORDER.length - 1)) * 100);

  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="max-w-sm w-full text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-900/30 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
            <CheckCircle2 size={48} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-serif text-white mb-3">Hoş Geldin!</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Profilin tamamlandı. Artık Vitalis'i kullanmaya başlayabilirsin.
          </p>
          <button
            onClick={onComplete}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            Keşfetmeye Başla
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      <div className="relative z-10 flex flex-col h-screen max-w-sm mx-auto w-full">
        {/* Progress bar */}
        <div className="px-6 pt-12 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-medium">
              {currentIndex + 1} / {FLOW_ORDER.length - 1}
            </span>
            <span className="text-slate-500 text-xs">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Header */}
        {currentStep !== 'intent' && (
          <div className="px-6 pt-4 pb-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-4">
              {config.icon}
            </div>
            <h1 className="text-2xl font-serif text-white mb-2">{config.title}</h1>
            <p className="text-slate-400 text-sm">{config.subtitle}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {currentStep === 'location' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-center">
                <MapPin size={40} className="text-gold-400 mx-auto mb-3" />
                <p className="text-slate-300 text-sm leading-relaxed">
                  Konum iznin, yakınındaki sağlık profesyonellerini görmeni sağlar. Konum bilgin güvenli şekilde saklanır.
                </p>
              </div>

              {error && <p className="text-amber-400 text-xs text-center">{error}</p>}

              {locationGranted && (
                <div className="flex items-center gap-2 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-emerald-400 text-sm">Konum alındı!</span>
                </div>
              )}

              <button
                onClick={handleLocationStep}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    Konum İznine İzin Ver
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                onClick={advanceStep}
                className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors text-center py-2"
              >
                Şimdilik Atla
              </button>
            </div>
          )}

          {currentStep === 'photos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center ${
                      photoUrls[i]
                        ? 'border-gold-500/60 bg-gold-500/5'
                        : 'border-slate-700 bg-slate-800/30'
                    }`}
                  >
                    {photoUrls[i] ? (
                      <img src={photoUrls[i]} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Camera size={24} className="text-slate-600" />
                    )}
                  </div>
                ))}
              </div>

              <div className="text-center">
                <label className="inline-flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm cursor-pointer hover:bg-slate-700 transition-all">
                  <Camera size={16} />
                  Fotoğraf Seç
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const urls = files.map((f) => URL.createObjectURL(f));
                      setPhotoUrls((prev) => [...prev, ...urls].slice(0, 6));
                      setError(null);
                    }}
                  />
                </label>
              </div>

              {error && <p className="text-red-400 text-xs text-center">{error}</p>}

              <button
                onClick={handlePhotoStep}
                disabled={loading || photoUrls.length < 3}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    Devam Et ({photoUrls.length}/3)
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 'bio' && (
            <div className="space-y-4">
              <div>
                <textarea
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); setError(null); }}
                  placeholder="Kendini tanıt… Kim olduğunu, ne aradığını, sağlıkla ilişkini anlat."
                  rows={6}
                  className="w-full px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all resize-none text-sm leading-relaxed"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs ${bio.length >= 50 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {bio.length} / 50 minimum
                  </span>
                  {bio.length >= 50 && (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  )}
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                onClick={handleBioStep}
                disabled={loading || bio.trim().length < 50}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>
                    Devam Et
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === 'intent' && (
            <IntentSelectionStep onSelect={handleIntentSelect} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
};
