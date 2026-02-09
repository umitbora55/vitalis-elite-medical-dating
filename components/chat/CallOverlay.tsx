import React from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Match, Profile } from '../../types';

type CallStatus = 'IDLE' | 'OUTGOING' | 'INCOMING' | 'ACTIVE';
type CallType = 'VOICE' | 'VIDEO';

interface CallOverlayProps {
  callStatus: CallStatus;
  callType: CallType;
  match: Match;
  userProfile: Profile;
  callDurationSeconds: number;
  isCameraOff: boolean;
  isMicMuted: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  onAcceptCall: () => void;
  formatDuration: (seconds: number) => string;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callStatus,
  callType,
  match,
  userProfile,
  callDurationSeconds,
  isCameraOff,
  isMicMuted,
  onToggleMic,
  onToggleCamera,
  onEndCall,
  onAcceptCall,
  formatDuration,
}) => {
  if (callStatus === 'IDLE') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
      <div className="absolute inset-0 overflow-hidden">
        {callType === 'VIDEO' && callStatus === 'ACTIVE' ? (
          <img
            src={match.profile.images[0]}
            alt="Call Background"
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <img
              src={match.profile.images[0]}
              alt="Call Background"
              className="w-full h-full object-cover blur-3xl opacity-40 scale-110"
            />
            <div className="absolute inset-0 bg-black/60"></div>
          </>
        )}
      </div>

      <div className="relative z-10 pt-20 flex flex-col items-center">
        {(callStatus !== 'ACTIVE' || callType === 'VOICE') && (
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800 shadow-2xl mb-6 relative">
            <img
              src={match.profile.images[0]}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
            {callStatus !== 'ACTIVE' && (
              <div className="absolute inset-0 rounded-full border-4 border-gold-500 animate-ping opacity-75"></div>
            )}
          </div>
        )}

        <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center drop-shadow-md">
          {match.profile.name}
        </h2>

        <p className="text-slate-200 font-medium tracking-wide animate-pulse drop-shadow-md">
          {callStatus === 'OUTGOING'
            ? 'Calling...'
            : callStatus === 'INCOMING'
              ? callType === 'VIDEO'
                ? 'Incoming Video Call...'
                : 'Incoming Voice Call...'
              : formatDuration(callDurationSeconds)}
        </p>
      </div>

      {callStatus === 'ACTIVE' && callType === 'VIDEO' && !isCameraOff && (
        <div className="absolute top-20 right-6 w-28 h-36 bg-slate-800 rounded-xl overflow-hidden border border-slate-600 shadow-2xl z-20">
          <img src={userProfile.images[0]} alt="Me" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="absolute bottom-12 left-0 right-0 z-20 flex justify-center items-center gap-8">
        {callStatus === 'ACTIVE' ? (
          <>
            <button
              onClick={onToggleMic}
              className={`p-4 rounded-full transition-colors ${
                isMicMuted
                  ? 'bg-white text-black'
                  : 'bg-slate-800/60 text-white backdrop-blur-md hover:bg-slate-700'
              }`}
            >
              {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            <button
              onClick={onEndCall}
              className="p-5 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transform hover:scale-105 transition-all"
            >
              <PhoneOff size={32} fill="currentColor" />
            </button>

            {callType === 'VIDEO' && (
              <button
                onClick={onToggleCamera}
                className={`p-4 rounded-full transition-colors ${
                  isCameraOff
                    ? 'bg-white text-black'
                    : 'bg-slate-800/60 text-white backdrop-blur-md hover:bg-slate-700'
                }`}
              >
                {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
            )}
          </>
        ) : callStatus === 'INCOMING' ? (
          <>
            <button
              onClick={onEndCall}
              className="p-5 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transform hover:scale-105 transition-all flex flex-col items-center gap-1"
            >
              <PhoneOff size={32} />
              <span className="text-[10px] uppercase font-bold">Decline</span>
            </button>
            <button
              onClick={onAcceptCall}
              className="p-5 rounded-full bg-green-500 text-white shadow-xl hover:bg-green-600 transform hover:scale-105 transition-all flex flex-col items-center gap-1 animate-bounce"
            >
              <Phone size={32} fill="currentColor" />
              <span className="text-[10px] uppercase font-bold">Accept</span>
            </button>
          </>
        ) : (
          <button
            onClick={onEndCall}
            className="p-5 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transform hover:scale-105 transition-all"
          >
            <PhoneOff size={32} fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
};
