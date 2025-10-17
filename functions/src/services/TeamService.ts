import admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { 
  Firestore, 
  DocumentReference, 
  FieldValue 
} from 'firebase-admin/firestore';
import UIDGenerator from 'uid-generator';
import { 
  TeamDocument, 
  SystemDocument, 
  FormattedProgress
} from '../types/api.js';
import { errors } from '../middleware/errorHandler.js';
import { formatProgress } from '../progress/progressUtils.js';
import { getTaskData, getHideoutData } from '../utils/dataLoaders.js';

interface CreateTeamData {
  password?: string;
  maximumMembers?: number;
}

interface JoinTeamData {
  id: string;
  password: string;
}

interface UserDocData {
  teamHide?: Record<string, boolean>;
}

export class TeamService {
  private db: Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Creates a new team with proper transaction safety
   */
  async createTeam(userId: string, data: CreateTeamData): Promise<{ team: string; password: string }> {
    try {
      let createdTeamId = '';
      let finalPassword = '';

      await this.db.runTransaction(async (transaction) => {
        const systemRef = this.db.collection('system').doc(userId) as DocumentReference<SystemDocument>;
        const systemDoc = await transaction.get(systemRef);
        const systemData = systemDoc.data();

        // Check if user is already in a team
        if (systemData?.team) {
          throw errors.conflict('User is already in a team');
        }

        // Check cooldown period
        if (systemData?.lastLeftTeam) {
          const now = admin.firestore.Timestamp.now();
          const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
          
          if (systemData.lastLeftTeam > fiveMinutesAgo) {
            throw errors.forbidden('You must wait 5 minutes after leaving a team to create a new one');
          }
        }

        // Generate team ID and password
        const uidgen = new UIDGenerator(32);
        createdTeamId = await uidgen.generate();
        finalPassword = data.password || await this.generateSecurePassword();

        const teamRef = this.db.collection('team').doc(createdTeamId) as DocumentReference<TeamDocument>;

        // Create team document
        transaction.set(teamRef, {
          owner: userId,
          password: finalPassword,
          maximumMembers: data.maximumMembers || 10,
          members: [userId],
          createdAt: FieldValue.serverTimestamp(),
        });

        // Update user's system document
        transaction.set(systemRef, { team: createdTeamId }, { merge: true });
      });

      logger.log('Team created successfully', {
        owner: userId,
        team: createdTeamId,
        maximumMembers: data.maximumMembers || 10,
      });

      return { team: createdTeamId, password: finalPassword };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      
      logger.error('Error creating team:', {
        error: error instanceof Error ? error.message : String(error),
        owner: userId,
      });
      throw errors.internal('Failed to create team');
    }
  }

  /**
   * Join an existing team
   */
  async joinTeam(userId: string, data: JoinTeamData): Promise<{ joined: boolean }> {
    if (!data.id || !data.password) {
      throw errors.badRequest('Team ID and password are required');
    }

    try {
      await this.db.runTransaction(async (transaction) => {
        const systemRef = this.db.collection('system').doc(userId) as DocumentReference<SystemDocument>;
        const systemDoc = await transaction.get(systemRef);
        const systemData = systemDoc.data();

        // Check if user is already in a team
        if (systemData?.team) {
          throw errors.conflict('User is already in a team');
        }

        const teamRef = this.db.collection('team').doc(data.id) as DocumentReference<TeamDocument>;
        const teamDoc = await transaction.get(teamRef);

        if (!teamDoc.exists) {
          throw errors.notFound('Team does not exist');
        }

        const teamData = teamDoc.data()!;

        // Validate password
        if (teamData.password !== data.password) {
          throw errors.unauthorized('Incorrect team password');
        }

        // Check if team is full
        const currentMembers = teamData.members?.length || 0;
        if (currentMembers >= (teamData.maximumMembers || 10)) {
          throw errors.forbidden('Team is full');
        }

        // Add user to team
        transaction.update(teamRef, {
          members: FieldValue.arrayUnion(userId)
        });

        // Update user's system document
        transaction.set(systemRef, { team: data.id }, { merge: true });
      });

      logger.log('User joined team successfully', {
        user: userId,
        team: data.id,
      });

      return { joined: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }

      logger.error('Error joining team:', {
        error: error instanceof Error ? error.message : String(error),
        user: userId,
        team: data.id,
      });
      throw errors.internal('Failed to join team');
    }
  }

  /**
   * Leave current team
   */
  async leaveTeam(userId: string): Promise<{ left: boolean }> {
    try {
      let originalTeamId: string | null = null;

      await this.db.runTransaction(async (transaction) => {
        const systemRef = this.db.collection('system').doc(userId) as DocumentReference<SystemDocument>;
        const systemDoc = await transaction.get(systemRef);
        const systemData = systemDoc.data();

        originalTeamId = systemData?.team || null;

        if (!originalTeamId) {
          throw errors.badRequest('User is not in a team');
        }

        const teamRef = this.db.collection('team').doc(originalTeamId) as DocumentReference<TeamDocument>;
        const teamDoc = await transaction.get(teamRef);
        const teamData = teamDoc.data();

        if (teamData?.owner === userId) {
          // If user is owner, disband team and remove all members
          if (teamData.members) {
            teamData.members.forEach((memberId: string) => {
              const memberSystemRef = this.db.collection('system').doc(memberId);
              transaction.set(memberSystemRef, {
                team: null,
                lastLeftTeam: FieldValue.serverTimestamp(),
              }, { merge: true });
            });
          }
          transaction.delete(teamRef);
        } else {
          // Remove user from team members
          transaction.update(teamRef, {
            members: FieldValue.arrayRemove(userId)
          });
          
          // Update user's system document
          transaction.set(systemRef, {
            team: null,
            lastLeftTeam: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      });

      logger.log('User left team successfully', {
        user: userId,
        team: originalTeamId,
      });

      return { left: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }

      logger.error('Error leaving team:', {
        error: error instanceof Error ? error.message : String(error),
        user: userId,
      });
      throw errors.internal('Failed to leave team');
    }
  }

  /**
   * Get team progress for all members
   */
  async getTeamProgress(userId: string, gameMode: string = 'pvp'): Promise<{
    data: FormattedProgress[];
    meta: { self: string; hiddenTeammates: string[] };
  }> {
    try {
      // Get user's team and visibility settings
      const [systemDoc, userDoc, hideoutData, taskData] = await Promise.all([
        (this.db.collection('system').doc(userId) as DocumentReference<SystemDocument>).get(),
        (this.db.collection('user').doc(userId) as DocumentReference<UserDocData>).get(),
        getHideoutData(),
        getTaskData()
      ]);

      if (!hideoutData || !taskData) {
        throw errors.internal('Failed to load essential game data');
      }

      const systemData = systemDoc.data();
      const userData = userDoc.data();
      const teamId = systemData?.team;
      const hiddenTeammatesMap = userData?.teamHide || {};

      let memberIds = [userId]; // Start with self

      // Get team members if in a team
      if (teamId) {
        const teamRef = this.db.collection('team').doc(teamId) as DocumentReference<TeamDocument>;
        const teamDoc = await teamRef.get();
        
        if (teamDoc.exists) {
          const teamData = teamDoc.data()!;
          memberIds = [...new Set([...(teamData.members || []), userId])];
        }
      }

      // Fetch progress for all members
      const progressPromises = memberIds.map(memberId =>
        this.db.collection('progress').doc(memberId).get()
      );

      const progressDocs = await Promise.all(progressPromises);

      // Format progress for each member
      const teamProgress = progressDocs
        .map((doc, index) => {
          const memberId = memberIds[index];
          if (!doc.exists) {
            logger.warn(`Progress document not found for member ${memberId}`);
            return null;
          }
          return formatProgress(doc.data(), memberId, hideoutData, taskData, gameMode);
        })
        .filter((progress): progress is FormattedProgress => progress !== null);

      // Determine hidden teammates
      const hiddenTeammates = memberIds.filter(
        id => id !== userId && hiddenTeammatesMap[id]
      );

      return {
        data: teamProgress,
        meta: {
          self: userId,
          hiddenTeammates,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }

      logger.error('Error fetching team progress:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw errors.internal('Failed to retrieve team progress');
    }
  }

  /**
   * Generates a secure password for team creation
   */
  private async generateSecurePassword(): Promise<string> {
    try {
      const passGen = new UIDGenerator(48, UIDGenerator.BASE62);
      const generated = await passGen.generate();
      
      if (generated && generated.length >= 4) {
        return generated;
      }
      
      logger.warn('Generated password was invalid, using fallback');
      return 'DEBUG_PASS_123';
    } catch (error) {
      logger.error('Error during password generation:', error);
      return 'ERROR_PASS_456';
    }
  }
}
