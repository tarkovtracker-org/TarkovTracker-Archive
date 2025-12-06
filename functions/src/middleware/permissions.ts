import { Request, Response, NextFunction } from 'express';
import { ApiToken } from '../types/api.js';

interface AuthenticatedRequest extends Request {
  apiToken?: ApiToken;
}

export const requirePermission =
  (permission: string) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const token = req.apiToken;
    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!Array.isArray(token.permissions) || !token.permissions.includes(permission)) {
      res.status(403).json({ success: false, error: `Missing required permission: ${permission}` });
      return;
    }

    next();
  };
