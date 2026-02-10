import { useCallback, useEffect, useState } from 'react';

interface UseBoostOptions {
  initialCount: number;
  durationMs?: number;
}

interface UseBoostResult {
  boostCount: number;
  boostEndTime: number | null;
  timeLeft: number;
  isActive: boolean;
  canActivate: boolean;
  activateBoost: () => boolean;
}

const DEFAULT_DURATION_MS = 30 * 60 * 1000;

export const useBoost = ({ initialCount, durationMs = DEFAULT_DURATION_MS }: UseBoostOptions): UseBoostResult => {
  const [boostCount, setBoostCount] = useState(initialCount);
  const [boostEndTime, setBoostEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (boostEndTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = boostEndTime - now;

        if (remaining <= 0) {
          setBoostEndTime(null);
          setTimeLeft(0);
          if (interval) clearInterval(interval);
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [boostEndTime]);

  const activateBoost = useCallback(() => {
    if (boostEndTime) return false;
    if (boostCount <= 0) return false;

    setBoostEndTime(Date.now() + durationMs);
    setBoostCount((prev) => Math.max(0, prev - 1));
    return true;
  }, [boostCount, boostEndTime, durationMs]);

  return {
    boostCount,
    boostEndTime,
    timeLeft,
    isActive: !!boostEndTime,
    canActivate: boostCount > 0 && !boostEndTime,
    activateBoost,
  };
};
