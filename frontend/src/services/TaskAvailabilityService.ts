import { getCurrentGameModeData } from '@/stores/utils/gameModeHelpers';
import { EOD_EDITIONS } from '@/config/gameConstants';
import type { Task } from '@/types/tarkov';
import type { TaskObjective, TaskRequirement } from '@/types/tarkov';
import type {
  TeamStoresMap,
  CompletionsMap,
  TraderLevelsMap,
  TraderStandingMap,
  FactionMap,
} from '@/stores/progress/types';
import { standingComparator } from '@/utils/traderRequirements';
import type { UserProgressData } from '@/shared_state';

interface TraderRequirement {
  trader?: { id?: string };
  value?: number;
}

interface TraderLevelRequirement {
  trader?: { id?: string };
  level?: number;
}

const ACTIVE_STATUSES = new Set(['active', 'accept', 'accepted']);

export class TaskAvailabilityService {
  private memo = new Map<string, boolean>();

  constructor(
    private readonly tasks: Map<string, Task>,
    private readonly teamStores: TeamStoresMap,
    private readonly tasksCompletions: CompletionsMap,
    private readonly traderLevels: TraderLevelsMap,
    private readonly traderStandings: TraderStandingMap,
    private readonly playerFactions: FactionMap
  ) {}

  evaluateAvailability(taskId: string, teamId: string): boolean {
    return this.evaluateWithStack(taskId, teamId, new Set());
  }

  private evaluateWithStack(taskId: string, teamId: string, stack: Set<string>): boolean {
    const memoKey = this.getMemoKey(taskId, teamId);

    if (this.memo.has(memoKey)) {
      return this.memo.get(memoKey)!;
    }

    if (stack.has(memoKey)) {
      return this.cacheAndReturn(memoKey, false);
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      return this.cacheAndReturn(memoKey, false);
    }

    stack.add(memoKey);

    const checks: Array<() => boolean> = [
      () => this.checkEodRequirement(task, teamId),
      () => this.checkFailedRequirements(task, teamId),
      () => this.checkCompletionState(taskId, teamId),
      () => this.checkPlayerLevel(task, teamId),
      () => this.checkTraderRequirements(task, teamId),
      () => this.checkObjectiveRequirements(task, teamId),
      () => this.checkTaskRequirements(task, teamId, stack),
      () => this.checkFactionRequirement(task, teamId),
    ];

    const result = checks.every((check) => check());
    stack.delete(memoKey);
    return this.cacheAndReturn(memoKey, result);
  }

  private checkEodRequirement(task: Task, teamId: string): boolean {
    if (!task.eodOnly) return true;
    const store = this.teamStores[teamId];
    const edition = store?.$state?.gameEdition ?? 0;
    return EOD_EDITIONS.has(edition);
  }

  private checkFailedRequirements(task: Task, teamId: string): boolean {
    if (!task.failedRequirements?.length) return true;
    const currentData = this.getCurrentData(teamId);

    return task.failedRequirements.every((requirement) => {
      const failed =
        currentData?.taskCompletions?.[requirement?.task?.id ?? '']?.failed ?? false;
      return !failed;
    });
  }

  private checkCompletionState(taskId: string, teamId: string): boolean {
    return !this.isTaskComplete(taskId, teamId);
  }

  private checkPlayerLevel(task: Task, teamId: string): boolean {
    if (!task.minPlayerLevel) return true;
    const currentData = this.getCurrentData(teamId);
    const playerLevel = currentData?.level ?? 0;
    return playerLevel >= task.minPlayerLevel;
  }

  private checkTraderRequirements(task: Task, teamId: string): boolean {
    return (
      this.validateTraderLevelRequirements(task.traderLevelRequirements, teamId) &&
      this.validateLegacyTraderRequirements(task.traderRequirements, teamId)
    );
  }

  private validateTraderLevelRequirements(
    requirements: TraderLevelRequirement[] | undefined,
    teamId: string
  ): boolean {
    if (!requirements?.length) return true;
    const teamTraderLevels = this.traderLevels[teamId] ?? {};

    return requirements.every((requirement) => {
      const traderId = requirement?.trader?.id;
      if (!traderId) return true;

      const requiredLevel = Math.max(
        0,
        Math.min(10, Math.floor(Number(requirement.level) || 0))
      );
      const currentLevel = teamTraderLevels[traderId] ?? 0;
      return currentLevel >= requiredLevel;
    });
  }

  private validateLegacyTraderRequirements(
    requirements: TraderRequirement[] | undefined,
    teamId: string
  ): boolean {
    if (!requirements?.length) return true;
    const teamTraderLevels = this.traderLevels[teamId] ?? {};

    return requirements.every((requirement) => {
      const traderId = requirement?.trader?.id;
      if (!traderId) return true;

      const requiredLevel = Math.max(
        0,
        Math.min(10, Math.floor(Number(requirement.value) || 0))
      );
      const currentLevel = teamTraderLevels[traderId] ?? 0;
      return currentLevel >= requiredLevel;
    });
  }

  private checkObjectiveRequirements(task: Task, teamId: string): boolean {
    const objectives = task.objectives || [];
    if (!objectives.length) return true;

    return objectives.every((objective) => {
      if (objective?.optional === true) return true;
      if (objective?.type === 'traderLevel') {
        return this.validateObjectiveTraderLevel(objective, teamId);
      }
      if (objective?.type === 'traderStanding') {
        return this.validateObjectiveStanding(objective, teamId);
      }
      return true;
    });
  }

  private validateObjectiveTraderLevel(objective: TaskObjective, teamId: string): boolean {
    const traderId = objective?.trader?.id;
    if (!traderId) return true;
    const required = Math.max(0, Math.min(10, Math.floor(Number(objective.level) || 0)));
    const current = this.traderLevels[teamId]?.[traderId] ?? 0;
    return current >= required;
  }

  private validateObjectiveStanding(objective: TaskObjective, teamId: string): boolean {
    const traderId = objective?.trader?.id;
    if (!traderId) return true;
    const required = Number(objective?.value) || 0;
    const current = this.traderStandings[teamId]?.[traderId] ?? 0;
    return standingComparator(current, objective?.compareMethod, required);
  }

  private checkTaskRequirements(
    task: Task,
    teamId: string,
    stack: Set<string>
  ): boolean {
    if (!task.taskRequirements?.length) return true;

    return task.taskRequirements.every((requirement) =>
      this.evaluateTaskRequirement(requirement, teamId, stack)
    );
  }

  private evaluateTaskRequirement(
    requirement: TaskRequirement,
    teamId: string,
    stack: Set<string>
  ): boolean {
    const requiredTaskId = requirement?.task?.id;
    if (!requiredTaskId) return true;

    const statuses = this.normaliseStatuses(requirement.status);
    const requiredTaskComplete = this.isTaskComplete(requiredTaskId, teamId);

    if (!statuses.length) {
      return requiredTaskComplete;
    }

    const handlers = [
      this.requiresCompletion(statuses) ? () => requiredTaskComplete : null,
      this.requiresActive(statuses)
        ? () => this.dependencyAvailable(requiredTaskId, teamId, stack)
        : null,
      this.requiresFailure(statuses) ? () => this.isTaskFailed(requiredTaskId, teamId) : null,
    ].filter(Boolean) as Array<() => boolean>;

    if (handlers.some((handler) => handler())) {
      return true;
    }

    return requiredTaskComplete;
  }

  private checkFactionRequirement(task: Task, teamId: string): boolean {
    if (!task.factionName || task.factionName === 'Any') return true;
    return task.factionName === this.playerFactions[teamId];
  }

  private isTaskComplete(taskId: string, teamId: string): boolean {
    return this.tasksCompletions[taskId]?.[teamId] ?? false;
  }

  private isTaskFailed(taskId: string, teamId: string): boolean {
    const currentData = this.getCurrentData(teamId);
    return currentData?.taskCompletions?.[taskId]?.failed ?? false;
  }

  private getCurrentData(teamId: string): UserProgressData | undefined {
    const store = this.teamStores[teamId];
    if (!store) return undefined;
    const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
    if (!currentData || typeof currentData !== 'object') {
      return undefined;
    }
    return currentData;
  }

  private cacheAndReturn(key: string, value: boolean): boolean {
    this.memo.set(key, value);
    return value;
  }

  private getMemoKey(taskId: string, teamId: string) {
    return `${taskId}:${teamId}`;
  }

  private normaliseStatuses(statuses: unknown): string[] {
    if (!Array.isArray(statuses)) return [];
    return statuses
      .map((status) => (typeof status === 'string' ? status.toLowerCase() : ''))
      .filter(Boolean);
  }

  private statusesIncludeActive(statuses: string[]) {
    return statuses.some((status) => ACTIVE_STATUSES.has(status));
  }

  private requiresCompletion(statuses: string[]) {
    return statuses.includes('complete');
  }

  private requiresActive(statuses: string[]) {
    return this.statusesIncludeActive(statuses);
  }

  private requiresFailure(statuses: string[]) {
    return statuses.includes('failed');
  }

  private dependencyAvailable(taskId: string, teamId: string, stack: Set<string>) {
    return this.evaluateWithStack(taskId, teamId, stack);
  }
}
