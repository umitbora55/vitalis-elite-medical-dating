import { useEffect, useRef, useState } from 'react';

interface UseSwipeLimitOptions {
  dailyLimit: number;
  onReset: () => void;
}

interface UseSwipeLimitResult {
  timeToReset: string;
}

export const useSwipeLimit = ({ dailyLimit, onReset }: UseSwipeLimitOptions): UseSwipeLimitResult => {
  const [timeToReset, setTimeToReset] = useState('');
  const onResetRef = useRef(onReset);

  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    const getNextMidnight = (): Date => {
      const next = new Date();
      next.setHours(24, 0, 0, 0);
      return next;
    };

    const updateCountdown = (): void => {
      const diffMs = Math.max(0, getNextMidnight().getTime() - Date.now());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeToReset(`${hours}h ${minutes}m`);
    };

    const scheduleReset = (): void => {
      const diffMs = Math.max(0, getNextMidnight().getTime() - Date.now());
      // Small buffer to avoid missing midnight due to timer drift.
      resetTimer = setTimeout(() => {
        onResetRef.current();
        updateCountdown();
        scheduleReset();
      }, diffMs + 50);
    };

    updateCountdown();
    const countdownTimer = setInterval(updateCountdown, 60_000);
    scheduleReset();

    return (): void => {
      clearInterval(countdownTimer);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [dailyLimit]);

  return { timeToReset };
};
