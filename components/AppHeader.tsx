import React from 'react';
import { Activity, User, MessageCircle, Bell, Clock, MapPin, Heart } from 'lucide-react';
import { ViewType } from '../stores/uiStore';

interface AppHeaderProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  unreadNotificationsCount?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentView, setView, unreadNotificationsCount = 0 }) => {
  // Agent 4: Better nav button styles
  const navButtonClass = (view: ViewType | ViewType[]) => {
    const views = Array.isArray(view) ? view : [view];
    const isActive = views.includes(currentView);
    return `btn-icon transition-all duration-200 ${
      isActive
        ? 'text-gold-500 bg-gold-500/10 dark:bg-gold-500/15'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;
  };

  return (
    <header className="fixed top-0 w-full z-50 glass border-b border-slate-200/50 dark:border-slate-800/50 h-16 flex items-center justify-between px-4 sm:px-6 transition-all duration-300 safe-top">

      {/* Left Action: Spacer for balance */}
      <div className="w-11"></div>

      {/* Center Logo Icon - Agent 3: Premium logo treatment */}
      <button
        type="button"
        aria-label="Go to home"
        onClick={() => setView('home')}
        className="flex items-center absolute left-1/2 transform -translate-x-1/2 group"
      >
        <div className="bg-gradient-to-br from-gold-500 via-gold-400 to-amber-500 p-2 rounded-xl shadow-glow-gold transition-all duration-300 group-hover:shadow-glow-gold-lg group-active:scale-95">
          <Activity size={22} className="text-white" strokeWidth={2.5} />
        </div>
      </button>

      {/* Right Action Group - Agent 4: Better spacing & touch targets */}
      <div className="flex items-center gap-1">

        {/* Nearby Button */}
        <button
          onClick={() => setView('nearby')}
          aria-label="Open nearby"
          className={navButtonClass('nearby')}
        >
          <MapPin size={22} strokeWidth={2} />
        </button>

        {/* History - Hidden on mobile */}
        <button
          onClick={() => setView('history')}
          aria-label="Open swipe history"
          className={`${navButtonClass('history')} hidden sm:flex`}
        >
          <Clock size={22} strokeWidth={2} />
        </button>

        {/* Likes You Button */}
        <button
          onClick={() => setView('likesYou')}
          aria-label="Open likes"
          className={navButtonClass('likesYou')}
        >
          <Heart size={22} strokeWidth={2} />
        </button>

        {/* Notifications with badge */}
        <button
          onClick={() => setView('notifications')}
          aria-label="Open notifications"
          className={`${navButtonClass('notifications')} relative`}
        >
          <Bell size={22} strokeWidth={2} />
          {unreadNotificationsCount > 0 && (
            <div className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 border-2 border-white dark:border-slate-950 shadow-sm">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </div>
          )}
        </button>

        {/* Messages */}
        <button
          onClick={() => setView('matches')}
          aria-label="Open matches"
          className={navButtonClass('matches')}
        >
          <MessageCircle size={22} strokeWidth={2} />
        </button>

        {/* Profile */}
        <button
          onClick={() => setView('profile')}
          aria-label="Open my profile"
          className={navButtonClass('profile')}
        >
          <User size={22} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};
