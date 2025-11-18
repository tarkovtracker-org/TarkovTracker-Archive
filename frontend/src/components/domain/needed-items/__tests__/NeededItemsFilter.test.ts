import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import NeededItemsFilter from '../NeededItemsFilter.vue';

// Mock dependencies
vi.mock('@/composables/useNeededItems', () => ({
  useNeededItems: () => ({
    clearItemFilterNameText: vi.fn(),
  }),
}));

vi.mock('@/composables/useNeededItemsSettings', () => ({
  useNeededItemsSettings: () => ({
    neededItemsStyle: ref('mediumCard'),
    hideFIR: ref(false),
    hideFIRLabel: ref('page.neededitems.options.items_show_non_fir'),
    hideFIRColor: ref('success'),
    itemsHideAll: ref(false),
    itemsHideAllLabel: ref('page.team.card.teamoptions.items_show_all'),
    itemsHideAllColor: ref('success'),
    itemsHideNonFIR: ref(false),
    itemsHideNonFIRLabel: ref('page.team.card.teamoptions.items_show_non_fir'),
    itemsHideNonFIRColor: ref('success'),
    itemsHideHideout: ref(false),
    itemsHideHideoutLabel: ref('page.team.card.teamoptions.items_show_hideout'),
    itemsHideHideoutColor: ref('success'),
  }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('NeededItemsFilter', () => {
  const views = [
    { title: 'All Items', icon: 'mdi-all-inclusive', view: 'all' as const },
    { title: 'Tasks', icon: 'mdi-clipboard-text', view: 'tasks' as const },
    { title: 'Hideout', icon: 'mdi-home', view: 'hideout' as const },
  ];

  it('should render filter controls', () => {
    const wrapper = mount(NeededItemsFilter, {
      props: {
        views,
        searchText: '',
        activeView: 'all',
      },
    });

    expect(wrapper.find('[data-test="search-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="settings-button"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-test="view-tab"]')).toHaveLength(3);
  });

  it('should emit update events when search text changes', async () => {
    const wrapper = mount(NeededItemsFilter, {
      props: {
        views,
        searchText: '',
        activeView: 'all',
      },
    });

    const searchInput = wrapper.find('[data-test="search-input"]');
    await searchInput.setValue('test');
    await searchInput.trigger('update:modelValue');

    expect(wrapper.emitted('update:search-text')).toBeTruthy();
    expect(wrapper.emitted('update:search-text')?.[0]).toEqual(['test']);
  });

  it('should emit update events when view changes', async () => {
    const wrapper = mount(NeededItemsFilter, {
      props: {
        views,
        searchText: '',
        activeView: 'all',
      },
    });

    const taskTab = wrapper.findAll('[data-test="view-tab"]')[1]; // Tasks tab
    await taskTab.trigger('click');

    expect(wrapper.emitted('update:active-view')).toBeTruthy();
  });

  it('should open settings dialog when button clicked', async () => {
    const wrapper = mount(NeededItemsFilter, {
      props: {
        views,
        searchText: '',
        activeView: 'all',
      },
    });

    const settingsButton = wrapper.find('[data-test="settings-button"]');
    await settingsButton.trigger('click');

    expect(wrapper.find('[data-test="settings-dialog"]').exists()).toBe(true);
  });
});
