import { Request, Response } from 'express';
import { ApiResponse, ApiToken } from '../types/api.js';
import { ProgressService } from '../services/ProgressService.js';
import { ValidationService } from '../services/ValidationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Reuse a single service instance across requests
const progressService = new ProgressService();

// Enhanced request interface
interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * @openapi
 * /progress:
 *   get:
 *     summary: "Returns progress data of the player"
 *     tags:
 *       - "Progress"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gameMode
 *         required: false
 *         description: "Game mode to get progress for (pvp or pve)"
 *         schema:
 *           type: string
 *           enum: [pvp, pve]
 *           default: pvp
 *     responses:
 *       200:
 *         description: "Player progress retrieved successfully."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: "#/components/schemas/Progress"
 *                 meta:
 *                   type: object
 *                   properties:
 *                     self:
 *                       type: string
 *                       description: "The user ID of the requester."
 *       401:
 *         description: "Unauthorized. Invalid token or missing 'GP' permission."
 *       500:
 *         description: "Internal server error."
 */
export const getPlayerProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  ValidationService.validatePermissions(req.apiToken, 'GP');
  
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  const gameMode = req.query.gameMode as string || 'pvp';
  const progressData = await progressService.getUserProgress(userId, gameMode);
  
  const response: ApiResponse = {
    success: true,
    data: progressData,
    meta: { self: userId, gameMode },
  };
  
  res.status(200).json(response);
});

/**
 * @openapi
 * /progress/level/{levelValue}:
 *   post:
 *     summary: "Sets player's level to value specified in the path"
 *     tags:
 *       - "Progress"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: "levelValue"
 *         in: "path"
 *         description: "Player's new level"
 *         required: true
 *         schema:
 *           type: "integer"
 *           minimum: 1
 *           maximum: 79
 *       - in: query
 *         name: gameMode
 *         required: false
 *         description: "Game mode to update level for (pvp or pve)"
 *         schema:
 *           type: string
 *           enum: [pvp, pve]
 *           default: pvp
 *     responses:
 *       200:
 *         description: "Player's level was updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     level:
 *                       type: integer
 *                     message:
 *                       type: string
 *       400:
 *         description: "Invalid level value provided."
 *       401:
 *         description: "Unauthorized. Invalid token or missing 'WP' permission."
 *       500:
 *         description: "Internal server error."
 */
export const setPlayerLevel = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  ValidationService.validatePermissions(req.apiToken, 'WP');
  
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  const level = ValidationService.validateLevel(req.params.levelValue);
  const gameMode = req.query.gameMode as string || 'pvp';
  
  await progressService.setPlayerLevel(userId, level, gameMode);
  
  const response: ApiResponse = {
    success: true,
    data: {
      level,
      message: 'Level updated successfully',
    },
  };
  
  res.status(200).json(response);
});

/**
 * @openapi
 * /progress/task/{taskId}:
 *   post:
 *     summary: "Update the progress state of a single task."
 *     tags:
 *       - "Progress"
 *     description: "Update the progress state of a single task."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         description: "The ID (usually UUID from tarkov.dev) of the task to update."
 *         schema:
 *           type: string
 *       - in: query
 *         name: gameMode
 *         required: false
 *         description: "Game mode to update task for (pvp or pve)"
 *         schema:
 *           type: string
 *           enum: [pvp, pve]
 *           default: pvp
 *     requestBody:
 *       required: true
 *       description: "The new state for the task."
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - state
 *             properties:
 *               state:
 *                 type: string
 *                 description: "The new state of the task."
 *                 enum: [uncompleted, completed, failed]
 *     responses:
 *       200:
 *         description: "The task was updated successfully."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskId:
 *                       type: string
 *                     state:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: "Invalid request parameters (e.g., bad taskId or state)."
 *       401:
 *         description: "Unauthorized to update progress (missing 'WP' permission)."
 *       500:
 *         description: "Internal server error."
 */
export const updateSingleTask = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  ValidationService.validatePermissions(req.apiToken, 'WP');
  
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  const taskId = ValidationService.validateTaskId(req.params.taskId);
  const { state } = ValidationService.validateTaskUpdate(req.body);
  const gameMode = req.query.gameMode as string || 'pvp';
  
  await progressService.updateSingleTask(userId, taskId, state, gameMode);
  
  const response: ApiResponse = {
    success: true,
    data: {
      taskId,
      state,
      message: 'Task updated successfully',
    },
  };
  
  res.status(200).json(response);
});

/**
 * @openapi
 * /progress/tasks:
 *   post:
 *     summary: "Updates status for multiple tasks"
 *     tags:
 *       - "Progress"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gameMode
 *         required: false
 *         description: "Game mode to update tasks for (pvp or pve)"
 *         schema:
 *           type: string
 *           enum: [pvp, pve]
 *           default: pvp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: "Object where keys are task IDs and values are the new status"
 *             additionalProperties:
 *               type: string
 *               enum: [uncompleted, completed, failed]
 *             example:
 *               {"task1": "completed", "task5": "uncompleted"}
 *     responses:
 *       200:
 *         description: "Tasks updated successfully."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedTasks:
 *                       type: array
 *                       items:
 *                         type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: "Invalid request body format or invalid status values."
 *       401:
 *         description: "Unauthorized. Invalid token or missing 'WP' permission."
 *       500:
 *         description: "Internal server error during batch update."
 */
export const updateMultipleTasks = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  ValidationService.validatePermissions(req.apiToken, 'WP');
  
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  const taskUpdates = ValidationService.validateMultipleTaskUpdate(req.body);
  const gameMode = req.query.gameMode as string || 'pvp';
  
  await progressService.updateMultipleTasks(userId, taskUpdates, gameMode);
  
  const response: ApiResponse = {
    success: true,
    data: {
      updatedTasks: Object.keys(taskUpdates),
      message: 'Tasks updated successfully',
    },
  };
  
  res.status(200).json(response);
});

/**
 * @openapi
 * /progress/task/objective/{objectiveId}:
 *   post:
 *     summary: "Update objective progress for a task."
 *     tags:
 *       - "Progress"
 *     description: "Update the progress (state or count) for a specific task objective."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         description: "The ID (usually UUID from tarkov.dev) of the task objective to update."
 *         schema:
 *           type: string
 *       - in: query
 *         name: gameMode
 *         required: false
 *         description: "Game mode to update objective for (pvp or pve)"
 *         schema:
 *           type: string
 *           enum: [pvp, pve]
 *           default: pvp
 *     requestBody:
 *       required: true
 *       description: "The objective properties to update. Provide at least one."
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               state:
 *                 type: string
 *                 description: "The new state of the task objective."
 *                 enum: [completed, uncompleted]
 *                 nullable: true
 *               count:
 *                 type: integer
 *                 description: "The number of items or completions toward the objective's goal."
 *                 minimum: 0
 *                 nullable: true
 *     responses:
 *       200:
 *         description: "The objective was updated successfully."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     objectiveId:
 *                       type: string
 *                     state:
 *                       type: string
 *                       nullable: true
 *                     count:
 *                       type: integer
 *                       nullable: true
 *                     message:
 *                       type: string
 *       400:
 *         description: "Invalid request parameters (e.g., bad objectiveId, state, or count)."
 *       401:
 *         description: "Unauthorized to update progress (missing 'WP' permission)."
 *       500:
 *         description: "Internal server error."
 */
export const updateTaskObjective = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  ValidationService.validatePermissions(req.apiToken, 'WP');
  
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  const objectiveId = ValidationService.validateObjectiveId(req.params.objectiveId);
  const updateData = ValidationService.validateObjectiveUpdate(req.body);
  const gameMode = req.query.gameMode as string || 'pvp';
  
  await progressService.updateTaskObjective(userId, objectiveId, updateData, gameMode);
  
  const response: ApiResponse = {
    success: true,
    data: {
      objectiveId,
      ...updateData,
      message: 'Task objective updated successfully',
    },
  };
  
  res.status(200).json(response);
});

export default {
  getPlayerProgress,
  setPlayerLevel,
  updateSingleTask,
  updateMultipleTasks,
  updateTaskObjective,
};
