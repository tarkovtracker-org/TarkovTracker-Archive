import { ref, computed, watch, provide, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { useTarkovData } from '@/composables/tarkovdata';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { useUserStore } from '@/stores/user';
import { useNeedVisibility } from '@/components/domain/items/useNeedVisibility';
import { debounce } from '@/utils/debounce';
import {
  matchesItemFilter,
  createTaskMap,
  createTaskPrerequisiteCounts,
  createHideoutModuleMap,
  createHideoutPrerequisiteCounts,
  shouldIncludeHideoutNeed,
} from './neededItemsUtils';

export interface NeededItemsView {
  title: string;
  icon: string;
  view: 'all' | 'tasks' | 'hideout';
}

export interface FilterOptions {
  itemName: string;
  hideFIR: boolean;
  itemsHideAll: boolean;
  itemsHideNonFIR: boolean;
  itemsHideHideout: boolean;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
}

const DEFAULT_ITEMS_PER_PAGE = 50;

export function useNeededItems() {
  // Store and composable dependencies
  const userStore = useUserStore();
  const {
    tasks,
    hideoutModules,
    hideoutLoading,
    loading,
    neededItemTaskObjectives,
    neededItemHideoutModules,
  } = useTarkovData();
  const { tasksCompletions, moduleCompletions, getHideoutLevelFor, getModuleCompletionMap } =
    useProgressQueries();
  const { isTaskNeedVisible, isHideoutNeedVisible } = useNeedVisibility();

  // Filter state
  const itemFilterNameText = ref('');
  const itemFilterName = ref('');

  // Only provide if we're in a component context
  if (getCurrentInstance()) {
    provide('itemFilterName', itemFilterName);
  }

  // Pagination state
  const currentPage = ref(0);
  const itemsPerPage = ref(DEFAULT_ITEMS_PER_PAGE);

  // View state
  const activeNeededView = computed({
    get: () => userStore.getNeededTypeView,
    set: (value) => userStore.setNeededTypeView(value),
  });

  // Debounce filter text changes
  const debouncedFilterUpdate = debounce((...args: unknown[]) => {
    const newVal = args[0] as string;
    itemFilterName.value = newVal;
  }, 50);

  watch(itemFilterNameText, debouncedFilterUpdate);

  // View configuration
  const neededViews: NeededItemsView[] = [
    {
      title: 'All Items',
      icon: 'mdi-all-inclusive',
      view: 'all',
    },
    {
      title: 'Tasks',
      icon: 'mdi-clipboard-text',
      view: 'tasks',
    },
    {
      title: 'Hideout',
      icon: 'mdi-home',
      view: 'hideout',
    },
  ];

  // Utility functions
  const clearItemFilterNameText = () => {
    if (itemFilterNameText.value) itemFilterNameText.value = '';
  };

  const normalizedFilter = computed(() => itemFilterName.value.trim().toLowerCase());

  // Task-related computed properties
  const taskMap = computed(() => createTaskMap(tasks?.value));

  const taskPrerequisiteCounts = computed(() =>
    createTaskPrerequisiteCounts(taskMap.value, tasksCompletions.value || {})
  );

  const allNeededTaskItems = computed(() => {
    const objectives = neededItemTaskObjectives?.value;
    if (!Array.isArray(objectives) || objectives.length === 0) {
      return [];
    }
    const sorted = objectives
      .filter((objective) => objective && matchesItemFilter(objective, normalizedFilter.value))
      .slice()
      .sort((a, b) => {
        const aScore = taskPrerequisiteCounts.value.get(a.taskId) || 0;
        const bScore = taskPrerequisiteCounts.value.get(b.taskId) || 0;
        if (aScore === bScore) {
          return 0;
        }
        return aScore - bScore;
      });
    return sorted;
  });

  const visibleTaskItems = computed(() => {
    return allNeededTaskItems.value.filter((need) => {
      if (need?.needType !== 'taskObjective') {
        return false;
      }
      const relatedTask = need?.taskId ? taskMap.value.get(need.taskId) : undefined;
      return isTaskNeedVisible(need, relatedTask);
    });
  });

  const neededTaskItems = computed(() => {
    const endIndex = (currentPage.value + 1) * itemsPerPage.value;
    return visibleTaskItems.value.slice(0, endIndex);
  });

  // Hideout-related computed properties
  const hideoutModuleMap = computed(() => createHideoutModuleMap(hideoutModules?.value));

  const hideoutPrerequisiteCounts = computed(() =>
    createHideoutPrerequisiteCounts(hideoutModuleMap.value, moduleCompletions.value || {})
  );

  const allNeededHideoutItems = computed(() => {
    const modules = neededItemHideoutModules?.value;
    if (!Array.isArray(modules) || modules.length === 0) {
      return [];
    }
    const filtered = modules
      .filter(
        (module) =>
          module &&
          shouldIncludeHideoutNeed(module, getHideoutLevelFor, getModuleCompletionMap) &&
          matchesItemFilter(module, normalizedFilter.value)
      )
      .slice()
      .sort((a, b) => {
        const moduleAId = a?.hideoutModule?.id;
        const moduleBId = b?.hideoutModule?.id;
        const aScore = moduleAId ? hideoutPrerequisiteCounts.value.get(moduleAId) || 0 : 0;
        const bScore = moduleBId ? hideoutPrerequisiteCounts.value.get(moduleBId) || 0 : 0;
        if (aScore === bScore) {
          return 0;
        }
        return aScore - bScore;
      });
    return filtered;
  });

  const visibleHideoutItems = computed(() => {
    return allNeededHideoutItems.value.filter((need) => {
      if (need?.needType !== 'hideoutModule') {
        return false;
      }
      return isHideoutNeedVisible(need);
    });
  });

  const neededHideoutItems = computed(() => {
    const endIndex = (currentPage.value + 1) * itemsPerPage.value;
    return visibleHideoutItems.value.slice(0, endIndex);
  });

  // Infinite scroll logic
  const hasMoreItems = computed(() => {
    if (activeNeededView.value === 'tasks') {
      return neededTaskItems.value.length < visibleTaskItems.value.length;
    }
    if (activeNeededView.value === 'hideout') {
      return neededHideoutItems.value.length < visibleHideoutItems.value.length;
    }
    return (
      neededTaskItems.value.length < visibleTaskItems.value.length ||
      neededHideoutItems.value.length < visibleHideoutItems.value.length
    );
  });

  const loadMoreItems = () => {
    if (hasMoreItems.value) {
      currentPage.value++;
    }
  };

  // Scroll handler for infinite scroll
  const handleScroll = debounce(() => {
    const { scrollY } = window;
    const { scrollHeight, clientHeight } = document.documentElement;
    if (scrollY + clientHeight >= scrollHeight - 100) {
      // Load more when 100px from bottom
      loadMoreItems();
    }
  }, 100);

  // Reset pagination on view change or filter update
  watch([activeNeededView, itemFilterName], () => {
    currentPage.value = 0;
  });

  // Reset pagination when source collections change substantially
  watch([visibleTaskItems, visibleHideoutItems], () => {
    currentPage.value = 0;
  });

  // Lifecycle hooks - only if we're in a component context
  if (getCurrentInstance()) {
    onMounted(() => {
      window.addEventListener('scroll', handleScroll);
    });

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll);
    });
  }

  return {
    // State
    itemFilterNameText,
    itemFilterName,
    currentPage,
    activeNeededView,
    neededViews,

    // Computed properties
    loading,
    hideoutLoading,
    neededTaskItems,
    neededHideoutItems,
    hasMoreItems,

    // Methods
    clearItemFilterNameText,
    loadMoreItems,
  };
}
