/**
 * Assertion Helpers - Custom matchers and assertion utilities
 *
 * This file provides custom assertion helpers to make tests more readable
 * and provide more specific error messages.
 */

import { expect } from 'vitest';

/**
 * Custom assertion helpers for tokens
 */
export const expectToken = (token: any) => ({
  toBeValidToken: () => {
    expect(token).toBeDefined();
    expect(token).toHaveProperty('id');
    expect(token).toHaveProperty('owner');
    expect(token).toHaveProperty('note');
    expect(token).toHaveProperty('permissions');
    expect(token).toHaveProperty('gameMode');
    expect(token).toHaveProperty('calls');
    expect(token).toHaveProperty('createdAt');

    expect(typeof token.id).toBe('string');
    expect(typeof token.owner).toBe('string');
    expect(typeof token.note).toBe('string');
    expect(Array.isArray(token.permissions)).toBe(true);
    expect(['pvp', 'pve']).toContain(token.gameMode);
    expect(typeof token.calls).toBe('number');
    expect(token.createdAt).toBeInstanceOf(Date);
  },

  toBeOwnedBy: (userId: string) => {
    expect(token).toBeDefined();
    expect(token.owner).toBe(userId);
  },

  toHavePermissions: (permissions: string[]) => {
    expect(token).toBeDefined();
    expect(token.permissions).toEqual(expect.arrayContaining(permissions));
  },

  toHaveExactPermissions: (permissions: string[]) => {
    expect(token).toBeDefined();
    expect(token.permissions).toEqual(expect.arrayContaining(permissions));
    expect(token.permissions).toHaveLength(permissions.length);
  },

  toHaveGameMode: (gameMode: 'pvp' | 'pve') => {
    expect(token).toBeDefined();
    expect(token.gameMode).toBe(gameMode);
  },

  toHaveCallCount: (count: number) => {
    expect(token).toBeDefined();
    expect(token.calls).toBe(count);
  },

  toHaveBeenCalled: (times: number = 1) => {
    expect(token).toBeDefined();
    expect(token.calls).toBeGreaterThanOrEqual(times);
  },
});

/**
 * Custom assertion helpers for users
 */
export const expectUser = (user: any) => ({
  toBeValidUser: () => {
    expect(user).toBeDefined();
    expect(user).toHaveProperty('uid');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('displayName');
    expect(user).toHaveProperty('level');
    expect(user).toHaveProperty('gameEdition');
    expect(user).toHaveProperty('pmcFaction');

    expect(typeof user.uid).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.displayName).toBe('string');
    expect(typeof user.level).toBe('number');
    expect(typeof user.gameEdition).toBe('number');
    expect(['USEC', 'BEAR']).toContain(user.pmcFaction);
  },

  toHaveLevel: (level: number) => {
    expect(user).toBeDefined();
    expect(user.level).toBe(level);
  },

  toHaveGameEdition: (edition: number) => {
    expect(user).toBeDefined();
    expect(user.gameEdition).toBe(edition);
  },

  toHaveFaction: (faction: 'USEC' | 'BEAR') => {
    expect(user).toBeDefined();
    expect(user.pmcFaction).toBe(faction);
  },

  toBeInLevelRange: (min: number, max: number) => {
    expect(user).toBeDefined();
    expect(user.level).toBeGreaterThanOrEqual(min);
    expect(user.level).toBeLessThanOrEqual(max);
  },
});

/**
 * Custom assertion helpers for teams
 */
export const expectTeam = (team: any) => ({
  toBeValidTeam: () => {
    expect(team).toBeDefined();
    expect(team).toHaveProperty('id');
    expect(team).toHaveProperty('name');
    expect(team).toHaveProperty('owner');
    expect(team).toHaveProperty('members');
    expect(team).toHaveProperty('createdAt');
    expect(team).toHaveProperty('settings');

    expect(typeof team.id).toBe('string');
    expect(typeof team.name).toBe('string');
    expect(typeof team.owner).toBe('string');
    expect(Array.isArray(team.members)).toBe(true);
    expect(team.createdAt).toBeInstanceOf(Date);
    expect(typeof team.settings).toBe('object');
  },

  toBeOwnedBy: (userId: string) => {
    expect(team).toBeDefined();
    expect(team.owner).toBe(userId);
  },

  toHaveMember: (userId: string) => {
    expect(team).toBeDefined();
    expect(team.members).toContain(userId);
  },

  toHaveMemberCount: (count: number) => {
    expect(team).toBeDefined();
    expect(team.members).toHaveLength(count);
  },

  toNotHaveMember: (userId: string) => {
    expect(team).toBeDefined();
    expect(team.members).not.toContain(userId);
  },

  toHaveSettings: (settings: any) => {
    expect(team).toBeDefined();
    expect(team.settings).toEqual(expect.objectContaining(settings));
  },
});

/**
 * Custom assertion helpers for progress
 */
export const expectProgress = (progress: any) => ({
  toBeValidProgress: () => {
    expect(progress).toBeDefined();
    expect(progress).toHaveProperty('currentGameMode');
    expect(progress).toHaveProperty('pvp');
    expect(progress).toHaveProperty('pve');

    expect(['pvp', 'pve']).toContain(progress.currentGameMode);
    expect(typeof progress.pvp).toBe('object');
    expect(typeof progress.pve).toBe('object');
  },

  toHaveGameMode: (gameMode: 'pvp' | 'pve') => {
    expect(progress).toBeDefined();
    expect(progress.currentGameMode).toBe(gameMode);
  },

  toHaveTaskCompletion: (taskId: string, gameMode?: 'pvp' | 'pve') => {
    expect(progress).toBeDefined();
    const modeData = gameMode || progress.currentGameMode;
    expect(progress[modeData]).toHaveProperty('taskCompletions');
    expect(progress[modeData].taskCompletions).toHaveProperty(taskId);
  },

  toHaveTaskObjective: (taskId: string, objectiveId: string, gameMode?: 'pvp' | 'pve') => {
    expect(progress).toBeDefined();
    const modeData = gameMode || progress.currentGameMode;
    expect(progress[modeData]).toHaveProperty('taskObjectives');
    expect(progress[modeData].taskObjectives).toHaveProperty(taskId);
    expect(progress[modeData].taskObjectives[taskId]).toHaveProperty(objectiveId);
  },

  toHaveCompletedTask: (taskId: string, gameMode?: 'pvp' | 'pve') => {
    expect(progress).toBeDefined();
    const modeData = gameMode || progress.currentGameMode;
    expect(progress[modeData]).toHaveProperty('taskCompletions');
    expect(progress[modeData].taskCompletions[taskId]).toHaveProperty('complete', true);
  },

  toHaveFailedTask: (taskId: string, gameMode?: 'pvp' | 'pve') => {
    expect(progress).toBeDefined();
    const modeData = gameMode || progress.currentGameMode;
    expect(progress[modeData]).toHaveProperty('taskCompletions');
    expect(progress[modeData].taskCompletions[taskId]).toHaveProperty('failed', true);
  },
});

/**
 * Custom assertion helpers for API responses
 */
export const expectApiResponse = (response: any) => ({
  toBeSuccessful: () => {
    expect(response).toBeDefined();
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeDefined();
  },

  toHaveStatus: (statusCode: number) => {
    expect(response).toBeDefined();
    expect(response.statusCode).toBe(statusCode);
  },

  toHaveBody: (body: any) => {
    expect(response).toBeDefined();
    expect(response.body).toEqual(body);
  },

  toContainBody: (partialBody: any) => {
    expect(response).toBeDefined();
    expect(response.body).toEqual(expect.objectContaining(partialBody));
  },

  toHaveHeader: (header: string, value: string) => {
    expect(response).toBeDefined();
    expect(response.headers).toHaveProperty(header);
    expect(response.headers[header]).toBe(value);
  },

  toBeError: (statusCode: number, message: string) => {
    expect(response).toBeDefined();
    expect(response.statusCode).toBe(statusCode);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain(message);
  },
});

/**
 * Custom assertion helpers for errors
 */
export const expectError = (error: any) => ({
  toBeApiError: () => {
    expect(error).toBeDefined();
    expect(error).toHaveProperty('name');
    expect(error).toHaveProperty('message');
    expect(error).toHaveProperty('statusCode');
    expect(error.name).toBe('ApiError');
  },

  toHaveStatusCode: (statusCode: number) => {
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(statusCode);
  },

  toHaveMessage: (message: string | RegExp) => {
    expect(error).toBeDefined();
    if (typeof message === 'string') {
      expect(error.message).toContain(message);
    } else {
      expect(error.message).toMatch(message);
    }
  },

  toBeFirebaseError: () => {
    expect(error).toBeDefined();
    expect(error).toHaveProperty('code');
    expect(error).toHaveProperty('message');
    expect(error.name).toBe('FirebaseError');
  },

  toHaveErrorCode: (code: string) => {
    expect(error).toBeDefined();
    expect(error.code).toBe(code);
  },
});

/**
 * Custom assertion helpers for arrays
 */
export const expectArray = (array: any[]) => ({
  toBeEmpty: () => {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toHaveLength(0);
  },

  toHaveLength: (length: number) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toHaveLength(length);
  },

  toContainItem: (item: any) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toContain(item);
  },

  toContainItemMatching: (matcher: any) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toEqual(expect.arrayContaining([matcher]));
  },

  toAllSatisfy: (predicate: (item: any) => boolean) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array.every(predicate)).toBe(true);
  },

  toContainOnly: (items: any[]) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array).toHaveLength(items.length);
    items.forEach((item) => expect(array).toContain(item));
  },
});

/**
 * Custom assertion helpers for objects
 */
export const expectObject = (object: any) => ({
  toHaveProperty: (property: string) => {
    expect(object).toBeDefined();
    expect(object).toHaveProperty(property);
  },

  toHaveProperties: (properties: string[]) => {
    expect(object).toBeDefined();
    properties.forEach((property) => {
      expect(object).toHaveProperty(property);
    });
  },

  toMatchShape: (shape: any) => {
    expect(object).toBeDefined();
    expect(object).toEqual(expect.objectContaining(shape));
  },

  toBeEmpty: () => {
    expect(object).toBeDefined();
    expect(Object.keys(object)).toHaveLength(0);
  },

  toHaveKeyCount: (count: number) => {
    expect(object).toBeDefined();
    expect(Object.keys(object)).toHaveLength(count);
  },
});

/**
 * Custom assertion helpers for promises
 */
export const expectPromise = (promise: Promise<any>) => ({
  toResolve: async () => {
    await expect(promise).resolves.toBeDefined();
  },

  toResolveTo: async (value: any) => {
    await expect(promise).resolves.toEqual(value);
  },

  toReject: async () => {
    await expect(promise).rejects.toBeDefined();
  },

  toRejectWith: async (error: any) => {
    await expect(promise).rejects.toEqual(error);
  },

  toRejectWithError: async (message: string | RegExp) => {
    await expect(promise).rejects.toThrow(message);
  },
});

/**
 * Custom assertion helpers for mocks
 */
export const expectMock = (mock: any) => ({
  toHaveBeenCalled: () => {
    expect(mock).toHaveBeenCalled();
  },

  toHaveBeenCalledTimes: (count: number) => {
    expect(mock).toHaveBeenCalledTimes(count);
  },

  toHaveBeenCalledWith: (...args: any[]) => {
    expect(mock).toHaveBeenCalledWith(...args);
  },

  toHaveBeenCalledOnceWith: (...args: any[]) => {
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(...args);
  },

  toHaveLastBeenCalledWith: (...args: any[]) => {
    expect(mock).toHaveBeenCalled();
    const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
    expect(lastCall).toEqual(args);
  },

  toHaveReturned: (value: any) => {
    expect(mock).toHaveReturned();
    expect(mock).toHaveReturnedWith(value);
  },

  toHaveReturnedTimes: (count: number) => {
    expect(mock).toHaveReturnedTimes(count);
  },
});

/**
 * Custom assertion helpers for performance
 */
export const expectPerformance = (metrics: any) => ({
  toCompleteWithin: (maxDuration: number) => {
    expect(metrics).toBeDefined();
    expect(metrics.duration).toBeLessThan(maxDuration);
  },

  toHaveThroughput: (minOpsPerSecond: number) => {
    expect(metrics).toBeDefined();
    expect(metrics.throughput).toBeGreaterThan(minOpsPerSecond);
  },

  toHaveSuccessRate: (minSuccessRate: number) => {
    expect(metrics).toBeDefined();
    expect(metrics.successRate).toBeGreaterThan(minSuccessRate);
  },

  toHaveMemoryUsage: (maxMemoryMB: number) => {
    expect(metrics).toBeDefined();
    expect(metrics.memoryUsage).toBeDefined();
    expect(metrics.memoryUsage.heapUsed).toBeLessThan(maxMemoryMB * 1024 * 1024);
  },
});

/**
 * Helper to create custom assertion chains
 */
export const createCustomAssertion = <T>(value: T, assertionName: string) => {
  const assertion: any = {
    value,

    // Add custom assertion methods
    toMatchCustom: (matcher: (value: T) => boolean, message?: string) => {
      if (!matcher(value)) {
        throw new Error(message || `Custom assertion ${assertionName} failed`);
      }
    },
  };

  // Add chainable methods after object creation to avoid forward reference
  assertion.and = assertion;
  assertion.but = assertion;
  assertion.which = assertion;
  assertion.that = assertion;

  return assertion;
};

/**
 * Helper to extend Vitest expect with custom matchers
 */
export const extendExpect = () => {
  // Add custom matchers to Vitest's expect
  expect.extend({
    toBeValidToken(received: any) {
      const isValid =
        received &&
        typeof received.id === 'string' &&
        typeof received.owner === 'string' &&
        Array.isArray(received.permissions) &&
        ['pvp', 'pve'].includes(received.gameMode);

      return {
        pass: isValid,
        message: () => `expected ${received} to be a valid token`,
      };
    },

    toBeValidUser(received: any) {
      const isValid =
        received &&
        typeof received.uid === 'string' &&
        typeof received.email === 'string' &&
        typeof received.level === 'number' &&
        ['USEC', 'BEAR'].includes(received.pmcFaction);

      return {
        pass: isValid,
        message: () => `expected ${received} to be a valid user`,
      };
    },

    toBeValidTeam(received: any) {
      const isValid =
        received &&
        typeof received.id === 'string' &&
        typeof received.name === 'string' &&
        typeof received.owner === 'string' &&
        Array.isArray(received.members);

      return {
        pass: isValid,
        message: () => `expected ${received} to be a valid team`,
      };
    },
  });
};

// Initialize custom matchers
extendExpect();
