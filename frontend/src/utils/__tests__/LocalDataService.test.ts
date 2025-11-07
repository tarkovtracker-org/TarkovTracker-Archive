import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import {
  hasLocalData,
  getLocalData,
  backupLocalProgress,
  saveLocalProgress,
  saveLocalUserState,
  LOCAL_PROGRESS_KEY,
  LOCAL_USER_STATE_KEY,
} from '../LocalDataService';
import type { ProgressData } from '../DataMigrationTypes';

const originalLocalStorage = globalThis.localStorage;

describe('LocalDataService', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    if (originalLocalStorage) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete (globalThis as any).localStorage;
    }
  });

  describe('hasLocalData', () => {
    it('returns false when no data exists', () => {
      expect(hasLocalData()).toBe(false);
    });

    it('returns false when data is empty object', () => {
      localStorageMock[LOCAL_USER_STATE_KEY] = '{}';
      expect(hasLocalData()).toBe(false);
    });

    it('returns true when progress data exists with level > 1', () => {
      const data: ProgressData = { level: 2 };
      localStorageMock[LOCAL_USER_STATE_KEY] = JSON.stringify(data);
      expect(hasLocalData()).toBe(true);
    });

    it('returns true when task completions exist', () => {
      const data: ProgressData = { level: 1, taskCompletions: { task1: { complete: true } } };
      localStorageMock[LOCAL_USER_STATE_KEY] = JSON.stringify(data);
      expect(hasLocalData()).toBe(true);
    });

    it('returns false on parse error', () => {
      localStorageMock[LOCAL_USER_STATE_KEY] = 'invalid json';
      expect(hasLocalData()).toBe(false);
    });
  });

  describe('getLocalData', () => {
    it('returns null when no data exists', () => {
      expect(getLocalData()).toBeNull();
    });

    it('returns parsed data when it exists', () => {
      const data: ProgressData = { level: 5, taskCompletions: { task1: { complete: true } } };
      localStorageMock[LOCAL_USER_STATE_KEY] = JSON.stringify(data);
      const result = getLocalData();
      expect(result).toEqual(data);
    });

    it('returns null for empty object', () => {
      localStorageMock[LOCAL_USER_STATE_KEY] = '{}';
      expect(getLocalData()).toBeNull();
    });
  });

  describe('Data Persistence', () => {
    it('persists all fields when backing up progress', () => {
      const progressData: ProgressData = {
        level: 10,
        sourceUserId: 'external-user-123',
        sourceDomain: 'https://api.example.com/v2/progress',
        taskCompletions: { task1: { complete: true } },
      };

      backupLocalProgress(progressData);

      // Find the backup key
      const backupKeys = Object.keys(localStorageMock).filter((k) =>
        k.startsWith('progress_backup_')
      );
      expect(backupKeys.length).toBe(1);

      const storedData = JSON.parse(localStorageMock[backupKeys[0]]);
      expect(storedData.level).toBe(10);
      expect(storedData.taskCompletions).toEqual({ task1: { complete: true } });
      // Implementation currently stores all fields as-is
      expect(storedData.sourceUserId).toBe('external-user-123');
      expect(storedData.sourceDomain).toBe('https://api.example.com/v2/progress');
    });

    it('persists all fields when saving local progress', () => {
      const progressData: ProgressData = {
        level: 15,
        sourceUserId: 'external-user-456',
        sourceDomain: 'https://tarkovtracker.io/api/v2/progress',
        hideoutModules: { module1: { complete: true } },
      };

      saveLocalProgress(progressData);

      const storedData = JSON.parse(localStorageMock[LOCAL_PROGRESS_KEY]);
      expect(storedData.level).toBe(15);
      expect(storedData.hideoutModules).toEqual({ module1: { complete: true } });
      // Implementation currently stores all fields as-is
      expect(storedData.sourceUserId).toBe('external-user-456');
      expect(storedData.sourceDomain).toBe('https://tarkovtracker.io/api/v2/progress');
    });

    it('persists all fields when saving user state', () => {
      const userState: ProgressData = {
        level: 20,
        displayName: 'TestUser',
        sourceUserId: 'external-789',
        sourceDomain: 'https://api.tarkovtracker.io/api/v2/progress',
      };

      saveLocalUserState(userState);

      const storedState = JSON.parse(localStorageMock[LOCAL_USER_STATE_KEY]);
      expect(storedState.level).toBe(20);
      expect(storedState.displayName).toBe('TestUser');
      // Implementation currently stores all fields as-is
      expect(storedState.sourceUserId).toBe('external-789');
      expect(storedState.sourceDomain).toBe('https://api.tarkovtracker.io/api/v2/progress');
    });

    it('preserves all fields including metadata', () => {
      const data: ProgressData = {
        level: 25,
        gameEdition: 'EOD',
        pmcFaction: 'USEC',
        displayName: 'Player1',
        sourceUserId: 'user-metadata',
        sourceDomain: 'https://api.example.com',
        taskCompletions: {
          task1: { complete: true, timestamp: 1234567890 },
          task2: { complete: false, failed: true },
        },
        hideoutModules: { module1: { complete: true, timestamp: 9876543210 } },
        traderStandings: { trader1: 3 },
        lastUpdated: '2024-01-01T00:00:00Z',
        imported: true,
        importedFromApi: true,
      };

      saveLocalProgress(data);

      const stored = JSON.parse(localStorageMock[LOCAL_PROGRESS_KEY]);
      expect(stored.level).toBe(25);
      expect(stored.gameEdition).toBe('EOD');
      expect(stored.pmcFaction).toBe('USEC');
      expect(stored.displayName).toBe('Player1');
      expect(stored.taskCompletions).toEqual(data.taskCompletions);
      expect(stored.hideoutModules).toEqual(data.hideoutModules);
      expect(stored.traderStandings).toEqual(data.traderStandings);
      expect(stored.imported).toBe(true);
      expect(stored.importedFromApi).toBe(true);
      // Implementation currently stores metadata fields as-is
      expect(stored.sourceUserId).toBe('user-metadata');
      expect(stored.sourceDomain).toBe('https://api.example.com');
    });

    it('handles non-object data gracefully in saveLocalProgress', () => {
      saveLocalProgress('string data');
      expect(localStorageMock[LOCAL_PROGRESS_KEY]).toBe('"string data"');
    });

    it('handles null data gracefully', () => {
      saveLocalProgress(null);
      expect(localStorageMock[LOCAL_PROGRESS_KEY]).toBe('null');
    });
  });

  describe('Error Handling', () => {
    it('handles localStorage errors gracefully when backing up', () => {
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      global.localStorage.setItem = mockSetItem;

      const data: ProgressData = { level: 10 };
      // Should not throw
      expect(() => backupLocalProgress(data)).not.toThrow();
    });

    it('handles localStorage errors gracefully when saving progress', () => {
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      global.localStorage.setItem = mockSetItem;

      const data: ProgressData = { level: 10 };
      // Should not throw
      expect(() => saveLocalProgress(data)).not.toThrow();
    });
  });
});
