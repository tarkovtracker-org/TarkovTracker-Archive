import { logger } from '@/utils/logger';

/**
 * Storage encryption utility for protecting sensitive data in localStorage.
 * Uses AES-GCM encryption with the Web Crypto API.
 *
 * Security considerations:
 * - In a client-side-only app, the encryption key must be accessible to the client
 * - This provides defense-in-depth against casual inspection and some attack vectors
 * - The key is derived from browser fingerprint + stored salt for consistency
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const SALT_LENGTH = 16;
const STORAGE_KEY_SALT = 'tt_storage_salt';

/**
 * Generates a cryptographically secure random buffer
 */
const generateRandomBuffer = (length: number): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(length));
};

/**
 * Gets or creates a persistent salt for key derivation
 */
const getOrCreateSalt = (): Uint8Array => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SALT);
    if (stored) {
      return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    }
  } catch (error) {
    logger.warn('[Encryption] Failed to retrieve salt:', error);
  }

  // Generate new salt
  const salt = generateRandomBuffer(SALT_LENGTH);
  try {
    localStorage.setItem(STORAGE_KEY_SALT, btoa(String.fromCharCode(...salt)));
  } catch (error) {
    logger.warn('[Encryption] Failed to store salt:', error);
  }
  return salt;
};

/**
 * Derives an encryption key from browser characteristics and a salt.
 * This provides a consistent key across sessions while adding some obfuscation.
 */
const deriveEncryptionKey = async (): Promise<CryptoKey> => {
  const salt = getOrCreateSalt();

  // Create a key derivation material from browser characteristics
  const keyMaterial = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    'tarkovtracker_v1', // App-specific constant
  ].join('|');

  const encoder = new TextEncoder();
  const keyMaterialBuffer = encoder.encode(keyMaterial);

  // Import the key material
  const importedKey = await crypto.subtle.importKey('raw', keyMaterialBuffer, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);

  // Derive the actual encryption key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    importedKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
};

/**
 * Encrypts a string using AES-GCM
 * @param plaintext - The data to encrypt
 * @returns Base64-encoded encrypted data with IV prepended
 */
export const encryptData = async (plaintext: string): Promise<string> => {
  try {
    const key = await deriveEncryptionKey();
    const iv = generateRandomBuffer(IV_LENGTH);
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv as BufferSource,
      },
      key,
      data as BufferSource
    );

    // Prepend IV to encrypted data for storage
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // Convert to base64 for string storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    logger.error('[Encryption] Failed to encrypt data:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypts AES-GCM encrypted data
 * @param encryptedData - Base64-encoded encrypted data with IV prepended
 * @returns Decrypted plaintext string
 */
export const decryptData = async (encryptedData: string): Promise<string> => {
  try {
    const key = await deriveEncryptionKey();

    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv as BufferSource,
      },
      key,
      data as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    logger.error('[Encryption] Failed to decrypt data:', error);
    throw new Error('Decryption failed');
  }
};

/**
 * Checks if a string appears to be encrypted data
 * (base64 string with sufficient length for IV + some data)
 */
export const isEncrypted = (data: string): boolean => {
  if (!data || typeof data !== 'string') {
    return false;
  }

  // Check if it looks like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Regex.test(data)) {
    return false;
  }

  // Check if it's long enough to contain IV + some encrypted data
  try {
    const decoded = atob(data);
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
};
