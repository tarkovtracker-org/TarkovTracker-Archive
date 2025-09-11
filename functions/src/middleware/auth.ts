import { Request, Response, NextFunction } from 'express';
import { ApiToken } from '../types/api.js';
import { TokenService } from '../services/TokenService.js';
import { asyncHandler } from './errorHandler.js';

// Enhanced request interface
interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
  user?: {
    id: string;
    username?: string;
  };
}

/**
 * Authentication middleware that validates Bearer tokens
 * and attaches token data to the request
 */
export const verifyBearer = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Allow CORS preflight without auth
    if (req.method === 'OPTIONS') {
      return next();
    }
    try {
      const tokenService = new TokenService();

      // Validate and get token data
      const token = await tokenService.validateToken(req.headers.authorization);

      // Attach token data to request
      req.apiToken = token;
      req.user = { id: token.owner };

      next();
    } catch (err) {
      // Respond with precise auth errors instead of bubbling to 500
      const message = err instanceof Error ? err.message : 'Authentication failed';
      // Default to 401 for auth errors
      res.status(401).json({ success: false, error: message });
    }
  }
);
