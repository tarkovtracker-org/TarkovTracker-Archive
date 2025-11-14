import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TeamService } from '../../src/services/TeamService';
import { PerformanceMonitor, LoadTester, TestDataGenerator } from './performanceUtils';
import { createTestSuite, getTarkovSeedData } from '../helpers/index.js';

const RUN_PERFORMANCE_TESTS = process.env.ENABLE_PERFORMANCE_TESTS === 'true';

// Performance suites are opt-in to avoid slowing down normal dev/CI runs.
// Enable by setting ENABLE_PERFORMANCE_TESTS=true in the environment.
(RUN_PERFORMANCE_TESTS ? describe : describe.skip)('Team Performance Tests', () => {
  const suite = createTestSuite('TeamPerformance');
  let teamService: TeamService;
  let monitor: PerformanceMonitor;
  let loadTester: LoadTester;

  beforeEach(async () => {
    await suite.beforeEach();
    teamService = new TeamService();
    monitor = new PerformanceMonitor();
    loadTester = new LoadTester();

    // Seed basic test data
    await suite.withDatabase({
      ...getTarkovSeedData(),
      teams: {},
      system: {},
      progress: {},
    });
  });

  afterEach(async () => {
    monitor.reset();
    loadTester.reset();
    await suite.afterEach();
  });
  describe('Team Creation Performance', () => {
    it('should create teams efficiently under load', async () => {
      const teamCount = 30;
      const metrics = await loadTester.runLoadTest(
        'createTeam',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          return teamService.createTeam(userId, {
            password: 'testpass123',
            maximumMembers: 10,
          });
        },
        {
          totalOperations: teamCount,
          concurrency: 6,
        }
      );
      expect(metrics.successfulOperations).toBe(teamCount);
      expect(metrics.averageResponseTime).toBeLessThan(150); // < 150ms average
      expect(metrics.p95ResponseTime).toBeLessThan(300); // < 300ms p95
      expect(metrics.throughput).toBeGreaterThan(8); // > 8 teams/sec
      expect(metrics.errorRate).toBe(0);
      // Memory usage should be reasonable
      const memoryGrowth =
        metrics.memoryUsage.final.heapUsed - metrics.memoryUsage.initial.heapUsed;
      expect(memoryGrowth).toBeLessThan(40 * 1024 * 1024); // < 40MB growth
    });
    it('should handle concurrent team creation efficiently', async () => {
      const concurrentUsers = 25;
      const operationsPerUser = 2;
      const metrics = await loadTester.runConcurrencyTest(
        'createTeam',
        async (userId) => {
          return teamService.createTeam(userId, {
            password: `testpass${userId}`,
            maximumMembers: 8,
          });
        },
        {
          concurrentUsers,
          operationsPerUser,
        }
      );
      expect(metrics.successfulOperations).toBe(concurrentUsers * operationsPerUser);
      expect(metrics.averageResponseTime).toBeLessThan(200); // < 200ms under concurrency
      expect(metrics.throughput).toBeGreaterThan(4); // > 4 teams/sec under concurrency
      // Check for memory leaks
      const memoryGrowth =
        metrics.memoryUsage[metrics.memoryUsage.length - 1].heapUsed -
        metrics.memoryUsage[0].heapUsed;
      expect(memoryGrowth).toBeLessThan(80 * 1024 * 1024); // < 80MB growth
    });
    it('should handle teams with different sizes efficiently', async () => {
      const teamSizes = [5, 10, 20, 30, 50];
      const operationCount = teamSizes.length;
      const metrics = await loadTester.runLoadTest(
        'createVariableSizeTeams',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          const maxSize = teamSizes[Math.floor(Math.random() * teamSizes.length)];
          return teamService.createTeam(userId, {
            password: 'testpass123',
            maximumMembers: maxSize,
          });
        },
        {
          totalOperations: operationCount * 3, // 3 iterations of each size
          concurrency: 5,
        }
      );
      expect(metrics.successfulOperations).toBe(operationCount * 3);
      expect(metrics.averageResponseTime).toBeLessThan(180);

      // Performance should not vary significantly based on team size
      const responseTimes = monitor
        .getOperationMetrics('createVariableSizeTeams')
        .map((m) => m.duration);
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      expect(maxResponseTime / minResponseTime).toBeLessThan(2); // < 2x variation
    });
  });
  describe('Team Join Performance', () => {
    beforeEach(async () => {
      // Seed teams for joining tests
      const teams: Record<string, any> = {};
      const system: Record<string, any> = {};

      for (let i = 0; i < 20; i++) {
        const teamId = TestDataGenerator.generateTeamId();
        const ownerId = TestDataGenerator.generateUserId(`owner${i}`);

        teams[teamId] = {
          owner: ownerId,
          password: `teampass${i}`,
          maximumMembers: 10,
          members: [ownerId],
          createdAt: { toDate: () => new Date() },
        };

        system[ownerId] = { team: teamId };
      }

      await suite.withDatabase({
        ...getTarkovSeedData(),
        teams,
        system,
      });
    });
    it('should handle team joining efficiently under load', async () => {
      const teams = Object.keys((global as any).dbState?.teams || {});
      const joinCount = Math.min(40, teams.length * 3); // 3 users per team max
      const metrics = await loadTester.runLoadTest(
        'joinTeam',
        async () => {
          const randomTeamId = teams[Math.floor(Math.random() * teams.length)];
          const userId = TestDataGenerator.generateUserId();

          return teamService.joinTeam(userId, {
            id: randomTeamId,
            password: `teampass${teams.indexOf(randomTeamId)}`,
          });
        },
        {
          totalOperations: joinCount,
          concurrency: 8,
        }
      );
      expect(metrics.successfulOperations).toBeGreaterThan(joinCount * 0.8); // Allow some failures due to team limits
      expect(metrics.averageResponseTime).toBeLessThan(120); // < 120ms average
      expect(metrics.p95ResponseTime).toBeLessThan(250); // < 250ms p95
      expect(metrics.throughput).toBeGreaterThan(10); // > 10 joins/sec
    });
    it('should handle concurrent team joining efficiently', async () => {
      const teams = Object.keys((global as any).dbState?.teams || {});
      const concurrentUsers = 30;
      const metrics = await loadTester.runConcurrencyTest(
        'joinTeam',
        async (userId) => {
          const randomTeamId = teams[Math.floor(Math.random() * teams.length)];
          return teamService.joinTeam(userId, {
            id: randomTeamId,
            password: `teampass${teams.indexOf(randomTeamId)}`,
          });
        },
        {
          concurrentUsers,
          operationsPerUser: 1,
        }
      );
      expect(metrics.successfulOperations).toBeGreaterThan(concurrentUsers * 0.7); // Allow some failures
      expect(metrics.averageResponseTime).toBeLessThan(180); // < 180ms under concurrency
      expect(metrics.throughput).toBeGreaterThan(5); // > 5 joins/sec under concurrency
    });
  });
  describe('Team Progress Retrieval Performance', () => {
    beforeEach(async () => {
      // Seed teams with members and progress
      const teams: Record<string, any> = {};
      const system: Record<string, any> = {};
      const progress: Record<string, any> = {};

      for (let i = 0; i < 15; i++) {
        const teamId = TestDataGenerator.generateTeamId();
        const ownerId = TestDataGenerator.generateUserId(`owner${i}`);
        const members = [ownerId];

        // Add additional members
        for (let j = 1; j < 5; j++) {
          const memberId = TestDataGenerator.generateUserId(`member${i}-${j}`);
          members.push(memberId);
          progress[memberId] = TestDataGenerator.generateProgressData();
        }

        progress[ownerId] = TestDataGenerator.generateProgressData();

        teams[teamId] = {
          owner: ownerId,
          password: `teampass${i}`,
          maximumMembers: 10,
          members,
          createdAt: { toDate: () => new Date() },
        };

        members.forEach((memberId) => {
          system[memberId] = { team: teamId };
        });
      }

      await suite.withDatabase({
        ...getTarkovSeedData(),
        teams,
        system,
        progress,
      });
    });
    it('should retrieve team progress efficiently under load', async () => {
      const userIds = Object.keys((global as any).dbState?.system || {});
      const operationCount = Math.min(25, userIds.length);
      const metrics = await loadTester.runLoadTest(
        'getTeamProgress',
        async () => {
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
          return teamService.getTeamProgress(randomUserId, 'pvp');
        },
        {
          totalOperations: operationCount,
          concurrency: 6,
        }
      );
      expect(metrics.successfulOperations).toBe(operationCount);
      expect(metrics.averageResponseTime).toBeLessThan(200); // < 200ms average (includes multiple user progress)
      expect(metrics.p95ResponseTime).toBeLessThan(400); // < 400ms p95
      expect(metrics.throughput).toBeGreaterThan(5); // > 5 team progress retrievals/sec
    });
    it('should handle concurrent team progress retrieval efficiently', async () => {
      const userIds = Object.keys((global as any).dbState?.system || {});
      const concurrentUsers = 20;
      const operationsPerUser = 3;
      const metrics = await loadTester.runConcurrencyTest(
        'getTeamProgress',
        async () => {
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
          return teamService.getTeamProgress(randomUserId, 'pvp');
        },
        {
          concurrentUsers,
          operationsPerUser,
        }
      );
      expect(metrics.successfulOperations).toBe(concurrentUsers * operationsPerUser);
      expect(metrics.averageResponseTime).toBeLessThan(300); // < 300ms under concurrency
      expect(metrics.throughput).toBeGreaterThan(3); // > 3 team progress retrievals/sec under concurrency
    });
    it('should handle team progress retrieval for different team sizes efficiently', async () => {
      // Create teams with different sizes
      const teamSizes = [2, 5, 8, 12];
      const userIds: string[] = [];

      for (const size of teamSizes) {
        const teamId = TestDataGenerator.generateTeamId();
        const ownerId = TestDataGenerator.generateUserId();
        const members = [ownerId];

        // Add members to reach desired size
        for (let i = 1; i < size; i++) {
          const memberId = TestDataGenerator.generateUserId();
          members.push(memberId);
          userIds.push(memberId);
        }

        userIds.push(ownerId);
      }
      const metrics = await loadTester.runLoadTest(
        'getVariableSizeTeamProgress',
        async () => {
          const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
          return teamService.getTeamProgress(randomUserId, 'pvp');
        },
        {
          totalOperations: 30,
          concurrency: 8,
        }
      );
      expect(metrics.successfulOperations).toBe(30);
      expect(metrics.averageResponseTime).toBeLessThan(250);

      // Performance should scale reasonably with team size
      const responseTimes = monitor
        .getOperationMetrics('getVariableSizeTeamProgress')
        .map((m) => m.duration);
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      expect(maxResponseTime / minResponseTime).toBeLessThan(3); // < 3x variation even with size differences
    });
  });
  describe('Team Leave Performance', () => {
    beforeEach(async () => {
      // Seed teams with members for leaving tests
      const teams: Record<string, any> = {};
      const system: Record<string, any> = {};

      for (let i = 0; i < 20; i++) {
        const teamId = TestDataGenerator.generateTeamId();
        const ownerId = TestDataGenerator.generateUserId(`owner${i}`);
        const members = [ownerId];

        // Add additional members
        for (let j = 1; j < 6; j++) {
          const memberId = TestDataGenerator.generateUserId(`member${i}-${j}`);
          members.push(memberId);
        }

        teams[teamId] = {
          owner: ownerId,
          password: `teampass${i}`,
          maximumMembers: 10,
          members,
          createdAt: { toDate: () => new Date() },
        };

        members.forEach((memberId) => {
          system[memberId] = { team: teamId };
        });
      }

      await suite.withDatabase({
        ...getTarkovSeedData(),
        teams,
        system,
      });
    });
    it('should handle team leaving efficiently under load', async () => {
      const memberUserIds = Object.keys((global as any).dbState?.system || {}).filter(
        (userId) => !userId.includes('owner')
      ); // Non-owners only
      const leaveCount = Math.min(30, memberUserIds.length);
      const metrics = await loadTester.runLoadTest(
        'leaveTeam',
        async () => {
          const userId = memberUserIds.pop();
          if (!userId) throw new Error('No users left to leave teams');
          return teamService.leaveTeam(userId);
        },
        {
          totalOperations: leaveCount,
          concurrency: 8,
        }
      );
      expect(metrics.successfulOperations).toBe(leaveCount);
      expect(metrics.averageResponseTime).toBeLessThan(100); // < 100ms average
      expect(metrics.p95ResponseTime).toBeLessThan(200); // < 200ms p95
      expect(metrics.throughput).toBeGreaterThan(15); // > 15 leaves/sec
    });
    it('should handle concurrent team leaving efficiently', async () => {
      const memberUserIds = Object.keys((global as any).dbState?.system || {}).filter(
        (userId) => !userId.includes('owner')
      );
      const concurrentUsers = Math.min(20, memberUserIds.length);
      const metrics = await loadTester.runConcurrencyTest(
        'leaveTeam',
        async (userId) => {
          return teamService.leaveTeam(userId);
        },
        {
          concurrentUsers,
          operationsPerUser: 1,
        }
      );
      expect(metrics.successfulOperations).toBe(concurrentUsers);
      expect(metrics.averageResponseTime).toBeLessThan(150); // < 150ms under concurrency
      expect(metrics.throughput).toBeGreaterThan(8); // > 8 leaves/sec under concurrency
    });
  });
  describe('Memory and Resource Usage', () => {
    it('should not leak memory during team operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 4;
      const teamsPerIteration = 10;
      for (let iteration = 0; iteration < iterations; iteration++) {
        // Create teams
        await loadTester.runLoadTest(
          'createTeam',
          async () => {
            const userId = TestDataGenerator.generateUserId(`iter${iteration}`);
            return teamService.createTeam(userId, {
              password: `testpass${iteration}`,
              maximumMembers: 5,
            });
          },
          {
            totalOperations: teamsPerIteration,
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
      expect(memoryGrowth).toBeLessThan(60 * 1024 * 1024); // < 60MB growth
    });
    it('should handle sustained team operations without degradation', async () => {
      const duration = 8000; // 8 seconds
      const startTime = Date.now();
      let operationCount = 0;
      const responseTimes: number[] = [];
      while (Date.now() - startTime < duration) {
        const userId = TestDataGenerator.generateUserId();

        const metrics = await monitor.measureOperation('sustainedTeamOperation', async () => {
          // Mix of team operations
          const operationType = Math.random();
          if (operationType < 0.4) {
            // Create team
            return teamService.createTeam(userId, {
              password: 'testpass123',
              maximumMembers: 5,
            });
          } else if (operationType < 0.7) {
            // Try to join a team (may fail, that's ok)
            try {
              return await teamService.joinTeam(userId, {
                id: 'non-existent-team',
                password: 'wrongpass',
              });
            } catch {
              return { success: false, operation: 'join' };
            }
          } else {
            // Try to leave a team (may fail, that's ok)
            try {
              return await teamService.leaveTeam(userId);
            } catch {
              return { success: false, operation: 'leave' };
            }
          }
        });
        responseTimes.push(metrics.metrics.duration);
        operationCount++;
        // Small delay to simulate realistic usage
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      // Calculate performance degradation
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      // Performance should not degrade significantly
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
      expect(operationCount).toBeGreaterThan(20); // Should complete reasonable number of operations
    });
  });
  describe('Stress Tests', () => {
    it('should handle maximum concurrent team operations', async () => {
      const maxConcurrency = 35;
      const operationsPerUser = 2;
      const metrics = await loadTester.runConcurrencyTest(
        'maxConcurrencyTeamOperations',
        async (userId) => {
          const operationType = Math.random();
          if (operationType < 0.5) {
            return teamService.createTeam(userId, {
              password: `testpass${userId}`,
              maximumMembers: 5,
            });
          } else {
            // Try to join (may fail, that's expected under stress)
            try {
              return await teamService.joinTeam(userId, {
                id: 'stress-team',
                password: 'stresspass',
              });
            } catch {
              return { success: false, operation: 'join' };
            }
          }
        },
        {
          concurrentUsers: maxConcurrency,
          operationsPerUser,
        }
      );
      // Should handle high concurrency with reasonable success rate
      expect(metrics.successfulOperations).toBeGreaterThan(
        maxConcurrency * operationsPerUser * 0.4
      ); // > 40% success
      expect(metrics.averageResponseTime).toBeLessThan(800); // < 800ms even under high load
      expect(metrics.throughput).toBeGreaterThan(2); // > 2 ops/sec under extreme load
    });
    it('should handle large team operations efficiently', async () => {
      // Create a large team
      const ownerId = TestDataGenerator.generateUserId('owner');
      const largeTeamId = TestDataGenerator.generateTeamId();
      const maxMembers = 50;

      await suite.withDatabase({
        ...getTarkovSeedData(),
        teams: {
          [largeTeamId]: {
            owner: ownerId,
            password: 'largepass',
            maximumMembers: maxMembers,
            members: [ownerId],
            createdAt: { toDate: () => new Date() },
          },
        },
        system: {
          [ownerId]: { team: largeTeamId },
        },
      });
      // Add many members to the team
      const addMembersMetrics = await monitor.measureOperation('addManyMembers', async () => {
        const addPromises = Array.from({ length: maxMembers - 1 }, async (_, index) => {
          const userId = TestDataGenerator.generateUserId(`member${index}`);
          return teamService.joinTeam(userId, {
            id: largeTeamId,
            password: 'largepass',
          });
        });
        return Promise.all(addPromises);
      });
      expect(addMembersMetrics.result).toHaveLength(maxMembers - 1);
      expect(addMembersMetrics.metrics.duration).toBeLessThan(5000); // < 5 seconds to add 49 members
      expect(addMembersMetrics.metrics.success).toBe(true);
      // Test team progress retrieval for large team
      const largeTeamProgressMetrics = await monitor.measureOperation(
        'getLargeTeamProgress',
        async () => {
          return teamService.getTeamProgress(ownerId, 'pvp');
        }
      );
      expect(largeTeamProgressMetrics.metrics.duration).toBeLessThan(1000); // < 1 second for large team
      expect(largeTeamProgressMetrics.metrics.success).toBe(true);
    });
    it('should recover from temporary overload conditions', async () => {
      // First, create a high load situation
      const highLoadMetrics = await loadTester.runLoadTest(
        'highLoadTeamOperations',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          return teamService.createTeam(userId, {
            password: 'highloadpass',
            maximumMembers: 5,
          });
        },
        {
          totalOperations: 60,
          concurrency: 20,
        }
      );
      // Allow system to recover
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Test normal performance after recovery
      const recoveryMetrics = await loadTester.runLoadTest(
        'recoveryTeamOperations',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          return teamService.createTeam(userId, {
            password: 'recoverypass',
            maximumMembers: 5,
          });
        },
        {
          totalOperations: 15,
          concurrency: 5,
        }
      );
      // Performance should recover to normal levels
      expect(recoveryMetrics.averageResponseTime).toBeLessThan(150);
      expect(recoveryMetrics.successfulOperations).toBe(15);
      expect(recoveryMetrics.errorRate).toBe(0);
    });
  });
});
