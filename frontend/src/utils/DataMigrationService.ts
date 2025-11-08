import type { GameMode } from '@/shared_state';
import { hasLocalData as hasLocalProgress, getLocalData } from './LocalDataService';
import type { ExportObject, ProgressData } from './DataMigrationTypes';
import {
  hasUserData as firestoreHasUserData,
  migrateLocalDataToUser,
  importDataToUser as importDataToFirestore,
  type MigrationResult,
} from './FirestoreMigrationService';
import { validateImportData as validateImportJson } from './DataValidationService';
import { fetchDataWithApiToken } from './ExternalApiService';
export { type ProgressData, type ExportObject } from './DataMigrationTypes';
export type { MigrationResult } from './FirestoreMigrationService';
export default class DataMigrationService {
  static async hasLocalData(): Promise<boolean> {
    return await hasLocalProgress();
  }
  static async getLocalData(): Promise<ProgressData | null> {
    return await getLocalData();
  }
  static async hasUserData(uid: string): Promise<boolean> {
    return firestoreHasUserData(uid);
  }
  static async migrateDataToUser(uid: string): Promise<MigrationResult> {
    if (!uid) {
      return { success: false, error: 'No UID provided' };
    }
    const localData = await getLocalData();
    if (!localData) {
      return { success: false, error: 'No local data available' };
    }
    return migrateLocalDataToUser(uid, localData);
  }
  static async exportDataForMigration(): Promise<ExportObject | null> {
    const data = await getLocalData();
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
  ): Promise<MigrationResult> {
    return importDataToFirestore(uid, importedData, targetGameMode);
  }
  static async fetchDataWithApiToken(
    apiToken: string,
    endpointUrl: string = import.meta.env.VITE_PROGRESS_ENDPOINT ||
      'https://tarkovtracker.io/api/v2/progress'
  ): Promise<ProgressData | null> {
    return fetchDataWithApiToken(apiToken, endpointUrl);
  }
}
