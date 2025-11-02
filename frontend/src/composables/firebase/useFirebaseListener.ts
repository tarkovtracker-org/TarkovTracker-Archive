import { watch, type Ref, type ComputedRef } from 'vue';
import type { Store } from 'pinia';
import type {
  DocumentReference,
  DocumentData,
  Unsubscribe,
  FirestoreError,
} from 'firebase/firestore';
import { onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import {
  clearStaleState,
  safePatchStore,
  resetStore,
  devLog,
  devWarn,
} from '@/composables/utils/storeHelpers';
import { logger } from '@/utils/logger';
export interface FirebaseListenerConfig {
  store: Store;
  docRef: ComputedRef<DocumentReference<DocumentData> | null>;
  unsubscribe: Ref<Unsubscribe | null>;
  storeId?: string;
  onError?: (error: FirestoreError) => void;
  onSnapshot?: (data: DocumentData | null) => void;
}
/**
 * Creates a Firebase document listener that automatically manages subscriptions
 * and syncs data with a Pinia store
 */
export function useFirebaseListener({
  store,
  docRef,
  unsubscribe,
  storeId,
  onError,
  onSnapshot: customOnSnapshot,
}: FirebaseListenerConfig) {
  const handleSnapshot = (snapshot: DocumentSnapshot<DocumentData>) => {
    const snapshotData = snapshot.data();
    const storeIdForLogging = storeId || store.$id;
    if (snapshotData) {
      devLog(`[${storeIdForLogging}] Snapshot received`, {
        exists: snapshot.exists(),
        dataKeys: Object.keys(snapshotData),
        tokensValue: snapshotData.tokens,
        tokensType: typeof snapshotData.tokens,
        tokensLength: Array.isArray(snapshotData.tokens) ? snapshotData.tokens.length : 'not array',
        fullData: snapshotData,
      });
      safePatchStore(store, snapshotData);
      clearStaleState(store, snapshotData);
      if (customOnSnapshot) {
        customOnSnapshot(snapshotData);
      }
    } else {
      devLog(`[${storeIdForLogging}] Snapshot data is null/undefined. Clearing state.`);
      resetStore(store);
      if (customOnSnapshot) {
        customOnSnapshot(null);
      }
    }
  };
  const handleError = (error: FirestoreError) => {
    const storeIdForLogging = storeId || store.$id;
    if (error.code === 'permission-denied' && unsubscribe.value) {
      devWarn(`[${storeIdForLogging}] Permission denied, unsubscribing and clearing state`);
      unsubscribe.value();
      unsubscribe.value = null;
      resetStore(store);
    } else {
      logger.error(`[${storeIdForLogging}] Firebase error:`, error);
    }
    if (onError) {
      onError(error);
    }
  };
  const stopWatcher = watch(
    docRef,
    async (newRef) => {
      const storeIdForLogging = storeId || store.$id;
      if (newRef) {
        // Cleanup previous subscription
        if (unsubscribe.value) {
          devLog(`[${storeIdForLogging}] Cleaning up previous subscription`);
          unsubscribe.value();
          resetStore(store);
        }
        // Create new subscription
        devLog(`[${storeIdForLogging}] Creating new Firebase subscription`);
        unsubscribe.value = onSnapshot(newRef, handleSnapshot, handleError);
      } else {
        // No reference, cleanup
        if (unsubscribe.value) {
          devLog(`[${storeIdForLogging}] No reference, unsubscribing`);
          unsubscribe.value();
          unsubscribe.value = null;
        }
        resetStore(store);
      }
    },
    { immediate: true }
  );
  // Cleanup function
  const cleanup = () => {
    stopWatcher();
    if (unsubscribe.value) {
      unsubscribe.value();
      unsubscribe.value = null;
    }
  };
  return {
    cleanup,
    isSubscribed: () => unsubscribe.value !== null,
  };
}
/**
 * Creates multiple Firebase listeners for a collection of documents
 * Useful for managing teammate stores or similar collections
 */
export function useMultipleFirebaseListeners<T extends Record<string, Store>>(
  stores: Ref<T>,
  unsubscribes: Ref<Record<string, Unsubscribe>>,
  createListener: (key: string, store: Store) => void,
  shouldInclude: (key: string) => boolean = () => true
) {
  const updateListeners = (newKeys: string[], oldKeys: string[] = []) => {
    // Remove listeners for keys that are no longer needed
    for (const key of oldKeys) {
      if (!newKeys.includes(key) || !shouldInclude(key)) {
        devLog(`Removing listener for key: ${key}`);
        if (unsubscribes.value[key]) {
          unsubscribes.value[key]();
          delete unsubscribes.value[key];
        }
        if (stores.value[key]) {
          delete stores.value[key];
        }
      }
    }
    // Add listeners for new keys
    for (const key of newKeys) {
      if (!stores.value[key] && shouldInclude(key)) {
        devLog(`Adding listener for key: ${key}`);
        createListener(key, stores.value[key]);
      }
    }
  };
  const cleanup = () => {
    Object.values(unsubscribes.value).forEach((unsubscribe) => {
      if (unsubscribe) unsubscribe();
    });
    unsubscribes.value = {};
    stores.value = {} as T;
  };
  return {
    updateListeners,
    cleanup,
  };
}
