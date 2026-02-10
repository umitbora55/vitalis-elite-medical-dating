import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { ChatTheme, Message } from '../../types';

interface AudioBubbleProps {
  msg: Message;
  isMe: boolean;
  currentTheme: ChatTheme;
  formatDuration: (seconds: number) => string;
}

export const AudioBubble: React.FC<AudioBubbleProps> = ({
  msg,
  isMe,
  currentTheme,
  formatDuration,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parseDuration = (str: string | undefined) => {
    if (!str) return 0;
    const parts = str.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const totalDuration = parseDuration(msg.duration || '0:05');

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * speed;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, totalDuration]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2, 0.75];
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    setCurrentTime(percentage * totalDuration);
  };

  const formattedCurrentTime = formatDuration(Math.floor(currentTime));

  return (
    <div className={`flex flex-col gap-2 min-w-[200px] ${isMe ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${
            isMe
              ? `bg-white ${currentTheme.isDark ? 'text-black' : 'text-slate-800'}`
              : `${currentTheme.primaryColor} text-white`
          }`}
        >
          {isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-1" />
          )}
        </button>

        <div
          className="flex-1 flex flex-col gap-1 cursor-pointer h-10 justify-center group"
          onClick={handleScrub}
        >
          <div className="flex items-center gap-0.5 h-6">
            {[...Array(20)].map((_, i) => {
              const progressPercent = currentTime / totalDuration;
              const barPercent = i / 20;
              const isPlayed = barPercent < progressPercent;

              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isPlayed
                      ? isMe
                        ? currentTheme.isDark
                          ? 'bg-white'
                          : 'bg-black'
                        : 'bg-white'
                      : isMe
                        ? currentTheme.isDark
                          ? 'bg-white/30'
                          : 'bg-black/20'
                        : 'bg-white/40'
                  } ${
                    isPlaying && i === Math.floor(progressPercent * 20)
                      ? 'animate-pulse scale-y-125'
                      : ''
                  }`}
                  style={{ height: `${Math.max(30, Math.random() * 100)}%` }}
                ></div>
              );
            })}
          </div>
        </div>

        <button
          onClick={toggleSpeed}
          className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
            isMe
              ? currentTheme.isDark
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-black/10 hover:bg-black/20 text-black'
              : 'bg-black/20 hover:bg-black/30 text-white'
          }`}
        >
          {speed}x
        </button>
      </div>

      <div
        className={`flex justify-between w-full px-1 text-[9px] font-mono font-medium ${
          isMe
            ? currentTheme.isDark
              ? 'text-white/70'
              : 'text-slate-600'
            : 'text-white/80'
        }`}
      >
        <span>{formattedCurrentTime}</span>
        <span>{msg.duration || '0:05'}</span>
      </div>
    </div>
  );
};
