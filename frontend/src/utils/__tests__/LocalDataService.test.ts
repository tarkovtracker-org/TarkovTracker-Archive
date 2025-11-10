import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hasLocalData,
  getLocalData,
  backupLocalProgress,
  saveLocalProgress,
  saveLocalUserState,
  LOCAL_PROGRESS_KEY,
  LOCAL_USER_STATE_KEY,
} from '@/utils/migration/LocalDataService';
import type { ProgressData } from '@/utils/migration/DataMigrationTypes';

// Mock the encryption module to avoid dealing with Web Crypto API in tests
vi.mock('@/utils/encryption', () => ({
  encryptData: vi.fn(async (data: string) => btoa(data)), // Simple base64 encoding for tests
  decryptData: vi.fn(async (data: string) => atob(data)), // Simple base64 decoding for tests
  isEncrypted: vi.fn((data: string) => {
    // Check if it looks like base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(data);
  }),
}));

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
  describe('hasLocalData', () => {
    it('returns false when no data exists', async () => {
      expect(await hasLocalData()).toBe(false);
    });
    it('returns false when data is empty object', async () => {
      localStorageMock[LOCAL_USER_STATE_KEY] = btoa('{}');
      expect(await hasLocalData()).toBe(false);
    });
    it('returns true when progress data exists with level > 1', async () => {
      const data: ProgressData = { level: 2 };
      localStorageMock[LOCAL_USER_STATE_KEY] = btoa(JSON.stringify(data));
      expect(await hasLocalData()).toBe(true);
    });
    it('returns true when task completions exist', async () => {
      const data: ProgressData = { level: 1, taskCompletions: { task1: { complete: true } } };
      localStorageMock[LOCAL_USER_STATE_KEY] = btoa(JSON.stringify(data));
      expect(await hasLocalData()).toBe(true);
    });
    it('returns false on parse error', async () => {
      localStorageMock[LOCAL_USER_STATE_KEY] = 'invalid json';
      expect(await hasLocalData()).toBe(false);
    });
  });
  describe('getLocalData', () => {
    it('returns null when no data exists', async () => {
      expect(await getLocalData()).toBeNull();
    });
    it('returns parsed data when it exists', async () => {
      const data: ProgressData = { level: 5, taskCompletions: { task1: { complete: true } } };
      localStorageMock[LOCAL_USER_STATE_KEY] = btoa(JSON.stringify(data));
      const result = await getLocalData();
      expect(result).toEqual(data);
    });
    it('returns null for empty object', async () => {
      localStorageMock[LOCAL_USER_STATE_KEY] = btoa('{}');
      expect(await getLocalData()).toBeNull();
    });
  });
  describe('Sensitive Field Removal for Privacy Protection', () => {
    it('sanitizes sensitive fields when backing up progress', async () => {
      const sensitiveData: ProgressData = {
        level: 10,
        sourceUserId: 'external-user-123',
        sourceDomain: 'https://api.example.com/v2/progress',
        taskCompletions: { task1: { complete: true } },
      };
      await backupLocalProgress(sensitiveData);
      // Find the backup key
      const backupKeys = Object.keys(localStorageMock).filter((k) =>
        k.startsWith('progress_backup_')
      );
      expect(backupKeys.length).toBe(1);
      const storedData = JSON.parse(atob(localStorageMock[backupKeys[0]]));
      expect(storedData.level).toBe(10);
      expect(storedData.taskCompletions).toEqual({ task1: { complete: true } });
      expect(storedData.sourceUserId).toBeUndefined();
      expect(storedData.sourceDomain).toBeUndefined();
    });
    it('sanitizes sensitive fields when saving local progress', async () => {
      const sensitiveData: ProgressData = {
        level: 15,
        sourceUserId: 'external-user-456',
        sourceDomain: 'https://tarkovtracker.io/api/v2/progress',
        hideoutModules: { module1: { complete: true } },
      };
      await saveLocalProgress(sensitiveData);
      const storedData = JSON.parse(atob(localStorageMock[LOCAL_PROGRESS_KEY]));
      expect(storedData.level).toBe(15);
      expect(storedData.hideoutModules).toEqual({ module1: { complete: true } });
      expect(storedData.sourceUserId).toBeUndefined();
      expect(storedData.sourceDomain).toBeUndefined();
    });
    it('sanitizes sensitive fields when saving user state', async () => {
      const sensitiveState: ProgressData = {
        level: 20,
        displayName: 'TestUser',
        sourceUserId: 'external-789',
        sourceDomain: 'https://api.tarkovtracker.io/api/v2/progress',
      };
      await saveLocalUserState(sensitiveState);
      const storedState = JSON.parse(atob(localStorageMock[LOCAL_USER_STATE_KEY]));
      expect(storedState.level).toBe(20);
      expect(storedState.displayName).toBe('TestUser');
      expect(storedState.sourceUserId).toBeUndefined();
      expect(storedState.sourceDomain).toBeUndefined();
    });
    it('preserves all other fields when sanitizing', async () => {
      const data: ProgressData = {
        level: 25,
        gameEdition: 'EOD',
        pmcFaction: 'USEC',
        displayName: 'Player1',
        sourceUserId: 'should-be-removed',
        sourceDomain: 'https://should-be-removed.com',
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
      await saveLocalProgress(data);
      const stored = JSON.parse(atob(localStorageMock[LOCAL_PROGRESS_KEY]));
      expect(stored.level).toBe(25);
      expect(stored.gameEdition).toBe('EOD');
      expect(stored.pmcFaction).toBe('USEC');
      expect(stored.displayName).toBe('Player1');
      expect(stored.taskCompletions).toEqual(data.taskCompletions);
      expect(stored.hideoutModules).toEqual(data.hideoutModules);
      expect(stored.traderStandings).toEqual(data.traderStandings);
      expect(stored.imported).toBe(true);
      expect(stored.importedFromApi).toBe(true);
      // But sensitive fields should be removed
      expect(stored.sourceUserId).toBeUndefined();
      expect(stored.sourceDomain).toBeUndefined();
    });
    it('handles non-object data gracefully in saveLocalProgress', async () => {
      await saveLocalProgress('string data');
      expect(atob(localStorageMock[LOCAL_PROGRESS_KEY])).toBe('"string data"');
    });
    it('handles null data gracefully', async () => {
      await saveLocalProgress(null);
      expect(atob(localStorageMock[LOCAL_PROGRESS_KEY])).toBe('null');
    });
  });
  describe('Error Handling', () => {
    it('handles localStorage errors gracefully when backing up', async () => {
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      global.localStorage.setItem = mockSetItem;
      const data: ProgressData = { level: 10 };
      // Should not throw
      await expect(backupLocalProgress(data)).resolves.not.toThrow();
    });
    it('handles localStorage errors gracefully when saving progress', async () => {
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      global.localStorage.setItem = mockSetItem;
      const data: ProgressData = { level: 10 };
      // Should not throw
      await expect(saveLocalProgress(data)).resolves.not.toThrow();
    });
  });
});
