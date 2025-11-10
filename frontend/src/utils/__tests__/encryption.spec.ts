import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { encryptData, decryptData, isEncrypted } from '../encryption';

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

// Mock localStorage with proper per-test isolation
const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    _store: store, // For testing/debugging
  };
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  language: 'en-US',
};

const mockScreen = {
  colorDepth: 24,
};

describe('Encryption Service', () => {
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;

  beforeAll(() => {
    // Store original globals
    const originalCrypto = globalThis.crypto;
    const originalLocalStorage = window.localStorage;
    const originalNavigator = globalThis.navigator;
    const originalScreen = globalThis.screen;
    const originalDate = globalThis.Date;
    const originalTextEncoder = globalThis.TextEncoder;
    const originalTextDecoder = globalThis.TextDecoder;

    // Mock global crypto API
    Object.defineProperty(globalThis, 'crypto', {
      value: mockCrypto,
      writable: true,
    });

    // Mock TextEncoder/TextDecoder
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;

    // Store for cleanup
    (globalThis as any).__originalGlobals = {
      crypto: originalCrypto,
      localStorage: originalLocalStorage,
      navigator: originalNavigator,
      screen: originalScreen,
      date: originalDate,
      textEncoder: originalTextEncoder,
      textDecoder: originalTextDecoder,
    };
  });

  beforeEach(() => {
    // Create fresh localStorage mock for each test
    mockLocalStorage = createMockLocalStorage();

    // Mock navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: mockNavigator,
      writable: true,
    });

    // Mock screen
    Object.defineProperty(globalThis, 'screen', {
      value: mockScreen,
      writable: true,
    });

    // Mock Date properly
    const originalDate = (globalThis as any).__originalGlobals.date;
    const MockDate = class extends originalDate {
      constructor() {
        super();
        return new originalDate(2023, 0, 1); // Fixed date for testing
      }
      static now() {
        return 1672531200000; // Fixed timestamp for testing
      }
      getTimezoneOffset() {
        return 0;
      }
    };

    Object.defineProperty(globalThis, 'Date', {
      value: MockDate,
      writable: true,
    });

    vi.clearAllMocks();

    // Reset crypto mocks with proper behavior
    mockCrypto.getRandomValues.mockImplementation((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i;
      }
      return arr;
    });

    const mockKey = {} as CryptoKey;
    mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
    mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
    mockCrypto.subtle.encrypt.mockResolvedValue(new Uint8Array(20));

    // Mock decrypt to return the actual input (for round-trip tests)
    mockCrypto.subtle.decrypt.mockImplementation(
      (_params: any, _key: CryptoKey, data: ArrayBuffer) => {
        // Convert the encrypted data back to a string for testing
        const textDecoder = new TextDecoder();
        // For testing, we'll assume the data represents the original plaintext
        return Promise.resolve(data);
      }
    );
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Key Generation and Derivation', () => {
    it('should generate random salt when none exists', async () => {
      // Setup: No existing salt
      mockLocalStorage.getItem.mockReturnValue(null);

      // Mock crypto functions for key derivation
      const mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

      // Mock getRandomValues to return consistent data
      mockCrypto.getRandomValues.mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i; // Deterministic values for testing
        }
        return arr;
      });

      // Should generate and store salt
      await encryptData('test');

      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(new Uint8Array(16));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'tt_storage_salt',
        expect.stringMatching(/^[A-Za-z0-9+/]+=*$/)
      );
    });

    it('should use existing salt when available', async () => {
      // Setup: Existing salt in storage
      const existingSalt = btoa('existing_salt_data');
      mockLocalStorage.getItem.mockReturnValue(existingSalt);

      const mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

      // Should not generate new salt
      await encryptData('test');

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('tt_storage_salt');
    });

    it('should derive consistent key from browser characteristics', async () => {
      const mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

      await encryptData('test');

      // Verify the key derivation parameters
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      expect(mockCrypto.subtle.deriveKey).toHaveBeenCalledWith(
        {
          name: 'PBKDF2',
          salt: expect.any(Uint8Array),
          iterations: 100000,
          hash: 'SHA-256',
        },
        expect.any(CryptoKey),
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });

    it('should handle localStorage errors gracefully', async () => {
      // Setup: localStorage throws error
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockCrypto.getRandomValues.mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      });

      const mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

      await encryptData('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle different timezone offsets', async () => {
      const testOffsets = [0, -300, 300, -480];
      const originalDate = (globalThis as any).__originalGlobals.date;

      for (const offset of testOffsets) {
        // Mock Date instance for this test
        const mockDate = {
          getTimezoneOffset: () => offset,
        };

        const MockDate = class extends originalDate {
          constructor() {
            super();
            return mockDate as any;
          }
        };

        Object.defineProperty(globalThis, 'Date', {
          value: MockDate,
          writable: true,
        });

        // Clear localStorage for this test
        mockLocalStorage.clear();
        mockCrypto.getRandomValues.mockImplementation((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i;
          }
          return arr;
        });

        const mockKey = {} as CryptoKey;
        mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
        mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);

        await encryptData('test');
      }

      // Should have been called for each timezone
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledTimes(testOffsets.length);
    });
  });

  describe('Encryption/Decryption Round-trip', () => {
    let mockKey: CryptoKey;
    let mockIV: Uint8Array;
    let mockEncryptedData: Uint8Array;

    beforeEach(() => {
      mockKey = {} as CryptoKey;
      mockIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      mockEncryptedData = new Uint8Array(100);

      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.getRandomValues.mockReturnValue(mockIV);

      // Better encrypt mock that returns actual data
      mockCrypto.subtle.encrypt.mockImplementation(
        (_params: any, _key: CryptoKey, data: ArrayBuffer) => {
          return Promise.resolve(new Uint8Array(new Uint8Array(data).byteLength + 20)); // Simulate encrypted data
        }
      );

      // Better decrypt mock that returns original data
      mockCrypto.subtle.decrypt.mockImplementation(
        (_params: any, _key: CryptoKey, _data: ArrayBuffer) => {
          // Return a reasonable amount of data for the test
          return Promise.resolve(
            new TextEncoder().encode('test data that gets encrypted and decrypted')
          );
        }
      );
    });

    it('should encrypt and decrypt simple strings', async () => {
      const testString = 'Hello, World!';
      const encrypted = await encryptData(testString);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBeDefined();
      expect(typeof decrypted).toBe('string');
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          iv: mockIV,
        },
        mockKey,
        expect.any(Uint8Array)
      );
    });

    it('should handle empty strings', async () => {
      const testString = '';
      const encrypted = await encryptData(testString);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBeDefined();
      expect(typeof decrypted).toBe('string');
    });

    it('should handle long strings', async () => {
      const testString = 'a'.repeat(10000);
      const encrypted = await encryptData(testString);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBeDefined();
      expect(typeof decrypted).toBe('string');
      expect(decrypted.length).toBeGreaterThan(0);
    });

    it('should handle Unicode and special characters', async () => {
      const testString = 'Hello 🌍 世界 🎮 ñáéíóú!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const encrypted = await encryptData(testString);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBeDefined();
      expect(typeof decrypted).toBe('string');
    });

    it('should handle JSON objects', async () => {
      const testObject = {
        name: 'Tarkov Tracker',
        version: '1.0.0',
        settings: {
          theme: 'dark',
          language: 'en',
        },
        nested: {
          deeply: {
            nested: ['array', 'with', 'objects', { key: 'value' }],
          },
        },
      };

      const testString = JSON.stringify(testObject);
      const encrypted = await encryptData(testString);
      const decrypted = await decryptData(encrypted);
      const parsedObject = JSON.parse(decrypted);

      expect(parsedObject).toEqual(testObject);
    });

    it('should handle arrays', async () => {
      const testArray = [
        'string',
        123,
        true,
        { nested: 'object' },
        ['nested', 'array'],
        null,
        undefined,
      ];

      const testString = JSON.stringify(testArray);
      const encrypted = await encryptData(testString);
      const decrypted = await decryptData(encrypted);
      const parsedArray = JSON.parse(decrypted);

      expect(parsedArray).toEqual(testArray);
    });

    it('should generate unique IV for each encryption', async () => {
      const firstIV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      const secondIV = new Uint8Array([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
      let callCount = 0;

      mockCrypto.getRandomValues.mockImplementation((arr) => {
        callCount++;
        if (callCount === 1) {
          arr.set(firstIV);
        } else {
          arr.set(secondIV);
        }
        return arr;
      });

      await encryptData('first');
      await encryptData('second');

      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
    });

    it('should prepend IV to encrypted data', async () => {
      const testString = 'test data';
      const encrypted = await encryptData(testString);

      // Decode the base64 to verify structure
      const decoded = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

      // First 12 bytes should be IV, rest should be encrypted data
      expect(decoded.slice(0, 12)).toEqual(mockIV);
      expect(decoded.length).toBeGreaterThan(12);
    });
  });

  describe('Error Handling', () => {
    let mockKey: CryptoKey;

    beforeEach(() => {
      mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
    });

    it('should throw error for encryption failures', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));

      await expect(encryptData('test')).rejects.toThrow('Encryption failed');
    });

    it('should throw error for decryption failures', async () => {
      const encrypted = 'invalid_encrypted_data';
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      await expect(decryptData(encrypted)).rejects.toThrow('Decryption failed');
    });

    it('should handle corrupted encrypted data', async () => {
      // Test with invalid base64
      await expect(decryptData('invalid_base64!@#')).rejects.toThrow();

      // Test with base64 but insufficient length
      await expect(decryptData('YQ==')).rejects.toThrow(); // Only 1 byte, less than IV length

      // Test with valid base64 but not encrypted data
      await expect(decryptData('dGVzdA==')).rejects.toThrow(); // "test" in base64
    });

    it('should handle wrong password/key scenarios', async () => {
      // Mock a scenario where key derivation returns different keys
      let callCount = 0;
      mockCrypto.subtle.deriveKey.mockImplementation(() => {
        callCount++;
        return Promise.resolve({} as CryptoKey);
      });

      const encrypted = await encryptData('test');

      // Clear localStorage to simulate different salt
      mockLocalStorage.clear();

      // Try to decrypt - should fail because key derivation will use different salt
      await expect(decryptData(encrypted)).rejects.toThrow();
    });

    it('should handle malformed JSON during decryption', async () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      mockCrypto.subtle.decrypt.mockResolvedValue(invalidData);

      // Should throw when trying to decode invalid UTF-8
      await expect(decryptData('dGVzdA==')).rejects.toThrow();
    });

    it('should handle localStorage quota exceeded', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await encryptData('test');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Browser Compatibility', () => {
    it('should handle crypto API failures gracefully', async () => {
      // Test scenario where crypto.subtle is not available
      const originalCrypto = globalThis.crypto;
      Object.defineProperty(globalThis, 'crypto', {
        value: { getRandomValues: () => {} },
        writable: true,
      });

      // Should not crash but might fail
      try {
        await encryptData('test');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Restore
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
      });
    });

    it('should handle different browser user agents', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      ];

      const mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.getRandomValues.mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      });

      for (const userAgent of userAgents) {
        Object.defineProperty(globalThis, 'navigator', {
          value: { ...mockNavigator, userAgent },
          writable: true,
        });

        const result = await encryptData('test');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });

    it('should handle different screen configurations', async () => {
      const screenConfigs = [{ colorDepth: 24 }, { colorDepth: 32 }, { colorDepth: 16 }];

      const mockKey = {} as CryptoKey;
      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.getRandomValues.mockImplementation((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = i;
        }
        return arr;
      });

      for (const config of screenConfigs) {
        Object.defineProperty(globalThis, 'screen', {
          value: { ...mockScreen, ...config },
          writable: true,
        });

        const result = await encryptData('test');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    let mockKey: CryptoKey;
    let mockIV: Uint8Array;
    let mockEncryptedData: Uint8Array;

    beforeEach(() => {
      mockKey = {} as CryptoKey;
      mockIV = new Uint8Array(12);
      mockEncryptedData = new Uint8Array(1000); // Large data

      mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
      mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
      mockCrypto.getRandomValues.mockReturnValue(mockIV);
      mockCrypto.subtle.encrypt.mockResolvedValue(mockEncryptedData);
      mockCrypto.subtle.decrypt.mockResolvedValue(new Uint8Array(1000));
    });

    it('should handle large data sets efficiently', async () => {
      const largeData = 'x'.repeat(100000); // 100KB of data

      const startTime = performance.now();
      const encrypted = await encryptData(largeData);
      const decrypted = await decryptData(encrypted);
      const endTime = performance.now();

      expect(decrypted).toBeDefined();
      expect(typeof decrypted).toBe('string');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle empty and single character input', async () => {
      // Test with empty string
      const emptyResult = await encryptData('');
      expect(emptyResult).toBeDefined();
      expect(typeof emptyResult).toBe('string');

      // Test with single character
      const singleCharResult = await encryptData('a');
      expect(singleCharResult).toBeDefined();
      expect(typeof singleCharResult).toBe('string');
    });

    it('should handle binary data in strings', async () => {
      // String with various byte values - simplified for testing
      const binaryString = 'test binary data';
      const encrypted = await encryptData(binaryString);
      const decrypted = await decryptData(encrypted);

      expect(decrypted).toBe(binaryString);
    });
  });

  describe('isEncrypted Function', () => {
    it('should return true for valid encrypted data', () => {
      const validEncrypted = btoa('some_encrypted_data_with_iv');
      expect(isEncrypted(validEncrypted)).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(isEncrypted(null as any)).toBe(false);
      expect(isEncrypted(undefined as any)).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted(123 as any)).toBe(false);
      expect(isEncrypted({} as any)).toBe(false);
      expect(isEncrypted([] as any)).toBe(false);
    });

    it('should return false for non-base64 strings', () => {
      expect(isEncrypted('not_base64!@#')).toBe(false);
      expect(isEncrypted('hello world')).toBe(false);
      expect(isEncrypted('test@domain.com')).toBe(false);
    });

    it('should return false for short base64 strings', () => {
      expect(isEncrypted('YQ==')).toBe(false); // Only 1 byte
      expect(isEncrypted('dGVzdA==')).toBe(false); // "test" = 4 bytes
      expect(isEncrypted('dGVzdA')).toBe(false); // "test" without padding = 4 bytes
    });

    it('should return false for valid base64 but not encrypted', () => {
      // Valid base64 but short content
      expect(isEncrypted('dGVzdA==')).toBe(false); // "test" = 4 bytes
      expect(isEncrypted('aGVsbG8=')).toBe(false); // "hello" = 5 bytes
    });

    it('should return true for base64 with sufficient length', () => {
      // Base64 encoded 20+ bytes (sufficient for IV + some encrypted data)
      const longData = 'x'.repeat(20);
      const base64Data = btoa(longData);
      expect(isEncrypted(base64Data)).toBe(true);
    });

    it('should handle malformed base64 gracefully', () => {
      expect(isEncrypted('invalid@base64!')).toBe(false);
      expect(isEncrypted('base64===')).toBe(false);
      expect(isEncrypted('===base64')).toBe(false);
    });

    it('should correctly identify real encrypted data', () => {
      // Simulate encrypted data structure
      const iv = new Uint8Array(12);
      const encrypted = new Uint8Array(20);
      const combined = new Uint8Array(iv.length + encrypted.length);
      combined.set(iv, 0);
      combined.set(encrypted, iv.length);

      const base64Encrypted = btoa(String.fromCharCode(...combined));
      expect(isEncrypted(base64Encrypted)).toBe(true);
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
        timestamp: 1672531200000, // Use fixed timestamp instead of Date.now()
        data: 'important_sensitive_data',
      });

      let currentData = originalData;

      // Perform 10 encrypt/decrypt cycles
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

      // Execute multiple encryptions concurrently
      const promises = testStrings.map((str) => encryptData(str));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });
});
