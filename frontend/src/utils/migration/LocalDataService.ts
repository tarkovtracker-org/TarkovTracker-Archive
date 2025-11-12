import { logger } from '@/utils/logger';
import { encryptData, decryptData, isEncrypted } from '@/utils/encryption';
import type { ProgressData } from '@/utils/migration/DataMigrationTypes';
export const LOCAL_PROGRESS_KEY = 'progress';
export const LOCAL_USER_STATE_KEY = 'user_state';
// Sensitive field names that should be removed from data before localStorage storage
export const SENSITIVE_FIELDS = [
  'sourceUserId', // External user identifier
  'sourceDomain', // API endpoint URL
] as const;
/**
 * Sanitizes progress data before localStorage storage by removing
 * potentially sensitive metadata fields that could identify users
 * or expose API endpoints.
 *
 * Fields removed are defined in SENSITIVE_FIELDS constant.
 *
 * @param data - The progress data to sanitize
 * @returns Sanitized copy of the data safe for localStorage
 */
const sanitizeProgressData = <T extends Record<string, unknown>>(data: T): T => {
  const sanitized = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    delete sanitized[field];
  }
  return sanitized;
};
// eslint-disable-next-line complexity
export const hasLocalData = async (): Promise<boolean> => {
  try {
    const encryptedData =
      localStorage.getItem(LOCAL_USER_STATE_KEY) ?? localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!encryptedData || encryptedData === '{}') {
      return false;
    }
    let progressData: string;
    // Handle backward compatibility with unencrypted data
    if (isEncrypted(encryptedData)) {
      progressData = await decryptData(encryptedData);
    } else {
      progressData = encryptedData;
      // Migrate unencrypted data to encrypted format
      logger.info('[LocalDataService] Migrating unencrypted data to encrypted format');
      const parsed = JSON.parse(progressData);
      await saveLocalProgress(parsed);
    }
    const parsedData: ProgressData = JSON.parse(progressData);
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
export const getLocalData = async (): Promise<ProgressData | null> => {
  try {
    const encryptedData =
      localStorage.getItem(LOCAL_USER_STATE_KEY) ?? localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!encryptedData) {
      return null;
    }
    let progressData: string;
    // Handle backward compatibility with unencrypted data
    if (isEncrypted(encryptedData)) {
      progressData = await decryptData(encryptedData);
    } else {
      progressData = encryptedData;
      // Migrate unencrypted data to encrypted format
      logger.info('[LocalDataService] Migrating unencrypted data to encrypted format');
      const parsed = JSON.parse(progressData);
      await saveLocalProgress(parsed);
    }
    const parsedData: ProgressData = JSON.parse(progressData);
    if (Object.keys(parsedData).length > 0) {
      return JSON.parse(JSON.stringify(parsedData)) as ProgressData;
    }
    return null;
  } catch (error) {
    logger.warn('[LocalDataService] Error retrieving local data:', error);
    return null;
  }
};
export const backupLocalProgress = async (data: ProgressData): Promise<void> => {
  const backupKey = `progress_backup_${new Date().toISOString()}`;
  try {
    const sanitizedData = sanitizeProgressData(data);
    const jsonData = JSON.stringify(sanitizedData);
    const encryptedData = await encryptData(jsonData);
    localStorage.setItem(backupKey, encryptedData);
  } catch (error) {
    logger.warn('[LocalDataService] Failed to create local backup copy:', error);
  }
};
export const saveLocalProgress = async (data: unknown): Promise<void> => {
  try {
    const sanitizedData =
      data && typeof data === 'object'
        ? sanitizeProgressData(data as Record<string, unknown>)
        : data;
    const jsonData = JSON.stringify(sanitizedData);
    const encryptedData = await encryptData(jsonData);
    localStorage.setItem(LOCAL_PROGRESS_KEY, encryptedData);
  } catch (error) {
    logger.warn('[LocalDataService] Failed to persist local progress:', error);
  }
};
export const saveLocalUserState = async (state: unknown): Promise<void> => {
  try {
    const sanitizedState =
      state && typeof state === 'object'
        ? sanitizeProgressData(state as Record<string, unknown>)
        : state;
    const jsonData = JSON.stringify(sanitizedState);
    const encryptedData = await encryptData(jsonData);
    localStorage.setItem(LOCAL_USER_STATE_KEY, encryptedData);
  } catch (error) {
    logger.warn('[LocalDataService] Failed to persist local user state:', error);
  }
};
