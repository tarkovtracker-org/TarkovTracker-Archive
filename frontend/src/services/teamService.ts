import type { TeamNeed, User } from '@/types/models/tarkov';

/**
 * Service for team-related business logic
 * Separated from components for better testability and reusability
 */
export class TeamService {
  /**
   * Get display name for a user
   */
  static getDisplayName(user: User): string {
    return user.displayName ?? user.nickname ?? user.email ?? 'Unknown';
  }

  /**
   * Calculate if a team member needs an item
   */
  static getTeamMemberNeedCount(teamNeeds: TeamNeed[], userId: string): number {
    if (!teamNeeds) return 0;

    const userNeed = teamNeeds.find((need) => need.user?.id === userId);
    return userNeed?.count || 0;
  }

  /**
   * Get all unique users from team needs
   */
  static getUniqueUsers(teamNeeds: TeamNeed[]): User[] {
    const uniqueUsers = new Set<User>();

    teamNeeds.forEach((need) => {
      if (need.user) {
        uniqueUsers.add(need.user);
      }
    });

    return Array.from(uniqueUsers);
  }

  /**
   * Check if a user has completed a need
   */
  static hasUserCompletedNeed(teamNeeds: TeamNeed[], userId: string): boolean {
    const userNeed = teamNeeds.find((need) => need.user?.id === userId);
    return userNeed?.completed || false;
  }

  /**
   * Calculate total needed count across all team members
   */
  static getTotalNeededCount(teamNeeds: TeamNeed[]): number {
    if (!teamNeeds) return 0;

    return teamNeeds.reduce((total, need) => total + (need.count || 0), 0);
  }

  /**
   * Format count as localized string
   */
  static formatCount(count: number): string {
    return Math.abs(count).toLocaleString();
  }
}
