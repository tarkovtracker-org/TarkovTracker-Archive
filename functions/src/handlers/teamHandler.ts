import { Request, Response } from 'express';
import { ApiResponse, ApiToken } from '../types/api.js';
import { TeamService } from '../services/TeamService.js';
import { ValidationService } from '../services/ValidationService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Reuse a single service instance across requests
const teamService = new TeamService();

interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * @openapi
 * /team/progress:
 *   get:
 *     summary: "Returns progress data of all members of the team"
 *     tags:
 *       - "Team"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gameMode
 *         required: false
 *         description: "Game mode to get team progress for (pvp or pve). Only used for dual-mode tokens; single-mode tokens use their configured game mode."
 *         schema:
 *           type: string
 *           enum: [pvp, pve]
 *           default: pvp
 *     responses:
 *       200:
 *         description: "Team progress retrieved successfully."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Progress'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     self:
 *                       type: string
 *                     hiddenTeammates:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: "Unauthorized. Invalid token or missing 'TP' permission."
 *       500:
 *         description: "Internal server error."
 */
export const getTeamProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  ValidationService.validatePermissions(req.apiToken, 'TP');

  const userId = ValidationService.validateUserId(req.apiToken?.owner);

  // Use token's game mode if specified, otherwise allow query parameter override (for dual tokens)
  let gameMode = req.apiToken?.gameMode || 'pvp';
  if (gameMode === 'dual') {
    gameMode = req.query.gameMode as string || 'pvp';
  }

  const result = await teamService.getTeamProgress(userId, gameMode);
  
  const response: ApiResponse = {
    success: true,
    data: result.data,
    meta: result.meta,
  };
  
  res.status(200).json(response);
});

/**
 * @openapi
 * /team/create:
 *   post:
 *     summary: "Creates a new team"
 *     tags:
 *       - "Team"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: "Custom password for the team (optional, will be generated if not provided)"
 *               maximumMembers:
 *                 type: integer
 *                 description: "Maximum number of team members (default: 10)"
 *                 minimum: 2
 *                 maximum: 50
 *     responses:
 *       200:
 *         description: "Team created successfully."
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
 *                     team:
 *                       type: string
 *                     password:
 *                       type: string
 *       400:
 *         description: "Invalid request parameters."
 *       409:
 *         description: "User is already in a team."
 *       403:
 *         description: "Must wait before creating a new team after leaving."
 *       500:
 *         description: "Internal server error."
 */
export const createTeam = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  // Validate request body if provided
  const data: { password?: string; maximumMembers?: number } = {};
  
  if (req.body?.password) {
    if (typeof req.body.password !== 'string' || req.body.password.trim().length < 4) {
      throw new Error('Password must be at least 4 characters long');
    }
    data.password = req.body.password.trim();
  }
  
  if (req.body?.maximumMembers) {
    const maxMembers = parseInt(String(req.body.maximumMembers), 10);
    if (isNaN(maxMembers) || maxMembers < 2 || maxMembers > 50) {
      throw new Error('Maximum members must be between 2 and 50');
    }
    data.maximumMembers = maxMembers;
  }
  
  const result = await teamService.createTeam(userId, data);
  
  const response: ApiResponse = {
    success: true,
    data: result,
  };
  
  res.status(200).json(response);
});

/**
 * @openapi
 * /team/join:
 *   post:
 *     summary: "Join an existing team"
 *     tags:
 *       - "Team"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - password
 *             properties:
 *               id:
 *                 type: string
 *                 description: "Team ID to join"
 *               password:
 *                 type: string
 *                 description: "Team password"
 *     responses:
 *       200:
 *         description: "Successfully joined team."
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
 *                     joined:
 *                       type: boolean
 *       400:
 *         description: "Team ID and password are required."
 *       401:
 *         description: "Incorrect team password."
 *       404:
 *         description: "Team does not exist."
 *       409:
 *         description: "User is already in a team."
 *       403:
 *         description: "Team is full."
 *       500:
 *         description: "Internal server error."
 */
export const joinTeam = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  const teamService = new TeamService();
  
  if (!req.body?.id || !req.body?.password) {
    throw new Error('Team ID and password are required');
  }
  
  const data = {
    id: String(req.body.id).trim(),
    password: String(req.body.password),
  };
  
  if (!data.id || !data.password) {
    throw new Error('Team ID and password cannot be empty');
  }
  
  const result = await teamService.joinTeam(userId, data);
  
  const response: ApiResponse = {
    success: true,
    data: result,
  };
  
  res.status(200).json(response);
});

/**
 * @openapi
 * /team/leave:
 *   post:
 *     summary: "Leave current team"
 *     tags:
 *       - "Team"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Successfully left team."
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
 *                     left:
 *                       type: boolean
 *       400:
 *         description: "User is not in a team."
 *       500:
 *         description: "Internal server error."
 */
export const leaveTeam = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = ValidationService.validateUserId(req.apiToken?.owner);
  const teamService = new TeamService();
  
  const result = await teamService.leaveTeam(userId);
  
  const response: ApiResponse = {
    success: true,
    data: result,
  };
  
  res.status(200).json(response);
});

export default {
  getTeamProgress,
  createTeam,
  joinTeam,
  leaveTeam,
};
