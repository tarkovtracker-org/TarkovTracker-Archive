import type { Store } from 'pinia';
import type { StoreWithFireswapExt } from '@/plugins/pinia-firestore';
import { logger } from '@/utils/logger';
import { isDevAuthEnabled } from '@/utils/devAuth';
const DEFAULT_ERROR_MESSAGE = 'Unable to complete the operation';
/**
 * Helper to preserve specific localStorage keys when clearing
 * This prevents losing user settings when resetting progress
 */
export const preserveLocalStorageKeys = (keysToPreserve: string[]): Map<string, string> => {
  const preserved = new Map<string, string>();
  keysToPreserve.forEach((key) => {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        preserved.set(key, value);
      }
    } catch (error) {
      logger.warn(`Failed to get localStorage key '${key}':`, error);
      // Continue to the next key even if this one fails
    }
  });
  return preserved;
};
export const restoreLocalStorageKeys = (preserved: Map<string, string>): void => {
  preserved.forEach((value, key) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      logger.error(`Failed to restore localStorage key '${key}':`, error);
    }
  });
};
export const getPrimaryFireswapSetting = <StoreType extends Store>(
  store: StoreWithFireswapExt<StoreType>
) => {
  const settings = store?._fireswapSettings;
  return settings && settings.length > 0 ? settings[0] : null;
};
export const setFireswapLock = <
  StoreType extends Store,
  Setting extends NonNullable<StoreWithFireswapExt<StoreType>['_fireswapSettings']>[number],
>(
  setting: Setting | null,
  locked: boolean
): void => {
  if (setting) {
    setting.lock = locked;
  }
};
export const cancelPendingUpload = <
  StoreType extends Store,
  Setting extends NonNullable<StoreWithFireswapExt<StoreType>['_fireswapSettings']>[number],
>(
  setting: Setting | null
): void => {
  setting?.uploadDocument?.cancel?.();
};
export const scheduleLockRelease = <
  StoreType extends Store,
  Setting extends NonNullable<StoreWithFireswapExt<StoreType>['_fireswapSettings']>[number],
>(
  setting: Setting | null,
  delay = 100
): ReturnType<typeof setTimeout> | undefined => {
  if (!setting) {
    return undefined;
  }
  return setTimeout(() => {
    setFireswapLock(setting, false);
  }, delay);
};
const isQuotaExceededError = (error: unknown): boolean => {
  return (
    error instanceof DOMException &&
    (error.code === 22 ||
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
};
const trySessionStorageFallback = (key: string, serialized: string): void => {
  try {
    sessionStorage.setItem(key, serialized);
    console.debug('[FireSwap] Using sessionStorage fallback (dev mode)');
    logger.warn(`Fell back to sessionStorage for key '${key}'`);
  } catch (sessionError) {
    logger.error(`sessionStorage fallback also failed for key '${key}'`, sessionError);
  }
};
export const saveToLocalStorage = (
  key: string,
  value: unknown,
  errorMessage: string = DEFAULT_ERROR_MESSAGE
): void => {
  const finalErrorMessage = errorMessage || DEFAULT_ERROR_MESSAGE;
  // Attempt JSON.stringify first to detect circular references.
  // If a circular reference is detected, log and return immediately (no storage or fallback).
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {
    if (error instanceof TypeError) {
      logger.error(`Circular reference serialization failed for key '${key}':`, error);
      // No fallback attempted for circular references; function returns here.
      return;
    }
    // For non-TypeError cases (unexpected serialization issues), log and return.
    logger.error(finalErrorMessage, error);
    return;
  }
  // If serialization succeeded, attempt to store the serialized value.
  try {
    localStorage.setItem(key, serialized);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      logger.error(`localStorage quota exceeded for key '${key}'`, error);
      // Attempt fallback to sessionStorage only in development contexts
      if (import.meta.env.DEV || isDevAuthEnabled()) {
        trySessionStorageFallback(key, serialized);
      }
    } else {
      logger.error(finalErrorMessage, error);
    }
  }
};
