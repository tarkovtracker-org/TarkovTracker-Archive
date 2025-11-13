import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenService } from '../../src/services/TokenService';
import { PerformanceMonitor, LoadTester, TestDataGenerator } from './performanceUtils';
import { createTestSuite } from '../helpers/index.js';

describe('Token Performance Tests', () => {
  const suite = createTestSuite('TokenPerformance');
  let tokenService: TokenService;
  let monitor: PerformanceMonitor;
  let loadTester: LoadTester;

  beforeEach(async () => {
    await suite.beforeEach();
    tokenService = new TokenService();
    monitor = new PerformanceMonitor();
    loadTester = new LoadTester();

    // Seed basic test data
    await suite.withDatabase({
      system: {},
      token: {},
    });
  });

  afterEach(async () => {
    monitor.reset();
    loadTester.reset();
    await suite.afterEach();
  });
  describe('Token Creation Performance', () => {
    it('should create tokens efficiently under moderate load', async () => {
      const userId = TestDataGenerator.generateUserId();
      const tokenCount = 50;
      const metrics = await loadTester.runLoadTest(
        'createToken',
        async () => {
          const tokenData = TestDataGenerator.generateToken();
          return tokenService.createToken(tokenData, {
            note: `Performance test token ${Date.now()}`,
            permissions: ['GP'],
            gameMode: 'pvp',
          });
        },
        {
          totalOperations: tokenCount,
          concurrency: 5,
          rampUpTime: 1000,
        }
      );
      // Performance assertions
      expect(metrics.successfulOperations).toBe(tokenCount);
      expect(metrics.failedOperations).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(100); // < 100ms average
      expect(metrics.p95ResponseTime).toBeLessThan(200); // < 200ms p95
      expect(metrics.throughput).toBeGreaterThan(10); // > 10 ops/sec
      expect(metrics.errorRate).toBe(0);
      // Memory usage should be reasonable
      const memoryGrowth =
        metrics.memoryUsage.final.heapUsed - metrics.memoryUsage.initial.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // < 50MB growth
    });
    it('should handle high concurrency token creation', async () => {
      const userId = TestDataGenerator.generateUserId();
      const concurrentUsers = 20;
      const operationsPerUser = 5;
      const metrics = await loadTester.runConcurrencyTest(
        'createToken',
        async (userId) => {
          const tokenData = TestDataGenerator.generateToken();
          return tokenService.createToken(tokenData, {
            note: `Concurrent test token ${Date.now()}`,
            permissions: ['GP', 'WP'],
            gameMode: 'pvp',
          });
        },
        {
          concurrentUsers,
          operationsPerUser,
        }
      );
      expect(metrics.successfulOperations).toBe(concurrentUsers * operationsPerUser);
      expect(metrics.failedOperations).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(150); // < 150ms average under concurrency
      expect(metrics.throughput).toBeGreaterThan(5); // > 5 ops/sec under concurrency
      // Check for memory leaks
      const memoryGrowth =
        metrics.memoryUsage[metrics.memoryUsage.length - 1].heapUsed -
        metrics.memoryUsage[0].heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // < 100MB growth
    });
    it('should maintain performance with multiple tokens per user', async () => {
      const userId = TestDataGenerator.generateUserId();
      const tokensPerUser = 10;
      // Seed user system document
      await suite.withDatabase({
        system: {
          [userId]: { tokens: [] },
        },
      });
      const metrics = await loadTester.runLoadTest(
        'createMultipleTokens',
        async () => {
          const tokenData = TestDataGenerator.generateToken();
          return tokenService.createToken(tokenData, {
            note: `Multi-token test ${Date.now()}`,
            permissions: ['GP'],
            gameMode: 'pvp',
          });
        },
        {
          totalOperations: tokensPerUser,
          concurrency: 3,
        }
      );
      expect(metrics.successfulOperations).toBe(tokensPerUser);
      expect(metrics.averageResponseTime).toBeLessThan(100);

      // Performance should not degrade significantly with multiple tokens
      const responseTimes = monitor
        .getOperationMetrics('createMultipleTokens')
        .map((m) => m.duration);
      const maxResponseTime = Math.max(...responseTimes);
      expect(maxResponseTime).toBeLessThan(200); // No single operation should be too slow
    });
  });
  describe('Token Validation Performance', () => {
    beforeEach(async () => {
      // Seed tokens for validation tests
      const tokens: Record<string, any> = {};
      for (let i = 0; i < 100; i++) {
        const token = TestDataGenerator.generateToken();
        const userId = TestDataGenerator.generateUserId(`user${i}`);
        tokens[token] = {
          owner: userId,
          note: `Test token ${i}`,
          permissions: ['GP', 'WP'],
          gameMode: 'pvp',
          calls: Math.floor(Math.random() * 100),
          createdAt: { toDate: () => new Date() },
        };
      }
      await suite.withDatabase({ token: tokens });
    });
    it('should validate tokens efficiently under load', async () => {
      const tokens = Object.keys((global as any).dbState?.token || {});
      const tokenCount = Math.min(50, tokens.length);
      const metrics = await loadTester.runLoadTest(
        'validateToken',
        async () => {
          const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
          return tokenService.getTokenInfo(randomToken);
        },
        {
          totalOperations: tokenCount,
          concurrency: 10,
        }
      );
      expect(metrics.successfulOperations).toBe(tokenCount);
      expect(metrics.averageResponseTime).toBeLessThan(50); // Validation should be fast
      expect(metrics.p95ResponseTime).toBeLessThan(100);
      expect(metrics.throughput).toBeGreaterThan(20); // > 20 validations/sec
    });
    it('should handle concurrent token validation efficiently', async () => {
      const tokens = Object.keys((global as any).dbState?.token || []);
      const concurrentUsers = 15;
      const operationsPerUser = 10;
      const metrics = await loadTester.runConcurrencyTest(
        'validateToken',
        async () => {
          const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
          return tokenService.getTokenInfo(randomToken);
        },
        {
          concurrentUsers,
          operationsPerUser,
        }
      );
      expect(metrics.successfulOperations).toBe(concurrentUsers * operationsPerUser);
      expect(metrics.averageResponseTime).toBeLessThan(75); // Slightly higher under concurrency
      expect(metrics.throughput).toBeGreaterThan(10); // > 10 validations/sec under concurrency
    });
  });
  describe('Token Revocation Performance', () => {
    beforeEach(async () => {
      // Seed tokens for revocation tests
      const tokens: Record<string, any> = {};
      const userId = TestDataGenerator.generateUserId();

      for (let i = 0; i < 50; i++) {
        const token = TestDataGenerator.generateToken();
        tokens[token] = {
          owner: userId,
          note: `Token to revoke ${i}`,
          permissions: ['GP'],
          gameMode: 'pvp',
          calls: 0,
          createdAt: { toDate: () => new Date() },
        };
      }

      await suite.withDatabase({
        token: tokens,
        system: {
          [userId]: { tokens: Object.keys(tokens) },
        },
      });
    });
    it('should revoke tokens efficiently', async () => {
      const tokens = Object.keys((global as any).dbState?.token || {});
      const revokeCount = Math.min(25, tokens.length);
      const metrics = await loadTester.runLoadTest(
        'revokeToken',
        async () => {
          const tokenToRevoke = tokens.pop();
          if (!tokenToRevoke) throw new Error('No tokens left to revoke');

          return tokenService.revokeToken(tokenToRevoke, { token: tokenToRevoke });
        },
        {
          totalOperations: revokeCount,
          concurrency: 5,
        }
      );
      expect(metrics.successfulOperations).toBe(revokeCount);
      expect(metrics.averageResponseTime).toBeLessThan(100);
      expect(metrics.throughput).toBeGreaterThan(5); // > 5 revocations/sec
    });
    it('should handle batch token revocation efficiently', async () => {
      const userId = TestDataGenerator.generateUserId();
      const tokens: Record<string, any> = {};

      // Create tokens for batch revocation
      for (let i = 0; i < 20; i++) {
        const token = TestDataGenerator.generateToken();
        tokens[token] = {
          owner: userId,
          note: `Batch revoke token ${i}`,
          permissions: ['GP'],
          gameMode: 'pvp',
          calls: 0,
          createdAt: { toDate: () => new Date() },
        };
      }

      await suite.withDatabase({
        token: tokens,
        system: {
          [userId]: { tokens: Object.keys(tokens) },
        },
      });
      const batchMetrics = await monitor.measureOperation('batchRevokeTokens', async () => {
        const revokePromises = Object.keys(tokens).map((token) =>
          tokenService.revokeToken(token, { token })
        );
        return Promise.all(revokePromises);
      });
      expect(batchMetrics.result).toHaveLength(20);
      expect(batchMetrics.metrics.duration).toBeLessThan(1000); // < 1 second for 20 tokens
      expect(batchMetrics.metrics.success).toBe(true);
    });
  });
  describe('Memory and Resource Usage', () => {
    it('should not leak memory during token operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 5;
      const tokensPerIteration = 20;
      for (let iteration = 0; iteration < iterations; iteration++) {
        const userId = TestDataGenerator.generateUserId(`iter${iteration}`);

        // Create tokens
        await loadTester.runLoadTest(
          'createToken',
          async () => {
            const tokenData = TestDataGenerator.generateToken();
            return tokenService.createToken(tokenData, {
              note: `Memory test token ${iteration}`,
              permissions: ['GP'],
              gameMode: 'pvp',
            });
          },
          {
            totalOperations: tokensPerIteration,
            concurrency: 5,
          }
        );
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      // Memory growth should be reasonable (less than 100MB for all operations)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
    });
    it('should handle sustained token operations without degradation', async () => {
      const duration = 10000; // 10 seconds
      const startTime = Date.now();
      let operationCount = 0;
      const responseTimes: number[] = [];
      while (Date.now() - startTime < duration) {
        const userId = TestDataGenerator.generateUserId();
        const tokenData = TestDataGenerator.generateToken();

        const metrics = await monitor.measureOperation('sustainedTokenCreation', async () => {
          return tokenService.createToken(tokenData, {
            note: `Sustained test token ${operationCount}`,
            permissions: ['GP'],
            gameMode: 'pvp',
          });
        });
        responseTimes.push(metrics.metrics.duration);
        operationCount++;
        // Small delay to simulate realistic usage
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      // Calculate performance degradation
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      // Performance should not degrade significantly (> 50% slower)
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
      expect(operationCount).toBeGreaterThan(50); // Should complete reasonable number of operations
    });
  });
  describe('Stress Tests', () => {
    it('should handle maximum concurrent token creation', async () => {
      const maxConcurrency = 50;
      const operationsPerUser = 2;
      const metrics = await loadTester.runConcurrencyTest(
        'maxConcurrencyTokenCreation',
        async (userId) => {
          const tokenData = TestDataGenerator.generateToken();
          return tokenService.createToken(tokenData, {
            note: `Max concurrency test ${userId}`,
            permissions: ['GP'],
            gameMode: 'pvp',
          });
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
      expect(metrics.averageResponseTime).toBeLessThan(500); // < 500ms even under high load
      expect(metrics.throughput).toBeGreaterThan(2); // > 2 ops/sec under extreme load
    });
    it('should recover from temporary overload conditions', async () => {
      // First, create a high load situation
      const highLoadMetrics = await loadTester.runLoadTest(
        'highLoadTokenCreation',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          const tokenData = TestDataGenerator.generateToken();
          return tokenService.createToken(tokenData, {
            note: 'High load test',
            permissions: ['GP'],
            gameMode: 'pvp',
          });
        },
        {
          totalOperations: 100,
          concurrency: 20,
        }
      );
      // Allow system to recover
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Test normal performance after recovery
      const recoveryMetrics = await loadTester.runLoadTest(
        'recoveryTokenCreation',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          const tokenData = TestDataGenerator.generateToken();
          return tokenService.createToken(tokenData, {
            note: 'Recovery test',
            permissions: ['GP'],
            gameMode: 'pvp',
          });
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
