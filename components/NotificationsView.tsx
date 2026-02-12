import React from 'react';
import { Notification, NotificationType, PremiumTier } from '../types';
import { Heart, MessageCircle, Star, Clock, Lock } from 'lucide-react';

interface NotificationsViewProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  premiumTier: PremiumTier;
  onExplore: () => void;
  onUpgradeClick: () => void;
}

const LOCKED_AVATAR_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23111c33'/><stop offset='100%' stop-color='%231f2f55'/></linearGradient></defs><rect width='64' height='64' fill='url(%23g)'/><circle cx='32' cy='24' r='12' fill='%2394a3b8'/><path d='M12 58c2-10 10-16 20-16s18 6 20 16' fill='%2394a3b8'/></svg>";

const NotificationsViewComponent: React.FC<NotificationsViewProps> = ({
  notifications,
  onNotificationClick,
  premiumTier,
  onExplore,
  onUpgradeClick,
}) => {
  const isForteOrAbove = premiumTier === 'FORTE' || premiumTier === 'ULTRA';
  const isRestrictedNotification = (type: NotificationType): boolean =>
    (type === NotificationType.LIKE || type === NotificationType.SUPER_LIKE) && !isForteOrAbove;

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
    const isRestricted = isRestrictedNotification(n.type);

    switch (n.type) {
      case NotificationType.SUPER_LIKE:
        return (
          <span>
            <span className={`font-bold transition-all ${isRestricted ? 'text-slate-500 blur-[4px]' : 'text-slate-200'}`}>
              {isRestricted ? 'Bir kullanıcı' : n.senderProfile.name}
            </span>
            {' '}seni süper beğendi! ⭐
          </span>
        );
      case NotificationType.MATCH:
        return (
          <span>
            <span className="font-bold text-slate-200">{n.senderProfile.name}</span> ile eşleştin! 🎉
          </span>
        );
      case NotificationType.LIKE:
        return (
          <span>
            <span className={`font-bold transition-all ${isRestricted ? 'text-slate-500 blur-[4px]' : 'text-slate-200'}`}>
              {isRestricted ? 'Bir kullanıcı' : n.senderProfile.name}
            </span>
            {' '}profilini beğendi. ❤️
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-5 pb-4 flex flex-col">
      {/* Header - Agent 2: Better typography */}
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-2xl font-serif font-bold text-white">Notifications</h2>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
        {notifications.length === 0 ? (
          /* Empty State - Agent 3: Premium empty state */
          <div className="flex flex-col items-center justify-center h-[50vh] space-y-5">
            <div className="w-24 h-24 rounded-full bg-slate-900/60 border border-slate-800/60 flex items-center justify-center">
              <Clock size={36} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-base font-medium mb-1">No new notifications</p>
              <p className="text-slate-500 text-sm">Start exploring to get matches!</p>
            </div>
            <button
              type="button"
              onClick={onExplore}
              className="btn-secondary px-6 py-3"
            >
              Explore profiles
            </button>
          </div>
        ) : (
          notifications.map((n) => {
            const isRestricted = isRestrictedNotification(n.type);
            return (
              <button
                type="button"
                aria-label={isRestricted ? 'Upgrade to unlock this notification' : `Open notification: ${n.type}`}
                key={n.id}
                onClick={() => (isRestricted ? onUpgradeClick() : onNotificationClick(n))}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-left active:scale-[0.98] ${!n.isRead
                  ? 'bg-slate-900/80 border-gold-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                  : 'bg-transparent border-slate-800/60 hover:bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {/* Avatar - Agent 6 */}
                <div className="relative flex-shrink-0">
                  <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isRestricted ? 'border-amber-500/30' : 'border-slate-700/60'}`}>
                    <img
                      src={isRestricted ? LOCKED_AVATAR_PLACEHOLDER : n.senderProfile.images[0]}
                      alt={isRestricted ? 'Locked profile' : 'Profile'}
                      className={`w-full h-full object-cover transition-all duration-500 ${isRestricted ? 'blur-md opacity-60' : 'opacity-100'
                      }`}
                    />
                    {isRestricted && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30">
                        <Lock size={16} className="text-gold-500" />
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-slate-950 ${getBgColor(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                </div>

                {/* Content - Agent 2 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 mb-1.5 leading-relaxed">
                    {getMessage(n)}
                  </p>
                  <p className="text-caption text-slate-500 font-medium">
                    {formatTimeAgo(n.timestamp)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!n.isRead && (
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"></div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export const NotificationsView = React.memo(NotificationsViewComponent);
