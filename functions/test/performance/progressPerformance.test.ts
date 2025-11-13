import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProgressService } from '../../src/services/ProgressService';
import { PerformanceMonitor, LoadTester, TestDataGenerator } from './performanceUtils';
import { createTestSuite } from '../helpers/index.js';
import type { TaskStatus } from '../../src/types/api';

describe('Progress Performance Tests', () => {
  const suite = createTestSuite('ProgressPerformance');
  let progressService: ProgressService;
  let monitor: PerformanceMonitor;
  let loadTester: LoadTester;

  beforeEach(async () => {
    await suite.beforeEach();
    progressService = new ProgressService();
    monitor = new PerformanceMonitor();
    loadTester = new LoadTester();

    // Seed basic test data
    await suite.withDatabase({
      progress: {},
      tarkovdata: {
        tasks: {
          'task-1': { id: 'task-1', name: 'Test Task 1' },
          'task-2': { id: 'task-2', name: 'Test Task 2' },
          'task-3': { id: 'task-3', name: 'Test Task 3' },
          'task-4': { id: 'task-4', name: 'Test Task 4' },
          'task-5': { id: 'task-5', name: 'Test Task 5' },
        },
        hideout: {
          'module-1': { id: 'module-1', name: 'Test Module 1' },
          'module-2': { id: 'module-2', name: 'Test Module 2' },
        },
      },
    });
  });

  afterEach(async () => {
    monitor.reset();
    loadTester.reset();
    await suite.afterEach();
  });
  describe('Progress Retrieval Performance', () => {
    beforeEach(async () => {
      // Seed progress data for multiple users
      const progressData: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        const userId = TestDataGenerator.generateUserId(`user${i}`);
        progressData[userId] = TestDataGenerator.generateProgressData();
      }
      await suite.withDatabase({ progress: progressData });
    });
    it('should retrieve user progress efficiently under load', async () => {
      const userIds = Object.keys((global as any).dbState?.progress ?? {});
      const operationCount = Math.min(30, userIds.length);
      const metrics = await loadTester.runLoadTest(
        'getUserProgress',
        async () => {
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
          return progressService.getUserProgress(randomUserId, 'pvp');
        },
        {
          totalOperations: operationCount,
          concurrency: 8,
        }
      );
      expect(metrics.successfulOperations).toBe(operationCount);
      expect(metrics.averageResponseTime).toBeLessThan(100); // < 100ms average
      expect(metrics.p95ResponseTime).toBeLessThan(200); // < 200ms p95
      expect(metrics.throughput).toBeGreaterThan(15); // > 15 retrievals/sec
      expect(metrics.errorRate).toBe(0);
    });
    it('should handle concurrent progress retrieval efficiently', async () => {
      const userIds = Object.keys((global as any).dbState?.progress ?? {});
      const concurrentUsers = 20;
      const operationsPerUser = 5;
      const metrics = await loadTester.runConcurrencyTest(
        'getUserProgress',
        async () => {
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
          return progressService.getUserProgress(randomUserId, 'pvp');
        },
        {
          concurrentUsers,
          operationsPerUser,
        }
      );
      expect(metrics.successfulOperations).toBe(concurrentUsers * operationsPerUser);
      expect(metrics.averageResponseTime).toBeLessThan(150); // < 150ms under concurrency
      expect(metrics.throughput).toBeGreaterThan(10); // > 10 retrievals/sec under concurrency
    });
    it('should handle progress retrieval for different game modes efficiently', async () => {
      const userId = TestDataGenerator.generateUserId();
      // Seed user with both game modes
      await suite.withDatabase({
        progress: {
          [userId]: {
            pvp: TestDataGenerator.generateProgressData(),
            pve: TestDataGenerator.generateProgressData(),
          },
        },
      });
      const metrics = await loadTester.runLoadTest(
        'getGameModeProgress',
        async () => {
          const gameMode = Math.random() > 0.5 ? 'pvp' : 'pve';
          return progressService.getUserProgress(userId, gameMode);
        },
        {
          totalOperations: 40,
          concurrency: 10,
        }
      );
      expect(metrics.successfulOperations).toBe(40);
      expect(metrics.averageResponseTime).toBeLessThan(80);
      expect(metrics.throughput).toBeGreaterThan(20);
    });
  });
  describe('Progress Update Performance', () => {
    beforeEach(async () => {
      // Seed initial progress data
      const progressData: Record<string, any> = {};
      for (let i = 0; i < 30; i++) {
        const userId = TestDataGenerator.generateUserId(`user${i}`);
        progressData[userId] = TestDataGenerator.generateProgressData();
      }
      await suite.withDatabase({ progress: progressData });
    });
    it('should update single task progress efficiently', async () => {
      const userIds = Object.keys((global as any).dbState?.progress ?? {});
      const operationCount = Math.min(25, userIds.length);
      const metrics = await loadTester.runLoadTest(
        'updateSingleTask',
        async () => {
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
          const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;
          return progressService.updateMultipleTasks(
            randomUserId,
            [{ id: taskId, state: Math.random() > 0.5 ? 'completed' : 'uncompleted' }],
            'pvp'
          );
        },
        {
          totalOperations: operationCount,
          concurrency: 6,
        }
      );
      expect(metrics.successfulOperations).toBe(operationCount);
      expect(metrics.averageResponseTime).toBeLessThan(120); // < 120ms for updates
      expect(metrics.p95ResponseTime).toBeLessThan(250); // < 250ms p95
      expect(metrics.throughput).toBeGreaterThan(8); // > 8 updates/sec
    });
    it('should update multiple tasks efficiently', async () => {
      const userId = TestDataGenerator.generateUserId();
      await suite.withDatabase({
        progress: {
          [userId]: TestDataGenerator.generateProgressData(),
        },
      });
      const metrics = await loadTester.runLoadTest(
        'updateMultipleTasks',
        async () => {
          const taskUpdates = Array.from({ length: 3 }, (_, i) => ({
            id: `perf-task-${i}`,
            state: (Math.random() > 0.5 ? 'completed' : 'uncompleted') as TaskStatus,
          }));
          return progressService.updateMultipleTasks(userId, taskUpdates, 'pvp');
        },
        {
          totalOperations: 20,
          concurrency: 4,
        }
      );
      expect(metrics.successfulOperations).toBe(20);
      expect(metrics.averageResponseTime).toBeLessThan(200); // < 200ms for multiple updates
      expect(metrics.throughput).toBeGreaterThan(5); // > 5 multi-update operations/sec
    });
    it('should handle concurrent progress updates efficiently', async () => {
      const concurrentUsers = 15;
      const operationsPerUser = 4;
      const metrics = await loadTester.runConcurrencyTest(
        'updateTaskStatus',
        async (userId) => {
          const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;
          return progressService.updateMultipleTasks(
            userId,
            [{ id: taskId, state: Math.random() > 0.5 ? 'completed' : 'uncompleted' }],
            'pvp'
          );
        },
        {
          concurrentUsers,
          operationsPerUser,
        }
      );
      expect(metrics.successfulOperations).toBe(concurrentUsers * operationsPerUser);
      expect(metrics.averageResponseTime).toBeLessThan(180); // < 180ms under concurrency
      expect(metrics.throughput).toBeGreaterThan(6); // > 6 updates/sec under concurrency
    });
    it('should handle mixed read/write operations efficiently', async () => {
      const operationCount = 40;
      const metrics = await loadTester.runLoadTest(
        'mixedProgressOperations',
        async () => {
          const userIds = Object.keys((global as any).dbState?.progress ?? {});
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
          const isRead = Math.random() > 0.5;
          if (isRead) {
            return progressService.getUserProgress(randomUserId, 'pvp');
          } else {
            const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;
            return progressService.updateMultipleTasks(
              randomUserId,
              [{ id: taskId, state: 'completed' }],
              'pvp'
            );
          }
        },
        {
          totalOperations: operationCount,
          concurrency: 10,
        }
      );
      expect(metrics.successfulOperations).toBe(operationCount);
      expect(metrics.averageResponseTime).toBeLessThan(150); // < 150ms for mixed operations
      expect(metrics.throughput).toBeGreaterThan(10); // > 10 mixed operations/sec
    });
  });
  describe('Progress Creation Performance', () => {
    it('should create new progress documents efficiently', async () => {
      const operationCount = 30;
      const metrics = await loadTester.runLoadTest(
        'createProgress',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          return progressService.getUserProgress(userId, 'pvp');
        },
        {
          totalOperations: operationCount,
          concurrency: 8,
        }
      );
      expect(metrics.successfulOperations).toBe(operationCount);
      expect(metrics.averageResponseTime).toBeLessThan(150); // < 150ms for creation
      expect(metrics.throughput).toBeGreaterThan(10); // > 10 creations/sec
    });
    it('should handle bulk progress creation efficiently', async () => {
      const userCount = 20;
      const bulkMetrics = await monitor.measureOperation('bulkProgressCreation', async () => {
        const createPromises = Array.from({ length: userCount }, async () => {
          const userId = TestDataGenerator.generateUserId();
          return progressService.getUserProgress(userId, 'pvp');
        });
        return Promise.all(createPromises);
      });
      expect(bulkMetrics.result).toHaveLength(userCount);
      expect(bulkMetrics.metrics.duration).toBeLessThan(2000); // < 2 seconds for 20 users
      expect(bulkMetrics.metrics.success).toBe(true);
    });
  });
  describe('Memory and Resource Usage', () => {
    it('should not leak memory during progress operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 4;
      const operationsPerIteration = 15;
      for (let iteration = 0; iteration < iterations; iteration++) {
        const userId = TestDataGenerator.generateUserId(`iter${iteration}`);

        // Create progress
        await progressService.getUserProgress(userId, 'pvp');
        // Update progress multiple times
        await loadTester.runLoadTest(
          'updateProgress',
          async () => {
            const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;
            return progressService.updateMultipleTasks(
              userId,
              [{ id: taskId, state: 'completed' }],
              'pvp'
            );
          },
          {
            totalOperations: operationsPerIteration,
            concurrency: 3,
          }
        );
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(80 * 1024 * 1024); // < 80MB growth
    });
    it('should handle sustained progress operations without degradation', async () => {
      const duration = 8000; // 8 seconds
      const startTime = Date.now();
      let operationCount = 0;
      const responseTimes: number[] = [];
      while (Date.now() - startTime < duration) {
        const userId = TestDataGenerator.generateUserId();
        const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;

        const metrics = await monitor.measureOperation('sustainedProgressOperation', async () => {
          // Mix of reads and writes
          if (Math.random() > 0.5) {
            return progressService.getUserProgress(userId, 'pvp');
          } else {
            return progressService.updateMultipleTasks(
              userId,
              [{ id: taskId, state: 'completed' }],
              'pvp'
            );
          }
        });
        responseTimes.push(metrics.metrics.duration);
        operationCount++;
        // Small delay to simulate realistic usage
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 15);
        });
      }
      // Calculate performance degradation
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      // Performance should not degrade significantly
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
      expect(operationCount).toBeGreaterThan(30); // Should complete reasonable number of operations
    });
  });
  describe('Stress Tests', () => {
    it('should handle maximum concurrent progress operations', async () => {
      const maxConcurrency = 40;
      const operationsPerUser = 3;
      const metrics = await loadTester.runConcurrencyTest(
        'maxConcurrencyProgress',
        async (userId) => {
          const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;
          return progressService.updateMultipleTasks(
            userId,
            [{ id: taskId, state: 'completed' }],
            'pvp'
          );
        },
        {
          concurrentUsers: maxConcurrency,
          operationsPerUser,
        }
      );
      // Should handle high concurrency with reasonable success rate
      expect(metrics.successfulOperations).toBeGreaterThan(
        maxConcurrency * operationsPerUser * 0.9
      ); // > 90% success
      expect(metrics.averageResponseTime).toBeLessThan(600); // < 600ms even under high load
      expect(metrics.throughput).toBeGreaterThan(3); // > 3 ops/sec under extreme load
    });
    it('should handle rapid successive updates to the same user', async () => {
      const userId = TestDataGenerator.generateUserId();
      const updateCount = 50;
      // Create initial progress
      await progressService.getUserProgress(userId, 'pvp');
      const metrics = await loadTester.runLoadTest(
        'rapidSuccessiveUpdates',
        async () => {
          const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;
          return progressService.updateMultipleTasks(
            userId,
            [{ id: taskId, state: Math.random() > 0.5 ? 'completed' : 'uncompleted' }],
            'pvp'
          );
        },
        {
          totalOperations: updateCount,
          concurrency: 15,
        }
      );
      expect(metrics.successfulOperations).toBe(updateCount);
      expect(metrics.averageResponseTime).toBeLessThan(200);
      expect(metrics.throughput).toBeGreaterThan(10);
    });
    it('should recover from temporary overload conditions', async () => {
      // First, create a high load situation
      await loadTester.runLoadTest(
        'highLoadProgress',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          const taskId = `task-${Math.floor(Math.random() * 5) + 1}`;
          return progressService.updateMultipleTasks(
            userId,
            [{ id: taskId, state: 'completed' }],
            'pvp'
          );
        },
        {
          totalOperations: 80,
          concurrency: 20,
        }
      );
      // Allow system to recover
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1000);
      });
      // Test normal performance after recovery
      const recoveryMetrics = await loadTester.runLoadTest(
        'recoveryProgress',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          return progressService.getUserProgress(userId, 'pvp');
        },
        {
          totalOperations: 20,
          concurrency: 5,
        }
      );
      // Performance should recover to normal levels
      expect(recoveryMetrics.averageResponseTime).toBeLessThan(100);
      expect(recoveryMetrics.successfulOperations).toBe(20);
      expect(recoveryMetrics.errorRate).toBe(0);
    });
  });
});
