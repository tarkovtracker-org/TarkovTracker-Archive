import { 
  TaskStatus, 
  TaskUpdateRequest, 
  MultipleTaskUpdateRequest, 
  ObjectiveUpdateRequest,
  ApiToken 
} from '../types/api.js';
import { errors } from '../middleware/errorHandler.js';

export class ValidationService {
  /**
   * Validates task status values
   */
  static validateTaskStatus(status: unknown): status is TaskStatus {
    return typeof status === 'string' && 
           ['completed', 'failed', 'uncompleted'].includes(status);
  }

  /**
   * Validates and sanitizes task update request
   */
  static validateTaskUpdate(body: unknown): TaskUpdateRequest {
    if (!body || typeof body !== 'object') {
      throw errors.badRequest('Request body is required');
    }

    const { state } = body as { state?: unknown };
    
    if (!state) {
      throw errors.badRequest('State is required');
    }

    if (!this.validateTaskStatus(state)) {
      throw errors.badRequest(
        "Invalid state provided. Must be 'completed', 'failed', or 'uncompleted'"
      );
    }

    return { state };
  }

  /**
   * Validates multiple task updates request
   */
  static validateMultipleTaskUpdate(body: unknown): MultipleTaskUpdateRequest {
    if (!body || typeof body !== 'object' || !Array.isArray(body)) {
      throw errors.badRequest('Request body must be an array');
    }

    const updates = body as unknown[];

    if (updates.length === 0) {
      throw errors.badRequest('At least one task update is required');
    }

    // Validate each task update
    const validatedUpdates: MultipleTaskUpdateRequest = [];

    for (const task of updates) {
      if (!task || typeof task !== 'object') {
        throw errors.badRequest('Each task must be an object');
      }

      if (!('id' in task) || !('state' in task)) {
        throw errors.badRequest('Each task must have id and state fields');
      }

      const { id, state } = task;

      if (typeof id !== 'string') {
        throw errors.badRequest('Task id must be a string');
      }

      if (!this.validateTaskStatus(state)) {
        throw errors.badRequest(
          `Invalid state for task ${id}. Must be 'completed', 'failed', or 'uncompleted'`
        );
      }

      validatedUpdates.push({ id, state });
    }

    return validatedUpdates;
  }

  /**
   * Validates objective update request
   */
  static validateObjectiveUpdate(body: unknown): ObjectiveUpdateRequest {
    if (!body || typeof body !== 'object') {
      throw errors.badRequest('Request body is required');
    }

    const { state, count } = body as { state?: unknown; count?: unknown };

    if (!state && count == null) {
      throw errors.badRequest('Either state or count must be provided');
    }

    const update: ObjectiveUpdateRequest = {};

    if (state) {
      if (state !== 'completed' && state !== 'uncompleted') {
        throw errors.badRequest('State must be "completed" or "uncompleted"');
      }
      update.state = state;
    }

    if (count != null) {
      if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
        throw errors.badRequest('Count must be a non-negative integer');
      }
      update.count = count;
    }

    return update;
  }

  /**
   * Validates task ID parameter
   */
  static validateTaskId(taskId: string): string {
    if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
      throw errors.badRequest('Task ID is required and must be a non-empty string');
    }
    return taskId.trim();
  }

  /**
   * Validates objective ID parameter
   */
  static validateObjectiveId(objectiveId: string): string {
    if (!objectiveId || typeof objectiveId !== 'string' || objectiveId.trim().length === 0) {
      throw errors.badRequest('Objective ID is required and must be a non-empty string');
    }
    return objectiveId.trim();
  }

  /**
   * Validates player level
   */
  static validateLevel(level: unknown): number {
    const levelNum = parseInt(String(level), 10);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 79) {
      throw errors.badRequest('Level must be a number between 1 and 79');
    }
    return levelNum;
  }

  /**
   * Validates API token permissions
   */
  static validatePermissions(token: ApiToken | undefined, requiredPermission: string): void {
    if (!token) {
      throw errors.unauthorized('Authentication required');
    }

    if (!token.permissions.includes(requiredPermission)) {
      throw errors.forbidden(`Missing required permission: ${requiredPermission}`);
    }
  }

  /**
   * Validates user ID
   */
  static validateUserId(userId: string | undefined): string {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw errors.unauthorized('Valid user ID is required');
    }
    return userId.trim();
  }

  /**
   * Sanitizes and validates display name
   */
  static validateDisplayName(displayName: unknown): string {
    if (typeof displayName !== 'string') {
      throw errors.badRequest('Display name must be a string');
    }

    const sanitized = displayName.trim();
    if (sanitized.length === 0) {
      throw errors.badRequest('Display name cannot be empty');
    }

    if (sanitized.length > 50) {
      throw errors.badRequest('Display name cannot exceed 50 characters');
    }

    // Basic sanitization - remove potentially harmful characters
    const cleanName = sanitized.replace(/[<>"'&]/g, '');
    return cleanName;
  }

  /**
   * Validates game edition
   */
  static validateGameEdition(edition: unknown): number {
    const editionNum = parseInt(String(edition), 10);
    if (isNaN(editionNum) || editionNum < 1 || editionNum > 6) {
      throw errors.badRequest('Game edition must be a number between 1 and 6');
    }
    return editionNum;
  }

  /**
   * Validates PMC faction
   */
  static validatePmcFaction(faction: unknown): 'USEC' | 'BEAR' {
    if (faction !== 'USEC' && faction !== 'BEAR') {
      throw errors.badRequest('PMC faction must be either "USEC" or "BEAR"');
    }
    return faction;
  }
}