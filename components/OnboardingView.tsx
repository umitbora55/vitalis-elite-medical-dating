import React, { useState } from 'react';
import { Activity, ShieldCheck, Heart, Clock, Lock, ChevronRight } from 'lucide-react';

interface OnboardingViewProps {
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

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

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

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

        {/* Actions */}
        <div className="w-full mt-8">
            <button 
                onClick={handleNext}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 group"
            >
                {step === steps.length - 1 ? "Get Started" : "Next"}
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            {step < steps.length - 1 && (
                <button 
                    onClick={onComplete}
                    className="mt-4 text-slate-500 text-sm font-medium hover:text-slate-300"
                >
                    Skip Intro
                </button>
            )}
        </div>
      </div>
    </div>
  );
};