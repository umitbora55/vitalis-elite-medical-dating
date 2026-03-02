import React from 'react';
import { Camera, ChevronUp, Lock, Mic, Send, Video, Clock } from 'lucide-react';
import { ChatTheme, Match } from '../../types';

interface ChatInputProps {
  match: Match;
  currentTheme: ChatTheme;
  isInputBlocked: boolean;
  isRecording: boolean;
  recordingMode: 'AUDIO' | 'VIDEO';
  recordingDuration: number;
  inputText: string;
  onInputChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSendPhoto: () => void;
  onSendButtonDown: (event: React.MouseEvent | React.TouchEvent) => void;
  onSendButtonUp: (event: React.MouseEvent | React.TouchEvent) => void;
  onRecordCancel: () => void;
  onToggleMediaMenu: () => void;
  isScheduleMenuOpen: boolean;
  // New props for countdown
  isFirstMovePending?: boolean;
  timeLeft?: string;
  isUrgent?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  match,
  currentTheme,
  isInputBlocked,
  isRecording,
  recordingMode,
  recordingDuration,
  inputText,
  onInputChange,
  onKeyDown,
  onSendPhoto,
  onSendButtonDown,
  onSendButtonUp,
  onRecordCancel,
  onToggleMediaMenu,
  isScheduleMenuOpen,
  isFirstMovePending,
  timeLeft,
  isUrgent,
}) => {
  return (
    <div className="flex items-center gap-3 w-full">
      {isInputBlocked ? (
        <div className="flex-1 px-4 py-3 bg-slate-800/50 rounded-full border border-slate-700 text-center text-xs text-slate-400 flex items-center justify-center gap-2 relative overflow-hidden group">
          {/* Countdown for blocked state */}
          {isFirstMovePending && timeLeft && (
            <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center backdrop-blur-[1px] transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <span className="text-gold-500 font-bold flex items-center gap-1.5">
                <Clock size={12} /> {timeLeft} remaining
              </span>
            </div>
          )}
          <Lock size={12} />
          <span>Sıra {match.profile.name}'de. İlk mesajı o atmalı.</span>
        </div>
      ) : isRecording ? (
        <div
          className={`flex-1 flex items-center justify-between px-4 py-3 rounded-full border animate-pulse ${recordingMode === 'AUDIO'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
            }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full animate-ping ${recordingMode === 'AUDIO' ? 'bg-red-500' : 'bg-blue-500'
                }`}
            ></div>
            <span
              className={`font-mono font-bold ${currentTheme.isDark ? 'text-white' : 'text-slate-800'
                }`}
            >
              {Math.floor(recordingDuration / 60)}:
              {(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest font-bold">
            {recordingMode === 'AUDIO' ? 'Recording Audio...' : 'Recording Video...'}
          </div>
        </div>
      ) : (
        <div className="relative w-full flex flex-col gap-1.5">
          {/* Slim pill timer — centered above the input */}
          {isFirstMovePending && timeLeft && (
            <div className="flex justify-center">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${isUrgent
                  ? 'bg-red-900/20 border-red-500/30 text-red-400'
                  : 'bg-amber-900/20 border-amber-500/25 text-amber-400'
                }`}>
                <Clock size={10} className={isUrgent ? 'animate-pulse' : ''} />
                <span>Expires in {timeLeft}</span>
              </div>
            </div>
          )}

          <div className="relative z-10 flex items-center gap-2 bg-inherit rounded-full w-full">
            {!isRecording && !inputText.trim() && (
              <button
                onClick={onSendPhoto}
                className={`p-3 rounded-full transition-colors shrink-0 ${currentTheme.isDark
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
              >
                <Camera size={20} />
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isFirstMovePending ? "Reply to keep the match..." : "Type a message..."}
              className={`flex-1 rounded-full px-5 py-3.5 text-sm focus:outline-none focus:ring-1 border transition-all w-full shadow-lg ${currentTheme.isDark
                ? `bg-slate-950 text-slate-200 ${isFirstMovePending ? (isUrgent ? 'border-red-500/50' : 'border-amber-500/50') : 'border-slate-800 focus:ring-gold-500/50 focus:border-gold-500/30'} placeholder:text-slate-600`
                : `bg-slate-50 text-slate-800 ${isFirstMovePending ? (isUrgent ? 'border-red-500/50' : 'border-amber-500/50') : 'border-slate-200 focus:ring-gold-500/50 focus:border-gold-500/30'} placeholder:text-slate-400`
                }`}
            />

            {/* Send Button Group */}
            <div className="relative shrink-0" onMouseLeave={onRecordCancel} onTouchCancel={onRecordCancel}>
              {!isRecording && !inputText.trim() && (
                <button
                  onClick={onToggleMediaMenu}
                  className={`absolute -top-3 -right-1 rounded-full p-0.5 border z-10 ${currentTheme.isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-500'
                    }`}
                >
                  <ChevronUp size={12} />
                </button>
              )}

              <button
                onMouseDown={onSendButtonDown}
                onMouseUp={onSendButtonUp}
                onTouchStart={onSendButtonDown}
                onTouchEnd={onSendButtonUp}
                className={`p-3.5 rounded-full transition-all duration-300 transform shadow-lg flex items-center justify-center ${inputText.trim()
                  ? 'bg-gold-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-100 hover:scale-105 active:scale-95'
                  : isRecording
                    ? 'bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                    : `${currentTheme.isDark
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`
                  }`}
              >
                {inputText.trim() ? (
                  <Send size={20} fill="currentColor" />
                ) : isRecording ? (
                  <div className="w-5 h-5 bg-white rounded-sm"></div>
                ) : recordingMode === 'VIDEO' ? (
                  <Video size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="absolute -top-10 left-0 right-0 text-center animate-fade-in pointer-events-none">
          <span className="text-xs text-slate-500 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
            Release to send • Drag away to cancel
          </span>
        </div>
      )}

      {inputText.trim().length > 0 && !isScheduleMenuOpen && (
        <div className="absolute -top-8 right-0 pr-4 animate-fade-in pointer-events-none">
          <span className="text-xs text-slate-500 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
            Hold to Schedule
          </span>
        </div>
      )}
    </div>
  );
};
