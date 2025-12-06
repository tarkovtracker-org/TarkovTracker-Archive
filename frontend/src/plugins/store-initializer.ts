import { logger } from '@/utils/logger';

/**
 * Simplified store initialization and data migration utilities
 */
let isStoreInitialized = false;

export function markInitialized(): void {
  isStoreInitialized = true;
}

export function isInitialized(): boolean {
  return isStoreInitialized;
}

export function forceInitialize(): void {
  markInitialized();
}
// Data migration utilities
export function wasDataMigrated(): boolean {
  if (typeof window !== 'undefined') {
    return (
      window.__TARKOV_DATA_MIGRATED === true ||
      sessionStorage.getItem('tarkovDataMigrated') === 'true'
    );
  }
  return false;
}

export function markDataMigrated(): void {
  if (typeof window !== 'undefined') {
    window.__TARKOV_DATA_MIGRATED = true;
    try {
      sessionStorage.setItem('tarkovDataMigrated', 'true');
    } catch (e) {
      logger.warn('Could not save migration flag to sessionStorage', e);
    }
  }
}
