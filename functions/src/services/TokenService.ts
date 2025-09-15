import admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { Firestore, DocumentReference } from 'firebase-admin/firestore';
import { ApiToken } from '../types/api.js';
import { errors } from '../middleware/errorHandler.js';

interface TokenDocument {
  owner: string;
  note: string;
  permissions: string[];
  gameMode?: string;
  calls?: number;
  createdAt?: admin.firestore.Timestamp;
}

export class TokenService {
  private db: Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Gets token information and increments call counter
   */
  async getTokenInfo(tokenString: string): Promise<ApiToken> {
    const tokenRef = this.db.collection('token').doc(tokenString) as DocumentReference<TokenDocument>;
    
    try {
      const tokenDoc = await tokenRef.get();
      
      if (!tokenDoc.exists) {
        throw errors.unauthorized('Invalid or expired token');
      }

      const tokenData = tokenDoc.data();
      
      if (!tokenData) {
        logger.error('Token document exists but data is undefined', { token: tokenString });
        throw errors.internal('Invalid token data');
      }

      // Increment call counter asynchronously (don't wait)
      this.incrementTokenCalls(tokenRef, tokenString);

      logger.log('Token accessed successfully', { 
        owner: tokenData.owner,
        permissions: tokenData.permissions 
      });

      return {
        ...tokenData,
        gameMode: tokenData.gameMode || 'pvp', // Default to PvP for legacy tokens
        token: tokenString,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }

      logger.error('Error getting token info:', {
        error: error instanceof Error ? error.message : String(error),
        token: tokenString,
      });
      throw errors.internal('Failed to retrieve token information');
    }
  }

  /**
   * Validates token and returns token data
   */
  async validateToken(authHeader: string | undefined): Promise<ApiToken> {
    if (!authHeader) {
      throw errors.unauthorized('No Authorization header provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      throw errors.badRequest("Invalid Authorization header format. Expected 'Bearer <token>'");
    }

    const tokenString = parts[1];
    return this.getTokenInfo(tokenString);
  }

  /**
   * Creates a new API token
   */
  async createToken(
    owner: string, 
    note: string, 
    permissions: string[],
    gameMode: string = 'pvp'
  ): Promise<{ token: string; created: boolean }> {
    const tokenString = this.generateSecureToken();
    const tokenRef = this.db.collection('token').doc(tokenString) as DocumentReference<TokenDocument>;
    const systemRef = this.db.collection('system').doc(owner);

    try {
      const tokenData: TokenDocument = {
        owner,
        note: note.trim(),
        permissions,
        gameMode,
        calls: 0,
        createdAt: admin.firestore.Timestamp.now(),
      };

      // Use transaction to ensure both operations succeed or fail together
      await this.db.runTransaction(async (transaction) => {
        // Create the token document
        transaction.set(tokenRef, tokenData);
        
        // Add token ID to user's system document tokens array (merge: true creates document if needed)
        transaction.set(systemRef, {
          tokens: admin.firestore.FieldValue.arrayUnion(tokenString)
        }, { merge: true });
      });

      logger.log('API token created successfully', {
        owner,
        permissions,
        gameMode,
        note: note.substring(0, 50), // Log truncated note for privacy
      });

      return { token: tokenString, created: true };
    } catch (error) {
      logger.error('Error creating token:', {
        error: error instanceof Error ? error.message : String(error),
        owner,
        permissions,
        gameMode,
      });
      throw errors.internal('Failed to create token');
    }
  }

  /**
   * Revokes an API token
   */
  async revokeToken(tokenString: string, userId: string): Promise<{ revoked: boolean }> {
    const tokenRef = this.db.collection('token').doc(tokenString) as DocumentReference<TokenDocument>;

    try {
      const tokenDoc = await tokenRef.get();
      
      if (!tokenDoc.exists) {
        throw errors.notFound('Token not found');
      }

      const tokenData = tokenDoc.data()!;

      // Verify user owns the token
      if (tokenData.owner !== userId) {
        throw errors.forbidden('You can only revoke your own tokens');
      }

      await tokenRef.delete();

      logger.log('Token revoked successfully', {
        owner: userId,
        token: tokenString.substring(0, 8) + '...', // Log partial token for security
      });

      return { revoked: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }

      logger.error('Error revoking token:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw errors.internal('Failed to revoke token');
    }
  }

  /**
   * Lists all tokens for a user
   */
  async listUserTokens(userId: string): Promise<Omit<ApiToken, 'token'>[]> {
    try {
      const tokensSnapshot = await this.db
        .collection('token')
        .where('owner', '==', userId)
        .get();

      const tokens = tokensSnapshot.docs.map(doc => {
        const data = doc.data() as TokenDocument;
        return {
          owner: data.owner,
          note: data.note,
          permissions: data.permissions,
          gameMode: data.gameMode || 'pvp',
          calls: data.calls || 0,
          createdAt: data.createdAt,
        };
      });

      return tokens;
    } catch (error) {
      logger.error('Error listing user tokens:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw errors.internal('Failed to list tokens');
    }
  }

  /**
   * Validates that requested permissions are valid
   */
  validatePermissions(permissions: string[]): void {
    const validPermissions = ['GP', 'TP', 'WP']; // Get Progress, Team Progress, Write Progress
    
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw errors.badRequest('At least one permission is required');
    }

    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      throw errors.badRequest(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }
  }

  /**
   * Generates a cryptographically secure token
   */
  private generateSecureToken(): string {
    // Generate a secure random string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(64);
    
    // Use crypto.getRandomValues for secure randomness
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for Node.js environment
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      const buffer = crypto.randomBytes(64);
      for (let i = 0; i < 64; i++) {
        array[i] = buffer[i];
      }
    }

    for (let i = 0; i < array.length; i++) {
      result += chars[array[i] % chars.length];
    }
    
    return result;
  }

  /**
   * Increments token call counter (async, don't wait)
   */
  private incrementTokenCalls(tokenRef: DocumentReference<TokenDocument>, tokenString: string): void {
    const callIncrement = admin.firestore.FieldValue.increment(1);
    
    tokenRef
      .update({ calls: callIncrement })
      .catch((error) => {
        logger.error('Failed to increment token calls', {
          error: error instanceof Error ? error.message : String(error),
          token: tokenString.substring(0, 8) + '...', // Partial token for security
        });
      });
  }
}