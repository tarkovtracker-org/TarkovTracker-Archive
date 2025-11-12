/**
 * Test Data Factories - Centralized factory for creating test data
 * 
 * This file exports all factory classes and provides a unified interface
 * for creating consistent test data across all test files.
 */

import { TokenFactory } from './TokenFactory';
import { UserFactory } from './UserFactory';
import { TeamFactory } from './TeamFactory';
import { ProgressFactory } from './ProgressFactory';
import { TaskFactory } from './TaskFactory';
export { TokenFactory } from './TokenFactory';
export { UserFactory } from './UserFactory';
export { TeamFactory } from './TeamFactory';
export { ProgressFactory } from './ProgressFactory';
export { TaskFactory } from './TaskFactory';
export { TestDataBuilder } from './TestDataBuilder';

// Re-export commonly used factory methods for convenience
export const createTestToken = (...args: any[]) => TokenFactory.create(...args);
export const createTestUser = (...args: any[]) => UserFactory.create(...args);
export const createTestTeam = (...args: any[]) => TeamFactory.create(...args);
export const createTestProgress = (...args: any[]) => ProgressFactory.create(...args);
export const createTestTask = (...args: any[]) => TaskFactory.create(...args);

// Bulk creation methods
export const createTestTokens = (...args: any[]) => TokenFactory.createMany(...args);
export const createTestUsers = (...args: any[]) => UserFactory.createMany(...args);
export const createTestTeams = (...args: any[]) => TeamFactory.createMany(...args);
export const createTestProgresses = (...args: any[]) => ProgressFactory.createMany(...args);
export const createTestTasks = (...args: any[]) => TaskFactory.createMany(...args);