import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NeededItemsList from '../NeededItemsList.vue';

// Mock components
vi.mock('@/components/domain/items/NeededItem.vue', () => ({
  default: {
    name: 'NeededItem',
    template: '<div data-test="needed-item"></div>',
    props: ['need', 'itemStyle'],
  },
}));

vi.mock('@/components/ui/RefreshButton.vue', () => ({
  default: {
    name: 'RefreshButton',
    template: '<div data-test="refresh-button"></div>',
    __isTeleport: true,
  },
}));

describe('NeededItemsList', () => {
  const mockTaskItems = [
    { id: '1', needType: 'taskObjective', item: { name: 'Task Item 1' } },
    { id: '2', needType: 'taskObjective', item: { name: 'Task Item 2' } },
  ];

  const mockHideoutItems = [
    { id: '3', needType: 'hideoutModule', item: { name: 'Hideout Item 1' } },
    { id: '4', needType: 'hideoutModule', item: { name: 'Hideout Item 2' } },
  ];

  it('should show loading indicator when loading', () => {
    const wrapper = mount(NeededItemsList, {
      props: {
        activeView: 'all',
        taskItems: [],
        hideoutItems: [],
        itemStyle: 'mediumCard',
        loading: true,
        hideoutLoading: false,
        hasMoreItems: false,
      },
    });

    expect(wrapper.find('[data-test="loading-indicator"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="refresh-button"]').exists()).toBe(true);
  });

  it('should render task items when view is all or tasks', () => {
    const wrapper = mount(NeededItemsList, {
      props: {
        activeView: 'all',
        taskItems: mockTaskItems,
        hideoutItems: [],
        itemStyle: 'mediumCard',
        loading: false,
        hideoutLoading: false,
        hasMoreItems: false,
      },
    });

    expect(wrapper.findAll('[data-test="needed-item"]')).toHaveLength(2);
  });

  it('should render hideout items when view is all or hideout', () => {
    const wrapper = mount(NeededItemsList, {
      props: {
        activeView: 'hideout',
        taskItems: [],
        hideoutItems: mockHideoutItems,
        itemStyle: 'mediumCard',
        loading: false,
        hideoutLoading: false,
        hasMoreItems: false,
      },
    });

    expect(wrapper.findAll('[data-test="needed-item"]')).toHaveLength(2);
  });

  it('should show load more button when has more items', () => {
    const wrapper = mount(NeededItemsList, {
      props: {
        activeView: 'tasks',
        taskItems: mockTaskItems,
        hideoutItems: [],
        itemStyle: 'mediumCard',
        loading: false,
        hideoutLoading: false,
        hasMoreItems: true,
      },
    });

    expect(wrapper.find('[data-test="load-more-button"]').exists()).toBe(true);
  });

  it('should emit load-more event when load more button clicked', async () => {
    const wrapper = mount(NeededItemsList, {
      props: {
        activeView: 'tasks',
        taskItems: mockTaskItems,
        hideoutItems: [],
        itemStyle: 'mediumCard',
        loading: false,
        hideoutLoading: false,
        hasMoreItems: true,
      },
    });

    const loadMoreButton = wrapper.find('[data-test="load-more-button"]');
    await loadMoreButton.trigger('click');

    expect(wrapper.emitted('load-more')).toBeTruthy();
    expect(wrapper.emitted('load-more')).toHaveLength(1);
  });

  it('should show loading more indicator when loading more', () => {
    const wrapper = mount(NeededItemsList, {
      props: {
        activeView: 'tasks',
        taskItems: mockTaskItems,
        hideoutItems: [],
        itemStyle: 'mediumCard',
        loading: true,
        hideoutLoading: false,
        hasMoreItems: true,
      },
    });

    expect(wrapper.find('[data-test="loading-more-indicator"]').exists()).toBe(true);
  });
});
