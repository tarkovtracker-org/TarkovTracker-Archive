import { defineStore } from 'pinia';
import { logger } from '@/utils/logger';

// Preferences state - user preferences that affect content visibility
export interface PreferencesState {
  // Tip management
  allTipsHidden: boolean;
  hideTips: Record<string, boolean>;

  // Content filtering preferences
  hideGlobalTasks: boolean;
  hideNonKappaTasks: boolean;
  hideKappaRequiredTasks: boolean;
  hideLightkeeperRequiredTasks: boolean;
  hideEodOnlyTasks: boolean;

  // Privacy
  streamerMode: boolean;

  // Saving state for UI feedback (optional to allow deletion)
  saving?: {
    streamerMode?: boolean;
    hideGlobalTasks?: boolean;
    hideNonKappaTasks?: boolean;
    hideKappaRequiredTasks?: boolean;
    hideLightkeeperRequiredTasks?: boolean;
    hideEodOnlyTasks?: boolean;
  };
}

export const defaultPreferencesState: PreferencesState = {
  allTipsHidden: false,
  hideTips: {},
  hideGlobalTasks: false,
  hideNonKappaTasks: false,
  hideKappaRequiredTasks: false,
  hideLightkeeperRequiredTasks: false,
  hideEodOnlyTasks: false,
  streamerMode: false,
  saving: {
    streamerMode: false,
    hideGlobalTasks: false,
    hideNonKappaTasks: false,
    hideKappaRequiredTasks: false,
    hideLightkeeperRequiredTasks: false,
    hideEodOnlyTasks: false,
  },
};

export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => {
    const state = JSON.parse(JSON.stringify(defaultPreferencesState));
    return state;
  },

  getters: {
    showTip: (state) => {
      return (tipKey: string): boolean => !state.allTipsHidden && !state.hideTips?.[tipKey];
    },
    hiddenTipCount: (state) => {
      return state.hideTips ? Object.keys(state.hideTips).length : 0;
    },
    hideAllTips: (state) => {
      return state.allTipsHidden ?? false;
    },
    getStreamerMode(state) {
      return state.streamerMode ?? false;
    },
    getHideGlobalTasks: (state) => {
      return state.hideGlobalTasks ?? false;
    },
    getHideNonKappaTasks: (state) => {
      return state.hideNonKappaTasks ?? false;
    },
    getHideKappaRequiredTasks: (state) => {
      return state.hideKappaRequiredTasks ?? false;
    },
    getHideLightkeeperRequiredTasks: (state) => {
      return state.hideLightkeeperRequiredTasks ?? false;
    },
    getHideEodOnlyTasks: (state) => {
      return state.hideEodOnlyTasks ?? false;
    },
  },

  actions: {
    hideTip(tipKey: string) {
      if (!this.hideTips) {
        this.hideTips = {};
      }
      this.hideTips[tipKey] = true;
      persistPreferencesState(this.$state);
    },

    unhideTips() {
      this.hideTips = {};
      this.allTipsHidden = false;
      persistPreferencesState(this.$state);
    },

    enableHideAllTips() {
      this.allTipsHidden = true;
      persistPreferencesState(this.$state);
    },

    setStreamerMode(mode: boolean) {
      this.streamerMode = mode;
      persistPreferencesState(this.$state);
      this.saving = this.saving || { ...defaultPreferencesState.saving };
      this.saving.streamerMode = true;
    },

    setHideGlobalTasks(hide: boolean) {
      this.hideGlobalTasks = hide;
      persistPreferencesState(this.$state);
      this.saving = this.saving || { ...defaultPreferencesState.saving };
      this.saving.hideGlobalTasks = true;
    },

    setHideNonKappaTasks(hide: boolean) {
      this.hideNonKappaTasks = hide;
      persistPreferencesState(this.$state);
      this.saving = this.saving || { ...defaultPreferencesState.saving };
      this.saving.hideNonKappaTasks = true;
    },

    setHideKappaRequiredTasks(hide: boolean) {
      this.hideKappaRequiredTasks = hide;
      persistPreferencesState(this.$state);
      this.saving = this.saving || { ...defaultPreferencesState.saving };
      this.saving.hideKappaRequiredTasks = true;
    },

    setHideLightkeeperRequiredTasks(hide: boolean) {
      this.hideLightkeeperRequiredTasks = hide;
      persistPreferencesState(this.$state);
      this.saving = this.saving || { ...defaultPreferencesState.saving };
      this.saving.hideLightkeeperRequiredTasks = true;
    },

    setHideEodOnlyTasks(hide: boolean) {
      this.hideEodOnlyTasks = hide;
      persistPreferencesState(this.$state);
      this.saving = this.saving || { ...defaultPreferencesState.saving };
      this.saving.hideEodOnlyTasks = true;
    },

    resetPreferences() {
      Object.assign(this.$state, defaultPreferencesState);
      persistPreferencesState(this.$state);
    },
  },
});

export type PreferencesStore = ReturnType<typeof usePreferencesStore>;

// Helper to persist preferences state
function persistPreferencesState(state: PreferencesState) {
  const persistedState = { ...state };
  delete persistedState.saving;
  try {
    localStorage.setItem('user-preferences', JSON.stringify(persistedState));
  } catch (error) {
    logger.error('Failed to persist preferences state:', error);
  }
}
