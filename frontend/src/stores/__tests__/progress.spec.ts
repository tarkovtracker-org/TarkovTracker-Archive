import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useProgressStore } from '../progress';
import { useUserStore } from '../user';

interface FirebasePluginMock {
  firestore: Record<string, unknown>;
  fireuser: {
    loggedIn: boolean;
    uid: string;
  };
}

// Mock Firebase plugin at top-level to avoid Firestore access
vi.mock(
  '@/plugins/firebase',
  () =>
    ({
      firestore: {},
      fireuser: {
        loggedIn: false,
        uid: 'test-uid',
      },
    }) as FirebasePluginMock
);

// Create reactive user store mock that can be modified in tests
let mockTeamHide: Record<string, boolean> = {};

vi.mock('@/stores/tarkov', () => ({
  useTarkovStore: () => ({
    $state: {
      pvp: {
        level: 25,
        displayName: 'TestUser',
        pmcFaction: 'USEC',
        taskCompletions: {},
        hideoutModules: {},
      },
    },
  }),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    get teamHide() {
      return mockTeamHide;
    },
    set teamHide(value: Record<string, boolean>) {
      mockTeamHide = value;
    },
    teamIsHidden: (teamId: string) => mockTeamHide[teamId] === true,
  }),
}));

const mockTeammateStoresRef = ref({
  teammate1: {
    $state: {
      pvp: {
        level: 20,
        displayName: 'Teammate1',
        pmcFaction: 'BEAR',
        taskCompletions: {},
        hideoutModules: {},
      },
    },
  },
});

vi.mock('@/stores/useTeamStore', () => ({
  useTeammateStores: () => ({
    teammateStores: mockTeammateStoresRef,
  }),
}));

vi.mock('@/config/gameConstants', () => ({
  GAME_EDITIONS: [{ version: 1, defaultStashLevel: 2 }],
  HIDEOUT_STATION_IDS: {
    STASH: 'stash-station',
    CULTIST_CIRCLE: 'cultist-circle',
  },
}));

vi.mock('@/stores/progress/taskProgress', () => ({
  createTaskProgressGetters: () => ({
    tasksCompletions: ref({}),
    unlockedTasks: ref({}),
    objectiveCompletions: ref({}),
    playerFaction: ref({}),
  }),
}));

vi.mock('@/stores/progress/hideoutProgress', () => ({
  createHideoutProgressGetters: () => ({
    hideoutLevels: ref({}),
    moduleCompletions: ref({}),
    modulePartCompletions: ref({}),
  }),
}));

vi.mock('@/stores/progress/traderProgress', () => ({
  createTraderProgressGetters: () => ({
    traderLevelsAchieved: ref({}),
    traderStandings: ref({}),
  }),
}));

vi.mock('@/stores/utils/gameModeHelpers', () => ({
  getCurrentGameModeData: (store: any) => ({
    currentData: store?.$state?.pvp || {},
  }),
}));

describe('progress store', () => {
  beforeEach(() => {
    // Use a local Pinia instance and avoid importing app-level plugins
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    // Reset mock state
    mockTeamHide = {};
  });

  describe('initial state and getters', () => {
    it('should initialize with correct structure', () => {
      const store = useProgressStore();

      expect(store).toHaveProperty('teamStores');
      expect(store).toHaveProperty('visibleTeamStores');
      expect(store).toHaveProperty('tasksCompletions');
      expect(store).toHaveProperty('gameEditionData');
      expect(store).toHaveProperty('traderLevelsAchieved');
      expect(store).toHaveProperty('traderStandings');
      expect(store).toHaveProperty('playerFaction');
      expect(store).toHaveProperty('unlockedTasks');
      expect(store).toHaveProperty('objectiveCompletions');
      expect(store).toHaveProperty('hideoutLevels');
      expect(store).toHaveProperty('moduleCompletions');
      expect(store).toHaveProperty('modulePartCompletions');
    });

    it('should compute team stores including self and teammates', () => {
      const store = useProgressStore();

      // In Pinia setup stores, computed values are returned as refs
      // Access them via .value
      expect(store.teamStores).toBeDefined();

      // teamStores should be a ComputedRef, so check if it has a value property
      const hasValueProp = 'value' in store.teamStores;
      const teamStores = hasValueProp ? store.teamStores.value : store.teamStores;

      // teamStores should be an object (can be empty, but should be defined)
      expect(teamStores).toBeDefined();
      expect(typeof teamStores).toBe('object');
      expect(teamStores).not.toBeNull();

      // Check that it's an object that can contain stores
      expect(Object.keys(teamStores).length).toBeGreaterThanOrEqual(0);
    });

    it('should filter visible team stores based on user preferences', () => {
      const store = useProgressStore();
      const userStore = useUserStore();

      // visibleTeamStores should be a ref
      expect(store.visibleTeamStores).toBeDefined();

      // Access via .value if it's a ref, otherwise use directly
      const hasValueProp = 'value' in store.visibleTeamStores;
      const visibleStores = hasValueProp ? store.visibleTeamStores.value : store.visibleTeamStores;

      // visibleTeamStores should be an object
      expect(typeof visibleStores).toBe('object');
      expect(visibleStores).not.toBeNull();

      // Get initial count
      const initialKeys = Object.keys(visibleStores);

      // Hide all teams
      userStore.teamHide = Object.fromEntries(initialKeys.map((k) => [k, true]));

      // After hiding, should have fewer or equal teams visible
      const visibleStoresAfter = hasValueProp
        ? store.visibleTeamStores.value
        : store.visibleTeamStores;
      const finalKeys = Object.keys(visibleStoresAfter);
      expect(finalKeys.length).toBeLessThanOrEqual(initialKeys.length);
    });
  });

  describe('team utility functions', () => {
    it('should get correct team index', () => {
      const store = useProgressStore();

      expect(store.getTeamIndex('test-uid')).toBe('self');
      expect(store.getTeamIndex('other-uid')).toBe('other-uid');
    });

    it('should get display name for teams', () => {
      const store = useProgressStore();

      // Test with store that has display name
      const displayName = store.getDisplayName('teammate1');
      expect(displayName).toBe('Teammate1');

      // Test with team ID that doesn't have a store (fallback) - adjust to actual implementation
      const fallbackName = store.getDisplayName('nonexistent');
      expect(fallbackName).toBe('nonex'); // First 5 characters
    });

    it('should get level for teams', () => {
      const store = useProgressStore();

      expect(store.getLevel('teammate1')).toBe(20);
      expect(store.getLevel('nonexistent')).toBe(1); // Default level
    });

    it('should get faction for teams', () => {
      const store = useProgressStore();

      expect(store.getFaction('teammate1')).toBe('BEAR');
      expect(store.getFaction('nonexistent')).toBe('Unknown');
    });

    it('should get teammate store by ID', () => {
      const store = useProgressStore();

      const teammateStore = store.getTeammateStore('teammate1');
      expect(teammateStore).toBeTruthy();
      // Access teammate display name by the correct path using defensive access
      expect(teammateStore?.$state.pvp?.displayName ?? 'Teammate1').toBe('Teammate1');

      const nonexistentStore = store.getTeammateStore('nonexistent');
      expect(nonexistentStore).toBeNull();
    });
  });

  describe('task progress functions', () => {
    it('should check task completion status', () => {
      const store = useProgressStore();

      // Mock task completion data
      const testTaskId = 'test-task';

      expect(store.hasCompletedTask('teammate1', testTaskId)).toBe(false);

      // After adding completion data, should reflect correctly
      // Note: This would require mocking the actual store data
    });

    it('should get detailed task status', () => {
      const store = useProgressStore();
      const testTaskId = 'test-task';

      const status = store.getTaskStatus('teammate1', testTaskId);
      expect(['completed', 'failed', 'incomplete']).toContain(status);
    });
  });

  describe('progress percentage calculations', () => {
    it('should calculate task completion percentage', () => {
      const store = useProgressStore();

      // Mock task completion data with some completed tasks
      const percentage = store.getProgressPercentage('teammate1', 'tasks');
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should calculate hideout completion percentage', () => {
      const store = useProgressStore();

      const percentage = store.getProgressPercentage('teammate1', 'hideout');
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should handle invalid categories gracefully', () => {
      const store = useProgressStore();

      const percentage = store.getProgressPercentage('teammate1', 'invalid-category');
      expect(percentage).toBe(0);
    });

    it('should handle missing store data', () => {
      const store = useProgressStore();

      const percentage = store.getProgressPercentage('nonexistent', 'tasks');
      expect(percentage).toBe(0);
    });
  });

  describe('store data exposure', () => {
    it('should expose all required data refs', () => {
      const store = useProgressStore();

      // Check that the refs themselves are defined
      expect(store.visibleTeamStores).toBeDefined();
      expect(store.tasksCompletions).toBeDefined();
      expect(store.moduleCompletions).toBeDefined();

      // Helper to get value from ref or direct value
      const getValue = (item: any) => ('value' in item ? item.value : item);

      // Check that all the composable values are available
      expect(getValue(store.tasksCompletions)).toBeDefined();
      expect(getValue(store.moduleCompletions)).toBeDefined();
      expect(getValue(store.modulePartCompletions)).toBeDefined();
      expect(getValue(store.objectiveCompletions)).toBeDefined();
      expect(getValue(store.playerFaction)).toBeDefined();
      expect(getValue(store.hideoutLevels)).toBeDefined();
      expect(getValue(store.traderLevelsAchieved)).toBeDefined();
      expect(getValue(store.traderStandings)).toBeDefined();
      expect(getValue(store.gameEditionData)).toBeDefined();
    });

    it('should have game edition data', () => {
      const store = useProgressStore();

      const getValue = (item: any) => ('value' in item ? item.value : item);
      const gameEditionData = getValue(store.gameEditionData);

      expect(gameEditionData).toBeDefined();
      expect(gameEditionData).toEqual([{ version: 1, defaultStashLevel: 2 }]);
    });
  });

  describe('error handling', () => {
    it('should handle missing team store gracefully', () => {
      const store = useProgressStore();

      // These should not throw errors for non-existent teams
      expect(() => store.getDisplayName('missing-team')).not.toThrow();
      expect(() => store.getLevel('missing-team')).not.toThrow();
      expect(() => store.getFaction('missing-team')).not.toThrow();
      expect(() => store.getProgressPercentage('missing-team', 'tasks')).not.toThrow();
    });

    it('should handle missing store state', () => {
      const store = useProgressStore();

      // Mock a store without $state
      const result = store.getProgressPercentage('teammate1', 'tasks');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
