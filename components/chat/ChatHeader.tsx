import React from 'react';
import { ChevronLeft, Search, Phone, Video, MoreVertical, Palette, MessageSquare, PhoneIncoming, Trash2, UserMinus } from 'lucide-react';
import { ChatTheme, Match } from '../../types';

interface ChatHeaderProps {
  match: Match;
  currentTheme: ChatTheme;
  status: { text: string; color: string };
  isSearchOpen: boolean;
  onBack: () => void;
  onToggleSearch: () => void;
  onStartCall: (type: 'VOICE' | 'VIDEO') => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onOpenTheme: () => void;
  onOpenTemplates: () => void;
  onSimulateIncomingCall: () => void;
  onDeleteConversation: () => void;
  onUnmatch: () => void;
  formatMatchTime: (timestamp: number) => string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  match,
  currentTheme,
  status,
  isSearchOpen,
  onBack,
  onToggleSearch,
  onStartCall,
  isMenuOpen,
  onToggleMenu,
  onOpenTheme,
  onOpenTemplates,
  onSimulateIncomingCall,
  onDeleteConversation,
  onUnmatch,
  formatMatchTime,
}) => {
  return (
    <div
      className={`flex items-center justify-between p-4 backdrop-blur-md border-b pt-8 pb-4 z-10 shadow-sm relative transition-colors ${currentTheme.isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
        }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Go back to matches"
          className={`p-1 -ml-2 transition-colors rounded-full ${currentTheme.isDark
            ? 'text-slate-400 hover:text-white hover:bg-slate-800'
            : 'text-slate-600 hover:text-black hover:bg-slate-100'
            }`}
        >
          <ChevronLeft size={28} />
        </button>

        <div className="relative">
          <div
            className={`w-10 h-10 rounded-full overflow-hidden border ${currentTheme.isDark ? 'border-slate-700' : 'border-slate-200'
              }`}
          >
            <img
              src={match.profile.images[0]}
              alt={match.profile.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${status.color} rounded-full border-2 ${currentTheme.isDark ? 'border-slate-900' : 'border-white'
              }`}
          ></div>
        </div>

        <div>
          <h3
            className={`font-bold text-sm ${currentTheme.isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
          >
            {match.profile.name}
          </h3>
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] text-gold-500 font-bold uppercase tracking-wider">
              {match.profile.specialty}
            </p>
            <span className="text-[8px] text-slate-500">•</span>
            <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
              Matched {formatMatchTime(match.timestamp)}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`flex items-center gap-4 ${currentTheme.isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
      >
        <button
          onClick={onToggleSearch}
          aria-label="Search in conversation"
          className={`hover:text-gold-400 transition-colors p-2 rounded-full ${isSearchOpen ? 'text-gold-500 bg-slate-800' : ''
            } ${currentTheme.isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
        >
          <Search size={20} />
        </button>

        <button
          onClick={() => onStartCall('VOICE')}
          aria-label="Start voice call"
          className={`hover:text-gold-400 transition-colors p-2 rounded-full ${currentTheme.isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
        >
          <Phone size={20} />
        </button>
        <button
          onClick={() => onStartCall('VIDEO')}
          aria-label="Start video call"
          className={`hover:text-gold-400 transition-colors p-2 rounded-full ${currentTheme.isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
            }`}
        >
          <Video size={20} />
        </button>

        <div className="relative">
          <button onClick={onToggleMenu} aria-label="Open chat actions" className="hover:text-gold-400 transition-colors p-2 rounded-full hover:bg-slate-800/50">
            <MoreVertical size={20} />
          </button>
          {isMenuOpen && (
            <div className="absolute top-10 right-0 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in z-20">
              <button
                onClick={onOpenTheme}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800 transition-colors border-b border-slate-800/50"
              >
                <Palette size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-slate-200">Change Theme</span>
              </button>

              <button
                onClick={onOpenTemplates}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800 transition-colors border-b border-slate-800/50"
              >
                <MessageSquare size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-slate-200">Message Templates</span>
              </button>

              <button
                onClick={onSimulateIncomingCall}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800 transition-colors border-b border-slate-800/50"
              >
                <PhoneIncoming size={16} className="text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  Simulate Incoming Call
                </span>
              </button>

              <button
                onClick={onDeleteConversation}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800 transition-colors"
              >
                <Trash2 size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Delete Conversation</span>
              </button>
              <div className="h-px bg-slate-800"></div>
              <button
                onClick={onUnmatch}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800 transition-colors"
              >
                <UserMinus size={16} className="text-red-500" />
                <span className="text-sm font-medium text-red-400">Unmatch</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
