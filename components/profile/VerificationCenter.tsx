import React from 'react';
import { Camera, CheckCircle, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { Profile } from '../../types';

type VerificationType = 'PHOTO' | 'PHONE' | 'EMAIL';

interface VerificationCenterProps {
  profile: Profile;
  onStartVerification: (type: VerificationType) => void;
}

export const VerificationCenter: React.FC<VerificationCenterProps> = ({
  profile,
  onStartVerification,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck size={14} className="text-slate-900 dark:text-white" /> Trust & Safety
        </h3>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  profile.verificationBadges?.photo
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Camera size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Photo Verification
                  </h4>
                  {profile.verificationBadges?.photo && (
                    <CheckCircle size={14} className="text-blue-500" fill="currentColor" stroke="black" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500">Badge to prove you're real.</p>
              </div>
            </div>
            <button
              onClick={() => !profile.verificationBadges?.photo && onStartVerification('PHOTO')}
              disabled={!!profile.verificationBadges?.photo}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                profile.verificationBadges?.photo
                  ? 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300'
              }`}
            >
              {profile.verificationBadges?.photo ? 'Verified' : 'Verify'}
            </button>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  profile.verificationBadges?.phone
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Smartphone size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Phone Verification
                  </h4>
                  {profile.verificationBadges?.phone && (
                    <CheckCircle size={14} className="text-green-500" fill="currentColor" stroke="black" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500">Secure your account.</p>
              </div>
            </div>
            <button
              onClick={() => !profile.verificationBadges?.phone && onStartVerification('PHONE')}
              disabled={!!profile.verificationBadges?.phone}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                profile.verificationBadges?.phone
                  ? 'border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300'
              }`}
            >
              {profile.verificationBadges?.phone ? 'Verified' : 'Verify'}
            </button>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  profile.verificationBadges?.email
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <Mail size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Institutional Email
                  </h4>
                  {profile.verificationBadges?.email && (
                    <CheckCircle size={14} className="text-purple-500" fill="currentColor" stroke="black" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500">Preferred for professionals.</p>
              </div>
            </div>
            <button
              onClick={() => !profile.verificationBadges?.email && onStartVerification('EMAIL')}
              disabled={!!profile.verificationBadges?.email}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                profile.verificationBadges?.email
                  ? 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300'
              }`}
            >
              {profile.verificationBadges?.email ? 'Verified' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
