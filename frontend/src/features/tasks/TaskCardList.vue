<template>
  <v-col cols="12" class="task-list-card-stack">
    <div v-for="(task, taskIndex) in tasks" :key="task.id || taskIndex" class="task-card-stack__item">
      <task-card
        :task="task"
        :active-user-view="activeUserView"
        :needed-by="task.neededBy || []"
        :show-next-tasks="showNextTasks"
        :show-previous-tasks="showPreviousTasks"
      />
    </div>
    <div v-if="hasMore" ref="loadMoreTrigger" class="task-card-stack__sentinel">
      <v-progress-circular
        v-if="supportsIntersectionObserver"
        indeterminate
        color="secondary"
        size="24"
        class="mr-3"
      />
      <v-btn variant="tonal" color="secondary" @click="emit('load-more')">
        Load more tasks
      </v-btn>
    </div>
  </v-col>
</template>

<script setup lang="ts">
  import {
    defineAsyncComponent,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
  } from 'vue';
  import type { Task } from '@/types/tarkov';

  const TaskCard = defineAsyncComponent(() => import('@/features/tasks/TaskCard.vue'));

  type TaskListItem = Task & { neededBy?: string[] };

  interface Props {
    tasks?: TaskListItem[];
    activeUserView: string;
    showNextTasks: boolean;
    showPreviousTasks: boolean;
    hasMore: boolean;
  }

  const props = withDefaults(defineProps<Props>(), {
    tasks: () => [],
  });

  const emit = defineEmits<{
    (event: 'load-more'): void;
  }>();

  const supportsIntersectionObserver = ref(false);
  const loadMoreTrigger = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  const setupObserver = () => {
    if (!supportsIntersectionObserver.value || !observer) {
      return;
    }
    observer.disconnect();
    nextTick(() => {
      if (!observer) {
        return;
      }
      if (loadMoreTrigger.value && props.hasMore) {
        observer.observe(loadMoreTrigger.value);
      }
    });
  };

  onMounted(() => {
    supportsIntersectionObserver.value =
      typeof window !== 'undefined' && 'IntersectionObserver' in window;
    if (!supportsIntersectionObserver.value) {
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          emit('load-more');
        }
      },
      { rootMargin: '320px 0px' }
    );
    setupObserver();
  });

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });

  watch(
    () => props.hasMore,
    () => {
      setupObserver();
    }
  );
</script>

<style scoped lang="scss">
  .task-list-card-stack {
    margin: 0;
  }

  .task-card-stack__item + .task-card-stack__item {
    margin-top: 8px;
  }

  .task-card-stack__sentinel {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 12px 0 20px;
  }
</style>
