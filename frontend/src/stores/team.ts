import { defineStore } from 'pinia';
import { logger } from '@/utils/logger';

// Team state - team-related visibility and management settings
export interface TeamState {
  // Team visibility settings
  teamHide: Record<string, boolean>;
  taskTeamHideAll: boolean;
  itemsTeamHideAll: boolean;
  itemsTeamHideNonFIR: boolean;
  itemsTeamHideHideout: boolean;
  mapTeamHideAll: boolean;
}

export const defaultTeamState: TeamState = {
  teamHide: {},
  taskTeamHideAll: false,
  itemsTeamHideAll: false,
  itemsTeamHideNonFIR: false,
  itemsTeamHideHideout: false,
  mapTeamHideAll: false,
};

export const useTeamStore = defineStore('team', {
  state: (): TeamState => {
    const state = JSON.parse(JSON.stringify(defaultTeamState));
    return state;
  },

  getters: {
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
  },

  actions: {
    toggleHidden(teamId: string) {
      if (!this.teamHide) {
        this.teamHide = {};
      }
      this.teamHide[teamId] = !this.teamHide[teamId];
      persistTeamState(this.$state);
    },

    setQuestTeamHideAll(hide: boolean) {
      this.taskTeamHideAll = hide;
      persistTeamState(this.$state);
    },

    setItemsTeamHideAll(hide: boolean) {
      this.itemsTeamHideAll = hide;
      persistTeamState(this.$state);
    },

    setItemsTeamHideNonFIR(hide: boolean) {
      this.itemsTeamHideNonFIR = hide;
      persistTeamState(this.$state);
    },

    setItemsTeamHideHideout(hide: boolean) {
      this.itemsTeamHideHideout = hide;
      persistTeamState(this.$state);
    },

    setMapTeamHideAll(hide: boolean) {
      this.mapTeamHideAll = hide;
      persistTeamState(this.$state);
    },

    resetTeamSettings() {
      Object.assign(this.$state, defaultTeamState);
      persistTeamState(this.$state);
    },

    unhideAllTeams() {
      this.teamHide = {};
      this.taskTeamHideAll = false;
      this.itemsTeamHideAll = false;
      this.mapTeamHideAll = false;
      persistTeamState(this.$state);
    },
  },
});

export type TeamStore = ReturnType<typeof useTeamStore>;

// Helper to persist team state
function persistTeamState(state: TeamState) {
  try {
    localStorage.setItem('user-team', JSON.stringify(state));
  } catch (error) {
    logger.error('Failed to persist team state:', error);
  }
}
