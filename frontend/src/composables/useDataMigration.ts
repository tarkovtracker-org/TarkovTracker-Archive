import { ref, computed } from 'vue';
import { fireuser } from '@/plugins/firebase';
import { markDataMigrated } from '@/plugins/store-initializer';
import DataMigrationService, { type ProgressData } from '@/utils/DataMigrationService';
import { useTarkovStore } from '@/stores/tarkov';
import type { StoreWithFireswapExt } from '@/plugins/pinia-firestore';
import { logger } from '@/utils/logger';

export type ImportedData = ProgressData;

export function useDataMigration() {
  // API migration state
  const apiToken = ref('');
  const apiEndpoint = ref('https://tarkovtracker.io/api/v2/progress');
  const apiError = ref('');
  const apiEndpointError = ref('');
  const fetchingApi = ref(false);
  const apiFetchSuccess = ref(false);
  const showToken = ref(false);

  // Import state
  const importing = ref(false);
  const importError = ref('');
  const importSuccess = ref(false);
  const confirmDialog = ref(false);
  const importedData = ref<ProgressData | null>(null);

  // Dialog state
  const showObjectivesDetails = ref(false);
  const showFailedTaskDetails = ref(false);

  const tarkovStore = useTarkovStore() as StoreWithFireswapExt<ReturnType<typeof useTarkovStore>>;

  // Computed properties for data counts
  const countCompletedTasks = computed(() => {
    if (!importedData.value?.taskCompletions) return 0;
    return Object.values(importedData.value.taskCompletions).filter((t) => t.complete).length;
  });

  const countFailedTasks = computed(() => {
    if (!importedData.value?.taskCompletions) return 0;
    return Object.values(importedData.value.taskCompletions).filter((t) => t.failed).length;
  });

  const countTaskObjectives = computed(() => {
    if (!importedData.value?.taskObjectives) return 0;
    return Object.keys(importedData.value.taskObjectives).length;
  });

  const countHideoutModules = computed(() => {
    if (!importedData.value?.hideoutModules) return 0;
    return Object.values(importedData.value.hideoutModules).filter((m) => m.complete).length;
  });

  const countHideoutParts = computed(() => {
    if (!importedData.value?.hideoutParts) return 0;
    return Object.keys(importedData.value.hideoutParts).length;
  });

  const failedTasks = computed(() => {
    if (!importedData.value?.taskCompletions) return [];
    return Object.entries(importedData.value.taskCompletions)
      .filter(([_, task]) => task.failed === true)
      .map(([id, task]) => ({ id, ...task }));
  });

  // API functions
  const fetchWithApiToken = async () => {
    fetchingApi.value = true;
    apiError.value = '';
    apiFetchSuccess.value = false;
    apiEndpointError.value = '';

    try {
      if (!apiToken.value || apiToken.value.length < 10) {
        apiError.value = 'Please enter a valid API token';
        return;
      }

      const endpoint = apiEndpoint.value.trim();
      try {
        new URL(endpoint);
      } catch {
        apiEndpointError.value = 'Please enter a valid URL (must start with https://)';
        return;
      }

      if (!endpoint.endsWith('/api/v2/progress')) {
        apiEndpointError.value = 'Endpoint must end with /api/v2/progress';
        return;
      }

      const data = await DataMigrationService.fetchDataWithApiToken(apiToken.value, endpoint);
      if (!data) {
        apiError.value = 'Failed to fetch data. Please check your token, endpoint, and try again.';
        return;
      }

      importedData.value = data;
      apiFetchSuccess.value = true;
      confirmDialog.value = true;
    } catch (error: unknown) {
      logger.error('Error fetching data with API token:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred during fetch.';
      apiError.value = `Error: ${errorMessage}`;
    } finally {
      fetchingApi.value = false;
    }
  };

  const confirmImport = async () => {
    importing.value = true;
    importError.value = '';

    try {
      const result = await DataMigrationService.importDataToUser(
        fireuser.uid!,
        importedData.value!,
        'pvp' // Force PvP mode only
      );
      if (result) {
        importSuccess.value = true;
        markDataMigrated();

        if (tarkovStore && typeof tarkovStore.firebindAll === 'function') {
          tarkovStore.firebindAll();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } else {
        importError.value = 'Failed to import data. Please try again.';
      }
    } catch (error: unknown) {
      logger.error('Error during import:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      importError.value = 'Error during import: ' + errorMessage;
    } finally {
      importing.value = false;
      confirmDialog.value = false;
    }
  };

  return {
    // State
    apiToken,
    apiEndpoint,
    apiError,
    apiEndpointError,
    fetchingApi,
    apiFetchSuccess,
    showToken,
    importing,
    importError,
    importSuccess,
    confirmDialog,
    importedData,
    showObjectivesDetails,
    showFailedTaskDetails,

    // Computed
    countCompletedTasks,
    countFailedTasks,
    countTaskObjectives,
    countHideoutModules,
    countHideoutParts,
    failedTasks,

    // Methods
    fetchWithApiToken,
    confirmImport,
  };
}
