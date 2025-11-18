import type { TarkovItem } from '@/types/models/tarkov';

/**
 * Service for needed items business logic
 * Separated from components for better testability and reusability
 */
export class NeededItemsService {
  /**
   * Check if an item is found in raid
   */
  static isFoundInRaid(item: TarkovItem | undefined): boolean {
    return item?.foundInRaid ?? false;
  }

  /**
   * Check if an item is banned
   */
  static isBanned(item: TarkovItem | undefined): boolean {
    return item?.banned ?? false;
  }

  /**
   * Get the image link for an item
   */
  static getImageLink(item: TarkovItem | undefined): string {
    return item?.iconLink ?? '';
  }

  /**
   * Check if an image is available
   */
  static isImageAvailable(imageLink: string): boolean {
    return Boolean(imageLink && imageLink.trim() !== '');
  }

  /**
   * Get appropriate CSS classes for item image
   */
  static getItemImageClasses(item: TarkovItem | undefined): Record<string, boolean> {
    return {
      'item-image': true,
      'banned-item': this.isBanned(item),
      'needed-item': !this.isBanned(item),
    };
  }

  /**
   * Calculate item row CSS classes
   */
  static getItemRowClasses(need: any): Record<string, boolean> {
    return {
      'needed-item-row': true,
      completed: need.completed,
      removed: need.removed,
      fIR: need.foundInRaid,
    };
  }

  /**
   * Get requirement type display
   */
  static getRequirementTypeDisplay(needType: string): string {
    switch (needType) {
      case 'taskObjective':
        return 'Task Objective';
      case 'hideoutModule':
        return 'Hideout Module';
      default:
        return needType;
    }
  }

  /**
   * Calculate level requirement info
   */
  static getLevelRequirementInfo(need: any): {
    levelRequired: number;
    lockedBefore: number;
    canComplete: boolean;
  } {
    let levelRequired = 0;
    let lockedBefore = 0;

    if (need.needType === 'taskObjective' && need.task) {
      levelRequired = need.task.minPlayerLevel || 0;

      const completed = need.task.completed;
      const hasPredecessors = need.task.predecessors?.length > 0;

      if (completed || hasPredecessors) {
        lockedBefore = need.task.predecessors?.length || 0;
      }
    }

    if (need.needType === 'hideoutModule' && need.station) {
      levelRequired = need.station.level || 0;
    }

    const canComplete = levelRequired > 0;

    return {
      levelRequired,
      lockedBefore,
      canComplete,
    };
  }

  /**
   * Get related task for task objective
   */
  static getRelatedTask(need: any): any {
    return need.needType === 'taskObjective' ? need.task : null;
  }

  /**
   * Get related station for hideout module
   */
  static getRelatedStation(need: any): any {
    return need.needType === 'hideoutModule' ? need.station : null;
  }
}
