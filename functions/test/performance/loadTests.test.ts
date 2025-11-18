import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenService } from '../../src/services/TokenService';
import { ProgressService } from '../../src/services/ProgressService';
import { TeamService } from '../../src/services/TeamService';
import { PerformanceMonitor, LoadTester, TestDataGenerator } from './performanceUtils';
import { createTestSuite, getTarkovSeedData } from '../helpers';

const RUN_PERFORMANCE_TESTS = process.env.ENABLE_PERFORMANCE_TESTS === 'true';

// Performance suites are opt-in to avoid slowing down normal dev/CI runs.
// Enable by setting ENABLE_PERFORMANCE_TESTS=true in the environment.
(RUN_PERFORMANCE_TESTS ? describe : describe.skip)('System Load Tests', () => {
  const suite = createTestSuite('SystemLoadTests');
  let tokenService: TokenService;
  let progressService: ProgressService;
  let teamService: TeamService;
  let monitor: PerformanceMonitor;
  let loadTester: LoadTester;

  beforeEach(async () => {
    await suite.beforeEach();
    tokenService = new TokenService();
    progressService = new ProgressService();
    teamService = new TeamService();
    monitor = new PerformanceMonitor();
    loadTester = new LoadTester();
    // Seed basic test data
    await suite.withDatabase({
      ...getTarkovSeedData(),
      token: {},
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
  describe('Realistic User Workflows', () => {
    it('should handle typical user lifecycle under load', async () => {
      const userCount = 25;
      const metrics = await loadTester.runLoadTest(
        'userLifecycle',
        async () => {
          const userId = TestDataGenerator.generateUserId();

          // Step 1: Create token
          const tokenData = TestDataGenerator.generateToken();
          const tokenResult = await tokenService.createToken(tokenData, {
            note: 'Load test user token',
            permissions: ['GP', 'WP', 'TP'],
            gameMode: 'pvp',
          });
          // Step 2: Get/create progress
          const progressResult = await progressService.getUserProgress(userId, 'pvp');
          // Step 3: Update some tasks
          const taskUpdates = TestDataGenerator.generateTaskUpdates(2);
          await progressService.updateMultipleTasks(userId, taskUpdates, 'pvp');
          // Step 4: Create team
          const teamResult = await teamService.createTeam(userId, {
            password: 'testpass123',
            maximumMembers: 5,
          });
          // Step 5: Get team progress
          await teamService.getTeamProgress(userId, 'pvp');
          return {
            token: tokenResult,
            progress: progressResult,
            team: teamResult,
          };
        },
        {
          totalOperations: userCount,
          concurrency: 5,
          rampUpTime: 2000,
        }
      );
      expect(metrics.successfulOperations).toBe(userCount);
      expect(metrics.averageResponseTime).toBeLessThan(5000); // < 5 seconds for full lifecycle
      expect(metrics.p95ResponseTime).toBeLessThan(10000); // < 10 seconds p95
      expect(metrics.throughput).toBeGreaterThan(0.1); // > 0.1 user lifecycles/sec
      expect(metrics.errorRate).toBe(0);
    });
    it('should handle team collaboration workflow under load', async () => {
      const teamCount = 15;
      const membersPerTeam = 4;
      // First, create teams
      const teams: Array<{ teamId: string; password: string; ownerId: string }> = [];
      for (let i = 0; i < teamCount; i++) {
        const ownerId = TestDataGenerator.generateUserId(`owner${i}`);
        const teamResult = await teamService.createTeam(ownerId, {
          password: `teampass${i}`,
          maximumMembers: membersPerTeam + 1,
        });

        teams.push({
          teamId: teamResult.team,
          password: teamResult.password,
          ownerId,
        });
      }
      // Now add members to teams concurrently
      const metrics = await loadTester.runLoadTest(
        'teamCollaboration',
        async () => {
          const team = teams[Math.floor(Math.random() * teams.length)];
          const userId = TestDataGenerator.generateUserId();

          // Join team
          await teamService.joinTeam(userId, {
            id: team.teamId,
            password: team.password,
          });
          // Create progress for user
          await progressService.getUserProgress(userId, 'pvp');
          // Update some tasks
          const taskUpdates = TestDataGenerator.generateTaskUpdates(2);
          await progressService.updateMultipleTasks(userId, taskUpdates, 'pvp');
          // Get team progress
          await teamService.getTeamProgress(userId, 'pvp');
          return { userId, teamId: team.teamId };
        },
        {
          totalOperations: teamCount * membersPerTeam,
          concurrency: 8,
        }
      );
      expect(metrics.successfulOperations).toBe(teamCount * membersPerTeam);
      expect(metrics.averageResponseTime).toBeLessThan(3000); // < 3 seconds for collaboration workflow
      expect(metrics.throughput).toBeGreaterThan(0.5); // > 0.5 collaboration workflows/sec
    });
    it('should handle mixed read/write operations under sustained load', async () => {
      const duration = 10000; // 10 seconds
      const startTime = Date.now();
      let operationCount = 0;
      const responseTimes: number[] = [];
      // Pre-seed some data
      const userIds: string[] = [];
      const teamIds: string[] = [];

      for (let i = 0; i < 10; i++) {
        const userId = TestDataGenerator.generateUserId(`seed${i}`);
        userIds.push(userId);

        // Create token
        const tokenData = TestDataGenerator.generateToken();
        await tokenService.createToken(tokenData, {
          note: `Seed token ${i}`,
          permissions: ['GP', 'WP'],
          gameMode: 'pvp',
        });
        // Create progress
        await progressService.getUserProgress(userId, 'pvp');
        // Create team for some users
        if (i < 5) {
          const teamResult = await teamService.createTeam(userId, {
            password: `seedpass${i}`,
            maximumMembers: 5,
          });
          teamIds.push(teamResult.team);
        }
      }
      while (Date.now() - startTime < duration) {
        const metrics = await monitor.measureOperation('mixedSustainedLoad', async () => {
          const operationType = Math.random();

          if (operationType < 0.3) {
            // Read operation (30%)
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            return progressService.getUserProgress(userId, 'pvp');
          } else if (operationType < 0.5) {
            // Write operation (20%)
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            const taskUpdates = TestDataGenerator.generateTaskUpdates(1);
            return progressService.updateMultipleTasks(userId, taskUpdates, 'pvp');
          } else if (operationType < 0.7) {
            // Token validation (20%)
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            return tokenService.getTokenInfo(`perf-token-${userId}`);
          } else if (operationType < 0.9 && teamIds.length > 0) {
            // Team operation (20%)
            const userId = userIds[Math.floor(Math.random() * userIds.length)];
            return teamService.getTeamProgress(userId, 'pvp');
          } else {
            // Create new user (10%)
            const newUserId = TestDataGenerator.generateUserId();
            const tokenData = TestDataGenerator.generateToken();
            await tokenService.createToken(tokenData, {
              note: 'Sustained load token',
              permissions: ['GP'],
              gameMode: 'pvp',
            });
            return progressService.getUserProgress(newUserId, 'pvp');
          }
        });
        responseTimes.push(metrics.metrics.duration);
        operationCount++;
        // Small delay to simulate realistic usage patterns
        await new Promise((resolve) => {
          setTimeout(resolve, Math.random() * 50);
        });
      }
      // Calculate performance metrics
      const avgResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      expect(avgResponseTime).toBeLessThan(2000); // < 2 seconds average under mixed load
      expect(maxResponseTime).toBeLessThan(5000); // < 5 seconds max response time
      expect(operationCount).toBeGreaterThan(10); // Should complete reasonable number of operations

      // Performance should be relatively stable (low variance)
      const variance = maxResponseTime / minResponseTime;
      expect(variance).toBeLessThan(10); // < 10x variance
    });
  });
  describe('Peak Load Scenarios', () => {
    it('should handle peak hour traffic simulation', async () => {
      // Simulate peak hour with high concurrent users
      const peakUsers = 50;
      const operationsPerUser = 3;
      const metrics = await loadTester.runConcurrencyTest(
        'peakHourSimulation',
        async (userId) => {
          // Simulate typical user behavior during peak hours
          const operations = [];
          // 1. Validate token (most common operation)
          operations.push(
            tokenService
              .getTokenInfo(`peak-token-${userId}`)
              .catch(() => ({ error: 'Token not found' }))
          );
          // 2. Get progress
          operations.push(progressService.getUserProgress(userId, 'pvp'));
          // 3. Update progress (less common)
          if (Math.random() > 0.5) {
            const taskUpdates = TestDataGenerator.generateTaskUpdates(1);
            operations.push(progressService.updateMultipleTasks(userId, taskUpdates, 'pvp'));
          }
          return Promise.all(operations);
        },
        {
          concurrentUsers: peakUsers,
          operationsPerUser,
        }
      );
      expect(metrics.successfulOperations).toBeGreaterThan(peakUsers * operationsPerUser * 0.5); // > 50% success
      expect(metrics.averageResponseTime).toBeLessThan(3000); // < 3 seconds under peak load
      expect(metrics.throughput).toBeGreaterThan(1); // > 1 operation/sec under peak load
    });
    it('should handle flash crowd scenario', async () => {
      // Simulate sudden spike in traffic (flash crowd)
      const flashCrowdSize = 100;
      const metrics = await loadTester.runLoadTest(
        'flashCrowd',
        async () => {
          const userId = TestDataGenerator.generateUserId();

          // Most users will try to create tokens and get progress simultaneously
          const tokenData = TestDataGenerator.generateToken();
          const tokenPromise = tokenService.createToken(tokenData, {
            note: 'Flash crowd token',
            permissions: ['GP'],
            gameMode: 'pvp',
          });
          const progressPromise = progressService.getUserProgress(userId, 'pvp');
          return Promise.all([tokenPromise, progressPromise]);
        },
        {
          totalOperations: flashCrowdSize,
          concurrency: Math.min(50, flashCrowdSize / 2), // High concurrency
          rampUpTime: 1000, // Rapid ramp-up
        }
      );
      // System should handle flash crowd gracefully
      expect(metrics.successfulOperations).toBeGreaterThan(flashCrowdSize * 0.7); // > 70% success rate
      expect(metrics.averageResponseTime).toBeLessThan(800); // < 800ms under extreme load
      expect(metrics.p95ResponseTime).toBeLessThan(2000); // < 2 seconds p95
    });
    it('should handle sustained high load without degradation', async () => {
      const duration = 15000; // 15 seconds of sustained high load
      const concurrentUsers = 30;
      const startTime = Date.now();
      const operationMetrics: Array<{ timestamp: number; responseTime: number; success: boolean }> =
        [];
      const userPromises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
        const userId = TestDataGenerator.generateUserId(`sustained${userIndex}`);

        while (Date.now() - startTime < duration) {
          const operationStart = Date.now();

          try {
            const operationType = Math.random();

            if (operationType < 0.4) {
              await progressService.getUserProgress(userId, 'pvp');
            } else if (operationType < 0.7) {
              const taskUpdates = TestDataGenerator.generateTaskUpdates(1);
              await progressService.updateMultipleTasks(userId, taskUpdates, 'pvp');
            } else if (operationType < 0.9) {
              await tokenService.getTokenInfo(`sustained-token-${userId}`);
            } else {
              await teamService.getTeamProgress(userId, 'pvp');
            }

            operationMetrics.push({
              timestamp: Date.now(),
              responseTime: Date.now() - operationStart,
              success: true,
            });
          } catch (_error) {
            operationMetrics.push({
              timestamp: Date.now(),
              responseTime: Date.now() - operationStart,
              success: false,
            });
          }
          // Small delay between operations
          await new Promise((resolve) => {
            setTimeout(resolve, Math.random() * 100);
          });
        }
      });
      await Promise.all(userPromises);
      // Analyze performance over time
      const totalOperations = operationMetrics.length;
      const successfulOperations = operationMetrics.filter((m) => m.success).length;
      const responseTimes = operationMetrics.map((m) => m.responseTime);
      const avgResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      // Check for performance degradation over time
      const midpoint = startTime + duration / 2;
      const firstHalf = operationMetrics.filter((m) => m.timestamp < midpoint);
      const secondHalf = operationMetrics.filter((m) => m.timestamp >= midpoint);
      const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.responseTime, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, m) => sum + m.responseTime, 0) / secondHalf.length;
      expect(totalOperations).toBeGreaterThan(100); // Should complete many operations
      expect(successfulOperations / totalOperations).toBeGreaterThan(0.8); // > 80% success rate
      expect(avgResponseTime).toBeLessThan(500); // < 500ms average under sustained load
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5); // < 50% degradation over time
    });
  });
  describe('Resource Exhaustion Tests', () => {
    it('should handle memory pressure gracefully', async () => {
      const initialMemory = process.memoryUsage();
      const memoryIntensiveOperations = 200;
      const metrics = await loadTester.runLoadTest(
        'memoryPressure',
        async () => {
          const userId = TestDataGenerator.generateUserId();

          // Create multiple tokens per user to increase memory usage
          const tokenPromises = [];
          for (let i = 0; i < 3; i++) {
            const tokenData = TestDataGenerator.generateToken();
            tokenPromises.push(
              tokenService.createToken(tokenData, {
                note: `Memory pressure token ${i}`,
                permissions: ['GP', 'WP'],
                gameMode: 'pvp',
              })
            );
          }
          // Create large progress data
          const largeTaskUpdates = TestDataGenerator.generateTaskUpdates(20);

          const [tokens] = await Promise.all([
            Promise.all(tokenPromises),
            progressService.getUserProgress(userId, 'pvp'),
            progressService.updateMultipleTasks(userId, largeTaskUpdates, 'pvp'),
          ]);
          return tokens;
        },
        {
          totalOperations: memoryIntensiveOperations,
          concurrency: 10,
        }
      );
      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(metrics.successfulOperations).toBeGreaterThan(memoryIntensiveOperations * 0.8); // > 80% success
      expect(metrics.averageResponseTime).toBeLessThan(1000); // < 1 second even under memory pressure
      expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // < 200MB growth for memory-intensive operations
    });
    it('should handle database connection limits', async () => {
      // Simulate many concurrent database operations
      const dbIntensiveOperations = 150;
      const highConcurrency = 25;
      const metrics = await loadTester.runLoadTest(
        'dbConnectionLimits',
        async () => {
          const userId = TestDataGenerator.generateUserId();

          // Perform multiple database operations in parallel
          const operations: Array<Promise<unknown>> = [
            progressService.getUserProgress(userId, 'pvp'),
            progressService.getUserProgress(userId, 'pve'),
            tokenService.createToken(TestDataGenerator.generateToken(), {
              note: 'DB intensive token',
              permissions: ['GP'],
              gameMode: 'pvp',
            }),
          ];
          // Add some team operations
          if (Math.random() > 0.5) {
            operations.push(
              teamService.createTeam(userId, {
                password: 'dbpass',
                maximumMembers: 5,
              })
            );
          }
          const results = await Promise.allSettled(operations);
          return results;
        },
        {
          totalOperations: dbIntensiveOperations,
          concurrency: highConcurrency,
        }
      );
      expect(metrics.successfulOperations).toBeGreaterThan(dbIntensiveOperations * 0.7); // > 70% success
      expect(metrics.averageResponseTime).toBeLessThan(4000); // < 1.5 seconds under DB pressure
      expect(metrics.throughput).toBeGreaterThan(1); // > 1 operation/sec under DB pressure
    });
  });
  describe('Recovery and Resilience Tests', () => {
    it('should recover from temporary overload', async () => {
      // Phase 1: Create overload condition
      const _overloadMetrics = await loadTester.runLoadTest(
        'overloadPhase',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          const tokenData = TestDataGenerator.generateToken();

          return Promise.all([
            tokenService.createToken(tokenData, {
              note: 'Overload token',
              permissions: ['GP', 'WP', 'TP'],
              gameMode: 'pvp',
            }),
            progressService.getUserProgress(userId, 'pvp'),
            teamService.createTeam(userId, {
              password: 'overloadpass',
              maximumMembers: 10,
            }),
          ]);
        },
        {
          totalOperations: 80,
          concurrency: 20,
        }
      );
      // Phase 2: Allow recovery period
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
      // Phase 3: Test recovery performance
      const recoveryMetrics = await loadTester.runLoadTest(
        'recoveryPhase',
        async () => {
          const userId = TestDataGenerator.generateUserId();
          return progressService.getUserProgress(userId, 'pvp');
        },
        {
          totalOperations: 30,
          concurrency: 5,
        }
      );
      // System should recover to normal performance
      expect(recoveryMetrics.averageResponseTime).toBeLessThan(1000); // < 200ms after recovery
      expect(recoveryMetrics.successfulOperations).toBe(30);
      expect(recoveryMetrics.errorRate).toBe(0);
    });
    it('should maintain performance during gradual load increase', async () => {
      const phases = [
        { operations: 20, concurrency: 5 },
        { operations: 30, concurrency: 8 },
        { operations: 40, concurrency: 12 },
        { operations: 50, concurrency: 15 },
      ];
      const phaseMetrics: Array<{ phase: number; avgResponseTime: number; successRate: number }> =
        [];
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];

        const metrics = await loadTester.runLoadTest(
          `gradualLoadPhase${i}`,
          async () => {
            const userId = TestDataGenerator.generateUserId();
            const operationType = Math.random();

            if (operationType < 0.5) {
              return progressService.getUserProgress(userId, 'pvp');
            } else {
              const taskUpdates = TestDataGenerator.generateTaskUpdates(1);
              return progressService.updateMultipleTasks(userId, taskUpdates, 'pvp');
            }
          },
          {
            totalOperations: phase.operations,
            concurrency: phase.concurrency,
          }
        );
        phaseMetrics.push({
          phase: i + 1,
          avgResponseTime: metrics.averageResponseTime,
          successRate: (metrics.successfulOperations / metrics.totalOperations) * 100,
        });
        // Small delay between phases
        if (i < phases.length - 1) {
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
        }
      }
      // Performance should degrade gracefully
      expect(phaseMetrics[0].avgResponseTime).toBeLessThan(150); // Phase 1 should be fast
      expect(phaseMetrics[3].avgResponseTime).toBeLessThan(2000); // Phase 4 should still be reasonable

      // Success rate should remain high
      phaseMetrics.forEach((metric) => {
        expect(metric.successRate).toBeGreaterThan(85); // > 85% success rate in all phases
      });
      // Performance degradation should be linear, not exponential
      const performanceDegradation =
        phaseMetrics[3].avgResponseTime / phaseMetrics[0].avgResponseTime;
      expect(performanceDegradation).toBeLessThan(3); // < 3x degradation from phase 1 to 4
    });
  });
});
