import { logger } from '@/utils/logger';
import type { ProgressData } from './DataMigrationTypes';

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
export const hasLocalData = (): boolean => {
  try {
    const progressData =
      localStorage.getItem(LOCAL_USER_STATE_KEY) ?? localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!progressData || progressData === '{}') {
      return false;
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

export const getLocalData = (): ProgressData | null => {
  try {
    const progressData =
      localStorage.getItem(LOCAL_USER_STATE_KEY) ?? localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!progressData) {
      return null;
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

export const backupLocalProgress = (data: ProgressData): void => {
  const backupKey = `progress_backup_${new Date().toISOString()}`;
  try {
    const sanitizedData = sanitizeProgressData(data);
    localStorage.setItem(backupKey, JSON.stringify(sanitizedData));
  } catch (error) {
    logger.warn('[LocalDataService] Failed to create local backup copy:', error);
  }
};

export const saveLocalProgress = (data: unknown): void => {
  try {
    const sanitizedData =
      data && typeof data === 'object'
        ? sanitizeProgressData(data as Record<string, unknown>)
        : data;
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(sanitizedData));
  } catch (error) {
    logger.warn('[LocalDataService] Failed to persist local progress:', error);
  }
};

export const saveLocalUserState = (state: unknown): void => {
  try {
    const sanitizedState =
      state && typeof state === 'object'
        ? sanitizeProgressData(state as Record<string, unknown>)
        : state;
    localStorage.setItem(LOCAL_USER_STATE_KEY, JSON.stringify(sanitizedState));
  } catch (error) {
    logger.warn('[LocalDataService] Failed to persist local user state:', error);
  }
};