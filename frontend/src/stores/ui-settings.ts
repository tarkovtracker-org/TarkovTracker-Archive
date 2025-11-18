import { defineStore } from 'pinia';
import { logger } from '@/utils/logger';

// UI Settings state - display preferences and layout settings
export interface UiSettingsState {
  // Task view preferences
  taskPrimaryView: string | null;
  taskMapView: string | null;
  taskTraderView: string | null;
  taskSecondaryView: string | null;
  taskUserView: string | null;

  // Item display preferences
  neededTypeView: string | null;
  itemsHideNonFIR: boolean;
  neededitemsStyle: string | null;

  // Hideout view preferences
  hideoutPrimaryView: string | null;

  // Task display toggles
  showOptionalTaskRequirementLabels: boolean;
  showRequiredTaskRequirementLabels: boolean;
  showExperienceRewards: boolean;
  showNextTasks: boolean;
  showPreviousTasks: boolean;
  showTaskIds: boolean;

  // Saving state for UI feedback (optional to allow deletion)
  saving?: {
    itemsNeededHideNonFIR?: boolean;
    showExperienceRewards?: boolean;
    showNextTasks?: boolean;
    showTaskIds?: boolean;
    showPreviousTasks?: boolean;
  };
}

export const defaultUiSettingsState: UiSettingsState = {
  taskPrimaryView: null,
  taskMapView: null,
  taskTraderView: null,
  taskSecondaryView: null,
  taskUserView: null,
  neededTypeView: null,
  itemsHideNonFIR: false,
  neededitemsStyle: null,
  hideoutPrimaryView: null,
  showOptionalTaskRequirementLabels: true,
  showRequiredTaskRequirementLabels: true,
  showExperienceRewards: true,
  showNextTasks: false,
  showTaskIds: false,
  showPreviousTasks: false,
  saving: {
    itemsNeededHideNonFIR: false,
    showExperienceRewards: false,
    showNextTasks: false,
    showTaskIds: false,
    showPreviousTasks: false,
  },
};

export const useUiSettingsStore = defineStore('uiSettings', {
  state: (): UiSettingsState => {
    const state = JSON.parse(JSON.stringify(defaultUiSettingsState));
    return state;
  },

  getters: {
    getTaskPrimaryView: (state) => {
      return state.taskPrimaryView ?? 'all';
    },
    getTaskMapView: (state) => {
      return state.taskMapView ?? 'all';
    },
    getTaskTraderView: (state) => {
      return state.taskTraderView ?? 'all';
    },
    getTaskSecondaryView: (state) => {
      return state.taskSecondaryView ?? 'available';
    },
    getTaskUserView: (state) => {
      return state.taskUserView ?? 'all';
    },
    getNeededTypeView: (state) => {
      return state.neededTypeView ?? 'all';
    },
    itemsNeededHideNonFIR: (state) => {
      return state.itemsHideNonFIR ?? false;
    },
    getNeededItemsStyle: (state) => {
      return state.neededitemsStyle ?? 'mediumCard';
    },
    getHideoutPrimaryView: (state) => {
      return state.hideoutPrimaryView ?? 'available';
    },
    getShowOptionalTaskRequirementLabels: (state) => {
      return state.showOptionalTaskRequirementLabels ?? true;
    },
    getShowRequiredTaskRequirementLabels: (state) => {
      return state.showRequiredTaskRequirementLabels ?? true;
    },
    getShowExperienceRewards: (state) => {
      return state.showExperienceRewards ?? true;
    },
    getShowNextTasks: (state) => {
      return state.showNextTasks ?? false;
    },
    getShowPreviousTasks: (state) => {
      return state.showPreviousTasks ?? false;
    },
    getShowTaskIds: (state) => {
      return state.showTaskIds ?? false;
    },
  },

  actions: {
    setTaskPrimaryView(view: string) {
      this.taskPrimaryView = view;
      persistUiSettingsState(this.$state);
    },

    setTaskMapView(view: string) {
      this.taskMapView = view;
      persistUiSettingsState(this.$state);
    },

    setTaskTraderView(view: string) {
      this.taskTraderView = view;
      persistUiSettingsState(this.$state);
    },

    setTaskSecondaryView(view: string) {
      this.taskSecondaryView = view;
      persistUiSettingsState(this.$state);
    },

    setTaskUserView(view: string) {
      this.taskUserView = view;
      persistUiSettingsState(this.$state);
    },

    setNeededTypeView(view: string) {
      this.neededTypeView = view;
      persistUiSettingsState(this.$state);
    },

    setItemsNeededHideNonFIR(hide: boolean) {
      this.itemsHideNonFIR = hide;
      persistUiSettingsState(this.$state);
      this.saving = this.saving || { ...defaultUiSettingsState.saving };
      this.saving.itemsNeededHideNonFIR = true;
    },

    setNeededItemsStyle(style: string) {
      this.neededitemsStyle = style;
      persistUiSettingsState(this.$state);
    },

    setHideoutPrimaryView(view: string) {
      this.hideoutPrimaryView = view;
      persistUiSettingsState(this.$state);
    },

    setShowOptionalTaskRequirementLabels(show: boolean) {
      this.showOptionalTaskRequirementLabels = show;
      persistUiSettingsState(this.$state);
    },

    setShowRequiredTaskRequirementLabels(show: boolean) {
      this.showRequiredTaskRequirementLabels = show;
      persistUiSettingsState(this.$state);
    },

    setShowExperienceRewards(show: boolean) {
      this.showExperienceRewards = show;
      persistUiSettingsState(this.$state);
      this.saving = this.saving || { ...defaultUiSettingsState.saving };
      this.saving.showExperienceRewards = true;
    },

    setShowNextTasks(show: boolean) {
      this.showNextTasks = show;
      persistUiSettingsState(this.$state);
      this.saving = this.saving || { ...defaultUiSettingsState.saving };
      this.saving.showNextTasks = true;
    },

    setShowPreviousTasks(show: boolean) {
      this.showPreviousTasks = show;
      persistUiSettingsState(this.$state);
      this.saving = this.saving || { ...defaultUiSettingsState.saving };
      this.saving.showPreviousTasks = true;
    },

    setShowTaskIds(show: boolean) {
      this.showTaskIds = show;
      persistUiSettingsState(this.$state);
      this.saving = this.saving || { ...defaultUiSettingsState.saving };
      this.saving.showTaskIds = true;
    },

    resetUiSettings() {
      Object.assign(this.$state, defaultUiSettingsState);
      persistUiSettingsState(this.$state);
    },
  },
});

export type UiSettingsStore = ReturnType<typeof useUiSettingsStore>;

// Helper to persist UI settings state
function persistUiSettingsState(state: UiSettingsState) {
  const persistedState = { ...state };
  delete persistedState.saving;
  try {
    localStorage.setItem('user-ui-settings', JSON.stringify(persistedState));
  } catch (error) {
    logger.error('Failed to persist UI settings state:', error);
  }
}
