import { describe, it, expect, vi } from 'vitest';
import { LRUCache } from '@/utils/lruCache';
describe('LRUCache', () => {
  describe('constructor', () => {
    it('creates a cache with the specified max size', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.size).toBe(0);
    });
    it('throws an error if maxSize is less than 1', () => {
      expect(() => new LRUCache<string, number>(0)).toThrow('LRUCache maxSize must be at least 1');
      expect(() => new LRUCache<string, number>(-1)).toThrow('LRUCache maxSize must be at least 1');
    });
    it('accepts an optional onEvict callback', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(5, onEvict);
      expect(cache.size).toBe(0);
    });
  });
  describe('set and get', () => {
    it('stores and retrieves values', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });
    it('returns undefined for non-existent keys', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.get('missing')).toBeUndefined();
    });
    it('updates existing keys and maintains them as most recent', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('a', 10); // Update 'a'
      cache.set('d', 4); // This should evict 'b', not 'a'
      expect(cache.get('a')).toBe(10);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });
  describe('has', () => {
    it('returns true for existing keys', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
    });
    it('returns false for non-existent keys', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.has('missing')).toBe(false);
    });
  });
  describe('delete', () => {
    it('removes a key and returns true if it existed', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.has('a')).toBe(false);
    });
    it('returns false if the key did not exist', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.delete('missing')).toBe(false);
    });
    it('calls onEvict when deleting an existing key', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(5, onEvict);
      cache.set('a', 1);
      cache.delete('a');
      expect(onEvict).toHaveBeenCalledWith('a', 1);
    });
    it('does not call onEvict when deleting a non-existent key', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(5, onEvict);
      cache.delete('missing');
      expect(onEvict).not.toHaveBeenCalled();
    });
  });
  describe('size', () => {
    it('returns the current number of items', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
      cache.delete('a');
      expect(cache.size).toBe(1);
    });
  });
  describe('eviction behavior', () => {
    it('evicts the least recently used item when capacity is exceeded', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
      expect(cache.size).toBe(3);
    });
    it('calls onEvict with the evicted key and value', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(3, onEvict);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'
      expect(onEvict).toHaveBeenCalledTimes(1);
      expect(onEvict).toHaveBeenCalledWith('a', 1);
    });
    it('evicts multiple items when multiple additions exceed capacity', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(2, onEvict);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // Evicts 'a'
      cache.set('d', 4); // Evicts 'b'
      expect(onEvict).toHaveBeenCalledTimes(2);
      expect(onEvict).toHaveBeenNthCalledWith(1, 'a', 1);
      expect(onEvict).toHaveBeenNthCalledWith(2, 'b', 2);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });
  });
  describe('access recency', () => {
    it('updates recency when getting a value', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // Access 'a' to make it most recent
      cache.get('a');
      // Adding 'd' should evict 'b', not 'a'
      cache.set('d', 4);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });
    it('maintains correct eviction order with multiple accesses', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(3, onEvict);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      // Access order: c, b, a (a is now most recent)
      cache.get('c');
      cache.get('b');
      cache.get('a');
      // Adding 'd' should evict 'c' (least recently used)
      cache.set('d', 4);
      expect(onEvict).toHaveBeenCalledWith('c', 3);
      expect(cache.has('c')).toBe(false);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });
  });
  describe('clear', () => {
    it('removes all items from the cache', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(false);
    });
    it('calls onEvict for each item when clearing', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(5, onEvict);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.clear();
      expect(onEvict).toHaveBeenCalledTimes(3);
      expect(onEvict).toHaveBeenCalledWith('a', 1);
      expect(onEvict).toHaveBeenCalledWith('b', 2);
      expect(onEvict).toHaveBeenCalledWith('c', 3);
    });
    it('works correctly when cache is already empty', () => {
      const onEvict = vi.fn();
      const cache = new LRUCache<string, number>(5, onEvict);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(onEvict).not.toHaveBeenCalled();
    });
  });
  describe('complex types', () => {
    it('works with object values and cleanup callbacks', () => {
      interface Resource {
        id: string;
        cleanup: () => void;
      }
      const cleanupSpy = vi.fn();
      const onEvict = vi.fn((key: string, resource: Resource) => {
        resource.cleanup();
      });
      const cache = new LRUCache<string, Resource>(2, onEvict);
      const resource1: Resource = { id: 'r1', cleanup: cleanupSpy };
      const resource2: Resource = { id: 'r2', cleanup: cleanupSpy };
      const resource3: Resource = { id: 'r3', cleanup: cleanupSpy };
      cache.set('a', resource1);
      cache.set('b', resource2);
      cache.set('c', resource3); // Should evict resource1
      expect(onEvict).toHaveBeenCalledWith('a', resource1);
      expect(cleanupSpy).toHaveBeenCalledTimes(1);
    });
  });
});
