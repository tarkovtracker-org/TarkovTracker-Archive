import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encryptData, decryptData } from '../encryption';

// Mock the global crypto API
const mockCrypto = {
  getRandomValues: vi.fn(),
  subtle: {
    importKey: vi.fn(),
    deriveKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
};

describe('Encryption Service - Security & Performance', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      writable: true,
    });

    vi.clearAllMocks();

    const mockKey = {} as CryptoKey;
    mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
    mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
  });

  describe('Performance and Edge Cases', () => {
    let mockKey: CryptoKey;
    let mockIV: Uint8Array;
    let mockEncryptedData: Uint8Array;

    beforeEach(() => {
      mockKey = {} as CryptoKey;
      mockIV = new Uint8Array(12);
      mockEncryptedData = new Uint8Array(1000);
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.getRandomValues.mockReturnValue(mockIV);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData);
      mockCrypto.subtle.decrypt.mockResolvedValue(new Uint8Array(1000));
    });

    it('should handle large data sets efficiently', async () => {
      const largeData = 'x'.repeat(100000);
      const startTime = performance.now();
      const encrypted = await encryptData(largeData);
      const decrypted = await decryptData(encrypted);
      const endTime = performance.now();

      expect(decrypted).toBeDefined();
      expect(typeof decrypted).toBe('string');
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle empty and single character input', async () => {
      const emptyResult = await encryptData('');
      expect(emptyResult).toBeDefined();
      expect(typeof emptyResult).toBe('string');

      const singleCharResult = await encryptData('a');
      expect(singleCharResult).toBeDefined();
      expect(typeof singleCharResult).toBe('string');
    });

    it('should handle binary data in strings', async () => {
      const binaryString = 'test binary data';

      let originalDataBytes: Uint8Array | null = null;
      mockCrypto.subtle.encrypt.mockImplementation(
        (_params: any, _key: CryptoKey, data: ArrayBuffer) => {
          originalDataBytes = new Uint8Array(data);
          const iv = new Uint8Array(12);
          const combined = new Uint8Array(iv.length + originalDataBytes.length);
          combined.set(iv, 0);
          combined.set(originalDataBytes, iv.length);
          return Promise.resolve(combined);
        }
      );
      mockCrypto.subtle.decrypt.mockImplementation(
        (_params: any, _key: CryptoKey, data: ArrayBuffer) => {
          if (originalDataBytes) {
            return Promise.resolve(originalDataBytes);
          }
          const dataArray = new Uint8Array(data);
          const dataPart = dataArray.slice(12);
          return Promise.resolve(dataPart);
        }
      );

      const encrypted = await encryptData(binaryString);
      const decrypted = await decryptData(encrypted);
      expect(decrypted).toBe(binaryString);
    });
  });

  describe('Security and Data Integrity', () => {
    it('should produce different encrypted data for same input', async () => {
      const testString = 'same input';
      mockCrypto.getRandomValues.mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      });

      const result1 = await encryptData(testString);
      const result2 = await encryptData(testString);
      expect(result1).not.toBe(result2);
    });

    it('should maintain data integrity across multiple encrypt/decrypt cycles', async () => {
      const originalData = JSON.stringify({
        user: 'testuser',
        timestamp: 1672531200000,
        data: 'important_sensitive_data',
      });

      let originalDataBytes: Uint8Array | null = null;
      mockCrypto.subtle.encrypt.mockImplementation(
        (_params: any, _key: CryptoKey, data: ArrayBuffer) => {
          originalDataBytes = new Uint8Array(data);
          const iv = new Uint8Array(12);
          const combined = new Uint8Array(iv.length + originalDataBytes.length);
          combined.set(iv, 0);
          combined.set(originalDataBytes, iv.length);
          return Promise.resolve(combined);
        }
      );
      mockCrypto.subtle.decrypt.mockImplementation(
        (_params: any, _key: CryptoKey, data: ArrayBuffer) => {
          if (originalDataBytes) {
            return Promise.resolve(originalDataBytes);
          }
          const dataArray = new Uint8Array(data);
          const dataPart = dataArray.slice(12);
          return Promise.resolve(dataPart);
        }
      );

      let currentData = originalData;
      for (let i = 0; i < 10; i++) {
        const encrypted = await encryptData(currentData);
        currentData = await decryptData(encrypted);
      }

      const finalParsed = JSON.parse(currentData);
      const originalParsed = JSON.parse(originalData);
      expect(finalParsed).toEqual(originalParsed);
    });

    it('should handle concurrent encryption requests', async () => {
      const testStrings = ['data1', 'data2', 'data3', 'data4', 'data5'];
      const mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.getRandomValues.mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      });
      mockCrypto.subtle.encrypt.mockResolvedValue(new Uint8Array(20));

      const promises = testStrings.map((str) => encryptData(str));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });
});
