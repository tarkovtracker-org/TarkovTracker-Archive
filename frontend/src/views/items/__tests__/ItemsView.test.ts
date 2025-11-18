import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ItemsView from '../ItemsView.vue';
import { useNeededItems } from '@/composables/useNeededItems';
import { useNeededItemsSettings } from '@/composables/useNeededItemsSettings';

// Mock dependencies
vi.mock('@/composables/useNeededItems', () => ({
  useNeededItems: vi.fn(),
}));

vi.mock('@/composables/useNeededItemsSettings', () => ({
  useNeededItemsSettings: vi.fn(),
}));

vi.mock('@/components/ui/TrackerTip', () => ({
  default: {
    name: 'TrackerTip',
    template: '<div class="tracker-tip"><slot /></div>',
  },
}));

vi.mock('@/components/domain/needed-items', () => ({
  NeededItemsFilter: {
    name: 'NeededItemsFilter',
    template: '<div class="needed-items-filter"><slot /></div>',
    props: ['views', 'searchText', 'activeView'],
    emits: ['update:searchText', 'update:activeView'],
  },
  NeededItemsList: {
    name: 'NeededItemsList',
    template: '<div class="needed-items-list"><slot /></div>',
    props: [
      'activeView',
      'taskItems',
      'hideoutItems',
      'itemStyle',
      'loading',
      'hideoutLoading',
      'hasMoreItems',
    ],
    emits: ['loadMore'],
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'page.neededitems.neededviews.tasks': 'Tasks',
        'page.neededitems.neededviews.hideout': 'Hideout',
        'page.neededitems.neededviews.all': 'All',
      };
      return translations[key] || key;
    }),
  })),
}));

describe('ItemsView', () => {
  let wrapper: any;
  let mockUseNeededItems: any;
  let mockUseNeededItemsSettings: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useNeededItems composable
    mockUseNeededItems = {
      itemFilterNameText: { value: '' },
      activeNeededView: { value: 'tasks' },
      neededTaskItems: { value: [{ id: 'item1', name: 'Task Item 1' }] },
      neededHideoutItems: { value: [{ id: 'item2', name: 'Hideout Item 1' }] },
      loading: { value: false },
      hideoutLoading: { value: false },
      hasMoreItems: { value: true },
      loadMoreItems: vi.fn(),
      neededViews: [{ view: 'tasks' }, { view: 'hideout' }, { view: 'all' }],
    };

    // Mock useNeededItemsSettings composable
    mockUseNeededItemsSettings = {
      neededItemsStyle: { value: 'grid' },
    };

    vi.mocked(useNeededItems).mockReturnValue(mockUseNeededItems);
    vi.mocked(useNeededItemsSettings).mockReturnValue(mockUseNeededItemsSettings);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders correctly with all required components', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should render TrackerTip
    expect(wrapper.findComponent({ name: 'TrackerTip' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TrackerTip' }).props('tip')).toEqual({
      id: 'neededitems',
    });

    // Should render NeededItemsFilter
    expect(wrapper.findComponent({ name: 'NeededItemsFilter' }).exists()).toBe(true);

    // Should render NeededItemsList
    expect(wrapper.findComponent({ name: 'NeededItemsList' }).exists()).toBe(true);
  });

  it('passes correct props to NeededItemsFilter', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const filterComponent = wrapper.findComponent({ name: 'NeededItemsFilter' });
    expect(filterComponent.props('views')).toEqual([
      { view: 'tasks', title: 'Tasks' },
      { view: 'hideout', title: 'Hideout' },
      { view: 'all', title: 'All' },
    ]);
    expect(filterComponent.props('searchText')).toBe('');
    expect(filterComponent.props('activeView')).toBe('tasks');
  });

  it('passes correct props to NeededItemsList', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const listComponent = wrapper.findComponent({ name: 'NeededItemsList' });
    expect(listComponent.props('activeView')).toBe('tasks');
    expect(listComponent.props('taskItems')).toEqual([{ id: 'item1', name: 'Task Item 1' }]);
    expect(listComponent.props('hideoutItems')).toEqual([{ id: 'item2', name: 'Hideout Item 1' }]);
    expect(listComponent.props('itemStyle')).toBe('grid');
    expect(listComponent.props('loading')).toBe(false);
    expect(listComponent.props('hideoutLoading')).toBe(false);
    expect(listComponent.props('hasMoreItems')).toBe(true);
  });

  it('handles view localization correctly', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const filterComponent = wrapper.findComponent({ name: 'NeededItemsFilter' });
    const views = filterComponent.props('views');

    expect(views).toEqual([
      { view: 'tasks', title: 'Tasks' },
      { view: 'hideout', title: 'Hideout' },
      { view: 'all', title: 'All' },
    ]);
  });

  it('handles search text updates', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const filterComponent = wrapper.findComponent({ name: 'NeededItemsFilter' });

    // Simulate search text change
    await filterComponent.vm.$emit('update:searchText', 'test search');
    await nextTick();

    expect(mockUseNeededItems.itemFilterNameText.value).toBe('test search');
  });

  it('handles active view updates', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const filterComponent = wrapper.findComponent({ name: 'NeededItemsFilter' });

    // Simulate active view change
    await filterComponent.vm.$emit('update:activeView', 'hideout');
    await nextTick();

    expect(mockUseNeededItems.activeNeededView.value).toBe('hideout');
  });

  it('handles load more items', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const listComponent = wrapper.findComponent({ name: 'NeededItemsList' });

    // Simulate load more
    await listComponent.vm.$emit('loadMore');
    await nextTick();

    expect(mockUseNeededItems.loadMoreItems).toHaveBeenCalled();
  });

  it('reflects loading states correctly', async () => {
    mockUseNeededItems.loading.value = true;
    mockUseNeededItems.hideoutLoading.value = true;

    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const listComponent = wrapper.findComponent({ name: 'NeededItemsList' });
    expect(listComponent.props('loading')).toBe(true);
    expect(listComponent.props('hideoutLoading')).toBe(true);
  });

  it('applies correct CSS classes', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should have compact-row class on v-container
    const container = wrapper.find('.v-container');
    expect(container.attributes('class')).toContain('compact-row');
  });

  it('handles empty item arrays correctly', async () => {
    mockUseNeededItems.neededTaskItems.value = [];
    mockUseNeededItems.neededHideoutItems.value = [];

    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const listComponent = wrapper.findComponent({ name: 'NeededItemsList' });
    expect(listComponent.props('taskItems')).toEqual([]);
    expect(listComponent.props('hideoutItems')).toEqual([]);
  });

  it('handles hasMoreItems false correctly', async () => {
    mockUseNeededItems.hasMoreItems.value = false;

    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const listComponent = wrapper.findComponent({ name: 'NeededItemsList' });
    expect(listComponent.props('hasMoreItems')).toBe(false);
  });

  it('handles different item styles correctly', async () => {
    mockUseNeededItemsSettings.neededItemsStyle.value = 'list';

    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const listComponent = wrapper.findComponent({ name: 'NeededItemsList' });
    expect(listComponent.props('itemStyle')).toBe('list');
  });

  it('handles TrackerTip with correct tip ID', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const trackerTip = wrapper.findComponent({ name: 'TrackerTip' });
    expect(trackerTip.props('tip')).toEqual({ id: 'neededitems' });
  });

  it('handles dynamic component imports correctly', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // The components should be dynamically imported and rendered
    expect(wrapper.findComponent({ name: 'NeededItemsFilter' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'NeededItemsList' }).exists()).toBe(true);
  });

  it('updates computed values when data changes', async () => {
    wrapper = mount(ItemsView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Update task items
    mockUseNeededItems.neededTaskItems.value = [{ id: 'item3', name: 'Updated Task Item' }];
    await nextTick();

    const listComponent = wrapper.findComponent({ name: 'NeededItemsList' });
    expect(listComponent.props('taskItems')).toEqual([{ id: 'item3', name: 'Updated Task Item' }]);

    // Update search text
    mockUseNeededItems.itemFilterNameText.value = 'new search';
    await nextTick();

    const filterComponent = wrapper.findComponent({ name: 'NeededItemsFilter' });
    expect(filterComponent.props('searchText')).toBe('new search');
  });
});
