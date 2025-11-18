import { onMounted } from 'vue';
import { usePreferencesStore, type PreferencesState } from '@/stores/preferences';
import { useUiSettingsStore, type UiSettingsState } from '@/stores/ui-settings';
import { useTeamStore, type TeamState } from '@/stores/team';
import { logger } from '@/utils/logger';
import type { Store } from 'pinia';

/**
 * Composable for managing user stores and their initialization
 * Provides centralized access to all user-related stores
 */
export function useUserStores(): {
  preferencesStore: Store<'preferences', PreferencesState>;
  uiSettingsStore: Store<'uiSettings', UiSettingsState>;
  teamStore: Store<'team', TeamState>;
  initializeStores: () => void;
  resetStores: () => void;
} {
  const preferencesStore = usePreferencesStore();
  const uiSettingsStore = useUiSettingsStore();
  const teamStore = useTeamStore();

  /**
   * Initialize all user stores from localStorage
   * Should be called once during app initialization
   */
  const initializeStores = () => {
    try {
      // Load preferences from localStorage
      const savedPreferences = localStorage.getItem('user-preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        preferencesStore.$patch(preferences);
      }

      // Load UI settings from localStorage
      const savedUiSettings = localStorage.getItem('user-ui-settings');
      if (savedUiSettings) {
        const uiSettings = JSON.parse(savedUiSettings);
        uiSettingsStore.$patch(uiSettings);
      }

      // Load team settings from localStorage
      const savedTeamSettings = localStorage.getItem('user-team');
      if (savedTeamSettings) {
        const teamSettings = JSON.parse(savedTeamSettings);
        teamStore.$patch(teamSettings);
      }

      // Try to migrate from old user store format
      migrateFromOldUserStore();
    } catch (error) {
      logger.error('Failed to initialize user stores:', error);
    }
  };

  /**
   * Migrate data from old user store format to new stores
   * This is a one-time migration helper
   */
  const migrateFromOldUserStore = () => {
    try {
      const oldUserStoreData = localStorage.getItem('user');
      if (!oldUserStoreData) return;

      const oldData = JSON.parse(oldUserStoreData);

      // Migrate preferences
      const preferencesMigration = {
        allTipsHidden: oldData.allTipsHidden,
        hideTips: oldData.hideTips,
        hideGlobalTasks: oldData.hideGlobalTasks,
        hideNonKappaTasks: oldData.hideNonKappaTasks,
        hideKappaRequiredTasks: oldData.hideKappaRequiredTasks,
        hideLightkeeperRequiredTasks: oldData.hideLightkeeperRequiredTasks,
        hideEodOnlyTasks: oldData.hideEodOnlyTasks,
        streamerMode: oldData.streamerMode,
      };

      // Migrate UI settings
      const uiSettingsMigration = {
        taskPrimaryView: oldData.taskPrimaryView,
        taskMapView: oldData.taskMapView,
        taskTraderView: oldData.taskTraderView,
        taskSecondaryView: oldData.taskSecondaryView,
        taskUserView: oldData.taskUserView,
        neededTypeView: oldData.neededTypeView,
        itemsHideNonFIR: oldData.itemsHideNonFIR,
        neededitemsStyle: oldData.neededitemsStyle,
        hideoutPrimaryView: oldData.hideoutPrimaryView,
        showOptionalTaskRequirementLabels: oldData.showOptionalTaskRequirementLabels,
        showRequiredTaskRequirementLabels: oldData.showRequiredTaskRequirementLabels,
        showExperienceRewards: oldData.showExperienceRewards,
        showNextTasks: oldData.showNextTasks,
        showPreviousTasks: oldData.showPreviousTasks,
        showTaskIds: oldData.showTaskIds,
      };

      // Migrate team settings
      const teamMigration = {
        teamHide: oldData.teamHide,
        taskTeamHideAll: oldData.taskTeamHideAll,
        itemsTeamHideAll: oldData.itemsTeamHideAll,
        itemsTeamHideNonFIR: oldData.itemsTeamHideNonFIR,
        itemsTeamHideHideout: oldData.itemsTeamHideHideout,
        mapTeamHideAll: oldData.mapTeamHideAll,
      };

      // Apply migrations only if new stores are empty
      if (Object.keys(preferencesStore.hideTips || {}).length === 0) {
        preferencesStore.$patch(preferencesMigration);
      }

      if (!uiSettingsStore.taskPrimaryView) {
        uiSettingsStore.$patch(uiSettingsMigration);
      }

      if (Object.keys(teamStore.teamHide || {}).length === 0) {
        teamStore.$patch(teamMigration);
      }

      // Clean up old data
      localStorage.removeItem('user');
      logger.info('Successfully migrated user store data to new stores');
    } catch (error) {
      logger.error('Failed to migrate from old user store:', error);
    }
  };

  /**
   * Reset all user stores to default values
   */
  const resetAllStores = () => {
    preferencesStore.resetPreferences();
    uiSettingsStore.resetUiSettings();
    teamStore.resetTeamSettings();
  };

  // Auto-initialize on mount
  onMounted(() => {
    initializeStores();
  });

  return {
    preferencesStore,
    uiSettingsStore,
    teamStore,
    initializeStores,
    resetStores: resetAllStores,
  };
}
