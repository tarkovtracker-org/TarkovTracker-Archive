import { describe, it, expect } from 'vitest';
import {
  formatObjective,
  getGameEditionFromData,
  initializeBaseProgress,
  processHideoutStations,
} from '../../../src/progress/formatting';
import { STASH_STATION_ID, CULTIST_CIRCLE_STATION_ID } from '../../../src/progress/constants';
import type {
  FormattedProgress,
  HideoutData,
  UserProgressData,
} from '../../../src/progress/constants';

describe('formatting module', () => {
  describe('formatObjective', () => {
    it('should handle empty/undefined data', () => {
      expect(formatObjective(null)).toEqual([]);
      expect(formatObjective(undefined)).toEqual([]);
      expect(formatObjective({})).toEqual([]);
    });

    it('should format basic objective data', () => {
      const rawData = {
        obj1: { complete: true },
        obj2: { complete: false },
      };

      const result = formatObjective(rawData);
      expect(result).toEqual([
        { id: 'obj1', complete: true },
        { id: 'obj2', complete: false },
      ]);
    });

    it('should include count when requested', () => {
      const rawData = {
        obj1: { complete: true, count: 5 },
        obj2: { complete: false, count: 10 },
      };

      const result = formatObjective(rawData, true);
      expect(result).toEqual([
        { id: 'obj1', complete: true, count: 5 },
        { id: 'obj2', complete: false, count: 10 },
      ]);
    });

    it('should handle invalid and failed flags', () => {
      const rawData = {
        obj1: { complete: true, invalid: true },
        obj2: { complete: true, failed: true },
        obj3: { complete: false, invalid: true, failed: true },
      };

      const result = formatObjective(rawData, false, true);
      expect(result).toEqual([
        { id: 'obj1', complete: false, invalid: true },
        { id: 'obj2', complete: true, failed: true },
        { id: 'obj3', complete: false, invalid: true, failed: true },
      ]);
    });

    it('should ensure invalid items are never marked complete', () => {
      const rawData = {
        obj1: { complete: true, invalid: true },
      };

      const result = formatObjective(rawData, false, true);
      expect(result[0].complete).toBe(false);
    });
  });

  describe('getGameEditionFromData', () => {
    it('should return undefined for invalid input', () => {
      expect(getGameEditionFromData(null)).toBeUndefined();
      expect(getGameEditionFromData(undefined)).toBeUndefined();
      expect(getGameEditionFromData('string')).toBeUndefined();
      expect(getGameEditionFromData([])).toBeUndefined();
    });

    it('should extract numeric game edition', () => {
      expect(getGameEditionFromData({ gameEdition: 4 })).toBe(4);
    });

    it('should parse string game edition', () => {
      expect(getGameEditionFromData({ gameEdition: '5' })).toBe(5);
    });

    it('should return undefined for invalid game edition', () => {
      expect(getGameEditionFromData({ gameEdition: 'invalid' })).toBeUndefined();
      expect(getGameEditionFromData({ gameEdition: NaN })).toBeUndefined();
      expect(getGameEditionFromData({ gameEdition: Infinity })).toBeUndefined();
    });
  });

  describe('initializeBaseProgress', () => {
    it('should initialize with defaults', () => {
      const result = initializeBaseProgress(null, 'user123');

      expect(result).toEqual({
        displayName: 'user12', // First 6 chars of userId
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 1,
        pmcFaction: 'USEC',
      });
    });

    it('should use provided progress data', () => {
      const progressData: UserProgressData = {
        displayName: 'TestUser',
        level: 15,
        gameEdition: 4,
        pmcFaction: 'BEAR',
      };

      const result = initializeBaseProgress(progressData, 'user123');

      expect(result).toEqual({
        displayName: 'TestUser',
        userId: 'user123',
        playerLevel: 15,
        gameEdition: 4,
        pmcFaction: 'BEAR',
      });
    });

    it('should use root game edition as fallback', () => {
      const progressData: UserProgressData = {
        displayName: 'TestUser',
        level: 15,
        // gameEdition missing
        pmcFaction: 'BEAR',
      };

      const fullData = { gameEdition: 3 };

      const result = initializeBaseProgress(progressData, 'user123', fullData);

      expect(result.gameEdition).toBe(3);
    });
  });

  describe('processHideoutStations', () => {
    it('should handle empty hideout data', () => {
      const progress: FormattedProgress = {
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'Test',
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 1,
        pmcFaction: 'USEC',
      };

      processHideoutStations(progress, null, 1, 'user123');
      // Should not throw and progress should remain unchanged
      expect(progress.hideoutModulesProgress).toEqual([]);
      expect(progress.hideoutPartsProgress).toEqual([]);
    });

    it('should process stash stations based on game edition', () => {
      const hideoutData: HideoutData = {
        hideoutStations: [
          {
            id: STASH_STATION_ID,
            levels: [
              { id: 'stash-level-1', level: 1, itemRequirements: [{ id: 'item1', count: 1 }] },
              { id: 'stash-level-2', level: 2, itemRequirements: [{ id: 'item2', count: 2 }] },
            ],
          },
        ],
      };

      const progress: FormattedProgress = {
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'Test',
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 2,
        pmcFaction: 'USEC',
      };

      processHideoutStations(progress, hideoutData, 2, 'user123');

      expect(progress.hideoutModulesProgress).toContainEqual({
        id: 'stash-level-1',
        complete: true,
      });
      expect(progress.hideoutModulesProgress).toContainEqual({
        id: 'stash-level-2',
        complete: true,
      });
      expect(progress.hideoutPartsProgress).toContainEqual({
        id: 'item1',
        complete: true,
        count: 1,
      });
      expect(progress.hideoutPartsProgress).toContainEqual({
        id: 'item2',
        complete: true,
        count: 2,
      });
    });

    it('should process cultist circle for Unheard editions', () => {
      const hideoutData: HideoutData = {
        hideoutStations: [
          {
            id: CULTIST_CIRCLE_STATION_ID,
            levels: [
              {
                id: 'cultist-level-1',
                level: 1,
                itemRequirements: [{ id: 'cultist-item1', count: 1 }],
              },
            ],
          },
        ],
      };

      const progress: FormattedProgress = {
        tasksProgress: [],
        taskObjectivesProgress: [],
        hideoutModulesProgress: [],
        hideoutPartsProgress: [],
        displayName: 'Test',
        userId: 'user123',
        playerLevel: 1,
        gameEdition: 5, // Unheard Edition
        pmcFaction: 'USEC',
      };

      processHideoutStations(progress, hideoutData, 5, 'user123');

      expect(progress.hideoutModulesProgress).toContainEqual({
        id: 'cultist-level-1',
        complete: true,
      });
      expect(progress.hideoutPartsProgress).toContainEqual({
        id: 'cultist-item1',
        complete: true,
        count: 1,
      });
    });
  });
});
