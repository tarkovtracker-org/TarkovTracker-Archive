import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLazy, createLazyAsync } from '../../src/utils/factory';
describe('utils/factory', () => {
  describe('createLazy', () => {
    it('should create a lazy initialization function', () => {
      const init = vi.fn(() => 'test-instance');
      const getInstance = createLazy(init);
      expect(typeof getInstance).toBe('function');
    });
    it('should call initialization function on first call', () => {
      const init = vi.fn(() => 'test-instance');
      const getInstance = createLazy(init);
      const result = getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(result).toBe('test-instance');
    });
    it('should return same instance on subsequent calls', () => {
      const init = vi.fn(() => ({ id: 'test', value: 42 }));
      const getInstance = createLazy(init);
      const instance1 = getInstance();
      const instance2 = getInstance();
      const instance3 = getInstance();
      expect(init).toHaveBeenCalledTimes(1); // Only called once
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1.id).toBe('test');
      expect(instance1.value).toBe(42);
    });
    it('should handle initialization function that returns null', () => {
      const init = vi.fn(() => null);
      const getInstance = createLazy(init);
      const instance1 = getInstance();
      const instance2 = getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBeNull();
      expect(instance2).toBeNull();
      expect(instance1).toBe(instance2);
    });
    it('should handle initialization function that returns undefined', () => {
      const undefinedValue = undefined;
      const init = vi.fn(() => undefinedValue);
      const getInstance = createLazy(init);
      const instance1 = getInstance();
      const instance2 = getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBeUndefined();
      expect(instance2).toBeUndefined();
      expect(instance1).toBe(instance2);
    });
    it('should only call init once even when it returns undefined', () => {
      const init = vi.fn(() => undefined);
      const getInstance = createLazy(init);
      
      // Call multiple times to ensure memoization
      getInstance();
      getInstance();
      getInstance();
      getInstance();
      
      // Init should only be called once, proving memoization works with undefined
      expect(init).toHaveBeenCalledTimes(1);
    });
    it('should handle initialization function that returns false', () => {
      const init = vi.fn(() => false);
      const getInstance = createLazy(init);
      const instance1 = getInstance();
      const instance2 = getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(false);
      expect(instance2).toBe(false);
      expect(instance1).toBe(instance2);
    });
    it('should handle initialization function that returns 0', () => {
      const init = vi.fn(() => 0);
      const getInstance = createLazy(init);
      const instance1 = getInstance();
      const instance2 = getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(0);
      expect(instance2).toBe(0);
      expect(instance1).toBe(instance2);
    });
    it('should throw error if initialization function throws', () => {
      const init = vi.fn(() => {
        throw new Error('Initialization failed');
      });
      const getInstance = createLazy(init);
      expect(getInstance).toThrow('Initialization failed');
      
      // Subsequent calls should still attempt initialization
      expect(() => getInstance()).toThrow('Initialization failed');
      expect(init).toHaveBeenCalledTimes(2);
    });
    it('should work with object instances', () => {
      class TestClass {
        constructor(public value: number) {}
      }
      
      const getInstance = createLazy(() => new TestClass(42));
      
      const instance1 = getInstance();
      const instance2 = getInstance();
      
      expect(instance1).toBeInstanceOf(TestClass);
      expect(instance1.value).toBe(42);
      expect(instance1).toBe(instance2);
    });
  });
  describe('createLazyAsync', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });
    it('should create an async lazy initialization function', () => {
      const init = vi.fn(async () => 'test-instance');
      const getInstance = createLazyAsync(init);
      expect(typeof getInstance).toBe('function');
    });
    it('should call initialization function on first call', async () => {
      const init = vi.fn(async () => 'test-instance');
      const getInstance = createLazyAsync(init);
      const result = await getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(result).toBe('test-instance');
    });
    it('should return same instance on subsequent calls', async () => {
      const init = vi.fn(async () => ({ id: 'test', value: 42 }));
      const getInstance = createLazyAsync(init);
      const instance1 = await getInstance();
      const instance2 = await getInstance();
      const instance3 = await getInstance();
      expect(init).toHaveBeenCalledTimes(1); // Only called once
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1.id).toBe('test');
      expect(instance1.value).toBe(42);
    });
    it('should handle concurrent calls correctly (single-flight)', async () => {
      let callCount = 0;
      const init = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return `instance-${callCount}`;
      });
      
      const getInstance = createLazyAsync(init);
      // Call getInstance multiple times concurrently
      const promise1 = getInstance();
      const promise2 = getInstance();
      const promise3 = getInstance();
      const [instance1, instance2, instance3] = await Promise.all([
        promise1,
        promise2,
        promise3
      ]);
      // Should only initialize once
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(callCount).toBe(1);
    });
    it('should handle initialization function that returns null', async () => {
      const init = vi.fn(async () => null);
      const getInstance = createLazyAsync(init);
      const instance1 = await getInstance();
      const instance2 = await getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBeNull();
      expect(instance2).toBeNull();
      expect(instance1).toBe(instance2);
    });
    it('should handle initialization function that returns undefined', async () => {
      const undefinedValue = undefined;
      const init = vi.fn(async () => undefinedValue);
      const getInstance = createLazyAsync(init);
      const instance1 = await getInstance();
      const instance2 = await getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBeUndefined();
      expect(instance2).toBeUndefined();
      expect(instance1).toBe(instance2);
    });
    it('should only call async init once even when it returns undefined', async () => {
      const init = vi.fn(async () => undefined);
      const getInstance = createLazyAsync(init);
      
      // Call multiple times to ensure memoization
      await getInstance();
      await getInstance();
      await getInstance();
      await getInstance();
      
      // Init should only be called once, proving memoization works with undefined
      expect(init).toHaveBeenCalledTimes(1);
    });
    it('should handle initialization function that returns false', async () => {
      const init = vi.fn(async () => false);
      const getInstance = createLazyAsync(init);
      const instance1 = await getInstance();
      const instance2 = await getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(false);
      expect(instance2).toBe(false);
      expect(instance1).toBe(instance2);
    });
    it('should handle initialization function that returns 0', async () => {
      const init = vi.fn(async () => 0);
      const getInstance = createLazyAsync(init);
      const instance1 = await getInstance();
      const instance2 = await getInstance();
      expect(init).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(0);
      expect(instance2).toBe(0);
      expect(instance1).toBe(instance2);
    });
    it('should throw error if initialization function throws', async () => {
      const init = vi.fn(async () => {
        throw new Error('Async initialization failed');
      });
      const getInstance = createLazyAsync(init);
      await expect(getInstance()).rejects.toThrow('Async initialization failed');
      
      // Subsequent calls should still attempt initialization
      await expect(getInstance()).rejects.toThrow('Async initialization failed');
      expect(init).toHaveBeenCalledTimes(2);
    });
    it('should work with Promise.resolve() values', async () => {
      const getInstance = createLazyAsync(async () => ({ data: 'ready' }));
      
      const instance1 = await getInstance();
      const instance2 = await getInstance();
      
      expect(instance1.data).toBe('ready');
      expect(instance1).toBe(instance2);
    });
    it('should handle async initialization with complex logic', async () => {
      let configLoaded = false;
      let serviceCreated = false;
      
      const init = vi.fn(async () => {
        // Simulate async config loading
        await new Promise(resolve => setTimeout(resolve, 5));
        configLoaded = true;
        
        // Simulate service creation
        await new Promise(resolve => setTimeout(resolve, 5));
        serviceCreated = true;
        
        return {
          configLoaded,
          serviceCreated,
          timestamp: Date.now()
        };
      });
      
      const getInstance = createLazyAsync(init);
      
      const instance1 = await getInstance();
      const instance2 = await getInstance();
      
      expect(configLoaded).toBe(true);
      expect(serviceCreated).toBe(true);
      expect(instance1.configLoaded).toBe(true);
      expect(instance1.serviceCreated).toBe(true);
      expect(instance1).toBe(instance2);
      expect(init).toHaveBeenCalledTimes(1);
    });
  });
});
