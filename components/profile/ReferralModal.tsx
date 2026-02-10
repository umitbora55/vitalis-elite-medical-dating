import React from 'react';
import { Copy, Gift, MessageCircle, MessageSquareMore, X } from 'lucide-react';
import { Profile } from '../../types';

interface ReferralModalProps {
  isOpen: boolean;
  profile: Profile;
  onClose: () => void;
  onCopyCode: () => void;
  onShareWhatsApp: () => void;
  onShareSMS: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  profile,
  onClose,
  onCopyCode,
  onShareWhatsApp,
  onShareSMS,
}) => {
  if (!isOpen || !profile.referralData) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X size={20} />
          </button>
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
            <Gift size={32} className="text-gold-400" />
          </div>
          <h3 className="text-xl font-serif font-bold text-white mb-1">Invite & Earn</h3>
          <p className="text-blue-100 text-xs">Invite colleagues, get free Premium!</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex justify-between text-xs font-bold uppercase text-slate-400 mb-2">
              <span>3 Friends Campaign</span>
              <span className="text-gold-500">{profile.referralData.invitedCount}/3 Joined</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, (profile.referralData.invitedCount / 3) * 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Invite 3 healthcare professionals to unlock 1 Month of Vitalis Premium!
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <p className="text-xs text-slate-400 uppercase font-bold mb-2">Your Invite Code</p>
            <div className="flex items-center gap-2 justify-center mb-3">
              <span className="text-2xl font-mono font-bold text-white tracking-widest">
                {profile.referralData.code}
              </span>
              <button
                onClick={onCopyCode}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Share this code with verified healthcare workers only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onShareWhatsApp}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-colors"
            >
              <MessageCircle size={16} /> WhatsApp
            </button>
            <button
              onClick={onShareSMS}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            >
              <MessageSquareMore size={16} /> SMS
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {profile.referralData.invitedCount}
              </div>
              <div className="text-[9px] text-slate-500 uppercase">Invited</div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-lg font-bold text-green-400">
                {profile.referralData.joinedCount}
              </div>
              <div className="text-[9px] text-slate-500 uppercase">Joined</div>
            </div>
            <div className="text-center border-l border-slate-800">
              <div className="text-lg font-bold text-gold-500">
                {profile.referralData.totalRewardsEarned}d
              </div>
              <div className="text-[9px] text-slate-500 uppercase">Earned</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
