/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSuite, firestore } from '../../helpers';

import {
  fetchTeam,
  fetchUser,
  fetchTaskProgress,
  fetchHideoutProgress,
  fetchTraderProgress,
  clearDataLoaderCache,
} from '../../../src/utils/dataLoaders';

describe('dataLoaders', () => {
  const suite = createTestSuite('utils/dataLoaders');

  beforeEach(async () => {
    await suite.beforeEach();
    // Global afterEach in test/setup.ts handles Firestore cleanup
    // We just need to clear the data loader cache
    clearDataLoaderCache();
  });

  afterEach(async () => {
    // Clear cache after each test to prevent stale cached data from leaking to next test
    // Note: Firestore is cleared by global afterEach in test/setup.ts
    clearDataLoaderCache();
    await suite.afterEach();
  });

  describe('fetchTeam', () => {
    it('should fetch and cache team data', async () => {
      const teamId = 'team123';
      const mockTeamData = { name: 'Test Team', id: teamId };

      // Seed the team data
      await suite.withDatabase({
        teams: { [teamId]: mockTeamData },
      });

      // First call - fetches from Firestore
      const result1 = await fetchTeam(teamId);
      expect(result1).toMatchObject({ name: 'Test Team' });

      // Second call - should return same cached data
      const result2 = await fetchTeam(teamId);
      expect(result2).toMatchObject({ name: 'Test Team' });
      expect(result1).toBe(result2); // Same object reference = cached
    });

    it('should return null when team does not exist', async () => {
      const teamId = 'nonexistent';

      const result = await fetchTeam(teamId);
      expect(result).toBeNull();
    });

    it('should handle concurrent calls efficiently', async () => {
      const teamId = 'team123';
      const mockTeamData = { name: 'Test Team', id: teamId };

      // Seed the team data
      await suite.withDatabase({
        teams: { [teamId]: mockTeamData },
      });

      // Make concurrent calls
      const [result1, result2, result3] = await Promise.all([
        fetchTeam(teamId),
        fetchTeam(teamId),
        fetchTeam(teamId),
      ]);

      expect(result1).toMatchObject({ name: 'Test Team' });
      expect(result2).toMatchObject({ name: 'Test Team' });
      expect(result3).toMatchObject({ name: 'Test Team' });
      // All should return same cached reference
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
  describe('fetchUser', () => {
    it('should fetch and cache user data', async () => {
      const userId = 'user123';
      const mockUserData = { uid: userId, displayName: 'Test User' };

      // Seed user data
      await suite.withDatabase({
        users: { [userId]: mockUserData },
      });

      // First call
      const result1 = await fetchUser(userId);
      expect(result1).toMatchObject({ displayName: 'Test User' });

      // Second call - should return cached data
      const result2 = await fetchUser(userId);
      expect(result2).toMatchObject({ displayName: 'Test User' });
      expect(result1).toBe(result2); // Same reference = cached
    });

    it('should return null when user does not exist', async () => {
      const userId = 'nonexistent';

      const result = await fetchUser(userId);
      expect(result).toBeNull();
    });

    it('should handle concurrent calls efficiently', async () => {
      const userId = 'user123';
      const mockUserData = { uid: userId, displayName: 'Test User' };

      // Seed user data
      await suite.withDatabase({
        users: { [userId]: mockUserData },
      });

      // Make concurrent calls
      const [result1, result2, result3] = await Promise.all([
        fetchUser(userId),
        fetchUser(userId),
        fetchUser(userId),
      ]);

      expect(result1).toMatchObject({ displayName: 'Test User' });
      expect(result2).toMatchObject({ displayName: 'Test User' });
      expect(result3).toMatchObject({ displayName: 'Test User' });
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('fetchTaskProgress', () => {
    it('should fetch and cache task progress data', async () => {
      const userId = 'user123';
      const mockTaskData = { uid: userId, tasks: ['task1', 'task2'] };

      // Seed task progress data - use correct collection name
      await suite.withDatabase({
        taskProgress: { [userId]: mockTaskData },
      });

      // First call
      const result1 = await fetchTaskProgress(userId);
      expect(result1).toMatchObject({ tasks: ['task1', 'task2'] });

      // Second call - should return cached data
      const result2 = await fetchTaskProgress(userId);
      expect(result2).toMatchObject({ tasks: ['task1', 'task2'] });
      expect(result1).toBe(result2);
    });

    it('should return null when task progress does not exist', async () => {
      const userId = 'nonexistent';

      const result = await fetchTaskProgress(userId);
      expect(result).toBeNull();
    });

    it('should handle concurrent calls efficiently', async () => {
      const userId = 'user123';
      const mockTaskData = { uid: userId, tasks: ['task1', 'task2'] };

      // Seed task progress data - use correct collection name
      await suite.withDatabase({
        taskProgress: { [userId]: mockTaskData },
      });

      // Make concurrent calls
      const [result1, result2, result3] = await Promise.all([
        fetchTaskProgress(userId),
        fetchTaskProgress(userId),
        fetchTaskProgress(userId),
      ]);

      expect(result1).toMatchObject({ tasks: ['task1', 'task2'] });
      expect(result2).toMatchObject({ tasks: ['task1', 'task2'] });
      expect(result3).toMatchObject({ tasks: ['task1', 'task2'] });
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('fetchHideoutProgress', () => {
    it('should fetch and cache hideout progress data', async () => {
      const userId = 'user123';
      const mockHideoutData = { uid: userId, level: 10 };

      // Seed hideout progress data - use correct collection name
      await suite.withDatabase({
        hideoutProgress: { [userId]: mockHideoutData },
      });

      // First call
      const result1 = await fetchHideoutProgress(userId);
      expect(result1).toMatchObject({ level: 10 });

      // Second call - should return cached data
      const result2 = await fetchHideoutProgress(userId);
      expect(result2).toMatchObject({ level: 10 });
      expect(result1).toBe(result2);
    });

    it('should return null when hideout progress does not exist', async () => {
      const userId = 'nonexistent';

      const result = await fetchHideoutProgress(userId);
      expect(result).toBeNull();
    });

    it('should handle concurrent calls efficiently', async () => {
      const userId = 'user123';
      const mockHideoutData = { uid: userId, level: 10 };

      // Seed hideout progress data - use correct collection name
      await suite.withDatabase({
        hideoutProgress: { [userId]: mockHideoutData },
      });

      // Make concurrent calls
      const [result1, result2, result3] = await Promise.all([
        fetchHideoutProgress(userId),
        fetchHideoutProgress(userId),
        fetchHideoutProgress(userId),
      ]);

      expect(result1).toMatchObject({ level: 10 });
      expect(result2).toMatchObject({ level: 10 });
      expect(result3).toMatchObject({ level: 10 });
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('fetchTraderProgress', () => {
    it('should fetch and cache trader progress data', async () => {
      const userId = 'user123';
      const mockTraderData = { uid: userId, traders: { prapor: 1 } };

      // Seed trader progress data - use correct collection name
      await suite.withDatabase({
        traderProgress: { [userId]: mockTraderData },
      });

      // First call
      const result1 = await fetchTraderProgress(userId);
      expect(result1).toMatchObject({ traders: { prapor: 1 } });

      // Second call - should return cached data
      const result2 = await fetchTraderProgress(userId);
      expect(result2).toMatchObject({ traders: { prapor: 1 } });
      expect(result1).toBe(result2);
    });

    it('should return null when trader progress does not exist', async () => {
      const userId = 'nonexistent';

      const result = await fetchTraderProgress(userId);
      expect(result).toBeNull();
    });

    it('should handle concurrent calls efficiently', async () => {
      const userId = 'user123';
      const mockTraderData = { uid: userId, traders: { prapor: 1 } };

      // Seed trader progress data - use correct collection name
      await suite.withDatabase({
        traderProgress: { [userId]: mockTraderData },
      });

      // Make concurrent calls
      const [result1, result2, result3] = await Promise.all([
        fetchTraderProgress(userId),
        fetchTraderProgress(userId),
        fetchTraderProgress(userId),
      ]);

      expect(result1).toMatchObject({ traders: { prapor: 1 } });
      expect(result2).toMatchObject({ traders: { prapor: 1 } });
      expect(result3).toMatchObject({ traders: { prapor: 1 } });
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('cache isolation', () => {
    it('should not share cache between different collection types', async () => {
      const userId = 'user123';
      const mockUserData = { uid: userId, displayName: 'Test User' };
      const mockTaskData = { uid: userId, tasks: ['task1', 'task2'] };

      // Seed both types of data - use correct collection names
      await suite.withDatabase({
        users: { [userId]: mockUserData },
        taskProgress: { [userId]: mockTaskData },
      });

      // Fetch user
      const userResult = await fetchUser(userId);
      expect(userResult).toMatchObject({ displayName: 'Test User' });

      // Fetch task progress - different collection, different cache
      const taskResult = await fetchTaskProgress(userId);
      expect(taskResult).toMatchObject({ tasks: ['task1', 'task2'] });

      // They should be different objects (different caches)
      expect(userResult).not.toBe(taskResult);
    });

    it('should not share cache between different IDs', async () => {
      const userId1 = 'user123';
      const userId2 = 'user456';
      const mockUserData1 = { uid: userId1, displayName: 'User 1' };
      const mockUserData2 = { uid: userId2, displayName: 'User 2' };

      // Seed both users
      await suite.withDatabase({
        users: {
          [userId1]: mockUserData1,
          [userId2]: mockUserData2,
        },
      });

      // Fetch first user
      const userResult1 = await fetchUser(userId1);
      expect(userResult1).toMatchObject({ displayName: 'User 1' });

      // Fetch second user
      const userResult2 = await fetchUser(userId2);
      expect(userResult2).toMatchObject({ displayName: 'User 2' });

      // They should be different objects (different cache entries)
      expect(userResult1).not.toBe(userResult2);
    });
  });
});
