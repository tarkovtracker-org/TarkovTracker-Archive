<template>
  <v-col cols="12" class="task-list-card-stack">
    <!-- Skeleton loaders while initial tasks are loading (CLS optimization) -->
    <template v-if="isInitialLoading">
      <div
        v-for="n in skeletonCount"
        :key="`skeleton-${n}`"
        class="task-card-stack__item task-card-skeleton"
      >
        <v-skeleton-loader type="article, actions" height="203" />
      </div>
    </template>

    <!-- Actual task cards -->
    <div
      v-for="(task, taskIndex) in tasks"
      v-else
      :key="task.id || taskIndex"
      class="task-card-stack__item"
    >
      <task-card
        :task="task"
        :active-user-view="activeUserView"
        :needed-by="task.neededBy || []"
        :show-next-tasks="showNextTasks"
        :show-previous-tasks="showPreviousTasks"
      />
    </div>

    <!-- Load more trigger -->
    <div
      v-if="hasMore && !isInitialLoading"
      ref="loadMoreTrigger"
      class="task-card-stack__sentinel"
    >
      <v-progress-circular
        v-if="supportsIntersectionObserver"
        indeterminate
        color="secondary"
        size="24"
        class="mr-3"
      />
      <v-btn variant="tonal" color="secondary" @click="emit('load-more')"> Load more tasks </v-btn>
    </div>
  </v-col>
</template>

<script setup lang="ts">
  import { defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import type { Task } from '@/types/tarkov';

  const TaskCard = defineAsyncComponent(() => import('@/features/tasks/TaskCard.vue'));

  type TaskListItem = Task & { neededBy?: string[] };

  interface Props {
    tasks?: TaskListItem[];
    activeUserView: string;
    showNextTasks: boolean;
    showPreviousTasks: boolean;
    hasMore: boolean;
    loading?: boolean;
  }

  const props = withDefaults(defineProps<Props>(), {
    tasks: () => [],
    loading: false,
  });

  // CLS optimization: Show skeleton loaders during initial load
  const isInitialLoading = ref(false);
  const skeletonCount = ref(10); // Show 10 skeleton cards initially

  // Track initial loading state
  watch(
    () => props.loading,
    (newLoading, oldLoading) => {
      // Only show skeletons during the very first load (when we have no tasks yet)
      if (newLoading && props.tasks.length === 0) {
        isInitialLoading.value = true;
      } else if (!newLoading && oldLoading) {
        isInitialLoading.value = false;
      }
    },
    { immediate: true }
  );

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

  .task-card-skeleton {
    /* Explicit height to prevent layout shift during loading */
    min-height: 203px;
    /* Match task card styling */
    border-radius: 4px;
    overflow: hidden;
  }

  .task-card-stack__sentinel {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 12px 0 20px;
  }
</style>
