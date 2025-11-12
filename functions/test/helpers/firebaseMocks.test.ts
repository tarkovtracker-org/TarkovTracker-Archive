/**
 * Unit tests for firebaseMocks utilities
 * Verifies that Firebase mock setup works correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupFirebaseMocks,
  setupMinimalFirebaseMocks,
  setupFirebaseMocksWithOverrides,
  getFirebaseMocks,
  createMockTransaction,
  createMockAuthUser,
  createMockDocumentSnapshot,
} from './firebaseMocks';

describe('firebaseMocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupFirebaseMocks', () => {
    it('should setup all Firebase modules', () => {
      const mocks = setupFirebaseMocks();

      expect(mocks.adminMock).toBeDefined();
      expect(mocks.firestoreMock).toBeDefined();
      expect(mocks.functionsMock).toBeDefined();
      expect(mocks.functionsMock.logger).toBeDefined();
      expect(mocks.functionsMock.https).toBeDefined();
      expect(mocks.functionsMock.schedule).toBeDefined();
      expect(mocks.functionsMock.handler).toBeDefined();
      expect(mocks.functionsMock.logger).toBeDefined();
      expect(mocks.functionsMock.config).toBeDefined();
    });

    it('should return all mock instances', () => {
      const { adminMock, firestoreMock, functionsMock } = setupFirebaseMocks();

      expect(adminMock).toBeDefined();
      expect(firestoreMock).toBeDefined();
      expect(functionsMock).toBeDefined();
    });
  });

  describe('setupMinimalFirebaseMocks', () => {
    it('should setup only firebase-admin mock', () => {
      const { adminMock } = setupMinimalFirebaseMocks();

      expect(adminMock).toBeDefined();
    });

    it('should return admin mock only', () => {
      const { adminMock, firestoreMock, functionsMock } = setupMinimalFirebaseMocks();

      expect(adminMock).toBeDefined();
      expect(firestoreMock).toBeUndefined();
      expect(functionsMock).toBeUndefined();
    });
  });

  describe('setupFirebaseMocksWithOverrides', () => {
    it('should use custom overrides when provided', () => {
      const customFirestore = { custom: 'mock' };
      const { firestoreMock } = setupFirebaseMocksWithOverrides({
        firestore: customFirestore,
      });

      expect(firestoreMock).toEqual(customFirestore);
    });

    it('should use defaults when no override provided', () => {
      const { firestoreMock } = setupFirebaseMocksWithOverrides({});

      expect(firestoreMock).toBeDefined();
    });

    it('should merge overrides with defaults', () => {
      const customFunctions = { customMethod: vi.fn() };
      const { functionsMock } = setupFirebaseMocksWithOverrides({
        functions: customFunctions,
      });

      expect(functionsMock).toEqual(customFunctions);
      expect(functionsMock.logger).toBeDefined(); // Should still have default properties
    });
  });

  describe('getFirebaseMocks', () => {
    it('should return mock instances without setting up vi.mock', () => {
      const mocks = getFirebaseMocks();

      expect(mocks.adminMock).toBeDefined();
      expect(mocks.firestoreMock).toBeDefined();
      expect(mocks.functionsMock).toBeDefined();
    });

    it('should provide fresh instances each call', () => {
      const mocks1 = getFirebaseMocks();
      const mocks2 = getFirebaseMocks();

      expect(mocks1).not.toBe(mocks2);
    });
  });

  describe('createMockTransaction', () => {
    it('should create transaction mock with all methods', () => {
      const transaction = createMockTransaction();

      expect(transaction.get).toBeDefined();
      expect(transaction.set).toBeDefined();
      expect(transaction.update).toBeDefined();
      expect(transaction.delete).toBeDefined();
      expect(transaction.create).toBeDefined();
      expect(transaction.getAll).toBeDefined();

      // All should be vi.fn()
      expect(vi.isMockFunction(transaction.get)).toBe(true);
      expect(vi.isMockFunction(transaction.set)).toBe(true);
      expect(vi.isMockFunction(transaction.update)).toBe(true);
      expect(vi.isMockFunction(transaction.delete)).toBe(true);
      expect(vi.isMockFunction(transaction.create)).toBe(true);
      expect(vi.isMockFunction(transaction.getAll)).toBe(true);
    });
  });

  describe('createMockAuthUser', () => {
    it('should create user with default properties', () => {
      const user = createMockAuthUser();

      expect(user.uid).toBe('test-user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.displayName).toBe('Test User');
    });

    it('should merge custom overrides', () => {
      const customUser = { uid: 'custom-123', custom: 'value' };
      const user = createMockAuthUser(customUser);

      expect(user.uid).toBe('custom-123');
      expect(user.custom).toBe('value');
      // Should still have defaults
      expect(user.email).toBe('test@example.com');
      expect(user.displayName).toBe('Test User');
    });
  });

  describe('createMockDocumentSnapshot', () => {
    it('should create document snapshot with defaults', () => {
      const data = { test: 'data' };
      const snapshot = createMockDocumentSnapshot(data);

      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()).toEqual(data);
      expect(snapshot.id).toBe('mock-doc-id');
      expect(snapshot.ref.id).toBe('mock-doc-id');
      expect(snapshot.ref.path).toBe('collection/mock-doc-id');
    });

    it('should support custom exists parameter', () => {
      const snapshot = createMockDocumentSnapshot({}, false);

      expect(snapshot.exists).toBe(false);
    });

    it('should return data via data() function', () => {
      const data = { test: 'data' };
      const snapshot = createMockDocumentSnapshot(data);

      expect(typeof snapshot.data).toBe('function');
      expect(snapshot.data()).toEqual(data);
    });
  });

  describe('Mock Integration', () => {
    it('should work with actual test patterns', () => {
      // This test verifies the patterns work as expected in real usage
      setupFirebaseMocks();

      // Verify firebase-admin mock is available
      const firebaseAdmin = require('firebase-admin');
      expect(firebaseAdmin.default).toBeDefined();

      // Verify firebase-functions mock is available
      const firebaseFunctions = require('firebase-functions');
      expect(firebaseFunctions.default).toBeDefined();

      // Verify v2 modules
      const firebaseV2 = require('firebase-functions/v2');
      expect(firebaseV2.logger).toBeDefined();
      expect(firebaseV2.https).toBeDefined();
      expect(firebaseV2.schedule).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid overrides gracefully', () => {
      expect(() => {
        setupFirebaseMocksWithOverrides(null as any);
      }).not.toThrow();
    });

    it('should provide working mocks even with overrides', () => {
      const { adminMock } = setupFirebaseMocksWithOverrides({
        admin: { broken: true },
      });

      expect(adminMock).toBeDefined();
      expect(adminMock.broken).toBe(true);
    });
  });
});
