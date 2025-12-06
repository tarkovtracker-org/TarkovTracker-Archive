import { fireuser } from '@/plugins/firebase';
import { defineStore, type StoreDefinition } from 'pinia';
import { watch } from 'vue';
import pinia from '@/plugins/pinia';
import type { StoreWithFireswapExt } from '@/plugins/pinia-firestore';
import { logger } from '@/utils/logger';
// Define the state structure
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
    showExperienceRewards: boolean;
    showNextTasks: boolean;
    showPreviousTasks: boolean;
    showTaskIds: boolean;
  };
}
// Export the default state with type annotation
export const defaultState: UserState = {
  allTipsHidden: false,
  hideTips: {},
  streamerMode: false,
  teamHide: {},
  taskTeamHideAll: false,
  itemsTeamHideAll: false,
  itemsTeamHideNonFIR: false,
  itemsTeamHideHideout: false,
  mapTeamHideAll: false,
  taskPrimaryView: null,
  taskMapView: null,
  taskTraderView: null,
  taskSecondaryView: null,
  taskUserView: null,
  neededTypeView: null,
  itemsHideNonFIR: false,
  hideGlobalTasks: false,
  hideNonKappaTasks: false,
  hideKappaRequiredTasks: false,
  hideLightkeeperRequiredTasks: false,
  hideEodOnlyTasks: false,
  showOptionalTaskRequirementLabels: true,
  showRequiredTaskRequirementLabels: true,
  showExperienceRewards: true,
  showNextTasks: false,
  showTaskIds: false,
  showPreviousTasks: false,
  neededitemsStyle: null,
  hideoutPrimaryView: null,
  saving: {
    streamerMode: false,
    hideGlobalTasks: false,
    hideNonKappaTasks: false,
    hideKappaRequiredTasks: false,
    hideLightkeeperRequiredTasks: false,
    hideEodOnlyTasks: false,
    itemsNeededHideNonFIR: false,
    showExperienceRewards: false,
    showNextTasks: false,
    showTaskIds: false,
    showPreviousTasks: false,
  },
};
// Per-toggle saving state (not persisted)
const initialSavingState = {
  streamerMode: false,
  hideGlobalTasks: false,
  hideNonKappaTasks: false,
  hideKappaRequiredTasks: false,
  hideLightkeeperRequiredTasks: false,
  hideEodOnlyTasks: false,
  itemsNeededHideNonFIR: false,
  showExperienceRewards: false,
  showNextTasks: false,
  showTaskIds: false,
  showPreviousTasks: false,
};
// Define getter types
type UserGetters = {
  showTip: (state: UserState) => (tipKey: string) => boolean;
  hiddenTipCount: (state: UserState) => number;
  hideAllTips: (state: UserState) => boolean;
  getStreamerMode: (state: UserState) => boolean;
  teamIsHidden: (state: UserState) => (teamId: string) => boolean;
  taskTeamAllHidden: (state: UserState) => boolean;
  itemsTeamAllHidden: (state: UserState) => boolean;
  itemsTeamNonFIRHidden: (state: UserState) => boolean;
  itemsTeamHideoutHidden: (state: UserState) => boolean;
  mapTeamAllHidden: (state: UserState) => boolean;
  getTaskPrimaryView: (state: UserState) => string;
  getTaskMapView: (state: UserState) => string;
  getTaskTraderView: (state: UserState) => string;
  getTaskSecondaryView: (state: UserState) => string;
  getTaskUserView: (state: UserState) => string;
  getNeededTypeView: (state: UserState) => string;
  itemsNeededHideNonFIR: (state: UserState) => boolean;
  getHideGlobalTasks: (state: UserState) => boolean;
  getHideNonKappaTasks: (state: UserState) => boolean;
  getHideKappaRequiredTasks: (state: UserState) => boolean;
  getHideLightkeeperRequiredTasks: (state: UserState) => boolean;
  getHideEodOnlyTasks: (state: UserState) => boolean;
  getShowOptionalTaskRequirementLabels: (state: UserState) => boolean;
  getShowRequiredTaskRequirementLabels: (state: UserState) => boolean;
  getShowExperienceRewards: (state: UserState) => boolean;
  getShowNextTasks: (state: UserState) => boolean;
  getShowPreviousTasks: (state: UserState) => boolean;
  getShowTaskIds: (state: UserState) => boolean;
  getNeededItemsStyle: (state: UserState) => string;
  getHideoutPrimaryView: (state: UserState) => string;
};
// Define action types
type UserActions = {
  hideTip(tipKey: string): void;
  unhideTips(): void;
  enableHideAllTips(): void;
  setStreamerMode(mode: boolean): void;
  toggleHidden(teamId: string): void;
  setQuestTeamHideAll(hide: boolean): void;
  setItemsTeamHideAll(hide: boolean): void;
  setItemsTeamHideNonFIR(hide: boolean): void;
  setItemsTeamHideHideout(hide: boolean): void;
  setMapTeamHideAll(hide: boolean): void;
  setTaskPrimaryView(view: string): void;
  setTaskMapView(view: string): void;
  setTaskTraderView(view: string): void;
  setTaskSecondaryView(view: string): void;
  setTaskUserView(view: string): void;
  setNeededTypeView(view: string): void;
  setItemsNeededHideNonFIR(hide: boolean): void;
  setHideGlobalTasks(hide: boolean): void;
  setHideNonKappaTasks(hide: boolean): void;
  setHideKappaRequiredTasks(hide: boolean): void;
  setHideLightkeeperRequiredTasks(hide: boolean): void;
  setHideEodOnlyTasks(hide: boolean): void;
  setShowOptionalTaskRequirementLabels(show: boolean): void;
  setShowRequiredTaskRequirementLabels(show: boolean): void;
  setShowExperienceRewards(show: boolean): void;
  setShowNextTasks(show: boolean): void;
  setShowPreviousTasks(show: boolean): void;
  setShowTaskIds(show: boolean): void;
  setNeededItemsStyle(style: string): void;
  setHideoutPrimaryView(view: string): void;
};
// Define the store type including the fireswap property
// Changed interface to type alias to resolve no-empty-object-type error
type UserStoreDefinition = StoreDefinition<'swapUser', UserState, UserGetters, UserActions>;

export const useUserStore: UserStoreDefinition = defineStore('swapUser', {
  state: (): UserState => {
    const state = JSON.parse(JSON.stringify(defaultState));
    // Always reset saving state on store creation
    state.saving = { ...initialSavingState };
    return state;
  },
  getters: {
    showTip: (state) => {
      return (tipKey: string): boolean => !state.allTipsHidden && !state.hideTips?.[tipKey];
    },
    hiddenTipCount: (state) => {
      // Ensure hideTips exists before getting keys
      return state.hideTips ? Object.keys(state.hideTips).length : 0;
    },
    hideAllTips: (state) => {
      return state.allTipsHidden ?? false;
    },
    getStreamerMode(state) {
      return state.streamerMode ?? false;
    },
    teamIsHidden: (state) => {
      return (teamId: string): boolean =>
        state.taskTeamHideAll || state.teamHide?.[teamId] || false;
    },
    taskTeamAllHidden: (state) => {
      return state.taskTeamHideAll ?? false;
    },
    itemsTeamAllHidden: (state) => {
      return state.itemsTeamHideAll ?? false;
    },
    itemsTeamNonFIRHidden: (state) => {
      return state.itemsTeamHideAll || state.itemsTeamHideNonFIR || false;
    },
    itemsTeamHideoutHidden: (state) => {
      return state.itemsTeamHideAll || state.itemsTeamHideHideout || false;
    },
    mapTeamAllHidden: (state) => {
      return state.mapTeamHideAll ?? false;
    },
    // Add default values for views using nullish coalescing
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
    getNeededItemsStyle: (state) => {
      return state.neededitemsStyle ?? 'mediumCard';
    },
    getHideoutPrimaryView: (state) => {
      return state.hideoutPrimaryView ?? 'available';
    },
  },
  actions: {
    hideTip(tipKey: string) {
      if (!this.hideTips) {
        this.hideTips = {};
      }
      this.hideTips[tipKey] = true;
    },
    unhideTips() {
      this.hideTips = {};
      this.allTipsHidden = false;
    },
    enableHideAllTips() {
      this.allTipsHidden = true;
    },
    setStreamerMode(mode: boolean) {
      this.streamerMode = mode;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.streamerMode = true;
    },
    toggleHidden(teamId: string) {
      if (!this.teamHide) {
        this.teamHide = {};
      }
      this.teamHide[teamId] = !this.teamHide[teamId];
    },
    setQuestTeamHideAll(hide: boolean) {
      this.taskTeamHideAll = hide;
    },
    setItemsTeamHideAll(hide: boolean) {
      this.itemsTeamHideAll = hide;
    },
    setItemsTeamHideNonFIR(hide: boolean) {
      this.itemsTeamHideNonFIR = hide;
    },
    setItemsTeamHideHideout(hide: boolean) {
      this.itemsTeamHideHideout = hide;
    },
    setMapTeamHideAll(hide: boolean) {
      this.mapTeamHideAll = hide;
    },
    setTaskPrimaryView(view: string) {
      this.taskPrimaryView = view;
    },
    setTaskMapView(view: string) {
      this.taskMapView = view;
    },
    setTaskTraderView(view: string) {
      this.taskTraderView = view;
    },
    setTaskSecondaryView(view: string) {
      this.taskSecondaryView = view;
    },
    setTaskUserView(view: string) {
      this.taskUserView = view;
    },
    setNeededTypeView(view: string) {
      this.neededTypeView = view;
    },
    setItemsNeededHideNonFIR(hide: boolean) {
      this.itemsHideNonFIR = hide;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.itemsNeededHideNonFIR = true;
    },
    setHideGlobalTasks(hide: boolean) {
      this.hideGlobalTasks = hide;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideGlobalTasks = true;
    },
    setHideNonKappaTasks(hide: boolean) {
      this.hideNonKappaTasks = hide;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideNonKappaTasks = true;
    },
    setHideKappaRequiredTasks(hide: boolean) {
      this.hideKappaRequiredTasks = hide;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideKappaRequiredTasks = true;
    },
    setHideLightkeeperRequiredTasks(hide: boolean) {
      this.hideLightkeeperRequiredTasks = hide;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideLightkeeperRequiredTasks = true;
    },
    setHideEodOnlyTasks(hide: boolean) {
      this.hideEodOnlyTasks = hide;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.hideEodOnlyTasks = true;
    },
    setShowOptionalTaskRequirementLabels(show: boolean) {
      this.showOptionalTaskRequirementLabels = show;
      persistUserState(this.$state);
    },
    setShowRequiredTaskRequirementLabels(show: boolean) {
      this.showRequiredTaskRequirementLabels = show;
      persistUserState(this.$state);
    },
    setShowExperienceRewards(show: boolean) {
      this.showExperienceRewards = show;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.showExperienceRewards = true;
    },
    setShowNextTasks(show: boolean) {
      this.showNextTasks = show;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.showNextTasks = true;
    },
    setShowPreviousTasks(show: boolean) {
      this.showPreviousTasks = show;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.showPreviousTasks = true;
    },
    setShowTaskIds(show: boolean) {
      this.showTaskIds = show;
      persistUserState(this.$state);
      this.saving = this.saving ?? { ...initialSavingState };
      this.saving.showTaskIds = true;
    },
    setNeededItemsStyle(style: string) {
      this.neededitemsStyle = style;
    },
    setHideoutPrimaryView(view: string) {
      this.hideoutPrimaryView = view;
    },
  },
  fireswap: [
    {
      path: '.',
      document: 'user/{uid}',
      debouncems: 10,
      localKey: 'user',
    },
  ],
}) as UserStoreDefinition;

export type UserStore = ReturnType<typeof useUserStore>;
// Watch for fireuser state changing and bind/unbind
watch(
  () => fireuser.loggedIn,
  (newValue: boolean) => {
    try {
      // Ensure pinia instance is available and correctly typed
      const userStore = useUserStore(pinia);
      const extendedStore = userStore as StoreWithFireswapExt<typeof userStore>;
      // Check if firebindAll/fireunbindAll exist before calling
      const canBind = typeof extendedStore.firebindAll === 'function';
      const canUnbind = typeof extendedStore.fireunbindAll === 'function';
      if (newValue) {
        if (canBind) {
          extendedStore.firebindAll!();
        }
      } else {
        if (canUnbind) {
          extendedStore.fireunbindAll!();
        }
      }
    } catch (_error) {
      // Handle cases where pinia or userStore might not be ready
      logger.error('Error in userStore watch for fireuser.loggedIn:', _error);
    }
  },
  { immediate: true }
);
// Helper to persist state without 'saving'
function persistUserState(state: UserState) {
  const persistedState = { ...state };
  delete persistedState.saving;
  localStorage.setItem('user', JSON.stringify(persistedState));
}
