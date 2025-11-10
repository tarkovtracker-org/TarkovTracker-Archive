import { onBeforeUnmount, readonly, ref, watch } from 'vue';
import { SKELETON_CONFIG } from '@/config/gameConstants';
/**
 * Composable for managing skeleton loading state with CLS optimization
 * Handles timer management, dynamic skeleton count calculation, and state transitions
 */
export function useSkeletonLoader() {
  // CLS optimization: Show skeleton loaders during initial load
  const isInitialLoading = ref(false);
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
  let skeletonStartTime = 0;
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  const clearSkeletonTimer = () => {
    if (skeletonTimerId !== null) {
      clearTimeout(skeletonTimerId);
      skeletonTimerId = null;
    }
    if (cleanupTimerId !== null) {
      clearTimeout(cleanupTimerId);
      cleanupTimerId = null;
    }
  };
  /**
   * Watcher to manage loading state transitions with minimum duration to avoid flicker
   * Only shows skeletons during the very first load (when we have no tasks yet)
   */
  const setupLoadingWatcher = (loadingProp: () => boolean, tasksLengthProp: () => number) => {
    watch(
      () => loadingProp(),
      (newLoading, _oldLoading) => {
        // Only show skeletons during the very first load (when we have no tasks yet)
        if (newLoading && tasksLengthProp() === 0 && !isInitialLoading.value) {
          isInitialLoading.value = true;
          skeletonStartTime = Date.now();
          clearSkeletonTimer();
          // Start minimum duration timer
          skeletonTimerId = setTimeout(() => {
            skeletonTimerId = null;
          }, MIN_SKELETON_DURATION);
        } else if (!newLoading && isInitialLoading.value) {
          // Clear skeleton when loading completes, regardless of oldLoading state
          // This ensures skeletons clear even if watcher missed intermediate states
          clearSkeletonTimer();
          // Calculate remaining time to show skeleton
          const elapsed = Date.now() - skeletonStartTime;
          const remaining = Math.max(0, MIN_SKELETON_DURATION - elapsed);
          if (remaining > 0) {
            cleanupTimerId = setTimeout(() => {
              cleanupTimerId = null;
              isInitialLoading.value = false;
            }, remaining);
          } else {
            isInitialLoading.value = false;
          }
        }
      },
      { immediate: true }
    );
  };
  /**
   * Debounced resize handler to update skeleton count dynamically
   */
  const handleResize = () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      skeletonCount.value = calculateSkeletonCount();
    }, 150);
  };
  /**
   * Setup resize listener to update skeleton count dynamically
   */
  const setupResizeListener = () => {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
  };
  /**
   * Remove resize listener
   */
  const removeResizeListener = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
  };
  /**
   * Clean up all timers and listeners
   */
  const cleanup = () => {
    if (skeletonTimerId !== null) {
      clearTimeout(skeletonTimerId);
      skeletonTimerId = null;
    }
    if (cleanupTimerId !== null) {
      clearTimeout(cleanupTimerId);
      cleanupTimerId = null;
    }
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
    removeResizeListener();
  };
  // Clean up timers on unmount
  onBeforeUnmount(() => {
    cleanup();
  });
  return {
    // State
    isInitialLoading: readonly(isInitialLoading),
    skeletonCount: readonly(skeletonCount),
    // Setup methods
    setupLoadingWatcher,
    setupResizeListener,
    // Cleanup method
    cleanup,
    // Configuration (exposed for external access if needed)
    MIN_SKELETON_DURATION,
  };
}
// Re-export types and constants for easy importing
export type { Ref } from 'vue';
export { SKELETON_CONFIG } from '@/config/gameConstants';
