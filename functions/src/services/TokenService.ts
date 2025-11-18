import { logger } from '../logger.js';
import type { Firestore, DocumentReference } from 'firebase-admin/firestore';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import type { ApiToken } from '../types/api.js';
import { errors } from '../middleware/errorHandler.js';
import { createLazyFirestore } from '../utils/factory.js';
interface TokenDocument {
  owner: string;
  note: string;
  permissions: string[];
  gameMode?: string;
  calls?: number;
  createdAt?: Timestamp;
  revoked?: boolean;
  // Expiration fields
  isActive?: boolean;
  status?: 'active' | 'expired' | 'revoked';
  lastUsed?: Timestamp;
  expiredAt?: Timestamp;
}
interface CreateTokenOptions {
  note: string;
  permissions: string[];
  gameMode?: string;
}
export class TokenService {
  private getDb: () => Firestore;
  constructor() {
    this.getDb = createLazyFirestore();
  }

  private get db(): Firestore {
    return this.getDb();
  }
  async getTokenInfo(tokenString: string): Promise<ApiToken> {
    // Removed unused variable 'db'
    const tokenRef = this.db
      .collection('token')
      .doc(tokenString) as DocumentReference<TokenDocument>;
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
      if (tokenData.revoked) {
        logger.warn('Attempt to use revoked token', {
          token: tokenString.substring(0, 8) + '...',
          owner: tokenData.owner,
        });
        throw errors.unauthorized('Invalid or expired token');
      }
      // Check for token expiration (for tokens with expiration fields)
      if (
        tokenData.isActive === false ||
        tokenData.status === 'expired' ||
        tokenData.status === 'revoked'
      ) {
        logger.warn('Attempt to use inactive or expired token', {
          token: tokenString.substring(0, 8) + '...',
          owner: tokenData.owner,
          status: tokenData.status,
          isActive: tokenData.isActive,
        });
        throw errors.unauthorized('Invalid or expired token');
      }
      this.incrementTokenCalls(tokenRef, tokenString);
      logger.log('Token accessed successfully', {
        owner: tokenData.owner,
        permissions: tokenData.permissions,
      });
      return {
        ...tokenData,
        gameMode: tokenData.gameMode ?? 'pvp',
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
  async createToken(
    owner: string,
    options: CreateTokenOptions
  ): Promise<{ token: string; created: boolean; owner: string; permissions: string[] }> {
    const { note, permissions, gameMode = 'pvp' } = options;
    this.validatePermissions(permissions);
    const tokenString = this.generateSecureToken();
    const db = this.getDb();
    const tokenRef = db.collection('token').doc(tokenString) as DocumentReference<TokenDocument>;
    const systemRef = db.collection('system').doc(owner);
    try {
      const tokenData: TokenDocument = {
        owner,
        note: note.trim(),
        permissions,
        gameMode,
        calls: 0,
        createdAt: Timestamp.now(),
      };
      await this.db.runTransaction(async (transaction) => {
        const existingToken = await transaction.get(tokenRef);
        if (existingToken.exists) {
          throw new Error('Token already exists');
        }
        transaction.set(tokenRef, tokenData);
        transaction.set(
          systemRef,
          {
            tokens: FieldValue.arrayUnion(tokenString),
          },
          { merge: true }
        );
      });
      logger.log('API token created successfully', {
        owner,
        permissions,
        gameMode,
        note: note.substring(0, 50),
      });
      return { token: tokenString, created: true, owner, permissions };
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
  async revokeToken(tokenString: string, userId: string): Promise<{ revoked: boolean }> {
    const db = this.getDb();
    const tokenRef = db.collection('token').doc(tokenString) as DocumentReference<TokenDocument>;
    try {
      const tokenDoc = await tokenRef.get();
      if (!tokenDoc.exists) {
        throw errors.notFound('Token not found');
      }
      const tokenData = tokenDoc.data()!;
      if (tokenData.owner !== userId) {
        throw errors.forbidden('You can only revoke your own tokens');
      }
      await tokenRef.delete();
      logger.log('Token revoked successfully', {
        owner: userId,
        token: tokenString.substring(0, 8) + '...',
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
  async listUserTokens(userId: string): Promise<ApiToken[]> {
    try {
      const db = this.getDb();
      const tokensSnapshot = await db.collection('token').where('owner', '==', userId).get();
      const tokens = tokensSnapshot.docs.map((doc) => {
        const data = doc.data() as TokenDocument;
        return {
          owner: data.owner,
          note: data.note,
          permissions: data.permissions,
          gameMode: data.gameMode ?? 'pvp',
          calls: data.calls ?? 0,
          createdAt: data.createdAt,
          token: doc.id,
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
  validatePermissions(permissions: string[]): void {
    const validPermissions = ['GP', 'TP', 'WP'];
    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw errors.badRequest('At least one permission is required');
    }
    const invalidPermissions = permissions.filter((p) => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      throw errors.badRequest(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }
  }
  private generateSecureToken(): string {
    // Generate 48 random bytes (will become 64 base64url characters)
    return randomBytes(48).toString('base64url');
  }
  private incrementTokenCalls(
    tokenRef: DocumentReference<TokenDocument>,
    tokenString: string
  ): void {
    const callIncrement = FieldValue.increment(1);
    tokenRef.update({ calls: callIncrement }).catch((error) => {
      logger.error('Failed to increment token calls', {
        error: error instanceof Error ? error.message : String(error),
        token: tokenString.substring(0, 8) + '...',
      });
    });
  }
}
