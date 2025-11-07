import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, createLogger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('logger instance', () => {
    it('should create logger with all methods', () => {
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should call correct console methods for each log level', async () => {
      // Set environment variable before importing
      const originalEnv = import.meta.env.VITE_LOG_LEVEL;
      (import.meta.env as any).VITE_LOG_LEVEL = 'debug';

      // Reset modules to force logger to reload with new environment
      vi.resetModules();
      const { logger: freshLogger } = await import('@/utils/logger');

      const consoleSpy = {
        debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      };

      freshLogger.debug('debug message');
      freshLogger.info('info message');
      freshLogger.warn('warn message');
      freshLogger.error('error message');

      expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');
      expect(consoleSpy.info).toHaveBeenCalledWith('info message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
      expect(consoleSpy.error).toHaveBeenCalledWith('error message');

      Object.values(consoleSpy).forEach((spy) => spy.mockRestore());

      // Restore original environment
      (import.meta.env as any).VITE_LOG_LEVEL = originalEnv;
    });

    it('should not log when log level is below threshold', async () => {
      // Set VITE_LOG_LEVEL appropriately for below threshold test
      const originalEnv = import.meta.env.VITE_LOG_LEVEL;
      (import.meta.env as any).VITE_LOG_LEVEL = 'warn';

      vi.resetModules();
      const { logger: freshLogger } = await import('@/utils/logger');

      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      freshLogger.debug('debug message');
      freshLogger.info('info message');
      freshLogger.warn('warn message'); // This should be called since warn >= warn level

      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled(); // warn should be called at warn level

      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();

      // Restore original environment
      (import.meta.env as any).VITE_LOG_LEVEL = originalEnv;
    });

    it('should log when log level meets or exceeds threshold', async () => {
      // Mock environment to set log level to warn
      vi.stubGlobal('import.meta', {
        env: {
          DEV: true,
          VITE_LOG_LEVEL: 'warn',
        },
      } as any);

      vi.resetModules();
      const { logger: freshLogger } = await import('@/utils/logger');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      freshLogger.warn('warn message');
      freshLogger.error('error message');

      expect(warnSpy).toHaveBeenCalledWith('warn message');
      expect(errorSpy).toHaveBeenCalledWith('error message');

      warnSpy.mockRestore();
      errorSpy.mockRestore();

      vi.unstubAllGlobals();
    });
  });

  describe('createLogger function', () => {
    it('should create logger with scope prefix', () => {
      const scopedLogger = createLogger('TestScope');

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      scopedLogger.info('test message');

      expect(consoleSpy).toHaveBeenCalledWith('[TestScope]', 'test message');

      consoleSpy.mockRestore();
    });

    it('should create logger with all scoped methods', () => {
      const scopedLogger = createLogger('TestScope');

      expect(scopedLogger).toHaveProperty('debug');
      expect(scopedLogger).toHaveProperty('info');
      expect(scopedLogger).toHaveProperty('warn');
      expect(scopedLogger).toHaveProperty('error');
      expect(typeof scopedLogger.debug).toBe('function');
      expect(typeof scopedLogger.info).toBe('function');
      expect(typeof scopedLogger.warn).toBe('function');
      expect(typeof scopedLogger.error).toBe('function');
    });
  });

  describe('console method fallbacks', () => {
    it('should fallback to console.log when console method is undefined', async () => {
      // Save and remove console.debug BEFORE loading the module
      const originalDebug = (console as any).debug;
      const originalEnv = import.meta.env.VITE_LOG_LEVEL;

      (console as any).debug = undefined;
      (import.meta.env as any).VITE_LOG_LEVEL = 'debug';
      (import.meta.env as any).DEV = true;

      // Now reset and load the logger module (it will see console.debug as undefined)
      vi.resetModules();
      const { logger: freshLogger } = await import('@/utils/logger');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      freshLogger.debug('test message');

      expect(logSpy).toHaveBeenCalledWith('test message');

      // Restore console.debug and environment
      (console as any).debug = originalDebug;
      (import.meta.env as any).VITE_LOG_LEVEL = originalEnv;
      logSpy.mockRestore();
    });
  });
});
