import { describe, it, expect } from 'vitest';
import { extractGameModeData } from '../../../src/progress/game-modes';
import type { UserProgressData, ProgressDataStructure } from '../../../src/progress/constants';

describe('game-modes module', () => {
  describe('extractGameModeData', () => {
    it('should handle null/undefined input', () => {
      expect(extractGameModeData(null)).toBeNull();
      expect(extractGameModeData(undefined)).toBeNull();
    });

    it('should extract game mode data from modern structure', () => {
      const data: ProgressDataStructure = {
        currentGameMode: 'pvp',
        pvp: {
          displayName: 'PVP User',
          level: 25,
          gameEdition: 4,
        },
        pve: {
          displayName: 'PVE User',
          level: 30,
          gameEdition: 6,
        },
      };

      const pvpResult = extractGameModeData(data, 'pvp');
      const pveResult = extractGameModeData(data, 'pve');

      expect(pvpResult).toEqual({
        displayName: 'PVP User',
        level: 25,
        gameEdition: 4,
      });

      expect(pveResult).toEqual({
        displayName: 'PVE User',
        level: 30,
        gameEdition: 6,
      });
    });

    it('should default to pvp mode when not specified', () => {
      const data: ProgressDataStructure = {
        currentGameMode: 'pvp',
        pvp: {
          displayName: 'PVP User',
          level: 25,
        },
      };

      const result = extractGameModeData(data);
      expect(result?.displayName).toBe('PVP User');
    });

    it('should default to currentGameMode when game mode not provided', () => {
      const data: ProgressDataStructure = {
        currentGameMode: 'pve',
        pvp: {
          displayName: 'PVP User',
          level: 25,
        },
        pve: {
          displayName: 'PVE User',
          level: 30,
        },
      };

      const result = extractGameModeData(data);
      expect(result?.displayName).toBe('PVE User');
    });

    it('should handle partial migration case', () => {
      const data = {
        currentGameMode: 'pvp',
        displayName: 'Legacy User',
        level: 15,
        gameEdition: 3,
        pmcFaction: 'BEAR',
      };

      const result = extractGameModeData(data);

      expect(result).toEqual({
        displayName: 'Legacy User',
        level: 15,
        gameEdition: 3,
        pmcFaction: 'BEAR',
      });
    });

    it('should handle legacy format (no game mode structure)', () => {
      const legacyData: UserProgressData = {
        displayName: 'Legacy User',
        level: 10,
        gameEdition: 2,
        pmcFaction: 'USEC',
        taskCompletions: {
          task1: { complete: true },
        },
      };

      const result = extractGameModeData(legacyData);

      expect(result).toEqual(legacyData);
    });

    it('should return null when requested mode does not exist', () => {
      const data: ProgressDataStructure = {
        currentGameMode: 'pvp',
        pvp: {
          displayName: 'PVP User',
        },
      };

      const result = extractGameModeData(data, 'pve');
      expect(result).toBeNull();
    });

    it('should handle empty object structure', () => {
      const data = {};
      const result = extractGameModeData(data);
      expect(result).toEqual({});
    });

    it('should prefer explicit game mode over currentGameMode', () => {
      const data: ProgressDataStructure = {
        currentGameMode: 'pvp',
        pvp: {
          displayName: 'PVP User',
          level: 25,
        },
        pve: {
          displayName: 'PVE User',
          level: 30,
        },
      };

      // Even though currentGameMode is 'pvp', we explicitly request 'pve'
      const result = extractGameModeData(data, 'pve');
      expect(result?.displayName).toBe('PVE User');
    });

    it('should handle missing game mode data gracefully', () => {
      const data: ProgressDataStructure = {
        currentGameMode: 'pvp',
        // pvp and pve are missing
      };

      const result = extractGameModeData(data, 'pvp');
      expect(result).toBeNull();
    });
  });
});
