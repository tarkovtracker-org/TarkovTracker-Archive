import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { useTarkovTime } from '../useTarkovTime';

const activeWrappers: VueWrapper[] = [];

const mountUseTarkovTime = (): ReturnType<typeof useTarkovTime> => {
  let composableResult: ReturnType<typeof useTarkovTime> | null = null;

  const TestComponent = defineComponent({
    setup() {
      composableResult = useTarkovTime();
      return () => null;
    },
  });

  const wrapper = mount(TestComponent);
  activeWrappers.push(wrapper);

  if (!composableResult) {
    throw new Error('useTarkovTime did not initialize');
  }

  return composableResult as ReturnType<typeof useTarkovTime>;
};

describe('useTarkovTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    activeWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
    vi.useRealTimers();
  });

  it('initializes with formatted time string', async () => {
    const mockDate = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    const { tarkovTime } = mountUseTarkovTime();
    await nextTick();

    expect(typeof tarkovTime.value).toBe('string');
  });

  it('updates time automatically after interval', async () => {
    const mockDate = new Date('2024-01-01T12:00:00Z');
    vi.setSystemTime(mockDate);

    const { tarkovTime } = mountUseTarkovTime();
    await nextTick();

    const initialValue = tarkovTime.value;
    const realTimeAdvanceMs = 10_000; // ~1m10s Tarkov time, guarantees minute rollover
    vi.advanceTimersByTime(realTimeAdvanceMs);
    vi.setSystemTime(new Date(mockDate.getTime() + realTimeAdvanceMs));
    await vi.runOnlyPendingTimersAsync();
    await nextTick();

    // Time should have updated
    expect(typeof tarkovTime.value).toBe('string');
    expect(tarkovTime.value).not.toBe(initialValue);
  });

  it('provides time as string', async () => {
    const { tarkovTime } = mountUseTarkovTime();
    await nextTick();

    expect(typeof tarkovTime.value).toBe('string');
  });

  it('composable can be imported and used', async () => {
    const result = mountUseTarkovTime();
    await nextTick();

    expect(result).toHaveProperty('tarkovTime');
    expect(result.tarkovTime).toBeDefined();
  });

  it('handles day/night boundaries correctly', async () => {
    // Test around midnight - tarkov time should wrap properly
    const midnightUTC = new Date('2024-01-01T00:00:00Z'); // 3 AM tarkov time
    vi.setSystemTime(midnightUTC);

    const { tarkovTime } = mountUseTarkovTime();
    await nextTick();

    // Pre-calculated expected value for 2024-01-01T00:00:00Z
    const expectedTarkovTime = '03:00 / 15:00';

    expect(tarkovTime.value).toBe(expectedTarkovTime);
  });

  it('handles time wraparound at 23:59 to 00:00', async () => {
    // Test near end of day to verify wraparound
    const lateEveningUTC = new Date('2024-01-01T21:00:00Z'); // 00:00 tarkov time next day
    vi.setSystemTime(lateEveningUTC);

    const { tarkovTime } = mountUseTarkovTime();
    await nextTick();

    expect(tarkovTime.value).toMatch(/^\d{2}:\d{2} \/ \d{2}:\d{2}$/);

    // Verify the second time is 12 hours ahead (e.g., 00:00 becomes 12:00)
    const timeMatch = tarkovTime.value.match(/^(\d{2}):(\d{2}) \/ (\d{2}):(\d{2})$/);
    expect(timeMatch).not.toBeNull();

    if (timeMatch) {
      const [, currentHour, , oppositeHour] = timeMatch;
      const currentHourNum = parseInt(currentHour, 10);
      const oppositeHourNum = parseInt(oppositeHour, 10);

      // Opposite time should be (current + 12) % 24
      const expectedOppositeHour = (currentHourNum + 12) % 24;
      expect(oppositeHourNum).toBe(expectedOppositeHour);
    }
  });

  it('handles edge cases around Tarkov time speed factor', async () => {
    // Test with different UTC times to ensure 7x speed factor works correctly
    const testCases = [
      new Date('2024-01-01T06:00:00Z'), // 18:00 tarkov time
      new Date('2024-01-01T12:00:00Z'), // 00:00 tarkov time (next day)
      new Date('2024-01-01T18:00:00Z'), // 06:00 tarkov time
    ];

    for (const testDate of testCases) {
      let wrapper: VueWrapper | null = null;
      try {
        vi.setSystemTime(testDate);
        const { tarkovTime } = mountUseTarkovTime();
        // Get the last added wrapper
        wrapper = activeWrappers[activeWrappers.length - 1];
        await nextTick();

        expect(tarkovTime.value).toMatch(/^\d{2}:\d{2} \/ \d{2}:\d{2}$/);

        // Verify time format is always HH:MM / HH:MM
        const timeParts = tarkovTime.value.split(' / ');
        expect(timeParts).toHaveLength(2);

        for (const timePart of timeParts) {
          expect(timePart).toMatch(/^\d{2}:\d{2}$/);
          const [hours, minutes] = timePart.split(':').map(Number);
          expect(hours).toBeGreaterThanOrEqual(0);
          expect(hours).toBeLessThan(24);
          expect(minutes).toBeGreaterThanOrEqual(0);
          expect(minutes).toBeLessThan(60);
        }
      } finally {
        // Always unmount to avoid overlapping intervals, even if assertion throws
        if (wrapper) {
          wrapper.unmount();
          const index = activeWrappers.indexOf(wrapper);
          if (index > -1) {
            activeWrappers.splice(index, 1);
          }
        }
      }
    }
  });

  it('handles interval cleanup properly', async () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const mockIntervalId = 123 as unknown as ReturnType<typeof setInterval>;

    const setIntervalSpy = vi.spyOn(window, 'setInterval').mockReturnValue(mockIntervalId);

    // Mount and unmount the component
    const wrapper = mount(
      defineComponent({
        setup() {
          useTarkovTime();
          return () => null;
        },
      })
    );

    activeWrappers.push(wrapper);

    wrapper.unmount();

    // Verify setInterval was called
    expect(setIntervalSpy).toHaveBeenCalled();

    // Verify clearInterval was called with the mock ID
    expect(clearIntervalSpy).toHaveBeenCalledWith(mockIntervalId);

    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });
});
