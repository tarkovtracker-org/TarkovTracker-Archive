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

interface TraderProgress {
  loyaltyLevel: number;
  standing: number;
}

export interface UserProgressData {
  level: number;
  pmcFaction: 'USEC' | 'BEAR';
  displayName: string | null;
  taskObjectives: { [objectiveId: string]: TaskObjective };
  taskCompletions: { [taskId: string]: TaskCompletion };
  hideoutParts: { [objectiveId: string]: HideoutPart };
  hideoutModules: { [hideoutId: string]: HideoutModule };
  traderStandings: { [traderId: string]: TraderProgress };
}

export interface UserState {
  currentGameMode: GameMode;
  gameEdition: number;
  pvp: UserProgressData;
  pve: UserProgressData;
}

const defaultProgressData: UserProgressData = {
  level: 1,
  pmcFaction: 'USEC',
  displayName: null,
  taskObjectives: {},
  taskCompletions: {},
  hideoutParts: {},
  hideoutModules: {},
  traderStandings: {},
};

export const defaultState: UserState = {
  currentGameMode: 'pvp',
  gameEdition: 1,
  pvp: JSON.parse(JSON.stringify(defaultProgressData)),
  pve: JSON.parse(JSON.stringify(defaultProgressData)),
};

// Migration function to convert legacy data structure to new gamemode-aware structure
export function migrateToGameModeStructure(legacyData: unknown): UserState {
  // If already in new format and properly structured, return as-is
  if (
    legacyData &&
    typeof legacyData === 'object' &&
    'currentGameMode' in legacyData &&
    'pvp' in legacyData &&
    'pve' in legacyData
  ) {
    const data = legacyData as Record<string, unknown>;
    // Ensure the structure is complete
    const pvpData = {
      ...defaultProgressData,
      ...(data.pvp as Record<string, unknown>),
    };
    const pveData = {
      ...defaultProgressData,
      ...(data.pve as Record<string, unknown>),
    };

    return {
      currentGameMode: (data.currentGameMode as GameMode) || 'pvp',
      gameEdition: (data.gameEdition as number) || defaultState.gameEdition,
      pvp: pvpData,
      pve: pveData,
    };
  }

  // Handle partial migration case - has currentGameMode but missing pvp/pve structure
  if (
    legacyData &&
    typeof legacyData === 'object' &&
    'currentGameMode' in legacyData &&
    !('pvp' in legacyData) &&
    !('pve' in legacyData)
  ) {
    const data = legacyData as Record<string, unknown>;
    // This is a partially migrated state, use the existing data as legacy format
    const migratedProgressData: UserProgressData = {
      level: (data.level as number) || defaultProgressData.level,
      pmcFaction: (data.pmcFaction as 'USEC' | 'BEAR') || defaultProgressData.pmcFaction,
      displayName: (data.displayName as string) || defaultProgressData.displayName,
      taskCompletions: (data.taskCompletions as UserProgressData['taskCompletions']) || {},
      taskObjectives: (data.taskObjectives as UserProgressData['taskObjectives']) || {},
      hideoutParts: (data.hideoutParts as UserProgressData['hideoutParts']) || {},
      hideoutModules: (data.hideoutModules as UserProgressData['hideoutModules']) || {},
      traderStandings: (data.traderStandings as UserProgressData['traderStandings']) || {},
    };

    return {
      currentGameMode: data.currentGameMode as GameMode,
      gameEdition: (data.gameEdition as number) || defaultState.gameEdition,
      pvp: migratedProgressData,
      pve: JSON.parse(JSON.stringify(defaultProgressData)),
    };
  }

  // Create new structure with migrated data from legacy format
  const data = (legacyData as Record<string, unknown>) || {};
  const migratedProgressData: UserProgressData = {
    level: (data.level as number) || defaultProgressData.level,
    pmcFaction: (data.pmcFaction as 'USEC' | 'BEAR') || defaultProgressData.pmcFaction,
    displayName: (data.displayName as string) || defaultProgressData.displayName,
    taskCompletions: (data.taskCompletions as UserProgressData['taskCompletions']) || {},
    taskObjectives: (data.taskObjectives as UserProgressData['taskObjectives']) || {},
    hideoutParts: (data.hideoutParts as UserProgressData['hideoutParts']) || {},
    hideoutModules: (data.hideoutModules as UserProgressData['hideoutModules']) || {},
    traderStandings: (data.traderStandings as UserProgressData['traderStandings']) || {},
  };

  return {
    currentGameMode: 'pvp', // Default to PvP for existing users
    gameEdition: (data.gameEdition as number) || defaultState.gameEdition,
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
      return legacyState as unknown as UserProgressData; // Cast to UserProgressData for legacy compatibility
    }
    // Otherwise return default structure
    return {
      level: 1,
      pmcFaction: 'USEC',
      displayName: null,
      taskCompletions: {},
      taskObjectives: {},
      hideoutParts: {},
      hideoutModules: {},
      traderStandings: {},
    };
  }
  return state[state.currentGameMode];
};

// Simplified getters using arrow functions
export const getters = {
  getCurrentGameMode: (state: UserState) => () => state.currentGameMode || 'pvp',

  playerLevel: (state: UserState) => () => getCurrentData(state).level ?? 1,

  getGameEdition: (state: UserState) => () => state.gameEdition ?? 1,

  getPMCFaction: (state: UserState) => () => getCurrentData(state).pmcFaction ?? 'USEC',

  getDisplayName: (state: UserState) => () => {
    const currentData = getCurrentData(state);
    return currentData.displayName === '' ? null : (currentData.displayName ?? null);
  },

  getObjectiveCount: (state: UserState) => (objectiveId: string) =>
    getCurrentData(state)?.taskObjectives?.[objectiveId]?.count ?? 0,

  getHideoutPartCount: (state: UserState) => (objectiveId: string) =>
    getCurrentData(state)?.hideoutParts?.[objectiveId]?.count ?? 0,

  getTraderLoyaltyLevel: (state: UserState) => (traderId: string) => {
    const record = getCurrentData(state)?.traderStandings?.[traderId];
    return record?.loyaltyLevel ?? 0;
  },

  getTraderStanding: (state: UserState) => (traderId: string) => {
    const record = getCurrentData(state)?.traderStandings?.[traderId];
    return record?.standing ?? 0;
  },

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
    this.gameEdition = edition;
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

  setTraderLoyaltyLevel(this: UserState, traderId: string, level: number) {
    const currentData = getCurrentData(this);
    if (!currentData.traderStandings) {
      currentData.traderStandings = {};
    }
    const normalizedLevel = Math.max(0, Math.min(10, Math.round(level ?? 0)));
    const existing = currentData.traderStandings[traderId] || { loyaltyLevel: 0, standing: 0 };
    currentData.traderStandings[traderId] = {
      loyaltyLevel: normalizedLevel,
      standing: existing.standing ?? 0,
    };
  },

  setTraderStanding(this: UserState, traderId: string, standing: number) {
    const currentData = getCurrentData(this);
    if (!currentData.traderStandings) {
      currentData.traderStandings = {};
    }
    const numericStanding = Number(standing);
    const normalizedStanding = Number.isFinite(numericStanding)
      ? Math.max(-10, Math.min(10, numericStanding))
      : 0;
    const existing = currentData.traderStandings[traderId] || { loyaltyLevel: 0, standing: 0 };
    currentData.traderStandings[traderId] = {
      loyaltyLevel: existing.loyaltyLevel ?? 0,
      standing: normalizedStanding,
    };
  },
} as const;

export type UserActions = typeof actions;
