import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import HideoutView from '../HideoutView.vue';
import { useHideoutData } from '@/composables/data/useHideoutData';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { useUserStore } from '@/stores/user';

// Mock dependencies
vi.mock('@/composables/data/useHideoutData', () => ({
  useHideoutData: vi.fn(),
}));

vi.mock('@/composables/useProgressQueries', () => ({
  useProgressQueries: vi.fn(),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: vi.fn(),
}));

vi.mock('@/components/ui/TrackerTip', () => ({
  default: {
    name: 'TrackerTip',
    template: '<div class="tracker-tip"><slot /></div>',
  },
}));

vi.mock('@/components/domain/hideout/HideoutCard', () => ({
  default: {
    name: 'HideoutCard',
    template: '<div class="hideout-card" :station="station">{{ station.name }}</div>',
    props: ['station'],
  },
}));

vi.mock('@/components/ui/RefreshButton', () => ({
  default: {
    name: 'RefreshButton',
    template: '<button class="refresh-button">Refresh</button>',
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'page.hideout.loading': 'Loading hideout data...',
        'page.hideout.nostationsfound': 'No stations found',
        'page.hideout.primaryviews.available': 'Available',
        'page.hideout.primaryviews.maxed': 'Maxed',
        'page.hideout.primaryviews.locked': 'Locked',
        'page.hideout.primaryviews.all': 'All',
      };
      return translations[key] || key;
    }),
  })),
}));

describe('HideoutView', () => {
  let wrapper: any;
  let mockHideoutData: any;
  let mockProgressQueries: any;
  let mockUserStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock hideout stations data
    const mockStations = [
      {
        id: 'station1',
        name: 'Medstation',
        levels: [
          { level: 1, stationLevelRequirements: [] },
          { level: 2, stationLevelRequirements: [] },
          { level: 3, stationLevelRequirements: [] },
        ],
      },
      {
        id: 'station2',
        name: 'Workbench',
        levels: [
          { level: 1, stationLevelRequirements: [] },
          { level: 2, stationLevelRequirements: [] },
        ],
      },
    ];

    mockHideoutData = {
      hideoutStations: { value: mockStations },
      loading: { value: false },
    };

    mockProgressQueries = {
      visibleTeamStores: { value: { station1: { level: 2 }, station2: { level: 1 } } },
      getHideoutLevelFor: vi.fn((stationId: string) => {
        const levels: Record<string, number> = { station1: 2, station2: 1 };
        return levels[stationId] || 0;
      }),
    };

    mockUserStore = {
      getTaskPrimaryView: 'available',
      setTaskPrimaryView: vi.fn(),
    };

    vi.mocked(useHideoutData).mockReturnValue(mockHideoutData);
    vi.mocked(useProgressQueries).mockReturnValue(mockProgressQueries);
    vi.mocked(useUserStore).mockReturnValue(mockUserStore);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders correctly with data loaded', async () => {
    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-tabs': { template: '<div class="v-tabs"><slot /></div>' },
          'v-tab': { template: '<div class="v-tab"><slot /></div>' },
          'v-progress-circular': { template: '<div class="v-progress-circular"></div>' },
          'v-alert': { template: '<div class="v-alert"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should render TrackerTip
    expect(wrapper.findComponent({ name: 'TrackerTip' }).exists()).toBe(true);

    // Should render primary views tabs
    expect(wrapper.find('.v-tabs').exists()).toBe(true);
    expect(wrapper.text()).toContain('Available');
    expect(wrapper.text()).toContain('Maxed');
    expect(wrapper.text()).toContain('Locked');
    expect(wrapper.text()).toContain('All');

    // Should render hideout cards
    const hideoutCards = wrapper.findAllComponents({ name: 'HideoutCard' });
    expect(hideoutCards).toHaveLength(2);
    expect(hideoutCards[0].text()).toContain('Medstation');
    expect(hideoutCards[1].text()).toContain('Workbench');
  });

  it('shows loading state correctly', async () => {
    mockHideoutData.loading.value = true;

    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-progress-circular': { template: '<div class="v-progress-circular"></div>' },
        },
      },
    });

    await nextTick();

    expect(wrapper.find('.v-progress-circular').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading hideout data...');
    expect(wrapper.findComponent({ name: 'RefreshButton' }).exists()).toBe(true);
  });

  it('shows empty state when no stations found', async () => {
    mockHideoutData.hideoutStations.value = [];
    mockHideoutData.loading.value = false;

    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-alert': { template: '<div class="v-alert"><slot /></div>' },
        },
      },
    });

    await nextTick();

    expect(wrapper.findComponent({ name: 'HideoutCard' }).exists()).toBe(false);
    expect(wrapper.find('.v-alert').exists()).toBe(true);
    expect(wrapper.text()).toContain('No stations found');
  });

  it('computes visible stations correctly based on active view', async () => {
    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-tabs': {
            template: '<div class="v-tabs"><slot /></div>',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
          'v-tab': { template: '<div class="v-tab"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Test 'available' view (default)
    expect(wrapper.vm.activePrimaryView).toBe('available');
    let hideoutCards = wrapper.findAllComponents({ name: 'HideoutCard' });
    expect(hideoutCards.length).toBeGreaterThan(0);

    // Test 'maxed' view
    wrapper.vm.activePrimaryView = 'maxed';
    await nextTick();

    // Test 'locked' view
    wrapper.vm.activePrimaryView = 'locked';
    await nextTick();

    // Test 'all' view
    wrapper.vm.activePrimaryView = 'all';
    await nextTick();
    hideoutCards = wrapper.findAllComponents({ name: 'HideoutCard' });
    expect(hideoutCards).toHaveLength(2); // Should show all stations
  });

  it('handles isStoreLoading computation correctly', async () => {
    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Test when hideout data is loading
    mockHideoutData.loading.value = true;
    await nextTick();
    expect(wrapper.vm.isStoreLoading).toBe(true);

    // Test when hideout data is not loading but stations are empty
    mockHideoutData.loading.value = false;
    mockHideoutData.hideoutStations.value = [];
    await nextTick();
    expect(wrapper.vm.isStoreLoading).toBe(true);

    // Test when team stores are empty
    mockHideoutData.hideoutStations.value = [{ id: 'station1', levels: [] }];
    mockProgressQueries.visibleTeamStores.value = {};
    await nextTick();
    expect(wrapper.vm.isStoreLoading).toBe(true);

    // Test when everything is loaded
    mockProgressQueries.visibleTeamStores.value = { station1: {} };
    await nextTick();
    expect(wrapper.vm.isStoreLoading).toBe(false);
  });

  it('filters stations correctly for upgradeability', async () => {
    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-tabs': {
            template: '<div class="v-tabs"><slot /></div>',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
          'v-tab': { template: '<div class="v-tab"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Set to 'available' view to test upgrade filtering
    wrapper.vm.activePrimaryView = 'available';
    await nextTick();

    // The canUpgradeStation function should be called for filtering
    expect(mockProgressQueries.getHideoutLevelFor).toHaveBeenCalled();
  });

  it('handles empty stations array gracefully', async () => {
    mockHideoutData.hideoutStations.value = [];
    mockHideoutData.loading.value = false;

    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
          'v-alert': { template: '<div class="v-alert"><slot /></div>' },
        },
      },
    });

    await nextTick();

    expect(wrapper.vm.visibleStations).toEqual([]);
    expect(wrapper.find('.v-alert').exists()).toBe(true);
  });

  it('handles errors in visible stations computation', async () => {
    // Mock getHideoutLevelFor to throw an error
    mockProgressQueries.getHideoutLevelFor.mockImplementation(() => {
      throw new Error('Test error');
    });

    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should handle errors gracefully and return empty array
    expect(wrapper.vm.visibleStations).toEqual([]);
  });

  it('binds activePrimaryView correctly with user store', async () => {
    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-tabs': {
            template:
              '<div class="v-tabs" @click="$emit(\'update:modelValue\', \'maxed\')"><slot /></div>',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
          'v-tab': { template: '<div class="v-tab"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Initial value should come from user store
    expect(wrapper.vm.activePrimaryView).toBe('available');

    // Changing the computed should call user store setter
    wrapper.vm.activePrimaryView = 'maxed';
    expect(mockUserStore.setTaskPrimaryView).toHaveBeenCalledWith('maxed');
  });

  it('renders tabs with correct icons and titles', async () => {
    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-card': { template: '<div class="v-card"><slot /></div>' },
          'v-tabs': { template: '<div class="v-tabs"><slot /></div>' },
          'v-tab': {
            template: '<div class="v-tab" :prepend-icon="prependIcon"><slot /></div>',
            props: ['prepend-icon'],
          },
        },
      },
    });

    await nextTick();

    const tabs = wrapper.findAll('.v-tab');
    expect(tabs).toHaveLength(4);

    // Check that titles are translated correctly
    expect(wrapper.text()).toContain('Available');
    expect(wrapper.text()).toContain('Maxed');
    expect(wrapper.text()).toContain('Locked');
    expect(wrapper.text()).toContain('All');
  });

  it('computes hasNextLevel correctly', async () => {
    wrapper = mount(HideoutView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Test with station that has next level
    const stationWithNextLevel = {
      id: 'station1',
      levels: [
        { level: 1, stationLevelRequirements: [] },
        { level: 2, stationLevelRequirements: [] },
      ],
    };

    // Test with maxed station
    const maxedStation = {
      id: 'station2',
      levels: [{ level: 1, stationLevelRequirements: [] }],
    };

    // The hasNextLevel function should work correctly
    expect(wrapper.vm.hasNextLevel(stationWithNextLevel)).toBe(true);
    expect(wrapper.vm.hasNextLevel(maxedStation)).toBe(false);
  });
});
