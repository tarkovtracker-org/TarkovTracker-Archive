import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TaskListView from '../TaskListView.vue';
import { useTaskList } from '@/composables/tasks/useTaskList';

// Mock dependencies
vi.mock('@/composables/tasks/useTaskList', () => ({
  useTaskList: vi.fn(),
}));

vi.mock('@/components/ui/TrackerTip', () => ({
  default: {
    name: 'TrackerTip',
    template: '<div class="tracker-tip"><slot /></div>',
  },
}));

vi.mock('@/components/domain/tasks/TaskViewSelector', () => ({
  default: {
    name: 'TaskViewSelector',
    template: '<div class="task-view-selector"><slot /></div>',
    props: [
      'primary',
      'secondary',
      'user',
      'map',
      'trader',
      'primaryViews',
      'secondaryViews',
      'userViews',
      'maps',
      'mapTaskTotals',
      'secondaryTaskCounts',
      'orderedTraders',
      'traderAvatar',
      'filtersActive',
    ],
    emits: [
      'update:primary',
      'update:secondary',
      'update:user',
      'update:map',
      'update:trader',
      'open-filters',
    ],
  },
}));

vi.mock('@/components/domain/tasks/TaskMapDisplay', () => ({
  default: {
    name: 'TaskMapDisplay',
    template: '<div class="task-map-display" v-if="show">{{ selectedMap }}</div>',
    props: ['show', 'selectedMap', 'visibleMarkers', 'activeMapView'],
  },
}));

vi.mock('@/components/domain/tasks/TaskCardList', () => ({
  default: {
    name: 'TaskCardList',
    template: '<div class="task-card-list"><slot /></div>',
    props: ['tasks', 'activeUserView', 'showNextTasks', 'showPreviousTasks', 'hasMore', 'loading'],
    emits: ['loadMore'],
  },
}));

vi.mock('@/components/domain/tasks/TaskFilterDialog', () => ({
  default: {
    name: 'TaskFilterDialog',
    template: '<div class="task-filter-dialog" v-if="modelValue"><slot /></div>',
    props: ['modelValue', 'filterControls', 'appearanceControls'],
    emits: ['update:modelValue'],
  },
}));

describe('TaskListView', () => {
  let wrapper: any;
  let mockUseTaskList: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useTaskList composable
    mockUseTaskList = {
      primaryViews: [
        { id: 'all', title: 'All Tasks' },
        { id: 'available', title: 'Available' },
      ],
      secondaryViews: [
        { id: 'overview', title: 'Overview' },
        { id: 'detailed', title: 'Detailed' },
      ],
      userViews: [
        { id: 'self', title: 'My Progress' },
        { id: 'team', title: 'Team Progress' },
      ],
      orderedTraders: [
        { id: 'prapor', name: 'Prapor', avatar: 'prapor-avatar.png' },
        { id: 'therapist', name: 'Therapist', avatar: 'therapist-avatar.png' },
      ],
      traderAvatar: vi.fn((traderId) => `avatar-${traderId}.png`),
      maps: [
        { id: 'factory', name: 'Factory' },
        { id: 'customs', name: 'Customs' },
      ],
      activePrimaryView: { value: 'all' },
      activeSecondaryView: { value: 'overview' },
      activeUserView: { value: 'self' },
      activeMapView: { value: 'factory' },
      activeTraderView: { value: 'prapor' },
      loadingTasks: { value: false },
      reloadingTasks: { value: false },
      renderedTasks: { value: [{ id: 'task1', name: 'Test Task' }] },
      hasMoreTasks: { value: true },
      loadMoreTasks: vi.fn(),
      mapTaskTotals: { factory: 5, customs: 10 },
      visibleGPS: { value: ['marker1', 'marker2'] },
      selectedMap: { value: 'factory' },
      filterControls: { search: '', factions: [] },
      appearanceControls: { compact: false },
      showNextTasks: true,
      showPreviousTasks: false,
      secondaryTaskCounts: { overview: 15, detailed: 8 },
      initialVisibleTasksHydrated: { value: true },
    };

    vi.mocked(useTaskList).mockReturnValue(mockUseTaskList);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it('renders correctly with all required components', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should render TrackerTip
    expect(wrapper.findComponent({ name: 'TrackerTip' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'TrackerTip' }).props('tip')).toEqual({ id: 'tasks' });

    // Should render TaskViewSelector
    expect(wrapper.findComponent({ name: 'TaskViewSelector' }).exists()).toBe(true);

    // Should render TaskMapDisplay (shown when primary view is 'maps')
    expect(wrapper.findComponent({ name: 'TaskMapDisplay' }).exists()).toBe(false); // Not shown by default

    // Should render TaskCardList
    expect(wrapper.findComponent({ name: 'TaskCardList' }).exists()).toBe(true);

    // Should render TaskFilterDialog (hidden by default)
    expect(wrapper.findComponent({ name: 'TaskFilterDialog' }).exists()).toBe(false);
  });

  it('passes correct props to TaskViewSelector', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const selectorComponent = wrapper.findComponent({ name: 'TaskViewSelector' });
    const props = selectorComponent.props();

    expect(props.primary).toBe('all');
    expect(props.secondary).toBe('overview');
    expect(props.user).toBe('self');
    expect(props.map).toBe('factory');
    expect(props.trader).toBe('prapor');
    expect(props.primaryViews).toEqual(mockUseTaskList.primaryViews);
    expect(props.secondaryViews).toEqual(mockUseTaskList.secondaryViews);
    expect(props.userViews).toEqual(mockUseTaskList.userViews);
    expect(props.maps).toEqual(mockUseTaskList.maps);
    expect(props.mapTaskTotals).toEqual(mockUseTaskList.mapTaskTotals);
    expect(props.secondaryTaskCounts).toEqual(mockUseTaskList.secondaryTaskCounts);
    expect(props.orderedTraders).toEqual(mockUseTaskList.orderedTraders);
    expect(props.traderAvatar).toBe(mockUseTaskList.traderAvatar);
    expect(props.filtersActive).toBe(false);
  });

  it('passes correct props to TaskCardList', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const cardListComponent = wrapper.findComponent({ name: 'TaskCardList' });
    const props = cardListComponent.props();

    expect(props.tasks).toEqual([{ id: 'task1', name: 'Test Task' }]);
    expect(props.activeUserView).toBe('self');
    expect(props.showNextTasks).toBe(true);
    expect(props.showPreviousTasks).toBe(false);
    expect(props.hasMore).toBe(true);
    expect(props.loading).toBe(false);
  });

  it('shows TaskMapDisplay when primary view is maps', async () => {
    mockUseTaskList.activePrimaryView.value = 'maps';

    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const mapDisplayComponent = wrapper.findComponent({ name: 'TaskMapDisplay' });
    expect(mapDisplayComponent.exists()).toBe(true);
    expect(mapDisplayComponent.props('show')).toBe(true);
    expect(mapDisplayComponent.props('selectedMap')).toBe('factory');
    expect(mapDisplayComponent.props('visibleMarkers')).toEqual(['marker1', 'marker2']);
    expect(mapDisplayComponent.props('activeMapView')).toBe('factory');
  });

  it('handles filter dialog correctly', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Initially filters dialog should be hidden
    expect(wrapper.vm.filtersDialog).toBe(false);
    expect(wrapper.findComponent({ name: 'TaskFilterDialog' }).exists()).toBe(false);

    // Open filters dialog
    const selectorComponent = wrapper.findComponent({ name: 'TaskViewSelector' });
    await selectorComponent.vm.$emit('open-filters');
    await nextTick();

    expect(wrapper.vm.filtersDialog).toBe(true);
    expect(wrapper.findComponent({ name: 'TaskFilterDialog' }).exists()).toBe(true);

    // Close filters dialog
    const filterDialog = wrapper.findComponent({ name: 'TaskFilterDialog' });
    await filterDialog.vm.$emit('update:modelValue', false);
    await nextTick();

    expect(wrapper.vm.filtersDialog).toBe(false);
  });

  it('computes loading states correctly', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Test initial loading state
    expect(wrapper.vm.isAnyLoadingActive).toBe(false);
    expect(wrapper.vm.skeletonLoadingState).toBe(false);

    // Test loading tasks
    mockUseTaskList.loadingTasks.value = true;
    await nextTick();
    expect(wrapper.vm.isAnyLoadingActive).toBe(true);
    expect(wrapper.vm.skeletonLoadingState).toBe(true);

    // Test reloading tasks
    mockUseTaskList.loadingTasks.value = false;
    mockUseTaskList.reloadingTasks.value = true;
    await nextTick();
    expect(wrapper.vm.isAnyLoadingActive).toBe(true);
    expect(wrapper.vm.skeletonLoadingState).toBe(true);

    // Test initial hydration
    mockUseTaskList.reloadingTasks.value = false;
    mockUseTaskList.initialVisibleTasksHydrated.value = false;
    await nextTick();
    expect(wrapper.vm.isAnyLoadingActive).toBe(false);
    expect(wrapper.vm.skeletonLoadingState).toBe(true);
  });

  it('handles view updates correctly', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const selectorComponent = wrapper.findComponent({ name: 'TaskViewSelector' });

    // Update primary view
    await selectorComponent.vm.$emit('update:primary', 'available');
    await nextTick();
    expect(mockUseTaskList.activePrimaryView.value).toBe('available');

    // Update secondary view
    await selectorComponent.vm.$emit('update:secondary', 'detailed');
    await nextTick();
    expect(mockUseTaskList.secondaryView.value).toBe('detailed');

    // Update user view
    await selectorComponent.vm.$emit('update:user', 'team');
    await nextTick();
    expect(mockUseTaskList.activeUserView.value).toBe('team');

    // Update map view
    await selectorComponent.vm.$emit('update:map', 'customs');
    await nextTick();
    expect(mockUseTaskList.activeMapView.value).toBe('customs');

    // Update trader view
    await selectorComponent.vm.$emit('update:trader', 'therapist');
    await nextTick();
    expect(mockUseTaskList.activeTraderView.value).toBe('therapist');
  });

  it('handles load more tasks correctly', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const cardListComponent = wrapper.findComponent({ name: 'TaskCardList' });
    await cardListComponent.vm.$emit('loadMore');
    await nextTick();

    expect(mockUseTaskList.loadMoreTasks).toHaveBeenCalled();
  });

  it('shows empty state when no tasks', async () => {
    mockUseTaskList.renderedTasks.value = [];
    mockUseTaskList.initialVisibleTasksHydrated.value = true;

    wrapper = mount(TaskListView, {
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

    expect(wrapper.vm.showEmptyState).toBe(true);
    expect(wrapper.find('.v-alert').exists()).toBe(true);
    expect(wrapper.text()).toContain('No tasks found');
  });

  it('applies correct CSS classes and styling', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
          'v-row': { template: '<div class="v-row"><slot /></div>' },
          'v-col': { template: '<div class="v-col"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should have task-page class
    expect(wrapper.find('.task-page').exists()).toBe(true);

    // Container should have specific styles
    const container = wrapper.find('.task-page__container');
    expect(container.exists()).toBe(true);
    expect(container.attributes('style')).toContain('max-width: 1800px');
  });

  it('handles filtersActive computed correctly', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const selectorComponent = wrapper.findComponent({ name: 'TaskViewSelector' });
    expect(selectorComponent.props('filtersActive')).toBe(false);

    // The filtersActive prop is computed from filtersDialog
    wrapper.vm.filtersDialog = true;
    await nextTick();

    // Should be passed to TaskViewSelector
    expect(selectorComponent.props('filtersActive')).toBe(true);
  });

  it('passes correct props to TaskFilterDialog', async () => {
    wrapper.vm.filtersDialog = true;

    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    const filterDialog = wrapper.findComponent({ name: 'TaskFilterDialog' });
    expect(filterDialog.props('modelValue')).toBe(true);
    expect(filterDialog.props('filterControls')).toEqual(mockUseTaskList.filterControls);
    expect(filterDialog.props('appearanceControls')).toEqual(mockUseTaskList.appearanceControls);
  });

  it('handles dynamic task updates', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Update tasks
    mockUseTaskList.renderedTasks.value = [{ id: 'task2', name: 'Updated Task' }];
    await nextTick();

    const cardListComponent = wrapper.findComponent({ name: 'TaskCardList' });
    expect(cardListComponent.props('tasks')).toEqual([{ id: 'task2', name: 'Updated Task' }]);
  });

  it('handles component lifecycle correctly', async () => {
    wrapper = mount(TaskListView, {
      global: {
        stubs: {
          'v-container': { template: '<div class="v-container"><slot /></div>' },
        },
      },
    });

    await nextTick();

    // Should initialize correctly
    expect(wrapper.vm.filtersDialog).toBe(false);
    expect(wrapper.exists()).toBe(true);

    // Should unmount cleanly
    wrapper.unmount();
    expect(wrapper.exists()).toBe(false);
  });
});
