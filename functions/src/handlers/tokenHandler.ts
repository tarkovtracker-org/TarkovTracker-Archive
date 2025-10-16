import { Request, Response } from 'express';
import { ApiToken } from '../types/api.js';
import { asyncHandler } from '../middleware/errorHandler.js';

interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * @openapi
 * /token:
 *   get:
 *     summary: "Returns data associated with the Token given in the Authorization header of the request"
 *     tags:
 *       - "Token"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Token details retrieved successfully."
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
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: "Permissions associated with the token."
 *                     token:
 *                       type: string
 *                       description: "The API token string."
 *                     owner:
 *                       type: string
 *                       description: "Token owner ID."
 *                     note:
 *                       type: string
 *                       description: "Token description/note."
 *                     calls:
 *                       type: integer
 *                       description: "Number of API calls made with this token."
 *                     gameMode:
 *                       type: string
 *                       description: "Token game mode (pvp, pve, or dual)."
 *       401:
 *         description: "Unauthorized. Invalid or missing token."
 *       500:
 *         description: "Internal server error."
 */
export const getTokenInfo = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Token is already validated by middleware and attached to req.apiToken
    const token = req.apiToken!;

    const response = {
      success: true,
      permissions: token.permissions,
      token: token.token,
      owner: token.owner,
      note: token.note,
      calls: token.calls || 0,
      gameMode: token.gameMode || 'pvp',
    };

    res.status(200).json(response);
  }
);

export default {
  getTokenInfo,
};
