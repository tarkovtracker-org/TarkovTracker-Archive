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
  return () => {
    if (instance === undefined) {
      instance = init();
    }
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
  let inFlight: Promise<T> | undefined;
  return async () => {
    if (instance !== undefined) return instance;
    if (!inFlight) {
      inFlight = init()
        .then((val) => {
          instance = val;
          return val;
        })
        .finally(() => {
          inFlight = undefined;
        });
    }
    return inFlight;
  };
}