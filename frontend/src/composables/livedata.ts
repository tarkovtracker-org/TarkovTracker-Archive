// Re-export the new modular composables for backward compatibility
export { useSystemStoreWithFirebase as useSystemStore } from '@/composables/stores/useSystemStore';
export {
  useTeamStoreWithFirebase as useTeamStore,
  useTeammateStores,
} from '@/composables/stores/useTeamStore';
export { useProgressStore } from '@/composables/stores/useProgressStore';
import { useTeammateStores } from '@/composables/stores/useTeamStore';
import { useSystemStoreWithFirebase } from '@/composables/stores/useSystemStore';
import { useTeamStoreWithFirebase } from '@/composables/stores/useTeamStore';
import { useProgressStore } from '@/composables/stores/useProgressStore';
// Legacy support - the actual implementation is now in the modular composables
// This maintains backward compatibility while using the new structure
// Moved to @/composables/utils/storeHelpers.ts as clearStaleState
// Moved to @/composables/firebase/useFirebaseListener.ts
// Team and system store implementations moved to modular composables
// Global state for backward compatibility
let globalTeammateStores: ReturnType<typeof useTeammateStores> | null = null;
// Function to initialize global state when called from setup
function initializeGlobalState() {
  if (!globalTeammateStores) {
    globalTeammateStores = useTeammateStores();
  }
}
// Export for backward compatibility
export const teammateStores = globalTeammateStores;
// Import useTarkovStore directly
import { useTarkovStore } from '@/stores/tarkov';
// Get Tarkov store for backward compatibility - will be initialized in useLiveData
let tarkovStore: ReturnType<typeof useTarkovStore> | null = null;
const getTarkovStore = () => {
  if (!tarkovStore) {
    tarkovStore = useTarkovStore();
  }
  return tarkovStore;
};
/**
 * Main composable that provides backward compatibility
 * while using the new modular structure under the hood
 */
export function useLiveData() {
  // Initialize global state when called from a setup function
  initializeGlobalState();
  // Use the imported composables directly
  return {
    useTeamStore: useTeamStoreWithFirebase,
    useSystemStore: useSystemStoreWithFirebase,
    useProgressStore,
    teammateStores: globalTeammateStores?.teammateStores,
    tarkovStore: getTarkovStore(),
  };
}
