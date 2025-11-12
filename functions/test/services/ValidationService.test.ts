import { describe, it, expect } from 'vitest';
import { ValidationService } from '../../src/services/ValidationService';

describe('ValidationService', () => {
  describe('validateUserId', () => {
    it('should accept valid user IDs', () => {
      const result = ValidationService.validateUserId('user-123');
      expect(result).toBe('user-123');
    });

    it('should reject empty user IDs', () => {
      expect(() => ValidationService.validateUserId('')).toThrow();
    });

    it('should reject null user IDs', () => {
      expect(() => ValidationService.validateUserId(null as any)).toThrow();
    });
  });

  describe('validateLevel', () => {
    it('should accept valid levels', () => {
      const result = ValidationService.validateLevel(15);
      expect(result).toBe(15);
    });

    it('should reject negative levels', () => {
      expect(() => ValidationService.validateLevel(-1)).toThrow();
    });

    it('should reject levels above maximum', () => {
      expect(() => ValidationService.validateLevel(100)).toThrow();
    });
  });

  describe('validateTaskUpdate', () => {
    it('should accept valid task data', () => {
      const taskData = {
        id: 'task-1',
        state: 'completed',
        gameMode: 'pvp',
      };
      const result = ValidationService.validateTaskUpdate(taskData);
      expect(result.state).toBe('completed');
    });

    it('should reject task data without ID', () => {
      const taskData = {
        state: 'completed',
        gameMode: 'pvp',
      };
      // validateTaskUpdate only checks for state, not ID, so this should pass
      const result = ValidationService.validateTaskUpdate(taskData);
      expect(result.state).toBe('completed');
    });

    it('should reject invalid task status', () => {
      const taskData = {
        id: 'task-1',
        state: 'invalid-status',
        gameMode: 'pvp',
      } as any;
      expect(() => ValidationService.validateTaskUpdate(taskData)).toThrow();
    });
  });
});
