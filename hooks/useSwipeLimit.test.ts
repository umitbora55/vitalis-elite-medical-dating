import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeLimit } from './useSwipeLimit';

describe('useSwipeLimit', () => {
  it('returns a time to reset string', () => {
    const { result } = renderHook(() =>
      useSwipeLimit({ dailyLimit: 50, onReset: vi.fn() }),
    );

    expect(result.current.timeToReset).toContain('h');
  });

  it('calls onReset when countdown reaches zero', () => {
    const onReset = vi.fn();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 9, 23, 59, 59, 500));

    renderHook(() => useSwipeLimit({ dailyLimit: 50, onReset }));

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onReset).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
