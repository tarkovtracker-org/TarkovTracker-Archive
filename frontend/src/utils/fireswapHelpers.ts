import type { Store } from 'pinia';
import type { StoreWithFireswapExt, FireswapSettingInternal } from '@/plugins/pinia-firestore';
import { logger } from '@/utils/logger';

/**
 * Helper to preserve specific localStorage keys when clearing
 * This prevents losing user settings when resetting progress
 */
export const preserveLocalStorageKeys = (keysToPreserve: string[]): Map<string, string> => {
  const preserved = new Map<string, string>();
  keysToPreserve.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      preserved.set(key, value);
    }
  });
  return preserved;
};

export const restoreLocalStorageKeys = (preserved: Map<string, string>): void => {
  preserved.forEach((value, key) => {
    localStorage.setItem(key, value);
  });
};

export const getPrimaryFireswapSetting = <StoreType extends Store>(
  store: StoreWithFireswapExt<StoreType>
): FireswapSettingInternal | null => {
  const settings = store?._fireswapSettings;
  return settings && settings.length > 0 ? settings[0] : null;
};

export const setFireswapLock = (setting: FireswapSettingInternal | null, locked: boolean): void => {
  if (setting) {
    setting.lock = locked;
  }
};

export const cancelPendingUpload = (setting: FireswapSettingInternal | null): void => {
  setting?.uploadDocument?.cancel?.();
};

export const scheduleLockRelease = (setting: FireswapSettingInternal | null, delay = 100): void => {
  if (!setting) {
    return;
  }
  setTimeout(() => {
    setFireswapLock(setting, false);
  }, delay);
};

export const saveToLocalStorage = (key: string, value: unknown, errorMessage: string): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logger.error(errorMessage, error);
  }
};
