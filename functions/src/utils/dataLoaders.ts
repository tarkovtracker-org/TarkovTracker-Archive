import functions from 'firebase-functions';
import { Firestore, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { createLazyFirestore } from './factory';

// Define interfaces for Firestore document data structures
interface TaskData {
  [taskId: string]: unknown;
}

interface HideoutData {
  [moduleId: string]: unknown;
}

interface CacheEntry<T> {
  data: T | null;
  inFlight?: Promise<T | null>;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Generic Firestore document loader with in-memory caching and in-flight promise handling
async function loadAndCache<T>(
  collection: string,
  doc: string,
  errorLabel: string
): Promise<T | null> {
  const cacheKey = `${collection}/${doc}`;
  const cached = cache.get(cacheKey);
  
  // If we have cached data, return it
  if (cached !== undefined && cached.inFlight === undefined) {
    return cached.data;
  }
  
  // If there's an in-flight promise, wait for it
  if (cached?.inFlight) {
    return cached.inFlight;
  }
  
  // Create a new in-flight promise
  const inFlightPromise = (async () => {
    const getDb = createLazyFirestore();
    const db: Firestore = getDb();
    try {
      const ref: DocumentReference<T> = db.collection(collection).doc(doc) as DocumentReference<T>;
      const snapshot: DocumentSnapshot<T> = await ref.get();
      let result: T | null;
      
      if (snapshot.exists) {
        result = snapshot.data() ?? null;
      } else {
        functions.logger.error(`Error getting ${errorLabel}: Document does not exist`);
        result = null;
      }
      
      // Update cache with the result
      cache.set(cacheKey, { data: result });
      return result;
    } catch (error) {
      functions.logger.error(`Firestore error getting ${errorLabel}:`, { error });
      const result = null;
      // Update cache with null on error
      cache.set(cacheKey, { data: result });
      return result;
    }
  })();
  
  // Store the in-flight promise
  cache.set(cacheKey, { data: cached?.data ?? null, inFlight: inFlightPromise });
  
  try {
    return await inFlightPromise;
  } finally {
    // Clear the in-flight promise after completion
    const entry = cache.get(cacheKey);
    if (entry) {
      cache.set(cacheKey, { data: entry.data });
    }
  }
}

// Export a function to clear cache for testing
export const clearDataLoaderCache = (): void => {
  cache.clear();
};

export const getTaskData = async (): Promise<TaskData | null> =>
  loadAndCache<TaskData>('tarkovdata', 'tasks', 'taskData');

export const getHideoutData = async (): Promise<HideoutData | null> =>
  loadAndCache<HideoutData>('tarkovdata', 'hideout', 'hideoutData');

// Define interfaces for user/team/progress data
interface TeamData {
  [key: string]: unknown;
}

interface UserData {
  [key: string]: unknown;
}

interface TaskProgressData {
  [key: string]: unknown;
}

interface HideoutProgressData {
  [key: string]: unknown;
}

interface TraderProgressData {
  [key: string]: unknown;
}

// Export fetch functions for teams, users, and progress data
export const fetchTeam = async (teamId: string): Promise<TeamData | null> =>
  loadAndCache<TeamData>('teams', teamId, 'team');

export const fetchUser = async (userId: string): Promise<UserData | null> =>
  loadAndCache<UserData>('users', userId, 'user');

export const fetchTaskProgress = async (userId: string): Promise<TaskProgressData | null> =>
  loadAndCache<TaskProgressData>('taskProgress', userId, 'taskProgress');

export const fetchHideoutProgress = async (userId: string): Promise<HideoutProgressData | null> =>
  loadAndCache<HideoutProgressData>('hideoutProgress', userId, 'hideoutProgress');

export const fetchTraderProgress = async (userId: string): Promise<TraderProgressData | null> =>
  loadAndCache<TraderProgressData>('traderProgress', userId, 'traderProgress');