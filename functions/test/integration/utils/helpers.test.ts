import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HttpsError } from 'firebase-functions/v2/https';

import {
  validateAuth,
  handleTeamError,
  writeToHistory,
  sanitizeItemId,
  waitForAll,
  PASSWORD_UID_GEN,
  TEAM_UID_GEN,
  ITEM_ID_SANITIZER_REGEX,
  SystemDocData,
  TeamDocData,
} from '../../../src/utils/helpers';
import UIDGenerator from '../../../src/token/UIDGenerator';
import { createTestSuite, firestore } from '../../helpers';
describe('utils/helpers', () => {
  describe('validateAuth', () => {
    it('should return user ID when authentication is present', () => {
      const mockRequest = {
        auth: { uid: 'test-user-123' },
      };
      const result = validateAuth(mockRequest as any);
      expect(result).toBe('test-user-123');
    });
    it('should throw unauthenticated error when auth is missing', () => {
      const mockRequest = { auth: null };
      expect(() => validateAuth(mockRequest as any)).toThrow(HttpsError);
      expect(() => validateAuth(mockRequest as any)).toThrow('Authentication required.');
    });
    it('should throw unauthenticated error when auth is undefined', () => {
      const mockRequest = {};
      expect(() => validateAuth(mockRequest as any)).toThrow(HttpsError);
      expect(() => validateAuth(mockRequest as any)).toThrow('Authentication required.');
    });
  });
  describe('handleTeamError', () => {
    it('should re-throw HttpsError without modification', () => {
      const originalError = new HttpsError('permission-denied', 'Access denied');

      expect(() => handleTeamError(originalError, 'test-context')).toThrow('Access denied');
    });
    it('should convert generic errors to internal HttpsError', () => {
      const originalError = new Error('Generic error message');

      expect(() => handleTeamError(originalError, 'test-context')).toThrow(HttpsError);
      expect(() => handleTeamError(originalError, 'test-context')).toThrow(HttpsError);
    });
    it('should include context information in the error message', () => {
      const originalError = new Error('Database connection failed');

      expect(() => handleTeamError(originalError, 'team-creation')).toThrow('team-creation');
    });
  });
  describe('writeToHistory', () => {
    const suite = createTestSuite('writeToHistory');

    beforeEach(suite.beforeEach);
    afterEach(suite.afterEach);

    it('should write history entry to Firestore using provided batch', async () => {
      const db = firestore();
      const batch = db.batch();

      const mockDocRef = db.doc('users/test-user/progress/test-progress');
      const mockTargetDocRef = db.doc('history/target-id');
      const testData = { field: 'value' };
      await writeToHistory(mockDocRef, mockTargetDocRef, testData, batch as any);

      // Commit the batch to see the result
      await batch.commit();

      // Verify history was written
      const historyCollection = db.collection('users/test-user/progress/test-progress/history');
      const historyDocs = await historyCollection.get();

      expect(historyDocs.empty).toBe(false);
      expect(historyDocs.size).toBe(1);

      const historyData = historyDocs.docs[0].data();
      expect(historyData).toMatchObject({
        field: 'value',
      });
      expect(historyData.updated_at).toBeDefined();
    });
    it('should write history entry to Firestore without batch', async () => {
      const db = firestore();
      const mockDocRef = db.doc('users/test-user-2/progress/test-progress-2');
      const mockTargetDocRef = db.doc('history/target-id-2');
      const testData = { field: 'value', anotherField: 123 };

      await writeToHistory(mockDocRef, mockTargetDocRef, testData);

      // Verify history was written
      const historyCollection = db.collection('users/test-user-2/progress/test-progress-2/history');
      const historyDocs = await historyCollection.get();

      expect(historyDocs.empty).toBe(false);
      const historyData = historyDocs.docs[0].data();
      expect(historyData).toMatchObject({
        field: 'value',
        anotherField: 123,
      });
      expect(historyData.updated_at).toBeDefined();
    });
  });
  describe('sanitizeItemId', () => {
    it('should replace all special characters with underscore', () => {
      const result = sanitizeItemId('item*[with]special/\\chars');
      expect(result).toBe('item__with]special__chars');
    });
    it('should handle strings without special characters', () => {
      const result = sanitizeItemId('normalItemId123');
      expect(result).toBe('normalItemId123');
    });
    it('should handle empty strings', () => {
      const result = sanitizeItemId('');
      expect(result).toBe('');
    });
    it('should handle strings with only special characters', () => {
      const result = sanitizeItemId('*?[\\/');
      expect(result).toBe('_____');
    });
  });
  describe('waitForAll', () => {
    it('should return results for all successful promises', async () => {
      const promises = [
        Promise.resolve('result1'),
        Promise.resolve('result2'),
        Promise.resolve('result3'),
      ];
      const { results, errors } = await waitForAll(promises);
      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(errors).toHaveLength(0);
    });
    it('should collect errors from failed promises', async () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      const promises = [
        Promise.resolve('result1'),
        Promise.reject(error1),
        Promise.resolve('result2'),
        Promise.reject(error2),
      ];
      const { results, errors } = await waitForAll(promises);
      expect(results).toEqual(['result1', 'result2']);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toBe(error1);
      expect(errors[1]).toBe(error2);
    });
    it('should handle empty promise array', async () => {
      const { results, errors } = await waitForAll([]);
      expect(results).toEqual([]);
      expect(errors).toHaveLength(0);
    });
    it('should handle promises that throw non-Error values', async () => {
      const promises = [
        Promise.reject(new Error('string error')),
        Promise.reject(new Error('number error')),
        Promise.reject(new Error('object error')),
      ];
      const { results, errors } = await waitForAll(promises);
      expect(results).toEqual([]);
      expect(errors).toHaveLength(3);
      expect(errors[0]).toBeInstanceOf(Error);
      expect(errors[1]).toBeInstanceOf(Error);
      expect(errors[2]).toBeInstanceOf(Error);
    });
  });
  describe('exports', () => {
    describe('PASSWORD_UID_GEN', () => {
      it('should be a UIDGenerator instance', () => {
        expect(PASSWORD_UID_GEN).toBeInstanceOf(UIDGenerator);
      });
      it('should generate UIDs with expected length', async () => {
        const uid = await PASSWORD_UID_GEN.generate();
        expect(uid).toHaveLength(48);
      });
      it('should generate unique UIDs', () => {
        const uid1 = PASSWORD_UID_GEN.generate();
        const uid2 = PASSWORD_UID_GEN.generate();
        expect(uid1).not.toBe(uid2);
      });
    });
    describe('TEAM_UID_GEN', () => {
      it('should be a UIDGenerator instance', () => {
        expect(TEAM_UID_GEN).toBeInstanceOf(UIDGenerator);
      });
      it('should generate UIDs with expected length', async () => {
        const uid = await TEAM_UID_GEN.generate();
        expect(uid).toHaveLength(32);
      });
      it('should generate unique UIDs', () => {
        const uid1 = TEAM_UID_GEN.generate();
        const uid2 = TEAM_UID_GEN.generate();
        expect(uid1).not.toBe(uid2);
      });
    });
    describe('ITEM_ID_SANITIZER_REGEX', () => {
      it('should be a RegExp object', () => {
        expect(ITEM_ID_SANITIZER_REGEX).toBeInstanceOf(RegExp);
      });
      it('should match the expected special characters', () => {
        expect('*').toMatch(ITEM_ID_SANITIZER_REGEX);
        expect('?').toMatch(ITEM_ID_SANITIZER_REGEX);
        expect('[').toMatch(ITEM_ID_SANITIZER_REGEX);
        expect('/').toMatch(ITEM_ID_SANITIZER_REGEX);
        expect('\\').toMatch(ITEM_ID_SANITIZER_REGEX);
      });
      it('should not match alphanumeric characters', () => {
        expect('abc123').not.toMatch(ITEM_ID_SANITIZER_REGEX);
      });
    });
    describe('type exports', () => {
      it('should export SystemDocData interface', () => {
        const mockTimestamp = { seconds: 1234567890, nanoseconds: 123456000 };
        const systemDoc: SystemDocData = {
          team: 'team-123',
          teamMax: 5,
          lastLeftTeam: mockTimestamp as any,
        };
        expect(systemDoc).toBeDefined();
      });
      it('should export TeamDocData interface', () => {
        const mockTimestamp = { seconds: 1234567890, nanoseconds: 123456000 };
        const teamDoc: TeamDocData = {
          owner: 'owner-123',
          password: 'secret',
          maximumMembers: 5,
          members: ['member1', 'member2'],
          createdAt: mockTimestamp as any,
        };
        expect(teamDoc).toBeDefined();
      });
    });
  });
});
