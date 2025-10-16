import { describe, it, expect } from 'vitest';
import { DataValidationUtils, type ProgressData } from '../DataValidationUtils';

describe('DataValidationUtils', () => {
  describe('hasSignificantProgress', () => {
    it('returns true for level above 1', () => {
      const data: ProgressData = { level: 5 };
      expect(DataValidationUtils.hasSignificantProgress(data)).toBe(true);
    });

    it('returns false for level 1 with no other data', () => {
      const data: ProgressData = { level: 1 };
      expect(DataValidationUtils.hasSignificantProgress(data)).toBe(false);
    });

    it('returns true when taskCompletions exist', () => {
      const data: ProgressData = {
        level: 1,
        taskCompletions: { task1: true },
      };
      expect(DataValidationUtils.hasSignificantProgress(data)).toBe(true);
    });

    it('returns true when taskObjectives exist', () => {
      const data: ProgressData = {
        level: 1,
        taskObjectives: { obj1: true },
      };
      expect(DataValidationUtils.hasSignificantProgress(data)).toBe(true);
    });

    it('returns true when hideoutModules exist', () => {
      const data: ProgressData = {
        level: 1,
        hideoutModules: { module1: true },
      };
      expect(DataValidationUtils.hasSignificantProgress(data)).toBe(true);
    });

    it('returns true when hideoutParts exist', () => {
      const data: ProgressData = {
        level: 1,
        hideoutParts: { part1: true },
      };
      expect(DataValidationUtils.hasSignificantProgress(data)).toBe(true);
    });

    it('returns false for empty objects', () => {
      const data: ProgressData = {
        level: 1,
        taskCompletions: {},
        taskObjectives: {},
        hideoutModules: {},
        hideoutParts: {},
      };
      expect(DataValidationUtils.hasSignificantProgress(data)).toBe(false);
    });
  });

  describe('isValidProgressData', () => {
    it('returns true for valid progress data', () => {
      const data: ProgressData = { level: 10 };
      expect(DataValidationUtils.isValidProgressData(data)).toBe(true);
    });

    it('returns false for null', () => {
      expect(DataValidationUtils.isValidProgressData(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(DataValidationUtils.isValidProgressData(undefined)).toBe(false);
    });

    it('returns false for non-object types', () => {
      expect(DataValidationUtils.isValidProgressData('string')).toBe(false);
      expect(DataValidationUtils.isValidProgressData(123)).toBe(false);
      expect(DataValidationUtils.isValidProgressData(true)).toBe(false);
    });

    it('returns false for array', () => {
      expect(DataValidationUtils.isValidProgressData([])).toBe(false);
    });

    it('returns false when level is missing', () => {
      const data = { gameEdition: 'standard' };
      expect(DataValidationUtils.isValidProgressData(data)).toBe(false);
    });

    it('returns false when level is not a number', () => {
      const data = { level: '10' };
      expect(DataValidationUtils.isValidProgressData(data)).toBe(false);
    });

    it('returns false when level is less than 1', () => {
      const data = { level: 0 };
      expect(DataValidationUtils.isValidProgressData(data)).toBe(false);
    });

    it('accepts level exactly 1', () => {
      const data: ProgressData = { level: 1 };
      expect(DataValidationUtils.isValidProgressData(data)).toBe(true);
    });

    it('accepts data with additional valid fields', () => {
      const data: ProgressData = {
        level: 15,
        displayName: 'Player',
        gameEdition: 'standard',
        pmcFaction: 'usec',
      };
      expect(DataValidationUtils.isValidProgressData(data)).toBe(true);
    });
  });

  describe('validateImportFormat', () => {
    it('returns true for valid import format', () => {
      const data = {
        type: 'tarkovtracker-migration',
        data: { level: 10 },
      };
      expect(DataValidationUtils.validateImportFormat(data)).toBe(true);
    });

    it('returns false when type is missing', () => {
      const data = {
        data: { level: 10 },
      };
      expect(DataValidationUtils.validateImportFormat(data)).toBe(false);
    });

    it('returns false when type is incorrect', () => {
      const data = {
        type: 'wrong-type',
        data: { level: 10 },
      };
      expect(DataValidationUtils.validateImportFormat(data)).toBe(false);
    });

    it('returns false when data is missing', () => {
      const data = {
        type: 'tarkovtracker-migration',
      };
      expect(DataValidationUtils.validateImportFormat(data)).toBe(false);
    });

    it('returns false when data is invalid', () => {
      const data = {
        type: 'tarkovtracker-migration',
        data: { level: 'invalid' },
      };
      expect(DataValidationUtils.validateImportFormat(data)).toBe(false);
    });

    it('returns false for null', () => {
      expect(DataValidationUtils.validateImportFormat(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(DataValidationUtils.validateImportFormat('string')).toBe(false);
    });

    it('validates nested data correctly', () => {
      const data = {
        type: 'tarkovtracker-migration',
        data: {
          level: 20,
          taskCompletions: { task1: true },
          displayName: 'TestPlayer',
        },
      };
      expect(DataValidationUtils.validateImportFormat(data)).toBe(true);
    });
  });

  describe('isValidApiToken', () => {
    it('returns true for valid token', () => {
      expect(DataValidationUtils.isValidApiToken('validtoken123')).toBe(true);
    });

    it('returns false for short token', () => {
      expect(DataValidationUtils.isValidApiToken('short')).toBe(false);
    });

    it('returns false for exactly 10 character token', () => {
      expect(DataValidationUtils.isValidApiToken('tencharact')).toBe(false);
    });

    it('returns true for 11 character token', () => {
      expect(DataValidationUtils.isValidApiToken('elevenchar1')).toBe(true);
    });

    it('returns false for token with leading whitespace', () => {
      expect(DataValidationUtils.isValidApiToken(' validtoken123')).toBe(false);
    });

    it('returns false for token with trailing whitespace', () => {
      expect(DataValidationUtils.isValidApiToken('validtoken123 ')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(DataValidationUtils.isValidApiToken('')).toBe(false);
    });

    it('returns false for whitespace only', () => {
      expect(DataValidationUtils.isValidApiToken('           ')).toBe(false);
    });

    it('returns false for non-string', () => {
      expect(DataValidationUtils.isValidApiToken(123 as unknown as string)).toBe(false);
    });

    it('accepts tokens with special characters', () => {
      expect(DataValidationUtils.isValidApiToken('token-with_special.chars123')).toBe(true);
    });
  });

  describe('hasDataWorthMigrating', () => {
    it('returns true when has significant progress', () => {
      const data: ProgressData = { level: 15 };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(true);
    });

    it('returns true when has display name', () => {
      const data: ProgressData = {
        level: 1,
        displayName: 'Player',
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(true);
    });

    it('returns false for whitespace-only display name with defaults', () => {
      const data: ProgressData = {
        level: 1,
        displayName: '   ',
        gameEdition: 'standard',
        pmcFaction: 'usec',
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(false);
    });

    it('returns true for non-standard game edition', () => {
      const data: ProgressData = {
        level: 1,
        gameEdition: 'edgeofDarkness',
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(true);
    });

    it('returns false for standard edition with usec faction', () => {
      const data: ProgressData = {
        level: 1,
        gameEdition: 'standard',
        pmcFaction: 'usec',
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(false);
    });

    it('returns true for non-usec faction', () => {
      const data: ProgressData = {
        level: 1,
        pmcFaction: 'bear',
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(true);
    });

    it('returns false for usec faction with standard edition', () => {
      const data: ProgressData = {
        level: 1,
        pmcFaction: 'usec',
        gameEdition: 'standard',
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(false);
    });

    it('returns false for minimal default data', () => {
      const data: ProgressData = {
        level: 1,
        gameEdition: 'standard',
        pmcFaction: 'usec',
        displayName: '',
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(false);
    });

    it('returns true when multiple criteria met', () => {
      const data: ProgressData = {
        level: 20,
        displayName: 'Player',
        gameEdition: 'edgeofDarkness',
        taskCompletions: { task1: true },
      };
      expect(DataValidationUtils.hasDataWorthMigrating(data)).toBe(true);
    });
  });

  describe('isValidOldApiData', () => {
    it('returns true for data with level field', () => {
      const data = { level: 10 };
      expect(DataValidationUtils.isValidOldApiData(data)).toBe(true);
    });

    it('returns true for data with playerLevel field', () => {
      const data = { playerLevel: 15 };
      expect(DataValidationUtils.isValidOldApiData(data)).toBe(true);
    });

    it('returns true for data with tasksProgress array', () => {
      const data = { tasksProgress: [] };
      expect(DataValidationUtils.isValidOldApiData(data)).toBe(true);
    });

    it('returns true for data with hideoutModulesProgress array', () => {
      const data = { hideoutModulesProgress: [] };
      expect(DataValidationUtils.isValidOldApiData(data)).toBe(true);
    });

    it('returns false for null', () => {
      expect(DataValidationUtils.isValidOldApiData(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(DataValidationUtils.isValidOldApiData('string')).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(DataValidationUtils.isValidOldApiData({})).toBe(false);
    });

    it('returns false when level is not a number', () => {
      const data = { level: 'ten' };
      expect(DataValidationUtils.isValidOldApiData(data)).toBe(false);
    });

    it('returns false when tasksProgress is not an array', () => {
      const data = { tasksProgress: 'not-array' };
      expect(DataValidationUtils.isValidOldApiData(data)).toBe(false);
    });

    it('accepts data with mixed valid fields', () => {
      const data = {
        level: 20,
        tasksProgress: [{ id: 'task1', complete: true }],
        hideoutModulesProgress: [],
      };
      expect(DataValidationUtils.isValidOldApiData(data)).toBe(true);
    });
  });

  describe('sanitizeProgressData', () => {
    it('clamps level to minimum of 1', () => {
      const data: ProgressData = { level: 0 };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.level).toBe(1);
    });

    it('clamps level to maximum of 79', () => {
      const data: ProgressData = { level: 100 };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.level).toBe(79);
    });

    it('floors decimal levels', () => {
      const data: ProgressData = { level: 15.7 };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.level).toBe(15);
    });

    it('trims display name', () => {
      const data: ProgressData = {
        level: 10,
        displayName: '  Player  ',
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.displayName).toBe('Player');
    });

    it('truncates long display names to 50 characters', () => {
      const data: ProgressData = {
        level: 10,
        displayName: 'A'.repeat(100),
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.displayName?.length).toBe(50);
    });

    it('sets default empty string for missing display name', () => {
      const data: ProgressData = { level: 10 };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.displayName).toBe('');
    });

    it('validates gameEdition against allowed values', () => {
      const data: ProgressData = {
        level: 10,
        gameEdition: 'edgeofDarkness',
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.gameEdition).toBe('edgeofDarkness');
    });

    it('defaults to standard for invalid gameEdition', () => {
      const data: ProgressData = {
        level: 10,
        gameEdition: 'invalid',
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.gameEdition).toBe('standard');
    });

    it('accepts all valid game editions', () => {
      const editions = ['standard', 'leftbehind', 'prepareescape', 'edgeofDarkness'];

      editions.forEach((edition) => {
        const data: ProgressData = {
          level: 10,
          gameEdition: edition,
        };
        const sanitized = DataValidationUtils.sanitizeProgressData(data);
        expect(sanitized.gameEdition).toBe(edition);
      });
    });

    it('validates pmcFaction against allowed values', () => {
      const data: ProgressData = {
        level: 10,
        pmcFaction: 'bear',
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.pmcFaction).toBe('bear');
    });

    it('defaults to usec for invalid pmcFaction', () => {
      const data: ProgressData = {
        level: 10,
        pmcFaction: 'invalid',
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.pmcFaction).toBe('usec');
    });

    it('accepts both valid factions', () => {
      const factions = ['usec', 'bear'];

      factions.forEach((faction) => {
        const data: ProgressData = {
          level: 10,
          pmcFaction: faction,
        };
        const sanitized = DataValidationUtils.sanitizeProgressData(data);
        expect(sanitized.pmcFaction).toBe(faction);
      });
    });

    it('preserves other fields unchanged', () => {
      const data: ProgressData = {
        level: 15,
        taskCompletions: { task1: true },
        taskObjectives: { obj1: true },
        hideoutModules: { module1: true },
        importedFromApi: true,
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);

      expect(sanitized.taskCompletions).toEqual(data.taskCompletions);
      expect(sanitized.taskObjectives).toEqual(data.taskObjectives);
      expect(sanitized.hideoutModules).toEqual(data.hideoutModules);
      expect(sanitized.importedFromApi).toBe(true);
    });

    it('handles undefined optional fields gracefully', () => {
      const data: ProgressData = {
        level: 10,
        displayName: undefined,
        gameEdition: undefined,
        pmcFaction: undefined,
      };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);

      expect(sanitized.displayName).toBe('');
      expect(sanitized.gameEdition).toBe('standard');
      expect(sanitized.pmcFaction).toBe('usec');
    });

    it('is idempotent for already sanitized data', () => {
      const data: ProgressData = {
        level: 15,
        displayName: 'Player',
        gameEdition: 'standard',
        pmcFaction: 'usec',
      };

      const sanitized1 = DataValidationUtils.sanitizeProgressData(data);
      const sanitized2 = DataValidationUtils.sanitizeProgressData(sanitized1);

      expect(sanitized2).toEqual(sanitized1);
    });

    it('handles negative levels', () => {
      const data: ProgressData = { level: -5 };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      expect(sanitized.level).toBe(1);
    });

    it('handles NaN level', () => {
      const data: ProgressData = { level: NaN };
      const sanitized = DataValidationUtils.sanitizeProgressData(data);
      // Math.floor(NaN) returns NaN, Math.max(1, NaN) returns NaN
      // This is expected JavaScript behavior
      expect(Number.isNaN(sanitized.level)).toBe(true);
    });
  });
});
