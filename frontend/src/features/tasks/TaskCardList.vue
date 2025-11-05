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
  const SKELETON_CONFIG = {
    CARD_HEIGHT: 203, // Height of skeleton card in pixels
    CARD_VERTICAL_SPACING: 16, // Approximate vertical spacing between cards
    MIN_SKELETONS: 3,
    MAX_SKELETONS: 20,
    MIN_SKELETON_DURATION: 400, // Minimum time (ms) to show skeleton to avoid flicker
  };

  const MIN_SKELETON_DURATION = SKELETON_CONFIG.MIN_SKELETON_DURATION;

  // Calculate dynamic skeleton count based on viewport height
  const calculateSkeletonCount = () => {
    if (typeof window === 'undefined') return SKELETON_CONFIG.MIN_SKELETONS;
    const viewportHeight = window.innerHeight;
    const count = Math.ceil(
      viewportHeight / (SKELETON_CONFIG.CARD_HEIGHT + SKELETON_CONFIG.CARD_VERTICAL_SPACING)
    );
    return Math.max(SKELETON_CONFIG.MIN_SKELETONS, Math.min(SKELETON_CONFIG.MAX_SKELETONS, count));
  };

  const skeletonCount = ref(calculateSkeletonCount());
  let skeletonTimerId: ReturnType<typeof setTimeout> | null = null;
  let cleanupTimerId: ReturnType<typeof setTimeout> | null = null;

  // Track initial loading state with minimum duration to avoid flicker
  watch(
    () => props.loading,
    (newLoading, oldLoading) => {
      // Only show skeletons during the very first load (when we have no tasks yet)
      if (newLoading && props.tasks.length === 0) {
        isInitialLoading.value = true;
        // Clear existing skeleton timer if any
        if (skeletonTimerId) {
          clearTimeout(skeletonTimerId);
          skeletonTimerId = null;
        }
        // Start minimum duration timer
        skeletonTimerId = setTimeout(() => {
          skeletonTimerId = null;
        }, SKELETON_CONFIG.MIN_SKELETON_DURATION);
      } else if (!newLoading && oldLoading) {
        // Clear existing cleanup timer if any
        if (cleanupTimerId) {
          clearTimeout(cleanupTimerId);
          cleanupTimerId = null;
        }
        // Don't clear loading immediately if minimum duration hasn't passed
        if (skeletonTimerId !== null) {
          cleanupTimerId = setTimeout(() => {
            cleanupTimerId = null;
            isInitialLoading.value = false;
          }, SKELETON_CONFIG.MIN_SKELETON_DURATION);
        } else {
          isInitialLoading.value = false;
        }
      }
    },
    { immediate: true }
  );

  // Clean up timers on unmount
  onBeforeUnmount(() => {
    if (skeletonTimerId !== null) {
      clearTimeout(skeletonTimerId);
      skeletonTimerId = null;
    }
    if (cleanupTimerId !== null) {
      clearTimeout(cleanupTimerId);
      cleanupTimerId = null;
    }
  });

  const emit = defineEmits<{
    (event: 'load-more'): void;
  }>();

  const supportsIntersectionObserver = ref(false);
  const loadMoreTrigger = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Debounced resize handler to update skeleton count
  const handleResize = () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      skeletonCount.value = calculateSkeletonCount();
    }, 150);
  };

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

    // Add resize listener to update skeleton count dynamically
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
  });

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    // Remove resize listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
    // Clear pending timeout
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
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
