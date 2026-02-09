import React from 'react';
import { Activity, User, MessageCircle, SlidersHorizontal, Bell, Clock, MapPin } from 'lucide-react';

interface AppHeaderProps {
  currentView: 'home' | 'profile' | 'matches' | 'notifications' | 'likesYou' | 'premium' | 'history' | 'nearby';
  setView: (view: 'home' | 'profile' | 'matches' | 'notifications' | 'likesYou' | 'premium' | 'history' | 'nearby') => void;
  onOpenFilters?: () => void;
  unreadNotificationsCount?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentView, setView, onOpenFilters, unreadNotificationsCount = 0 }) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 transition-colors duration-300">
      
      {/* Left Action: Profile or Filter based on View */}
      {currentView === 'home' && onOpenFilters ? (
        <button 
          onClick={onOpenFilters}
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-gold-500 dark:hover:text-gold-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <SlidersHorizontal size={24} />
        </button>
      ) : (
        <button 
          onClick={() => setView('profile')}
          className={`p-2 rounded-full transition-colors ${
              currentView === 'profile' 
              ? 'text-gold-500 bg-slate-100 dark:bg-slate-800 dark:text-gold-400' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User size={24} />
        </button>
      )}

      {/* Center Logo */}
      <div className="flex items-center gap-2 cursor-pointer absolute left-1/2 transform -translate-x-1/2" onClick={() => setView('home')}>
        <div className="bg-gradient-to-tr from-gold-600 to-gold-400 p-1.5 rounded-lg shadow-[0_0_15px_rgba(251,191,36,0.3)]">
          <Activity size={20} className="text-white" strokeWidth={3} />
        </div>
        <h1 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 dark:from-slate-100 dark:via-slate-300 dark:to-slate-100 tracking-wide hidden sm:block transition-colors duration-300">
          VITALIS
        </h1>
      </div>

      {/* Right Action: Notifications, Matches, History */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        
        {/* Nearby Button */}
        <button 
            onClick={() => setView('nearby')}
            className={`p-2 rounded-full transition-colors ${currentView === 'nearby' ? 'text-gold-500 dark:text-gold-400 bg-slate-100 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
            <MapPin size={24} />
        </button>

        <button 
            onClick={() => setView('history')}
            className={`p-2 rounded-full transition-colors hidden sm:block ${currentView === 'history' ? 'text-gold-500 dark:text-gold-400 bg-slate-100 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
            <Clock size={24} />
        </button>

        <button 
            onClick={() => setView('notifications')}
            className={`p-2 rounded-full transition-colors relative ${currentView === 'notifications' ? 'text-gold-500 dark:text-gold-400 bg-slate-100 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
            <Bell size={24} />
            {unreadNotificationsCount > 0 && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border border-white dark:border-slate-950">
                    {unreadNotificationsCount}
                </div>
            )}
        </button>

        <button 
            onClick={() => setView('matches')}
            className={`p-2 rounded-full transition-colors ${currentView === 'matches' ? 'text-gold-500 dark:text-gold-400 bg-slate-100 dark:bg-slate-800' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
        >
            <MessageCircle size={24} />
        </button>
      </div>
    </header>
  );
};