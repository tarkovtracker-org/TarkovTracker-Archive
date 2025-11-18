import { ref, computed, onMounted, type Ref } from 'vue';
import { useVirtualTaskList } from './useVirtualTaskList';
import type { Task } from '@/types/models/tarkov';

export function useTaskVirtualization(tasks: Ref<Task[]>) {
  const {
    renderedTasks: virtualRenderedTasks,
    hasMoreTasks: _hasMoreTasks,
    loadMore: _loadMore,
    reset: _reset,
  } = useVirtualTaskList(tasks);

  const visibleItems = ref<number[]>([]);
  const scrollTop = ref(0);
  const containerRef = ref<HTMLElement | null>(null);
  const totalHeight = ref(0);

  const updateVisibleItems = () => {
    if (!containerRef.value) return;
    visibleItems.value = Array.from({ length: virtualRenderedTasks.value.length }, (_, i) => i);
  };

  const initialVisibleTasksHydrated = ref(false);

  onMounted(() => {
    // Simulate hydration completion
    setTimeout(() => {
      initialVisibleTasksHydrated.value = true;
    }, 100);
  });

  const renderedTasks = computed(() => {
    return initialVisibleTasksHydrated.value ? virtualRenderedTasks.value : [];
  });

  const loadMoreTasks = () => {
    // This would typically load more data from API
    // For now, just trigger a recompute
    updateVisibleItems();
  };

  return {
    renderedTasks,
    visibleItems,
    scrollTop,
    containerRef,
    totalHeight,
    initialVisibleTasksHydrated,
    loadMoreTasks,
    updateVisibleItems,
  };
}
