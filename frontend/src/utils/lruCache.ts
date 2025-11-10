/**
 * Bounded LRU (Least Recently Used) cache implementation.
 * Maintains items in order of access, evicting the least recently used when capacity is exceeded.
 *
 * @template K - The type of the cache keys
 * @template V - The type of the cache values
 */
export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly cache: Map<K, V>;
  private readonly onEvict?: (key: K, value: V) => void;

  /**
   * Creates a new LRU cache with the specified maximum size.
   *
   * @param maxSize - Maximum number of items to store in the cache
   * @param onEvict - Optional callback invoked when an item is evicted
   */
  constructor(maxSize: number, onEvict?: (key: K, value: V) => void) {
    if (maxSize < 1) {
      throw new Error('LRUCache maxSize must be at least 1');
    }
    this.maxSize = maxSize;
    this.cache = new Map();
    this.onEvict = onEvict;
  }

  /**
   * Retrieves a value from the cache and marks it as most recently used.
   *
   * @param key - The key to retrieve
   * @returns The cached value, or undefined if not found
   */
  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!;
      // Move to end (most recently used) by deleting and re-inserting
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  /**
   * Inserts or updates a value in the cache and marks it as most recently used.
   * If the cache exceeds maxSize, evicts the least recently used entry.
   *
   * @param key - The key to set
   * @param value - The value to store
   */
  set(key: K, value: V): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add new entry
    this.cache.set(key, value);

    // Evict least recently used if over capacity
    if (this.cache.size > this.maxSize) {
      // First entry in Map is the least recently used
      const oldestKey = this.cache.keys().next().value as K;
      const oldestValue = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.onEvict?.(oldestKey, oldestValue);
    }
  }

  /**
   * Checks if a key exists in the cache without updating recency.
   *
   * @param key - The key to check
   * @returns true if the key exists, false otherwise
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Deletes a key from the cache and invokes the eviction callback.
   *
   * @param key - The key to delete
   * @returns true if the key existed and was deleted, false otherwise
   */
  delete(key: K): boolean {
    const value = this.cache.get(key);
    const existed = this.cache.delete(key);
    if (existed) {
      this.onEvict?.(key, value as V);
    }
    return existed;
  }

  /**
   * Returns the current number of items in the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clears all items from the cache, invoking the eviction callback for each.
   */
  clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.cache.entries()) {
        this.onEvict(key, value);
      }
    }
    this.cache.clear();
  }
}
