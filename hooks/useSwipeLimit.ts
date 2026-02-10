import { useEffect, useState } from 'react';

interface UseSwipeLimitOptions {
  dailyLimit: number;
  onReset: () => void;
}

interface UseSwipeLimitResult {
  timeToReset: string;
}

export const useSwipeLimit = ({ dailyLimit, onReset }: UseSwipeLimitOptions): UseSwipeLimitResult => {
  const [timeToReset, setTimeToReset] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeToReset(`${hours}h ${minutes}m`);

      if (diff <= 1000) {
        onReset();
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);

    return () => clearInterval(timer);
  }, [dailyLimit, onReset]);

  return { timeToReset };
};
