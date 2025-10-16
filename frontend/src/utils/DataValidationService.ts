import { logger } from '@/utils/logger';
import type { ProgressData } from './DataMigrationTypes';

export const validateImportData = (jsonString: string): ProgressData | null => {
  try {
    const parsedJson = JSON.parse(jsonString) as unknown;
    if (
      typeof parsedJson !== 'object' ||
      parsedJson === null ||
      !('type' in parsedJson) ||
      (parsedJson as { type: unknown }).type !== 'tarkovtracker-migration' ||
      !('data' in parsedJson)
    ) {
      logger.warn(
        '[DataValidationService] Invalid import type or structure in parsed JSON:',
        (parsedJson as { type?: unknown })?.type
      );
      return null;
    }
    const data = (parsedJson as { data: unknown }).data as ProgressData;
    if (typeof data.level !== 'number') {
      logger.warn('[DataValidationService] Invalid level in import data.');
      return null;
    }
    return data;
  } catch (error) {
    logger.error('[DataValidationService] Error validating import data:', error);
    return null;
  }
};
