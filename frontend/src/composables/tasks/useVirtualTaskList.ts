import { computed, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { Task } from '@/types/models/tarkov';
import { VIRTUAL_LIST_INITIAL_BATCH, VIRTUAL_LIST_BATCH_INCREMENT } from '@/utils/constants';
export function useVirtualTaskList(tasks: Ref<Task[]>) {
  const renderedCount = ref(0);
  const renderedTasks = computed(() => tasks.value.slice(0, renderedCount.value));
  const hasMoreTasks = computed(() => tasks.value.length > renderedCount.value);
  const reset = () => {
    const total = tasks.value.length;
    renderedCount.value = total === 0 ? 0 : Math.min(VIRTUAL_LIST_INITIAL_BATCH, total);
  };
  const loadMore = () => {
    if (!hasMoreTasks.value) {
      return;
    }
    renderedCount.value = Math.min(
      renderedCount.value + VIRTUAL_LIST_BATCH_INCREMENT,
      tasks.value.length
    );
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
