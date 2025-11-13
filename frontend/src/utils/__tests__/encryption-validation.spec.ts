import { describe, it, expect } from 'vitest';
import { isEncrypted } from '../encryption';

describe('Encryption Service - Validation', () => {
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
});
