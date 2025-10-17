import { firestore } from '@/plugins/firebase';
import { doc, getDoc, setDoc } from '@/plugins/firebase';
import type { DocumentData } from 'firebase/firestore';
import type { GameMode, UserState, UserProgressData } from '@/shared_state';
import { defaultState, migrateToGameModeStructure } from '@/shared_state';
import { logger } from '@/utils/logger';
import type { ProgressData } from './DataMigrationTypes';
import {
  transformTaskObjectives,
  transformHideoutParts,
  transformTraderStandings,
} from './DataTransformService';
import { backupLocalProgress, saveLocalUserState } from './LocalDataService';

const getProgressRef = (uid: string) => doc(firestore, 'progress', uid);

const hasMeaningfulProgress = (data: ProgressData): boolean =>
  data.level > 1 ||
  Object.keys(data.taskCompletions || {}).length > 0 ||
  Object.keys(data.taskObjectives || {}).length > 0 ||
  Object.keys(data.hideoutModules || {}).length > 0 ||
  Object.keys(data.hideoutParts || {}).length > 0;

interface ImportedProgressMetadata extends UserProgressData {
  lastUpdated: string;
  importedFromExternalSource: boolean;
  importDate: string;
  importedFromApi?: boolean;
  sourceUserId?: string;
  sourceDomain?: string;
}

export const hasUserData = async (uid: string): Promise<boolean> => {
  try {
    const progressRef = getProgressRef(uid);
    const progressDoc = await getDoc(progressRef);
    const exists = progressDoc.exists();
    const data: ProgressData = (progressDoc.data() as ProgressData) || {};
    return exists && Object.keys(data).length > 0 && hasMeaningfulProgress(data);
  } catch (error) {
    logger.warn('[FirestoreMigrationService] Error checking user data presence:', error);
    return false;
  }
};

const shouldAbortMigration = (existingData: ProgressData | null): boolean =>
  Boolean(existingData && hasMeaningfulProgress(existingData));

const enrichLocalDataForMigration = (localData: ProgressData): ProgressData => ({
  ...localData,
  lastUpdated: new Date().toISOString(),
  migratedFromLocalStorage: true,
  migrationDate: new Date().toISOString(),
  autoMigrated: true,
  imported: localData.displayName ? localData.imported : true,
});

export const migrateLocalDataToUser = async (
  uid: string,
  localData: ProgressData
): Promise<boolean> => {
  try {
    const progressRef = getProgressRef(uid);
    let existingData: ProgressData | null = null;
    try {
      const existingDoc = await getDoc(progressRef);
      existingData = existingDoc.exists() ? ((existingDoc.data() as ProgressData) || null) : null;
    } catch (error) {
      logger.warn('[FirestoreMigrationService] Error checking existing user data proceeding', error);
    }

    if (shouldAbortMigration(existingData)) {
      logger.warn(
        '[FirestoreMigrationService] User already has data, aborting automatic migration.'
      );
      return false;
    }

    const enrichedData = enrichLocalDataForMigration({ ...localData });
    await setDoc(progressRef, enrichedData as DocumentData, { merge: true });
    backupLocalProgress(enrichedData);
    return true;
  } catch (error) {
    logger.error('[FirestoreMigrationService] Error migrating local data to Firestore:', error);
    return false;
  }
};

const toTransformedProgressData = (importedData: ProgressData): UserProgressData => ({
  level: importedData.level || 1,
  pmcFaction: (importedData.pmcFaction?.toUpperCase() as 'USEC' | 'BEAR') || 'USEC',
  displayName: importedData.displayName || null,
  taskObjectives: transformTaskObjectives(importedData.taskObjectives || {}),
  taskCompletions: importedData.taskCompletions || {},
  hideoutParts: transformHideoutParts(importedData.hideoutParts || {}),
  hideoutModules: importedData.hideoutModules || {},
  traderStandings: transformTraderStandings(importedData.traderStandings || {}),
});

const parseGameEdition = (importedData: ProgressData): number =>
  typeof importedData.gameEdition === 'string'
    ? parseInt(importedData.gameEdition) || 1
    : importedData.gameEdition || 1;

const attachImportedMetadata = (
  progressData: UserProgressData,
  importedData: ProgressData
): ImportedProgressMetadata => {
  const metadata: ImportedProgressMetadata = {
    ...progressData,
    lastUpdated: new Date().toISOString(),
    importedFromExternalSource: true,
    importDate: new Date().toISOString(),
    importedFromApi: importedData.importedFromApi || false,
    sourceUserId: importedData.sourceUserId ?? undefined,
    sourceDomain: importedData.sourceDomain ?? undefined,
  };

  if (importedData.sourceUserId) {
    metadata.sourceUserId = importedData.sourceUserId;
  }
  if (importedData.sourceDomain) {
    metadata.sourceDomain = importedData.sourceDomain;
  }

  return metadata;
};

const buildImportedUserState = (importedData: ProgressData, existingData: UserState): UserState => {
  const transformedProgressData = toTransformedProgressData(importedData);
  const gameEdition = parseGameEdition(importedData);
  const gameDataWithMetadata = attachImportedMetadata(transformedProgressData, importedData);

  const newUserState: UserState = {
    ...existingData,
    currentGameMode: 'pvp',
    gameEdition,
    pvp: gameDataWithMetadata,
  };

  return newUserState;
};

export const importDataToUser = async (
  uid: string,
  importedData: ProgressData,
  _targetGameMode?: GameMode
): Promise<boolean> => {
  if (!uid) {
    logger.error('[FirestoreMigrationService] No UID provided for importDataToUser.');
    return false;
  }
  if (!importedData) {
    logger.error('[FirestoreMigrationService] No data provided for importDataToUser.');
    return false;
  }
  try {
    const progressRef = getProgressRef(uid);
    let existingData: UserState = { ...defaultState };

    try {
      const existingDoc = await getDoc(progressRef);
      if (existingDoc.exists()) {
        const rawData = existingDoc.data();
        existingData = migrateToGameModeStructure(rawData);
      }
    } catch (error) {
      logger.warn('[FirestoreMigrationService] Could not get existing data, using defaults:', error);
    }

    const newUserState = buildImportedUserState(importedData, existingData);
    await setDoc(progressRef, newUserState as DocumentData, { merge: true });
    saveLocalUserState(newUserState);
    return true;
  } catch (error) {
    logger.error(
      `[FirestoreMigrationService] General error in importDataToUser for user ${uid}:`,
      error
    );
    return false;
  }
};
