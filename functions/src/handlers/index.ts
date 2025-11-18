/**
 * Explicit barrel export for all request handlers.
 * This file re-exports individual route handlers from their respective modules.
 * Use these explicit imports for clarity and easier import tracing.
 *
 * Example usage:
 *   import { getPlayerProgress, setPlayerLevel } from './handlers.js';
 *   // OR
 *   import * as handlers from './handlers.js';
 *   handlers.getPlayerProgress(...)
 */

export {
  getPlayerProgress,
  setPlayerLevel,
  updateSingleTask,
  updateMultipleTasks,
  updateTaskObjective,
} from './progressHandler.js';

export { getTeamProgress, createTeam, joinTeam, leaveTeam } from './teamHandler.js';

export { getTokenInfo } from './tokenHandler.js';

export { deleteUserAccountHandler } from './userDeletionHandler.js';
