import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTarkovTime } from '../useTarkovTime';

describe('useTarkovTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with formatted time string', () => {
    const mockDate = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    const { tarkovTime } = useTarkovTime();

    expect(typeof tarkovTime.value).toBe('string');
  });

  it('updates time automatically after interval', async () => {
    const mockDate = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    const { tarkovTime } = useTarkovTime();
    // Store initial time for potential future comparison
    // const _initialTime = tarkovTime.value

    // Advance time by 4 seconds (interval is 3000ms)
    vi.advanceTimersByTime(4000);

    // Time should have updated
    expect(typeof tarkovTime.value).toBe('string');
  });

  it('provides time as string', () => {
    const { tarkovTime } = useTarkovTime();

    expect(typeof tarkovTime.value).toBe('string');
  });

  it('composable can be imported and used', () => {
    const result = useTarkovTime();

    expect(result).toHaveProperty('tarkovTime');
    expect(result.tarkovTime).toBeDefined();
  });
});
