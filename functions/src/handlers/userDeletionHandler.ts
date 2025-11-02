import admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { Firestore, DocumentReference } from 'firebase-admin/firestore';
import { Request, Response } from 'express';
import { ApiResponse, ApiError } from '../types/api.js';
import { errors } from '../middleware/errorHandler.js';

interface UserDeletionRequest {
  confirmationText: string;
  reAuthToken?: string;
}

interface SystemDocData {
  team?: string | null;
  teamMax?: number;
  lastLeftTeam?: admin.firestore.Timestamp;
}

interface TeamDocData {
  owner: string;
  password: string;
  maximumMembers: number;
  members: string[];
  createdAt: admin.firestore.Timestamp;
}

interface UserDocData {
  displayName?: string;
  createdAt?: admin.firestore.Timestamp;
  lastSignInTime?: admin.firestore.Timestamp;
}

export class UserDeletionService {
  private db: Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Completely delete a user account and all associated data
   */
  async deleteUserAccount(
    userId: string,
    request: UserDeletionRequest
  ): Promise<ApiResponse<{ message: string }>> {
    logger.info('Starting user deletion process', { userId });

    // Validate confirmation text
    if (request.confirmationText !== 'DELETE MY ACCOUNT') {
      throw errors.badRequest('Invalid confirmation text. Must be exactly "DELETE MY ACCOUNT"');
    }

    try {
      // Step 1: Handle team ownership transfers and cleanup
      await this.handleTeamCleanup(userId);

      // Step 2: Delete all user data from Firestore collections
      await this.deleteUserData(userId);

      // Step 3: Delete Firebase Auth account
      await this.deleteFirebaseAuthUser(userId);

      logger.info('User deletion completed successfully', { userId });

      return {
        success: true,
        data: {
          message: 'User account and all associated data have been permanently deleted',
        },
      };
    } catch (error) {
      logger.error('Error during user deletion', { userId, error });

      if (error instanceof ApiError) {
        throw error;
      }

      throw errors.internal('Failed to delete user account. Please try again later.');
    }
  }

  /**
   * Handle team ownership transfers and remove user from teams
   */
  private async handleTeamCleanup(userId: string): Promise<void> {
    const systemRef = this.db.collection('system').doc(userId) as DocumentReference<SystemDocData>;

    return this.db.runTransaction(async (transaction) => {
      const systemDoc = await transaction.get(systemRef);

      if (!systemDoc.exists) {
        logger.info('No system document found for user', { userId });
        return;
      }

      const systemData = systemDoc.data();
      if (!systemData?.team) {
        logger.info('User is not part of any team', { userId });
        return;
      }

      const teamRef = this.db
        .collection('team')
        .doc(systemData.team) as DocumentReference<TeamDocData>;
      const teamDoc = await transaction.get(teamRef);

      if (!teamDoc.exists) {
        logger.warn('Team document not found', { userId, teamId: systemData.team });
        return;
      }

      const teamData = teamDoc.data()!;

      // Check if user is the team owner
      if (teamData.owner === userId) {
        await this.transferTeamOwnership(transaction, teamRef, teamData, userId);
      } else {
        // Just remove user from team members
        const updatedMembers = teamData.members.filter((memberId) => memberId !== userId);
        transaction.update(teamRef, { members: updatedMembers });
        logger.info('Removed user from team members', { userId, teamId: systemData.team });
      }
    });
  }

  /**
   * Transfer team ownership to the next oldest member
   */
  private async transferTeamOwnership(
    transaction: admin.firestore.Transaction,
    teamRef: DocumentReference<TeamDocData>,
    teamData: TeamDocData,
    currentOwnerId: string
  ): Promise<void> {
    // Remove current owner from members list
    const remainingMembers = teamData.members.filter((memberId) => memberId !== currentOwnerId);

    if (remainingMembers.length === 0) {
      // No other members, delete the team
      transaction.delete(teamRef);
      logger.info('Deleted team with no remaining members', {
        teamId: teamRef.id,
        ownerId: currentOwnerId,
      });
      return;
    }

    // Find the oldest member based on user creation time
    const newOwner = await this.findOldestMember(remainingMembers);

    // Update team with new owner
    transaction.update(teamRef, {
      owner: newOwner,
      members: remainingMembers,
    });

    logger.info('Transferred team ownership', {
      teamId: teamRef.id,
      oldOwner: currentOwnerId,
      newOwner,
      remainingMembers: remainingMembers.length,
    });
  }

  /**
   * Find the oldest member by checking user creation times
   */
  private async findOldestMember(memberIds: string[]): Promise<string> {
    try {
      // Get user documents for all members to check creation times
      const userPromises = memberIds.map((memberId) =>
        this.db.collection('user').doc(memberId).get()
      );

      const userDocs = await Promise.all(userPromises);

      let oldestMember = memberIds[0];
      let oldestTime = new Date();

      for (let i = 0; i < userDocs.length; i++) {
        const userDoc = userDocs[i];
        const memberId = memberIds[i];

        if (userDoc.exists) {
          const userData = userDoc.data() as UserDocData;
          const createdAt = userData.createdAt?.toDate() || new Date();

          if (createdAt < oldestTime) {
            oldestTime = createdAt;
            oldestMember = memberId;
          }
        }
      }

      return oldestMember;
    } catch (error) {
      logger.warn('Error finding oldest member, using first member', { memberIds, error });
      return memberIds[0]; // Fallback to first member
    }
  }

  /**
   * Delete all user data from Firestore collections
   */
  private async deleteUserData(userId: string): Promise<void> {
    const batch = this.db.batch();
    let operationCount = 0;

    // Collections that contain user documents
    const collections = ['progress', 'system', 'user'];

    for (const collectionName of collections) {
      const docRef = this.db.collection(collectionName).doc(userId);
      batch.delete(docRef);
      operationCount++;
    }

    // Delete all tokens owned by the user
    const tokensQuery = this.db.collection('token').where('owner', '==', userId);
    const tokenDocs = await tokensQuery.get();

    tokenDocs.forEach((doc) => {
      batch.delete(doc.ref);
      operationCount++;
    });

    // Execute batch delete if there are operations
    if (operationCount > 0) {
      await batch.commit();
      logger.info('Deleted user data from Firestore', { userId, operationsCount: operationCount });
    }
  }

  /**
   * Delete user from Firebase Authentication
   */
  private async deleteFirebaseAuthUser(userId: string): Promise<void> {
    try {
      await admin.auth().deleteUser(userId);
      logger.info('Deleted Firebase Auth user', { userId });
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/user-not-found') {
        logger.info('Firebase Auth user already deleted or not found', { userId });
        return;
      }

      logger.error('Failed to delete Firebase Auth user', { userId, error });
      throw errors.internal('Failed to delete authentication account');
    }
  }
}

/**
 * HTTP handler for user deletion
 */
export async function deleteUserAccountHandler(
  req: Request & { user?: { id: string } },
  res: Response
): Promise<void> {
  try {
    // Extract user ID from authenticated request
    const userId = req.user?.id;

    if (!userId) {
      throw errors.unauthorized('User not authenticated');
    }

    const userDeletionService = new UserDeletionService();
    const result = await userDeletionService.deleteUserAccount(userId, req.body);

    res.status(200).json(result);
  } catch (error) {
    logger.error('User deletion handler error', { error });

    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
