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
});
