import type { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler.js';
import type {
  TaskStatus,
  TaskUpdateRequest,
  MultipleTaskUpdateRequest,
  ObjectiveUpdateRequest,
} from '../types/api.js';

/**
 * Input validation service for security
 * Provides centralized validation for API inputs
 */

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
}

/**
 * Validates and sanitizes input data
 */
export const validateInput = (
  data: unknown,
  rules: ValidationRule[]
): { isValid: boolean; errors: string[]; sanitizedData?: unknown } => {
  const errors: string[] = [];
  const sanitizedData = data;

  // Security: Validate basic structure
  if (data === null || data === undefined) {
    return { isValid: false, errors: ['Input is required'] };
  }

  if (typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid input format'] };
  }

  const objData = data as Record<string, unknown>;

  for (const rule of rules) {
    const value = objData[rule.field];

    // Required field validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    // Type validation
    if (rule.type && value !== undefined) {
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${rule.field} must be a string`);
      } else if (rule.type === 'number' && typeof value !== 'number') {
        errors.push(`${rule.field} must be a number`);
      } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${rule.field} must be a boolean`);
      }
    }

    // Length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      errors.push(`${rule.field} exceeds maximum length of ${rule.maxLength}`);
    }

    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push(`${rule.field} contains invalid characters`);
    }

    // Security: Sanitization
    if (rule.sanitize && typeof value === 'string') {
      // Basic XSS prevention
      const sanitized = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*<\/script>)/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*<\/iframe>)/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();

      if (sanitized !== value) {
        objData[rule.field] = sanitized;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData,
  };
};

/**
 * Middleware for input validation
 */
export const validationMiddleware = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = validateInput(req.body, rules);

    if (!validation.isValid) {
      const errors = validation.errors.join(', ');
      return next(createError(400, `Validation failed: ${errors}`));
    }

    // Use sanitized data if available
    if (validation.sanitizedData) {
      req.body = validation.sanitizedData;
    }

    next();
  };
};

// Common validation rules
export const commonRules = {
  teamId: {
    field: 'teamId',
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  username: {
    field: 'username',
    required: true,
    type: 'string',
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    sanitize: true,
  },
  note: {
    field: 'note',
    type: 'string',
    maxLength: 500,
    sanitize: true,
  },
  permissions: {
    field: 'permissions',
    required: true,
    type: 'array',
  },
  maximumMembers: {
    field: 'maximumMembers',
    type: 'number',
  },
};

/**
 * ValidationService class for backward compatibility
 * Provides access to validation utilities
 */
export class ValidationService {
  static validateInput = validateInput;
  static validationMiddleware = validationMiddleware;
  static rules = commonRules;

  /**
   * Validates user ID and returns trimmed value
   */
  static validateUserId(userId: unknown): string {
    if (typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Valid user ID is required');
    }
    return userId.trim();
  }

  /**
   * Validates player level (1-79)
   */
  static validateLevel(level: unknown): number {
    const numLevel = typeof level === 'string' ? parseInt(level, 10) : (level as number);

    if (typeof numLevel !== 'number' || isNaN(numLevel)) {
      throw new Error('Level must be a number between 1 and 79');
    }

    const flooredLevel = Math.floor(numLevel);
    if (flooredLevel < 1 || flooredLevel > 79) {
      throw new Error('Level must be a number between 1 and 79');
    }

    return flooredLevel;
  }

  /**
   * Validates task ID and returns trimmed value
   */
  static validateTaskId(taskId: unknown): string {
    if (typeof taskId !== 'string' || !taskId.trim()) {
      throw new Error('Task ID is required and must be a non-empty string');
    }
    return taskId.trim();
  }

  /**
   * Validates objective ID and returns trimmed value
   */
  static validateObjectiveId(objectiveId: unknown): string {
    if (typeof objectiveId !== 'string' || !objectiveId.trim()) {
      throw new Error('Objective ID is required and must be a non-empty string');
    }
    return objectiveId.trim();
  }

  /**
   * Validates task update request body
   */
  static validateTaskUpdate(body: unknown): TaskUpdateRequest {
    if (!body || typeof body !== 'object') {
      throw new Error('Request body is required');
    }

    const update = body as Record<string, unknown>;

    if (!update.state || typeof update.state !== 'string') {
      throw new Error('State is required');
    }

    const validStates: TaskStatus[] = ['completed', 'failed', 'uncompleted'];
    if (!validStates.includes(update.state as TaskStatus)) {
      throw new Error("Invalid state provided. Must be 'completed', 'failed', or 'uncompleted'");
    }

    return { state: update.state as TaskStatus };
  }

  /**
   * Validates multiple task update request body
   */
  static validateMultipleTaskUpdate(body: unknown): MultipleTaskUpdateRequest {
    if (!Array.isArray(body)) {
      throw new Error('Request body must be an array');
    }

    if (body.length === 0) {
      throw new Error('At least one task update is required');
    }

    return body.map((update) => {
      if (!update || typeof update !== 'object') {
        throw new Error('Each task must be an object');
      }

      const taskUpdate = update as Record<string, unknown>;

      if (!taskUpdate.id || typeof taskUpdate.id !== 'string') {
        if (!taskUpdate.id) {
          throw new Error('Each task must have id and state fields');
        } else {
          throw new Error('Task id must be a string');
        }
      }

      if (!taskUpdate.state || typeof taskUpdate.state !== 'string') {
        throw new Error('Each task must have id and state fields');
      }

      const validStates: TaskStatus[] = ['completed', 'failed', 'uncompleted'];
      if (!validStates.includes(taskUpdate.state as TaskStatus)) {
        throw new Error(
          `Invalid state for task ${taskUpdate.id}. Must be 'completed', 'failed', or 'uncompleted'`
        );
      }

      return {
        id: taskUpdate.id.trim(),
        state: taskUpdate.state as TaskStatus,
      };
    });
  }

  /**
   * Validates objective update request body
   */
  static validateObjectiveUpdate(body: unknown): ObjectiveUpdateRequest {
    if (!body || typeof body !== 'object') {
      throw new Error('Request body is required');
    }

    const update = body as Record<string, unknown>;
    const result: ObjectiveUpdateRequest = {};

    // Treat null as undefined for validation
    // Treat null as undefined for validation
    const hasState = update.state !== null && update.state !== undefined;
    const hasCount = update.count !== null && update.count !== undefined;

    if (!hasState && !hasCount) {
      throw new Error('Either state or count must be provided');
    }

    if (hasState) {
      if (typeof update.state !== 'string') {
        throw new Error('State must be a string');
      }

      const validStates: ('completed' | 'uncompleted')[] = ['completed', 'uncompleted'];
      if (!validStates.includes(update.state as 'completed' | 'uncompleted')) {
        throw new Error('State must be "completed" or "uncompleted"');
      }

      result.state = update.state as 'completed' | 'uncompleted';
    }

    if (hasCount) {
      if (typeof update.count !== 'number') {
        throw new Error('Count must be a non-negative integer');
      }

      const count = update.count as number;

      if (isNaN(count) || count < 0 || !Number.isInteger(count)) {
        throw new Error('Count must be a non-negative integer');
      }

      result.count = count;
    }

    return result;
  }

  /**
   * Validates task status (returns boolean)
   */
  static validateTaskStatus(status: unknown): boolean {
    const validStatuses = ['completed', 'failed', 'uncompleted'];
    return typeof status === 'string' && validStatuses.includes(status);
  }

  /**
   * Validates display name and returns sanitized value
   */
  static validateDisplayName(displayName: unknown): string {
    if (typeof displayName !== 'string') {
      throw new Error('Display name must be a string');
    }

    const trimmed = displayName.trim();
    if (!trimmed) {
      throw new Error('Display name cannot be empty');
    }

    if (trimmed.length > 50) {
      throw new Error('Display name cannot exceed 50 characters');
    }

    // Sanitize by removing harmful characters
    const sanitized = trimmed
      .replace(/</g, '') // Remove < characters first to avoid matching non-tags
      .replace(/>/g, '') // Remove > characters
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/'/g, '') // Remove quotes
      .replace(/"/g, '') // Remove quotes
      .replace(/&/g, '') // Remove ampersands
      .replace(/\s+/g, ' ') // Normalize whitespace, but keep single spaces
      .trim();

    return sanitized;
  }

  /**
   * Validates game edition (1-6)
   */
  static validateGameEdition(edition: unknown): number {
    const numEdition = typeof edition === 'string' ? parseInt(edition, 10) : (edition as number);

    if (typeof numEdition !== 'number' || isNaN(numEdition) || numEdition < 1 || numEdition > 6) {
      throw new Error('Game edition must be a number between 1 and 6');
    }

    return Math.floor(numEdition);
  }

  /**
   * Validates PMC faction (USEC or BEAR)
   */
  static validatePmcFaction(faction: unknown): string {
    if (typeof faction !== 'string') {
      throw new Error('PMC faction must be either "USEC" or "BEAR"');
    }

    const trimmed = faction.trim();
    if (trimmed !== 'USEC' && trimmed !== 'BEAR') {
      throw new Error('PMC faction must be either "USEC" or "BEAR"');
    }

    return trimmed;
  }

  /**
   * Validates token permissions
   */
  static validatePermissions(token: unknown, requiredPermission: string): void {
    if (!token || typeof token !== 'object') {
      throw new Error('Authentication required');
    }

    const apiToken = token as { permissions?: string[] };

    if (!apiToken.permissions || !Array.isArray(apiToken.permissions)) {
      throw new Error('Missing required permission: ' + requiredPermission);
    }

    if (!apiToken.permissions.includes(requiredPermission)) {
      throw new Error('Missing required permission: ' + requiredPermission);
    }
  }
}
