import type { _GettersTree } from 'pinia';

export type GameMode = 'pvp' | 'pve';

// State interfaces
interface TaskObjective {
  count?: number;
  complete?: boolean;
  timestamp?: number;
}

interface TaskCompletion {
  complete?: boolean;
  failed?: boolean;
  timestamp?: number;
}

interface HideoutPart {
  count?: number;
  complete?: boolean;
  timestamp?: number;
}

interface HideoutModule {
  complete?: boolean;
  timestamp?: number;
}

export interface UserProgressData {
  level: number;
  gameEdition: number;
  pmcFaction: 'USEC' | 'BEAR';
  displayName: string | null;
  taskObjectives: { [objectiveId: string]: TaskObjective };
  taskCompletions: { [taskId: string]: TaskCompletion };
  hideoutParts: { [objectiveId: string]: HideoutPart };
  hideoutModules: { [hideoutId: string]: HideoutModule };
}

export interface UserState {
  currentGameMode: GameMode;
  pvp: UserProgressData;
  pve: UserProgressData;
}

const defaultProgressData: UserProgressData = {
  level: 1,
  gameEdition: 1,
  pmcFaction: 'USEC',
  displayName: null,
  taskObjectives: {},
  taskCompletions: {},
  hideoutParts: {},
  hideoutModules: {},
};

export const defaultState: UserState = {
  currentGameMode: 'pvp',
  pvp: JSON.parse(JSON.stringify(defaultProgressData)),
  pve: JSON.parse(JSON.stringify(defaultProgressData)),
};

// Migration function to convert legacy data structure to new gamemode-aware structure
export function migrateToGameModeStructure(legacyData: unknown): UserState {
  // If already in new format and properly structured, return as-is
  if (
    legacyData &&
    typeof legacyData === 'object' &&
    legacyData.currentGameMode &&
    legacyData.pvp &&
    legacyData.pve
  ) {
    // Ensure the structure is complete
    const pvpData = {
      ...defaultProgressData,
      ...legacyData.pvp,
    };
    const pveData = {
      ...defaultProgressData,
      ...legacyData.pve,
    };

    return {
      currentGameMode: legacyData.currentGameMode || 'pvp',
      pvp: pvpData,
      pve: pveData,
    };
  }

  // Handle partial migration case - has currentGameMode but missing pvp/pve structure
  if (legacyData && legacyData.currentGameMode && !legacyData.pvp && !legacyData.pve) {
    // This is a partially migrated state, use the existing data as legacy format
    const migratedProgressData: UserProgressData = {
      level: legacyData?.level || defaultProgressData.level,
      gameEdition: legacyData?.gameEdition || defaultProgressData.gameEdition,
      pmcFaction: legacyData?.pmcFaction || defaultProgressData.pmcFaction,
      displayName: legacyData?.displayName || defaultProgressData.displayName,
      taskCompletions: legacyData?.taskCompletions || {},
      taskObjectives: legacyData?.taskObjectives || {},
      hideoutParts: legacyData?.hideoutParts || {},
      hideoutModules: legacyData?.hideoutModules || {},
    };

    return {
      currentGameMode: legacyData.currentGameMode,
      pvp: migratedProgressData,
      pve: JSON.parse(JSON.stringify(defaultProgressData)),
    };
  }

  // Create new structure with migrated data from legacy format
  const migratedProgressData: UserProgressData = {
    level: legacyData?.level || defaultProgressData.level,
    gameEdition: legacyData?.gameEdition || defaultProgressData.gameEdition,
    pmcFaction: legacyData?.pmcFaction || defaultProgressData.pmcFaction,
    displayName: legacyData?.displayName || defaultProgressData.displayName,
    taskCompletions: legacyData?.taskCompletions || {},
    taskObjectives: legacyData?.taskObjectives || {},
    hideoutParts: legacyData?.hideoutParts || {},
    hideoutModules: legacyData?.hideoutModules || {},
  };

  return {
    currentGameMode: 'pvp', // Default to PvP for existing users
    pvp: migratedProgressData,
    pve: JSON.parse(JSON.stringify(defaultProgressData)), // Fresh PvE data
  };
}

// Helper to get current gamemode data
const getCurrentData = (state: UserState): UserProgressData => {
  // Handle case where state might not be fully migrated yet
  if (!state.currentGameMode || !state[state.currentGameMode]) {
    // If we don't have gamemode structure, try to return legacy data
    const legacyState = state as unknown as Record<string, unknown>;
    if (
      legacyState.level !== undefined ||
      legacyState.taskCompletions ||
      legacyState.taskObjectives
    ) {
      return legacyState; // Cast to UserProgressData for legacy compatibility
    }
    // Otherwise return default structure
    return {
      level: 1,
      gameEdition: 1,
      pmcFaction: 'USEC',
      displayName: null,
      taskCompletions: {},
      taskObjectives: {},
      hideoutParts: {},
      hideoutModules: {},
    };
  }
  return state[state.currentGameMode];
};

// Simplified getters using arrow functions
export const getters = {
  getCurrentGameMode: (state: UserState) => () => state.currentGameMode || 'pvp',

  playerLevel: (state: UserState) => () => getCurrentData(state).level ?? 1,

  getGameEdition: (state: UserState) => () => getCurrentData(state).gameEdition ?? 1,

  getPMCFaction: (state: UserState) => () => getCurrentData(state).pmcFaction ?? 'USEC',

  getDisplayName: (state: UserState) => () => {
    const currentData = getCurrentData(state);
    return currentData.displayName === '' ? null : (currentData.displayName ?? null);
  },

  getObjectiveCount: (state: UserState) => (objectiveId: string) =>
    getCurrentData(state)?.taskObjectives?.[objectiveId]?.count ?? 0,

  getHideoutPartCount: (state: UserState) => (objectiveId: string) =>
    getCurrentData(state)?.hideoutParts?.[objectiveId]?.count ?? 0,

  isTaskComplete: (state: UserState) => (taskId: string) =>
    getCurrentData(state)?.taskCompletions?.[taskId]?.complete ?? false,

  isTaskFailed: (state: UserState) => (taskId: string) =>
    getCurrentData(state)?.taskCompletions?.[taskId]?.failed ?? false,

  isTaskObjectiveComplete: (state: UserState) => (objectiveId: string) =>
    getCurrentData(state)?.taskObjectives?.[objectiveId]?.complete ?? false,

  isHideoutPartComplete: (state: UserState) => (objectiveId: string) =>
    getCurrentData(state)?.hideoutParts?.[objectiveId]?.complete ?? false,

  isHideoutModuleComplete: (state: UserState) => (hideoutId: string) =>
    getCurrentData(state)?.hideoutModules?.[hideoutId]?.complete ?? false,

  getCurrentProgressData: (state: UserState) => () => getCurrentData(state),

  getPvPProgressData: (state: UserState) => () => state.pvp,

  getPvEProgressData: (state: UserState) => () => state.pve,
} as const satisfies _GettersTree<UserState>;

// Helper functions for common operations
const createCompletion = (complete: boolean, failed = false) => ({
  complete,
  failed,
  timestamp: Date.now(),
});

const updateObjective = (
  state: UserState,
  key: keyof UserProgressData,
  objectiveId: string,
  updates: Record<string, unknown>
) => {
  const currentData = getCurrentData(state);
  const stateValue = currentData[key];
  if (!stateValue || typeof stateValue !== 'object') {
    (currentData[key] as Record<string, unknown>) = {};
  }
  const stateObj = currentData[key] as Record<string, unknown>;
  stateObj[objectiveId] = {
    ...(stateObj[objectiveId] || {}),
    ...updates,
  };
};

// Simplified actions
export const actions = {
  switchGameMode(this: UserState, mode: GameMode) {
    this.currentGameMode = mode;
  },

  incrementLevel(this: UserState) {
    const currentData = getCurrentData(this);
    currentData.level = currentData.level ? currentData.level + 1 : 2;
  },

  decrementLevel(this: UserState) {
    const currentData = getCurrentData(this);
    currentData.level = Math.max(1, (currentData.level || 1) - 1);
  },

  setLevel(this: UserState, level: number) {
    const currentData = getCurrentData(this);
    currentData.level = Math.max(1, level);
  },

  setGameEdition(this: UserState, edition: number) {
    const currentData = getCurrentData(this);
    currentData.gameEdition = edition;
  },

  setPMCFaction(this: UserState, faction: 'USEC' | 'BEAR') {
    const currentData = getCurrentData(this);
    currentData.pmcFaction = faction;
  },

  setDisplayName(this: UserState, name: string | null) {
    const currentData = getCurrentData(this);
    currentData.displayName = typeof name === 'string' ? name : null;
  },

  setObjectiveCount(this: UserState, objectiveId: string, count: number) {
    updateObjective(this, 'taskObjectives', objectiveId, { count: Math.max(0, count) });
  },

  setHideoutPartCount(this: UserState, objectiveId: string, count: number) {
    updateObjective(this, 'hideoutParts', objectiveId, { count: Math.max(0, count) });
  },

  setTaskComplete(this: UserState, taskId: string) {
    updateObjective(this, 'taskCompletions', taskId, createCompletion(true, false));
  },

  setTaskFailed(this: UserState, taskId: string) {
    updateObjective(this, 'taskCompletions', taskId, createCompletion(true, true));
  },

  setTaskUncompleted(this: UserState, taskId: string) {
    updateObjective(this, 'taskCompletions', taskId, createCompletion(false, false));
  },

  setTaskObjectiveComplete(this: UserState, objectiveId: string) {
    updateObjective(this, 'taskObjectives', objectiveId, { complete: true, timestamp: Date.now() });
  },

  setTaskObjectiveUncomplete(this: UserState, objectiveId: string) {
    updateObjective(this, 'taskObjectives', objectiveId, { complete: false });
  },

  toggleTaskObjectiveComplete(this: UserState, objectiveId: string) {
    const isComplete = getters.isTaskObjectiveComplete(this)(objectiveId);
    if (isComplete) {
      actions.setTaskObjectiveUncomplete.call(this, objectiveId);
    } else {
      actions.setTaskObjectiveComplete.call(this, objectiveId);
    }
  },

  setHideoutPartComplete(this: UserState, objectiveId: string) {
    updateObjective(this, 'hideoutParts', objectiveId, { complete: true, timestamp: Date.now() });
  },

  setHideoutPartUncomplete(this: UserState, objectiveId: string) {
    updateObjective(this, 'hideoutParts', objectiveId, { complete: false });
  },

  toggleHideoutPartComplete(this: UserState, objectiveId: string) {
    const isComplete = getters.isHideoutPartComplete(this)(objectiveId);
    if (isComplete) {
      actions.setHideoutPartUncomplete.call(this, objectiveId);
    } else {
      actions.setHideoutPartComplete.call(this, objectiveId);
    }
  },

  setHideoutModuleComplete(this: UserState, hideoutId: string) {
    updateObjective(this, 'hideoutModules', hideoutId, { complete: true, timestamp: Date.now() });
  },

  setHideoutModuleUncomplete(this: UserState, hideoutId: string) {
    updateObjective(this, 'hideoutModules', hideoutId, { complete: false });
  },

  toggleHideoutModuleComplete(this: UserState, hideoutId: string) {
    const isComplete = getters.isHideoutModuleComplete(this)(hideoutId);
    if (isComplete) {
      actions.setHideoutModuleUncomplete.call(this, hideoutId);
    } else {
      actions.setHideoutModuleComplete.call(this, hideoutId);
    }
  },
} as const;

export type UserActions = typeof actions;
