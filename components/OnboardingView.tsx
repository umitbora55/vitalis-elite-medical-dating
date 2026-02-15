import React, { useState, useCallback } from 'react';
import { Activity, ShieldCheck, Heart, Clock, Lock, ChevronRight, Loader2 } from 'lucide-react';

interface OnboardingViewProps {
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  // AUDIT-FIX: [FE-007] - Added isTransitioning state to prevent double-click issues
  const [isTransitioning, setIsTransitioning] = useState(false);

  const steps = [
    {
      title: "Welcome to Vitalis",
      desc: "The exclusive dating platform designed specifically for healthcare professionals like you.",
      icon: <Activity size={64} className="text-gold-500" />,
      bg: "from-slate-900 to-slate-950"
    },
    {
      title: "Verified Pros Only",
      desc: "Connect with confidence. Every profile is verified to ensure you are meeting real colleagues.",
      icon: <ShieldCheck size={64} className="text-green-500" />,
      bg: "from-slate-900 to-green-950/30"
    },
    {
      title: "Match & Connect",
      desc: "Swipe right to connect. Find someone who understands the demands of your profession.",
      icon: <Heart size={64} className="text-red-500 fill-red-500" />,
      bg: "from-slate-900 to-red-950/30"
    },
    {
      title: "Shift Friendly",
      desc: "Use the 'Available Now' status to let others know you are free for a coffee break or chat between rounds.",
      icon: <Clock size={64} className="text-blue-500" />,
      bg: "from-slate-900 to-blue-950/30"
    },
    {
      title: "Safe & Private",
      desc: "Your privacy is our priority. We have strict anti-harassment policies and advanced reporting tools.",
      icon: <Lock size={64} className="text-gold-500" />,
      bg: "from-slate-900 to-gold-950/20"
    }
  ];

  // AUDIT-FIX: [FE-007] - Added double-click prevention with transition state
  const handleNext = useCallback(() => {
    if (isTransitioning) return;

    if (step < steps.length - 1) {
      setIsTransitioning(true);
      setStep(prev => prev + 1);
      // Reset transitioning state after animation completes
      setTimeout(() => setIsTransitioning(false), 350);
    } else {
      setIsTransitioning(true);
      onComplete();
    }
  }, [step, steps.length, isTransitioning, onComplete]);

  // AUDIT-FIX: [FE-007] - Handle skip with transition protection
  const handleSkip = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    onComplete();
  }, [isTransitioning, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-fade-in">
      {/* Dynamic Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${steps[step].bg} transition-colors duration-700`}></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

      <div className="relative z-10 w-full max-w-md px-8 flex flex-col items-center text-center h-[70vh] justify-between">
        
        {/* Progress Bars */}
        <div className="flex gap-2 w-full mb-8">
            {steps.map((_, idx) => (
                <div 
                    key={idx} 
                    className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${idx <= step ? 'bg-gold-500' : 'bg-slate-800'}`}
                ></div>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center animate-slide-up">
            <div className="w-32 h-32 rounded-full bg-slate-900/50 border border-slate-700 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
                {steps[step].icon}
            </div>
            
            <h1 className="text-3xl font-serif font-bold text-white mb-4">
                {steps[step].title}
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
                {steps[step].desc}
            </p>
        </div>

        {/* AUDIT-FIX: [FE-007] - Actions with loading state and disabled during transition */}
        <div className="w-full mt-8">
            <button
                onClick={handleNext}
                disabled={isTransitioning}
                className={`w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 group ${
                  isTransitioning ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.02]'
                }`}
                aria-busy={isTransitioning}
            >
                {isTransitioning && step === steps.length - 1 ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    {step === steps.length - 1 ? "Get Started" : "Next"}
                    <ChevronRight size={20} className={!isTransitioning ? "group-hover:translate-x-1 transition-transform" : ""} />
                  </>
                )}
            </button>
            {step < steps.length - 1 && (
                <button
                    onClick={handleSkip}
                    disabled={isTransitioning}
                    className={`mt-4 text-slate-500 text-sm font-medium ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-300'}`}
                >
                    Skip Intro
                </button>
            )}
        </div>
      </div>
    </div>
  );
};