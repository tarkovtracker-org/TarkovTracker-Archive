/**
 * LEGACY USER STORE - Backward Compatibility Layer
 *
 * This store provides backward compatibility during the refactoring transition.
 * It maps old user store API calls to the new modular stores.
 *
 * TODO: Remove this store after updating all components to use the new stores directly.
 */

import { defineStore } from 'pinia';
import { usePreferencesStore, type PreferencesStore } from './preferences';
import { useUiSettingsStore, type UiSettingsStore } from './ui-settings';
import { useTeamStore, type TeamStore } from './team';

// Re-export the old interface for backward compatibility
interface UserState {
  allTipsHidden: boolean;
  hideTips: Record<string, boolean>;
  streamerMode: boolean;
  teamHide: Record<string, boolean>;
  taskTeamHideAll: boolean;
  itemsTeamHideAll: boolean;
  itemsTeamHideNonFIR: boolean;
  itemsTeamHideHideout: boolean;
  mapTeamHideAll: boolean;
  taskPrimaryView: string | null;
  taskMapView: string | null;
  taskTraderView: string | null;
  taskSecondaryView: string | null;
  taskUserView: string | null;
  neededTypeView: string | null;
  itemsHideNonFIR: boolean;
  hideGlobalTasks: boolean;
  hideNonKappaTasks: boolean;
  hideKappaRequiredTasks: boolean;
  hideLightkeeperRequiredTasks: boolean;
  hideEodOnlyTasks: boolean;
  showOptionalTaskRequirementLabels: boolean;
  showRequiredTaskRequirementLabels: boolean;
  showExperienceRewards: boolean;
  showNextTasks: boolean;
  showPreviousTasks: boolean;
  showTaskIds: boolean;
  neededitemsStyle: string | null;
  hideoutPrimaryView?: string | null;
  saving?: {
    streamerMode: boolean;
    hideGlobalTasks: boolean;
    hideNonKappaTasks: boolean;
    hideKappaRequiredTasks: boolean;
    hideLightkeeperRequiredTasks: boolean;
    hideEodOnlyTasks: boolean;
    itemsNeededHideNonFIR: boolean;
    itemsTeamHideNonFIR: boolean;
    showExperienceRewards: boolean;
    showNextTasks: boolean;
    showPreviousTasks: boolean;
    showTaskIds: boolean;
  };
}

export const useUserStore = defineStore('swapUser', {
  state: (): UserState => {
    // Get the new stores
    const preferencesStore = usePreferencesStore();
    const uiSettingsStore = useUiSettingsStore();
    const teamStore = useTeamStore();

    // Combine states for backward compatibility
    return {
      // From preferences store
      allTipsHidden: preferencesStore.allTipsHidden,
      hideTips: preferencesStore.hideTips,
      streamerMode: preferencesStore.streamerMode,
      hideGlobalTasks: preferencesStore.hideGlobalTasks,
      hideNonKappaTasks: preferencesStore.hideNonKappaTasks,
      hideKappaRequiredTasks: preferencesStore.hideKappaRequiredTasks,
      hideLightkeeperRequiredTasks: preferencesStore.hideLightkeeperRequiredTasks,
      hideEodOnlyTasks: preferencesStore.hideEodOnlyTasks,

      // From team store
      teamHide: teamStore.teamHide,
      taskTeamHideAll: teamStore.taskTeamHideAll,
      itemsTeamHideAll: teamStore.itemsTeamHideAll,
      itemsTeamHideNonFIR: teamStore.itemsTeamHideNonFIR,
      itemsTeamHideHideout: teamStore.itemsTeamHideHideout,
      mapTeamHideAll: teamStore.mapTeamHideAll,

      // From UI settings store
      taskPrimaryView: uiSettingsStore.taskPrimaryView,
      taskMapView: uiSettingsStore.taskMapView,
      taskTraderView: uiSettingsStore.taskTraderView,
      taskSecondaryView: uiSettingsStore.taskSecondaryView,
      taskUserView: uiSettingsStore.taskUserView,
      neededTypeView: uiSettingsStore.neededTypeView,
      itemsHideNonFIR: uiSettingsStore.itemsHideNonFIR,
      neededitemsStyle: uiSettingsStore.neededitemsStyle,
      hideoutPrimaryView: uiSettingsStore.hideoutPrimaryView,
      showOptionalTaskRequirementLabels: uiSettingsStore.showOptionalTaskRequirementLabels,
      showRequiredTaskRequirementLabels: uiSettingsStore.showRequiredTaskRequirementLabels,
      showExperienceRewards: uiSettingsStore.showExperienceRewards,
      showNextTasks: uiSettingsStore.showNextTasks,
      showPreviousTasks: uiSettingsStore.showPreviousTasks,
      showTaskIds: uiSettingsStore.showTaskIds,

      // Combined saving state
      saving: {
        streamerMode: preferencesStore.saving?.streamerMode ?? false,
        hideGlobalTasks: preferencesStore.saving?.hideGlobalTasks ?? false,
        hideNonKappaTasks: preferencesStore.saving?.hideNonKappaTasks ?? false,
        hideKappaRequiredTasks: preferencesStore.saving?.hideKappaRequiredTasks ?? false,
        hideLightkeeperRequiredTasks:
          preferencesStore.saving?.hideLightkeeperRequiredTasks ?? false,
        hideEodOnlyTasks: preferencesStore.saving?.hideEodOnlyTasks ?? false,
        itemsNeededHideNonFIR: uiSettingsStore.saving?.itemsNeededHideNonFIR ?? false,
        showExperienceRewards: uiSettingsStore.saving?.showExperienceRewards ?? false,
        showNextTasks: uiSettingsStore.saving?.showNextTasks ?? false,
        showTaskIds: uiSettingsStore.saving?.showTaskIds ?? false,
        showPreviousTasks: uiSettingsStore.saving?.showPreviousTasks ?? false,
        itemsTeamHideNonFIR: false, // This wasn't in the new stores, default to false
      },
    };
  },

  getters: {
    showTip: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.showTip;
    },
    hiddenTipCount: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.hiddenTipCount;
    },
    hideAllTips: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.hideAllTips;
    },
    getStreamerMode: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.getStreamerMode;
    },
    teamIsHidden: () => {
      const teamStore = useTeamStore();
      return teamStore.teamIsHidden;
    },
    taskTeamAllHidden: () => {
      const teamStore = useTeamStore();
      return teamStore.taskTeamAllHidden;
    },
    itemsTeamAllHidden: () => {
      const teamStore = useTeamStore();
      return teamStore.itemsTeamAllHidden;
    },
    itemsTeamNonFIRHidden: () => {
      const teamStore = useTeamStore();
      return teamStore.itemsTeamNonFIRHidden;
    },
    itemsTeamHideoutHidden: () => {
      const teamStore = useTeamStore();
      return teamStore.itemsTeamHideoutHidden;
    },
    mapTeamAllHidden: () => {
      const teamStore = useTeamStore();
      return teamStore.mapTeamAllHidden;
    },
    getTaskPrimaryView: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getTaskPrimaryView;
    },
    getTaskMapView: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getTaskMapView;
    },
    getTaskTraderView: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getTaskTraderView;
    },
    getTaskSecondaryView: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getTaskSecondaryView;
    },
    getTaskUserView: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getTaskUserView;
    },
    getNeededTypeView: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getNeededTypeView;
    },
    itemsNeededHideNonFIR: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.itemsNeededHideNonFIR;
    },
    getHideGlobalTasks: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.getHideGlobalTasks;
    },
    getHideNonKappaTasks: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.getHideNonKappaTasks;
    },
    getHideKappaRequiredTasks: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.getHideKappaRequiredTasks;
    },
    getHideLightkeeperRequiredTasks: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.getHideLightkeeperRequiredTasks;
    },
    getHideEodOnlyTasks: () => {
      const preferencesStore = usePreferencesStore();
      return preferencesStore.getHideEodOnlyTasks;
    },
    getShowOptionalTaskRequirementLabels: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getShowOptionalTaskRequirementLabels;
    },
    getShowRequiredTaskRequirementLabels: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getShowRequiredTaskRequirementLabels;
    },
    getShowExperienceRewards: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getShowExperienceRewards;
    },
    getShowNextTasks: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getShowNextTasks;
    },
    getShowPreviousTasks: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getShowPreviousTasks;
    },
    getShowTaskIds: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getShowTaskIds;
    },
    getNeededItemsStyle: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getNeededItemsStyle;
    },
    getHideoutPrimaryView: () => {
      const uiSettingsStore = useUiSettingsStore();
      return uiSettingsStore.getHideoutPrimaryView;
    },
  },

  actions: {
    // Preferences actions
    hideTip(tipKey: string) {
      const preferencesStore = usePreferencesStore();
      preferencesStore.hideTip(tipKey);
    },
    unhideTips() {
      const preferencesStore = usePreferencesStore();
      preferencesStore.unhideTips();
    },
    enableHideAllTips() {
      const preferencesStore = usePreferencesStore();
      preferencesStore.enableHideAllTips();
    },
    setStreamerMode(mode: boolean) {
      const preferencesStore = usePreferencesStore();
      preferencesStore.setStreamerMode(mode);
    },
    setHideGlobalTasks(hide: boolean) {
      const preferencesStore = usePreferencesStore();
      preferencesStore.setHideGlobalTasks(hide);
    },
    setHideNonKappaTasks(hide: boolean) {
      const preferencesStore = usePreferencesStore();
      preferencesStore.setHideNonKappaTasks(hide);
    },
    setHideKappaRequiredTasks(hide: boolean) {
      const preferencesStore = usePreferencesStore();
      preferencesStore.setHideKappaRequiredTasks(hide);
    },
    setHideLightkeeperRequiredTasks(hide: boolean) {
      const preferencesStore = usePreferencesStore();
      preferencesStore.setHideLightkeeperRequiredTasks(hide);
    },
    setHideEodOnlyTasks(hide: boolean) {
      const preferencesStore = usePreferencesStore();
      preferencesStore.setHideEodOnlyTasks(hide);
    },

    // Team actions
    toggleHidden(teamId: string) {
      const teamStore = useTeamStore();
      teamStore.toggleHidden(teamId);
    },
    setQuestTeamHideAll(hide: boolean) {
      const teamStore = useTeamStore();
      teamStore.setQuestTeamHideAll(hide);
    },
    setItemsTeamHideAll(hide: boolean) {
      const teamStore = useTeamStore();
      teamStore.setItemsTeamHideAll(hide);
    },
    setItemsTeamHideNonFIR(hide: boolean) {
      const teamStore = useTeamStore();
      teamStore.setItemsTeamHideNonFIR(hide);
    },
    setItemsTeamHideHideout(hide: boolean) {
      const teamStore = useTeamStore();
      teamStore.setItemsTeamHideHideout(hide);
    },
    setMapTeamHideAll(hide: boolean) {
      const teamStore = useTeamStore();
      teamStore.setMapTeamHideAll(hide);
    },

    // UI Settings actions
    setTaskPrimaryView(view: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setTaskPrimaryView(view);
    },
    setTaskMapView(view: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setTaskMapView(view);
    },
    setTaskTraderView(view: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setTaskTraderView(view);
    },
    setTaskSecondaryView(view: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setTaskSecondaryView(view);
    },
    setTaskUserView(view: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setTaskUserView(view);
    },
    setNeededTypeView(view: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setNeededTypeView(view);
    },
    setItemsNeededHideNonFIR(hide: boolean) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setItemsNeededHideNonFIR(hide);
    },
    setNeededItemsStyle(style: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setNeededItemsStyle(style);
    },
    setHideoutPrimaryView(view: string) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setHideoutPrimaryView(view);
    },
    setShowOptionalTaskRequirementLabels(show: boolean) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setShowOptionalTaskRequirementLabels(show);
    },
    setShowRequiredTaskRequirementLabels(show: boolean) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setShowRequiredTaskRequirementLabels(show);
    },
    setShowExperienceRewards(show: boolean) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setShowExperienceRewards(show);
    },
    setShowNextTasks(show: boolean) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setShowNextTasks(show);
    },
    setShowPreviousTasks(show: boolean) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setShowPreviousTasks(show);
    },
    setShowTaskIds(show: boolean) {
      const uiSettingsStore = useUiSettingsStore();
      uiSettingsStore.setShowTaskIds(show);
    },
  },
});

export type UserStore = ReturnType<typeof useUserStore>;
