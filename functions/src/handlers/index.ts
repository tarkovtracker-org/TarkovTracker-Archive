/**
 * Explicit barrel export for all request handlers.
 * This file re-exports individual route handlers from their respective modules.
 * Use these explicit imports for clarity and easier import tracing.
 *
 * Example usage:
 *   import { getPlayerProgress, setPlayerLevel } from './handlers';
 *   // OR
 *   import * as handlers from './handlers';
 *   handlers.getPlayerProgress(...)
 */

export {
  getPlayerProgress,
  setPlayerLevel,
  updateSingleTask,
  updateMultipleTasks,
  updateTaskObjective,
} from './progressHandler';

export { getTeamProgress, createTeam, joinTeam, leaveTeam } from './teamHandler';

export { getTokenInfo } from './tokenHandler';

export { deleteUserAccountHandler } from './userDeletionHandler';
