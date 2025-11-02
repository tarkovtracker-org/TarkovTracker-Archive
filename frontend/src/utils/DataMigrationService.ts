import type { GameMode } from '@/shared_state';
import { hasLocalData as hasLocalProgress, getLocalData } from './LocalDataService';
import type { ExportObject, ProgressData } from './DataMigrationTypes';
import {
  hasUserData as firestoreHasUserData,
  migrateLocalDataToUser,
  importDataToUser as importDataToFirestore,
} from './FirestoreMigrationService';
import { validateImportData as validateImportJson } from './DataValidationService';
import { fetchDataWithApiToken } from './ExternalApiService';

export { type ProgressData, type ExportObject } from './DataMigrationTypes';

export default class DataMigrationService {
  static hasLocalData(): boolean {
    return hasLocalProgress();
  }

  static getLocalData(): ProgressData | null {
    return getLocalData();
  }

  static async hasUserData(uid: string): Promise<boolean> {
    return firestoreHasUserData(uid);
  }

  static async migrateDataToUser(uid: string): Promise<boolean> {
    if (!uid) {
      return false;
    }
    const localData = getLocalData();
    if (!localData) {
      return false;
    }
    return migrateLocalDataToUser(uid, localData);
  }

  static exportDataForMigration(): ExportObject | null {
    const data = getLocalData();
    if (!data) return null;
    return {
      type: 'tarkovtracker-migration',
      timestamp: new Date().toISOString(),
      version: 1,
      data,
    };
  }

  static validateImportData(jsonString: string): ProgressData | null {
    return validateImportJson(jsonString);
  }

  static async importDataToUser(
    uid: string,
    importedData: ProgressData,
    targetGameMode?: GameMode
  ): Promise<boolean> {
    return importDataToFirestore(uid, importedData, targetGameMode);
  }

  static async fetchDataWithApiToken(
    apiToken: string,
    oldDomain: string = 'https://tarkovtracker.io/api/v2/progress'
  ): Promise<ProgressData | null> {
    return fetchDataWithApiToken(apiToken, oldDomain);
  }
}
