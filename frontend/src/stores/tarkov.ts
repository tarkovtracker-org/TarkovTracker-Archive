import { defineStore } from 'pinia';
import { watch } from 'vue';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { fireuser, firestore } from '@/plugins/firebase';
import { logger } from '@/utils/logger';
import { notify } from '@/utils/notify';
import { isDevAuthEnabled } from '@/utils/devAuth';
import { wasDataMigrated } from '@/plugins/store-initializer';
import type { StoreWithFireswapExt } from '@/plugins/pinia-firestore';
import {
  getters,
  actions,
  defaultState,
  migrateToGameModeStructure,
  type UserState,
  type UserActions,
  type GameMode,
} from '@/shared_state';
import {
  preserveLocalStorageKeys,
  restoreLocalStorageKeys,
  getPrimaryFireswapSetting,
  setFireswapLock,
  cancelPendingUpload,
  scheduleLockRelease,
  saveToLocalStorage,
} from '@/utils/fireswapHelpers';
// LocalStorage keys that should be preserved during profile reset operations
const PRESERVED_STORAGE_KEYS = ['user', 'DEV_USER_ID'];
// Define the Fireswap configuration type
interface FireswapConfig {
  path: string;
  document: string;
  debouncems: number;
  localKey: string;
}
// Define the store, letting Pinia infer the type
// Cast getters/actions to any for now due to JS import
export const useTarkovStore = defineStore('swapTarkov', {
  state: () => {
    // Start with default state, migration will happen during Firestore binding
    return JSON.parse(JSON.stringify(defaultState)) as UserState;
  },
  getters: {
    ...getters,
    // Override getters to trigger migration before data access
    isTaskComplete: function (state) {
      return (taskId: string) => {
        (this as unknown as { migrateDataIfNeeded: () => void }).migrateDataIfNeeded();
        return getters.isTaskComplete(state)(taskId);
      };
    },
    isTaskFailed: function (state) {
      return (taskId: string) => {
        (this as unknown as { migrateDataIfNeeded: () => void }).migrateDataIfNeeded();
        return getters.isTaskFailed(state)(taskId);
      };
    },
    getCurrentGameMode: function (state) {
      return () => {
        (this as unknown as { migrateDataIfNeeded: () => void }).migrateDataIfNeeded();
        return getters.getCurrentGameMode(state)();
      };
    },
  },
  actions: {
    ...(actions as UserActions),
    async switchGameMode(mode: GameMode) {
      // Switch the current game mode using the base action
      actions.switchGameMode.call(this, mode);
      // If user is logged in, sync the gamemode change to backend
      if (fireuser.uid) {
        // Skip Firestore sync when dev auth is enabled
        if (!isDevAuthEnabled()) {
          try {
            const userProgressRef = doc(firestore, 'progress', fireuser.uid);
            // Send complete state to satisfy Firestore security rules validation
            const completeState = {
              currentGameMode: mode,
              gameEdition: this.gameEdition,
              pvp: this.pvp,
              pve: this.pve,
            };
            await setDoc(userProgressRef, completeState, { merge: true });
          } catch (error) {
            logger.error('Error syncing gamemode to backend:', error);
            notify({
              message: 'Failed to sync gamemode — please try again',
              type: 'error',
            });
          }
        }
      }
    },
    migrateDataIfNeeded() {
      // Check if we need to migrate data - more comprehensive check
      const needsMigration =
        !this.currentGameMode ||
        !this.pvp ||
        !this.pve ||
        ((this as unknown as Record<string, unknown>).level !== undefined && !this.pvp?.level); // Has legacy level but no pvp.level
      if (needsMigration) {
        logger.info('Migrating legacy data structure to gamemode-aware structure');
        const currentState = JSON.parse(JSON.stringify(this.$state));
        const migratedData = migrateToGameModeStructure(currentState);
        this.$patch(migratedData);
        // If user is logged in, save the migrated structure to Firestore
        if (fireuser.uid && !isDevAuthEnabled()) {
          try {
            const userProgressRef = doc(firestore, 'progress', fireuser.uid);
            setDoc(userProgressRef, migratedData);
          } catch (error) {
            logger.error('Error saving migrated data to Firestore:', error);
          }
        }
      }
    },
    async resetOnlineProfile() {
      // Handle logged-out users differently - clear all local storage and cache
      if (!fireuser.uid) {
        logger.info('Resetting all local data (logged out)');
        try {
          const freshDefaultState = JSON.parse(JSON.stringify(defaultState)) as UserState;

          // Clear all localStorage completely (no preservation for full reset)
          localStorage.clear();

          // Clear sessionStorage as well
          sessionStorage.clear();

          // Attempt to clear cache if available
          if ('caches' in window) {
            try {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map((name) => caches.delete(name)));
              logger.info('Cache cleared successfully');
            } catch (cacheError) {
              logger.warn('Failed to clear cache:', cacheError);
            }
          }

          // Save fresh default state to localStorage
          saveToLocalStorage(
            'progress',
            freshDefaultState,
            'Error saving default state to localStorage after reset:'
          );

          // Update store state
          this.$patch(freshDefaultState);

          logger.info('All local data reset successfully');
          notify({
            message: 'All local data cleared successfully',
            type: 'success',
          });
        } catch (error) {
          logger.error('Error resetting local data:', error);
          notify({
            message: 'Failed to reset local data — please try again',
            type: 'error',
          });
        }
        return;
      }

      // Handle logged-in users - reset online profile
      const extendedStore = this as unknown as StoreWithFireswapExt<
        ReturnType<typeof useTarkovStore>
      >;
      const primarySetting = getPrimaryFireswapSetting(extendedStore);
      if (!primarySetting) {
        logger.error('Fireswap extension not available');
        notify({
          message: 'Fireswap extension unavailable — profile reset failed',
          type: 'error',
        });
        return;
      }
      const resetContext = this.prepareProfileReset(primarySetting, fireuser.uid);
      await this.executeProfileReset(resetContext);
    },
    prepareProfileReset(primarySetting: ReturnType<typeof getPrimaryFireswapSetting>, uid: string) {
      const freshDefaultState = JSON.parse(JSON.stringify(defaultState)) as UserState;
      const previousState = JSON.parse(JSON.stringify(this.$state)) as UserState;
      const preservedData = preserveLocalStorageKeys(PRESERVED_STORAGE_KEYS);
      const localStorageBackup = new Map<string, string>();
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key);
        if (value !== null) {
          localStorageBackup.set(key, value);
        }
      }
      const restoreLocalStorageFromBackup = () => {
        const failedKeys: string[] = [];
        localStorage.clear();
        localStorageBackup.forEach((value, key) => {
          try {
            localStorage.setItem(key, value);
          } catch (error) {
            logger.error(`Failed to restore localStorage key '${key}' during rollback`, error);
            failedKeys.push(key);
          }
        });
        if (failedKeys.length > 0) {
          throw new Error(
            `Failed to restore ${failedKeys.length} localStorage key(s): ${failedKeys.join(', ')}`
          );
        }
      };
      return {
        freshDefaultState,
        previousState,
        preservedData,
        restoreLocalStorageFromBackup,
        primarySetting,
        userProgressRef: doc(firestore, 'progress', uid),
      };
    },
    async executeProfileReset(
      context: ReturnType<typeof useTarkovStore.prototype.prepareProfileReset>
    ) {
      let lockAcquired = false;
      let firestoreWriteCompleted = false;
      let firestoreBackup:
        | { exists: true; data: UserState }
        | { exists: false; data?: undefined }
        | null = null;
      try {
        firestoreBackup = await this.backupAndResetFirestore(
          context.userProgressRef,
          context.freshDefaultState
        );
        firestoreWriteCompleted = !!firestoreBackup;
        setFireswapLock(context.primarySetting, true);
        lockAcquired = true;
        localStorage.clear();
        restoreLocalStorageKeys(context.preservedData);
        saveToLocalStorage(
          'progress',
          context.freshDefaultState,
          'Error saving default state to localStorage after reset:'
        );
        this.$patch(context.freshDefaultState);
        logger.info('Online profile reset successfully');
      } catch (error) {
        logger.error(
          `Error resetting online profile for user ${fireuser.uid}. Attempting rollback.`,
          error
        );
        await this.rollbackProfileReset({
          ...context,
          firestoreWriteCompleted,
          firestoreBackup,
        });
        notify({
          message: 'Failed to reset online profile — previous data restored',
          type: 'error',
        });
      } finally {
        cancelPendingUpload(context.primarySetting);
        if (lockAcquired) {
          scheduleLockRelease(context.primarySetting);
        }
      }
    },
    async backupAndResetFirestore(
      userProgressRef: ReturnType<typeof doc>,
      freshDefaultState: UserState
    ) {
      if (isDevAuthEnabled()) {
        return null;
      }
      const snapshot = await getDoc(userProgressRef);
      const backup = snapshot.exists()
        ? { exists: true as const, data: snapshot.data() as UserState }
        : { exists: false as const };
      await setDoc(userProgressRef, freshDefaultState);
      return backup;
    },
    async rollbackProfileReset(context: {
      restoreLocalStorageFromBackup: () => void;
      previousState: UserState;
      firestoreWriteCompleted: boolean;
      firestoreBackup: { exists: true; data: UserState } | { exists: false } | null;
      userProgressRef: ReturnType<typeof doc>;
    }) {
      try {
        context.restoreLocalStorageFromBackup();
      } catch (restoreError) {
        logger.error('Failed to restore localStorage backup after reset failure:', restoreError);
      }
      try {
        this.$patch(context.previousState);
      } catch (stateError) {
        logger.error('Failed to restore store state after reset failure:', stateError);
      }
      if (context.firestoreWriteCompleted && !isDevAuthEnabled()) {
        await this.rollbackFirestoreState(context.userProgressRef, context.firestoreBackup);
      }
    },
    async rollbackFirestoreState(
      userProgressRef: ReturnType<typeof doc>,
      firestoreBackup: { exists: true; data: UserState } | { exists: false } | null
    ) {
      try {
        if (firestoreBackup && firestoreBackup.exists) {
          await setDoc(userProgressRef, firestoreBackup.data);
        } else {
          await deleteDoc(userProgressRef);
        }
      } catch (remoteRestoreError) {
        logger.error(
          `Failed to rollback Firestore progress doc for user ${fireuser.uid}:`,
          remoteRestoreError
        );
      }
    },
    async resetCurrentGameModeData() {
      const currentMode = this.getCurrentGameMode();
      await this.resetGameModeData(currentMode);
    },
    async resetGameModeData(mode: GameMode) {
      try {
        const freshProgressData = JSON.parse(JSON.stringify(defaultState[mode]));

        // Handle logged-out users differently - only clear local storage
        if (!fireuser.uid) {
          logger.info(`Resetting ${mode.toUpperCase()} local data (logged out)`);

          // Create the new complete state with the reset game mode
          const otherMode = mode === 'pvp' ? 'pve' : 'pvp';
          const newCompleteState = {
            currentGameMode: this.currentGameMode,
            gameEdition: this.gameEdition,
            [mode]: freshProgressData,
            [otherMode]: JSON.parse(JSON.stringify(this[otherMode])), // Preserve other mode
          };

          // Preserve user settings before clearing localStorage
          const preservedData = preserveLocalStorageKeys(PRESERVED_STORAGE_KEYS);

          // Clear all localStorage to ensure no stale data remains
          localStorage.clear();

          // Restore preserved user settings
          restoreLocalStorageKeys(preservedData);

          // Save the new complete state directly to localStorage
          saveToLocalStorage(
            'progress',
            newCompleteState,
            'Error saving state to localStorage after reset:'
          );

          // Use $patch to update state while preserving reactivity
          this.$patch(newCompleteState as UserState);

          logger.info(`${mode.toUpperCase()} local data reset successfully`);
          notify({
            message: `${mode.toUpperCase()} data reset successfully`,
            type: 'success',
          });
          return;
        }

        // Handle logged-in users - reset Firestore data
        const updateData = { [mode]: freshProgressData };
        // Only write to Firestore if dev auth is not enabled
        if (!isDevAuthEnabled()) {
          const userProgressRef = doc(firestore, 'progress', fireuser.uid);
          await setDoc(userProgressRef, updateData, { merge: true });
        }
        // Create the new complete state with the reset game mode
        const otherMode = mode === 'pvp' ? 'pve' : 'pvp';
        const newCompleteState = {
          currentGameMode: this.currentGameMode,
          gameEdition: this.gameEdition,
          [mode]: freshProgressData,
          [otherMode]: JSON.parse(JSON.stringify(this[otherMode])), // Preserve other mode
        };
        // Preserve user settings before clearing localStorage
        const preservedData = preserveLocalStorageKeys(PRESERVED_STORAGE_KEYS);
        // Get access to the Fireswap plugin's lock mechanism
        const extendedStore = this as unknown as StoreWithFireswapExt<
          ReturnType<typeof useTarkovStore>
        >;
        const primarySetting = getPrimaryFireswapSetting(extendedStore);
        if (!primarySetting) {
          logger.error('Fireswap extension not available for game mode reset');
          notify({
            message: 'Fireswap extension unavailable — game mode reset failed',
            type: 'error',
          });
          return;
        }
        let lockAcquired = false;
        try {
          setFireswapLock(primarySetting, true);
          lockAcquired = true;
          // Clear all localStorage to ensure no stale data remains
          localStorage.clear();
          // Restore preserved user settings
          restoreLocalStorageKeys(preservedData);
          // Save the new complete state directly to localStorage
          saveToLocalStorage(
            'progress',
            newCompleteState,
            'Error saving state to localStorage after reset:'
          );
          // Cancel any pending debounced saves before updating state
          cancelPendingUpload(primarySetting);
          // Use $patch to update state while preserving reactivity
          this.$patch(newCompleteState as UserState);
          logger.info(`${mode.toUpperCase()} game mode data reset successfully`);
          notify({
            message: `${mode.toUpperCase()} data reset successfully`,
            type: 'success',
          });
        } finally {
          if (lockAcquired) {
            // Ensure Vue has processed the state change before releasing the lock
            scheduleLockRelease(primarySetting);
          }
        }
      } catch (error) {
        logger.error(`Error resetting ${mode} game mode data:`, error);
        notify({
          message: `Failed to reset ${mode.toUpperCase()} data — please try again`,
          type: 'error',
        });
      }
    },
  },
  fireswap: [
    {
      path: '.',
      document: 'progress/{uid}',
      debouncems: 250,
      localKey: 'progress',
    },
  ] as FireswapConfig[],
});
// Type the store instance based on Pinia's inferred type
type TarkovStoreType = ReturnType<typeof useTarkovStore>;
// Type the store instance potentially returned by initializeStore
type StoreInstance = TarkovStoreType | null;
const getSafeStoreInstance = (): StoreInstance => {
  try {
    const store = useTarkovStore();
    return store && typeof store.$id === 'string' ? store : null;
  } catch (error) {
    logger.error('Could not initialize tarkov store:', error);
    return null;
  }
};
let watchHandlerRunning = false;
watch(
  () => fireuser.loggedIn,
  async (newValue: boolean) => {
    if (watchHandlerRunning) {
      return;
    }
    watchHandlerRunning = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const tarkovStore = getSafeStoreInstance();
      if (!tarkovStore) {
        logger.warn('Cannot bind/unbind store - store instance is null');
        watchHandlerRunning = false;
        return;
      }
      const extendedStore = tarkovStore as StoreWithFireswapExt<TarkovStoreType>;
      if (newValue) {
        const wasMigrated =
          wasDataMigrated() || sessionStorage.getItem('tarkovDataMigrated') === 'true';
        if (wasMigrated) {
          if (typeof extendedStore.firebindAll === 'function') {
            extendedStore.firebindAll();
          }
        } else {
          if (typeof extendedStore.firebindAll === 'function') {
            extendedStore.firebindAll();
          }
        }
        // Call migration after binding is complete
        setTimeout(() => {
          if (typeof tarkovStore.migrateDataIfNeeded === 'function') {
            tarkovStore.migrateDataIfNeeded();
          }
        }, 1000);
      } else {
        if (typeof extendedStore.fireunbindAll === 'function') {
          extendedStore.fireunbindAll();
        }
      }
    } catch (error) {
      logger.error('Error in fireuser watch handler:', error);
    } finally {
      watchHandlerRunning = false;
    }
  },
  { immediate: false }
);
setTimeout(async () => {
  try {
    const tarkovStore = getSafeStoreInstance();
    if (!tarkovStore) {
      throw new Error('Failed to get tarkovStore in delayed initialization');
    }
    const extendedStore = tarkovStore as StoreWithFireswapExt<TarkovStoreType>;
    const wasMigrated =
      wasDataMigrated() || sessionStorage.getItem('tarkovDataMigrated') === 'true';
    if (wasMigrated) {
      if (typeof extendedStore.firebindAll === 'function') {
        extendedStore.firebindAll();
      }
    } else if (fireuser.loggedIn && typeof extendedStore.firebindAll === 'function') {
      extendedStore.firebindAll();
    }
    // Call migration after binding is complete
    setTimeout(() => {
      if (typeof tarkovStore.migrateDataIfNeeded === 'function') {
        tarkovStore.migrateDataIfNeeded();
      }
    }, 1000);
  } catch (error) {
    logger.error('Error in delayed store initialization:', error);
  }
}, 500);
