import React from 'react';
import { Notification, NotificationType } from '../types';
import { Heart, MessageCircle, Star, Clock } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
}

const NotificationsViewComponent: React.FC<NotificationsViewProps> = ({ notifications, onNotificationClick }) => {
  
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    
    return "Just now";
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
        case NotificationType.SUPER_LIKE:
            return <Star size={16} className="text-white fill-white" />;
        case NotificationType.MATCH:
            return <MessageCircle size={16} className="text-white" />;
        case NotificationType.LIKE:
            return <Heart size={16} className="text-white fill-white" />;
        default:
            return null;
    }
  };

  const getBgColor = (type: NotificationType) => {
    switch (type) {
        case NotificationType.SUPER_LIKE:
            return 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]';
        case NotificationType.MATCH:
            return 'bg-purple-500';
        case NotificationType.LIKE:
            return 'bg-gold-500';
        default:
            return 'bg-slate-700';
    }
  };

  const getMessage = (n: Notification) => {
      switch (n.type) {
          case NotificationType.SUPER_LIKE:
              return (
                <span>
                    <span className="font-bold text-slate-200">{n.senderProfile.name}</span> super liked you! ⭐
                </span>
              );
          case NotificationType.MATCH:
              return (
                <span>
                    You matched with <span className="font-bold text-slate-200">{n.senderProfile.name}</span>!
                </span>
              );
          case NotificationType.LIKE:
              return (
                <span>
                    <span className="font-bold text-slate-200">{n.senderProfile.name}</span> liked your profile.
                </span>
              );
      }
  };

  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-4 flex flex-col">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-serif text-white">Notifications</h2>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
        {notifications.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-[50vh] opacity-50 space-y-4">
             <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Clock size={32} className="text-slate-600" />
             </div>
             <p className="text-slate-500 text-sm">No new notifications</p>
           </div>
        ) : (
          notifications.map((n) => (
            <div 
                key={n.id} 
                onClick={() => onNotificationClick(n)}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    !n.isRead ? 'bg-slate-900/80 border-gold-500/30' : 'bg-transparent border-slate-800 hover:bg-slate-900/30'
                }`}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-700">
                    <img src={n.senderProfile.images[0]} alt={n.senderProfile.name} className="w-full h-full object-cover" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-950 ${getBgColor(n.type)}`}>
                    {getIcon(n.type)}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 mb-1 leading-snug">
                    {getMessage(n)}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                    {formatTimeAgo(n.timestamp)}
                </p>
              </div>
              
              {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const NotificationsView = React.memo(NotificationsViewComponent);
