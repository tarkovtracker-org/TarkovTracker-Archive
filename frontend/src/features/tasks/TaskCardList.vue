<template>
  <v-col cols="12" class="task-list-card-stack">
    <!-- Skeleton loaders while initial tasks are loading (CLS optimization) -->
    <template v-if="isInitialLoading">
      <div
        v-for="n in skeletonCount"
        :key="`skeleton-${n}`"
        class="task-card-stack__item task-card-skeleton"
      >
        <v-skeleton-loader type="article, actions" :height="SKELETON_CONFIG.CARD_HEIGHT" />
      </div>
    </template>
    <!-- Actual task cards -->
    <template v-else>
      <div
        v-for="(task, taskIndex) in tasks"
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
    </template>
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
  import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import type { Task } from '@/types/tarkov';
  import { SKELETON_CONFIG } from '@/config/gameConstants';
  import { useSkeletonLoader } from '@/composables/useSkeletonLoader';
  import TaskCard from '@/features/tasks/TaskCard.vue';
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
  // Initialize skeleton loader composable
  const skeletonLoader = useSkeletonLoader();
  const { isInitialLoading, skeletonCount } = skeletonLoader;
  // Setup loading watcher with props
  skeletonLoader.setupLoadingWatcher(
    () => props.loading,
    () => props.tasks.length
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
    // Setup resize listener for skeleton count updates
    skeletonLoader.setupResizeListener();
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
  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  });
</script>
<style scoped lang="scss">
  .task-list-card-stack {
    margin: 0;
  }
  .task-card-stack__item + .task-card-stack__item {
    margin-top: var(--task-card-vertical-spacing);
  }
  .task-card-skeleton {
    /* Explicit height to prevent layout shift during loading */
    min-height: var(--task-card-min-height);
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
