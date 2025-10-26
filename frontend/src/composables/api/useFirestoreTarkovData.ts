/**
 * Firestore-based Tarkov data access
 * Replaces Apollo GraphQL calls with direct Firestore reads for better performance
 *
 * Data is cached in Firestore by the scheduled Cloud Function (runs daily at midnight UTC)
 * See: functions/src/index.ts:828-839 (scheduledTarkovDataFetch)
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';
import { firestore } from '@/plugins/firebase';
import { logger } from '@/utils/logger';
import type { TarkovDataQueryResult, TarkovItem } from '@/types/tarkov';

// Singleton state for caching
const isInitialized = ref(false);
const tarkovItemsCache: Ref<TarkovItem[] | null> = ref(null);
const loading = ref(false);
const error: Ref<Error | null> = ref(null);

/**
 * Composable for loading Tarkov items from Firestore cache
 * This replaces the direct Apollo GraphQL calls to tarkov.dev API
 *
 * Data structure: /tarkovData/items document contains an 'items' field with array of all items
 * Cached by scheduledTarkovDataFetch Cloud Function (runs daily at midnight UTC)
 *
 * Implements singleton pattern to prevent duplicate Firestore listeners
 */
export function useFirestoreTarkovItems() {
  // Only initialize once (singleton pattern)
  if (!isInitialized.value) {
    isInitialized.value = true;
    loading.value = true;

    try {
      // Create Firestore document reference for single-doc cache pattern
      const itemsDocRef = doc(firestore, 'tarkovData', 'items');

      // Use VueFire's useDocument for reactive Firestore access
      const firestoreDoc = useDocument<{ items: TarkovItem[] }>(itemsDocRef, {
        ssrKey: 'tarkov-items',
      });

      // Watch for data load
      let stopWatch: (() => void) | null = null;
      stopWatch = watch(
        [firestoreDoc.data, firestoreDoc.error],
        ([docData, docError]) => {
          if (docData !== undefined || docError) {
            loading.value = false;

            if (docError) {
              logger.error('Failed to load Tarkov items from Firestore:', docError);
              error.value = docError as Error;
            } else if (docData && docData.items) {
              tarkovItemsCache.value = docData.items;
              logger.info(`Loaded ${docData.items.length} Tarkov items from Firestore cache`);
            } else {
              logger.warn('Tarkov items document exists but has no items field');
              tarkovItemsCache.value = [];
            }

            // Stop watching after first load
            if (stopWatch) {
              stopWatch();
            }
          }
        },
        { immediate: true }
      );
    } catch (err) {
      logger.error('Error initializing Firestore Tarkov items:', err);
      error.value = err as Error;
      loading.value = false;
    }
  }

  return {
    items: computed(() => tarkovItemsCache.value || []),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
  };
}

/**
 * Composable for main Tarkov data queries (tasks, maps, traders, player levels)
 *
 * NOTE: This is a transitional implementation that will:
 * 1. Initially call the existing GraphQL endpoint
 * 2. Be gradually replaced with Firestore reads as backend caching expands
 *
 * For now, we're focusing on ITEMS first (biggest performance win)
 */
export function useFirestoreTarkovData(
  gameMode: ComputedRef<string> = computed(() => 'regular'),
  languageCode: ComputedRef<string> = computed(() => 'en')
) {
  // TODO: Phase 2 - Migrate tasks/maps/traders to Firestore
  // For now, this is a placeholder that maintains the same interface
  // as useTarkovDataQuery for easy drop-in replacement

  const result = ref<TarkovDataQueryResult | null>(null);
  const queryLoading = ref(false);
  const queryError: Ref<Error | null> = ref(null);

  // Future implementation will load from Firestore collections:
  // - collection('tasks')
  // - collection('maps')
  // - collection('traders')
  // - collection('playerLevels')

  const refetch = async (variables?: { lang: string; gameMode: string }) => {
    logger.info('Refetch called with variables:', variables);
    // TODO: Implement Firestore refetch logic
  };

  return {
    result: computed(() => result.value),
    loading: computed(() => queryLoading.value),
    error: computed(() => queryError.value),
    refetch,
    languageCode,
    gameMode,
  };
}
