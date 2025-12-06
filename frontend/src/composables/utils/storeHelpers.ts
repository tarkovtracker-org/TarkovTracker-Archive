import type { Store } from 'pinia';
import type { DocumentData } from 'firebase/firestore';
import { logger } from '@/utils/logger';

/**
 * Clears store properties that are not present in the new state
 * This ensures the store doesn't retain stale data when Firebase documents are updated
 */
export function clearStaleState(
  store: Store,
  newState?: DocumentData | Record<string, unknown>
): void {
  try {
    const currentState = store.$state;
    const missingProperties = Object.keys(currentState).filter((key) => {
      if (typeof newState === 'undefined') return true;
      try {
        return !Object.prototype.hasOwnProperty.call(newState, key);
      } catch (error) {
        logger.error(`Error checking property ${key}:`, error);
        return true;
      }
    });
    if (missingProperties.length > 0) {
      const missingPropertiesObject = missingProperties.reduce(
        (acc, key) => {
          acc[key] = null;
          return acc;
        },
        {} as Record<string, null>
      );
      store.$patch(missingPropertiesObject);
    }
  } catch (error) {
    logger.error('Error clearing stale state:', error);
  }
}

/**
 * Safely patches a store with new data
 */
export function safePatchStore(store: Store, data: DocumentData | Record<string, unknown>): void {
  try {
    if (data && typeof data === 'object') {
      store.$patch(data);
    } else {
      if (import.meta.env.DEV) {
        logger.warn('Invalid data provided to safePatchStore:', data);
      }
    }
  } catch (error) {
    logger.error('Error patching store:', error);
  }
}

/**
 * Resets a store to empty state by clearing all properties
 */
export function resetStore(store: Store): void {
  try {
    clearStaleState(store, {});
  } catch (error) {
    logger.error('Error resetting store:', error);
  }
}

/**
 * Development-only logging utility
 */
export function devLog(_message: string, ..._args: unknown[]): void {
  // Development logging disabled
}

/**
 * Development-only warning utility
 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    logger.warn(`[DEV] ${message}`, ...args);
  }
}

/**
 * Development-only error logging utility
 */
export function devError(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    logger.error(`[DEV] ${message}`, ...args);
  }
}

/**
 * Creates a deep copy of an object using JSON methods
 * Note: This method has limitations (no functions, dates become strings, etc.)
 * Use only for simple data structures
 */
export function safeJsonCopy<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    logger.error('Error creating JSON copy:', error);
    return obj;
  }
}

/**
 * Checks if a value is a non-empty object
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Safely gets a nested property from an object
 */
export function safeGet<T>(obj: unknown, path: string, defaultValue?: T): T | undefined {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = (result as Record<string, unknown>)[key];
      } else {
        return defaultValue;
      }
    }
    return result as T | undefined;
  } catch (error) {
    logger.error(`Error getting property ${path}:`, error);
    return defaultValue;
  }
}
