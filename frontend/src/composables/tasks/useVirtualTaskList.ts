import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { Task } from '@/types/tarkov';

// Performance optimization: Reduced from 24 → 12 → 8 to improve initial render time
// TaskCard components are heavy (415 lines, 15+ computed properties each)
// 8 cards × 15 computed properties = 120 evaluations vs 180 at 12 cards (33% reduction)
const INITIAL_BATCH = 8;
const BATCH_INCREMENT = 16;

export function useVirtualTaskList(tasks: Ref<Task[]>) {
  const renderedCount = ref(0);

  const renderedTasks = computed(() => tasks.value.slice(0, renderedCount.value));
  const hasMoreTasks = computed(() => tasks.value.length > renderedCount.value);

  const reset = () => {
    const total = tasks.value.length;
    renderedCount.value = total === 0 ? 0 : Math.min(INITIAL_BATCH, total);
  };

  const loadMore = () => {
    if (!hasMoreTasks.value) {
      return;
    }
    renderedCount.value = Math.min(renderedCount.value + BATCH_INCREMENT, tasks.value.length);
  };

  watch(
    tasks,
    () => {
      reset();
    },
    { immediate: true }
  );

  return {
    renderedTasks,
    hasMoreTasks,
    loadMore,
    reset,
  };
}
