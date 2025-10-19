import { logger } from '@/utils/logger';
import type { ProgressData } from './DataMigrationTypes';
import CryptoJS from 'crypto-js'; // AES encryption

// Encryption key, ideally should be per-user/session and not hardcoded
const LOCAL_STORAGE_SECRET = 'change_this_secret_key'; // TODO: Use a secure key derivation in production
export const LOCAL_PROGRESS_KEY = 'progress';
export const LOCAL_USER_STATE_KEY = 'user_state';

// eslint-disable-next-line complexity
function decryptStr(cipherText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, LOCAL_STORAGE_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    logger.warn('[LocalDataService] Failed to decrypt local data:', err);
    return '';
  }
}

function encryptStr(plainText: string): string {
  try {
    return CryptoJS.AES.encrypt(plainText, LOCAL_STORAGE_SECRET).toString();
  } catch (err) {
    logger.warn('[LocalDataService] Failed to encrypt data:', err);
    return '';
  }
}

// eslint-disable-next-line complexity
export const hasLocalData = (): boolean => {
  try {
    const encryptedProgressData =
      localStorage.getItem(LOCAL_USER_STATE_KEY) ?? localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!encryptedProgressData || encryptedProgressData === '{}') {
      return false;
    }
    let decryptedProgressData = decryptStr(encryptedProgressData);
    // fallback for pre-migration plain text
    if (!decryptedProgressData && encryptedProgressData.startsWith('{')) {
      decryptedProgressData = encryptedProgressData;
    }
    const parsedData: ProgressData = JSON.parse(decryptedProgressData);
    const hasKeys = Object.keys(parsedData).length > 0;
    const hasProgress =
      parsedData.level > 1 ||
      Object.keys(parsedData.taskCompletions || {}).length > 0 ||
      Object.keys(parsedData.taskObjectives || {}).length > 0 ||
      Object.keys(parsedData.hideoutModules || {}).length > 0 ||
      Object.keys(parsedData.hideoutParts || {}).length > 0;
    return hasKeys && hasProgress;
  } catch (error) {
    logger.warn('[LocalDataService] Error checking local data availability:', error);
    return false;
  }
};

export const getLocalData = (): ProgressData | null => {
  try {
    const encryptedProgressData =
      localStorage.getItem(LOCAL_USER_STATE_KEY) ?? localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!encryptedProgressData) {
      return null;
    }
    let decryptedProgressData = decryptStr(encryptedProgressData);
    // fallback for pre-migration plain text
    if (!decryptedProgressData && encryptedProgressData.startsWith('{')) {
      decryptedProgressData = encryptedProgressData;
    }
    const parsedData: ProgressData = JSON.parse(decryptedProgressData);
    if (Object.keys(parsedData).length > 0) {
      return JSON.parse(JSON.stringify(parsedData)) as ProgressData;
    }
    return null;
  } catch (error) {
    logger.warn('[LocalDataService] Error retrieving local data:', error);
    return null;
  }
};

export const backupLocalProgress = (data: ProgressData): void => {
  const backupKey = `progress_backup_${new Date().toISOString()}`;
  try {
    localStorage.setItem(backupKey, JSON.stringify(data));
  } catch (error) {
    logger.warn('[LocalDataService] Failed to create local backup copy:', error);
  }
};

export const saveLocalProgress = (data: unknown): void => {
  try {
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(data));
  } catch (error) {
    logger.warn('[LocalDataService] Failed to persist local progress:', error);
  }
};

export const saveLocalUserState = (state: unknown): void => {
  try {
    const stateStr = JSON.stringify(state);
    const encryptedState = encryptStr(stateStr);
    localStorage.setItem(LOCAL_USER_STATE_KEY, encryptedState);
  } catch (error) {
    logger.warn('[LocalDataService] Failed to persist local user state:', error);
  }
};
