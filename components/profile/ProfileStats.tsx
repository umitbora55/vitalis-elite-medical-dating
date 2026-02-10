import React from 'react';
import { Eye, Heart, HeartHandshake, Lock, TrendingUp } from 'lucide-react';

interface StatsData {
  views: number;
  likes: number;
  matches: number;
  trend: number;
}

interface ProfileStatsProps {
  stats: StatsData;
  isPremium: boolean;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats, isPremium }) => {
  return (
    <div className="mb-6 space-y-3">
      <h3 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest pl-2">
        Profile Insights
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400 mb-2">
            <Eye size={16} />
            <span className="text-[10px] uppercase font-bold">Views</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
              {isPremium ? stats.views : `${Math.floor(stats.views / 10) * 10}+`}
            </span>
            {isPremium && (
              <div className="flex items-center gap-1 text-[10px] text-green-500 mt-1">
                <TrendingUp size={10} />
                <span>{stats.trend}% vs last wk</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-2 text-gold-500 mb-2">
            <Heart size={16} fill={isPremium ? 'currentColor' : 'none'} />
            <span className="text-[10px] uppercase font-bold">Likes</span>
          </div>
          <div className="relative">
            {isPremium ? (
              <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {stats.likes}
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 blur-[2px] leading-none">
                  12
                </span>
                <Lock size={12} className="text-gold-500 absolute top-1 left-2" />
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-1">New likes this week</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-2 text-purple-500 dark:text-purple-400 mb-2">
            <HeartHandshake size={16} />
            <span className="text-[10px] uppercase font-bold">Matches</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
              {stats.matches}
            </span>
            <p className="text-[10px] text-slate-500 mt-1">New connections</p>
          </div>
        </div>
      </div>
    </div>
  );
};
