import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useNeededItems } from '../useNeededItems';

// Mock dependencies
vi.mock('@/composables/tarkovdata', () => ({
  useTarkovData: () => ({
    tasks: ref([]),
    hideoutModules: ref([]),
    hideoutLoading: ref(false),
    loading: ref(false),
    neededItemTaskObjectives: ref([]),
    neededItemHideoutModules: ref([]),
  }),
}));

vi.mock('@/composables/useProgressQueries', () => ({
  useProgressQueries: () => ({
    tasksCompletions: ref({}),
    moduleCompletions: ref({}),
    getHideoutLevelFor: vi.fn(),
    getModuleCompletionMap: vi.fn(),
  }),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    getNeededTypeView: 'all',
    setNeededTypeView: vi.fn(),
  }),
}));

vi.mock('@/components/domain/items/useNeedVisibility', () => ({
  useNeedVisibility: () => ({
    isTaskNeedVisible: vi.fn(() => true),
    isHideoutNeedVisible: vi.fn(() => true),
  }),
}));

vi.mock('@/utils/debounce', () => ({
  debounce: (fn: Function) => fn, // Return function directly for tests
}));

vi.mock('@/stores/progress', () => ({
  STASH_STATION_ID: 'stash-station-id',
}));

describe('useNeededItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const {
      itemFilterNameText,
      activeNeededView,
      neededTaskItems,
      neededHideoutItems,
      loading,
      hideoutLoading,
      hasMoreItems,
      neededViews,
    } = useNeededItems();

    expect(itemFilterNameText.value).toBe('');
    expect(activeNeededView.value).toBe('all');
    expect(neededTaskItems.value).toEqual([]);
    expect(neededHideoutItems.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(hideoutLoading.value).toBe(false);
    expect(hasMoreItems.value).toBe(false);
    expect(neededViews).toHaveLength(3);
    expect(neededViews[0].view).toBe('all');
    expect(neededViews[1].view).toBe('tasks');
    expect(neededViews[2].view).toBe('hideout');
  });

  it('should provide itemFilterName through provide/inject', () => {
    const { itemFilterName } = useNeededItems();
    expect(itemFilterName.value).toBeDefined();
  });

  it('should clear filter text', () => {
    const { itemFilterNameText, clearItemFilterNameText } = useNeededItems();

    itemFilterNameText.value = 'test filter';
    clearItemFilterNameText();

    expect(itemFilterNameText.value).toBe('');
  });

  it('should load more items when available', () => {
    const { loadMoreItems } = useNeededItems();

    // Since we're mocking empty arrays, hasMoreItems will be false
    // but we can still call the function
    expect(() => loadMoreItems()).not.toThrow();
  });
});
