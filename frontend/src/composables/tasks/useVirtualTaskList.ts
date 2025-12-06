import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { Task } from '@/types/tarkov';

const INITIAL_BATCH = 24;
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
