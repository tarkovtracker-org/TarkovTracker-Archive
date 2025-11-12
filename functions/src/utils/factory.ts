/**
 * Returns a memoized initializer for synchronous singletons.
 *
 * @template T - The type of the singleton instance
 * @param init - Initialization function that creates the singleton
 * @returns A function that returns the singleton instance, creating it on first call
 *
 * @example
 * ```ts
 * const getService = createLazy(() => new MyService());
 * const instance1 = getService(); // Creates new instance
 * const instance2 = getService(); // Returns same instance
 * ```
 */
export function createLazy<T>(init: () => T): () => T {
  let instance: T | undefined;
  let hasInitialized = false;
  return () => {
    // Use hasInitialized flag instead of checking instance === undefined
    // This ensures memoization works correctly even when init() returns undefined
    if (hasInitialized) return instance as T;
    instance = init();
    hasInitialized = true;
    return instance;
  };
}

/**
 * Returns a memoized initializer for async singletons with single-flight semantics.
 * Ensures that concurrent calls wait for the same initialization promise rather than
 * creating multiple instances.
 *
 * @template T - The type of the singleton instance
 * @param init - Async initialization function that creates the singleton
 * @returns An async function that returns the singleton instance, creating it on first call
 *
 * @example
 * ```ts
 * const getService = createLazyAsync(async () => {
 *   const config = await loadConfig();
 *   return new MyService(config);
 * });
 * const instance1 = await getService(); // Initializes asynchronously
 * const instance2 = await getService(); // Returns same instance
 * ```
 */
export function createLazyAsync<T>(init: () => Promise<T>): () => Promise<T> {
  let instance: T | undefined;
  let hasInitialized: boolean | undefined;
  let inFlight: Promise<T> | undefined;
  return async () => {
    // Use hasInitialized flag instead of checking instance === undefined
    // This ensures memoization works correctly even when init() returns undefined
    if (hasInitialized) return instance as T;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    if (!inFlight) {
      inFlight = init()
        .then((val) => {
          instance = val;
          hasInitialized = true;
          return val;
        })
        .finally(() => {
          inFlight = undefined;
        });
    }
    return inFlight;
  };
}

/**
 * Creates a lazy Firebase Admin instance that ensures proper initialization
 * before returning firestore instance.
 */
export const createLazyFirestore = () => {
  return createLazy(() => {
    // If using Firebase emulator, use real admin instance
    // (globalSetup.ts sets env vars so Admin SDK connects to emulator automatically)
    if (process.env.USE_FIREBASE_EMULATOR === 'true') {
      // Initialize if not already done
      if (admin.apps.length === 0) {
        admin.initializeApp({
          projectId: process.env.GCLOUD_PROJECT ?? 'test-project',
        });
      }
      return admin.firestore();
    }
    // Regular initialization for non-emulator (production/development)
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: process.env.GCLOUD_PROJECT ?? 'demo-test',
      });
    }
    return admin.firestore();
  });
};

/**
 * Creates a lazy Firebase Admin auth instance that ensures proper initialization
 * before returning auth instance.
 */
export const createLazyAuth = () => {
  return createLazy(() => {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      if (admin.auth._isMockFunction) {
        return admin.auth();
      }
      return admin.auth();
    }
    // Initialize if not already done
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: process.env.GCLOUD_PROJECT ?? 'demo-test',
      });
    }
    return admin.auth();
  });
};

/**
 * Creates a lazy Firebase Admin instance for tests that bypasses initialization
 * and returns a mock directly.
 */
export const createLazyFirestoreForTests = () => {
  return createLazy(() => {
    return admin.firestore();
  });
};
import admin from 'firebase-admin';
