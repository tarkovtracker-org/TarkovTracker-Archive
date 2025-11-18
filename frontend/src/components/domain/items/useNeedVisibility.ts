import { useUserStore } from '@/stores/user';
import { useTarkovStore } from '@/stores/tarkov';
import { taskMatchesRequirementFilters } from '@/utils/taskFilters';
import { useProgressQueries } from '@/composables/useProgressQueries';
import type { NeededItemTaskObjective, NeededItemHideoutModule, Task } from '@/types/models/tarkov';
const ANY_FACTION = 'Any';
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
export function useNeedVisibility() {
  const userStore = useUserStore();
  const tarkovStore = useTarkovStore();
  const {
    playerFaction,
    tasksCompletions,
    objectiveCompletions,
    moduleCompletions,
    modulePartCompletions,
  } = useProgressQueries();
  const getTeamFactions = (teamId?: string): string[] => {
    const factions = [ANY_FACTION];
    if (!teamId || teamId === 'self') {
      const getter = tarkovStore.getPMCFaction;
      const faction = typeof getter === 'function' ? getter() : getter;
      const normalized = asString(faction);
      if (normalized) factions.push(normalized);
      return factions;
    }
    const faction = playerFaction.value?.[teamId];
    const normalized = asString(faction);
    if (normalized) factions.push(normalized);
    return factions;
  };
  const normalizeFaction = (faction: string | undefined): string =>
    asString(faction) ?? ANY_FACTION;
  const matchesFactionForTeam = (taskFaction: string | undefined, teamId?: string): boolean => {
    const normalizedTaskFaction = normalizeFaction(taskFaction);
    return getTeamFactions(teamId).includes(normalizedTaskFaction);
  };
  const hasTeamNeedingEntry = (
    record: Record<string, boolean> | undefined,
    taskFaction: string | undefined
  ): boolean => {
    if (!record) return false;
    return Object.entries(record).some(([teamId, status]) => {
      if (status !== false) {
        return false;
      }
      return matchesFactionForTeam(taskFaction, teamId);
    });
  };
  // Helper to check if item type should be filtered based on FIR settings
  const shouldFilterItemType = (need: NeededItemTaskObjective): boolean => {
    if (!userStore.itemsNeededHideNonFIR) return false;

    if (need.type === 'mark' || need.type === 'buildWeapon' || need.type === 'plantItem') {
      return true;
    }

    return need.type === 'giveItem' && need.foundInRaid === false;
  };

  // Helper to check task requirements and filters
  const passesTaskRequirements = (task: Task): boolean => {
    const requirementOptions = {
      showKappa: !userStore.hideKappaRequiredTasks,
      showLightkeeper: !userStore.hideLightkeeperRequiredTasks,
      showEod: !userStore.hideEodOnlyTasks,
      hideNonEndgame: userStore.hideNonKappaTasks,
      treatEodAsEndgame: false,
    } as const;

    return taskMatchesRequirementFilters(task, requirementOptions);
  };

  // Helper to check self completion status
  const isSelfCompleted = (need: NeededItemTaskObjective): boolean => {
    const selfTaskComplete = tasksCompletions.value?.[need.taskId]?.self === true;
    const selfObjectiveComplete = objectiveCompletions.value?.[need.id]?.self === true;
    return selfTaskComplete || selfObjectiveComplete;
  };

  // Helper to check if team needs attention
  const getTeamAttentionStatus = (
    need: NeededItemTaskObjective,
    taskFaction: string | undefined
  ) => {
    const taskNeedsAttention = hasTeamNeedingEntry(
      tasksCompletions.value?.[need.taskId],
      taskFaction
    );
    const objectiveNeedsAttention = hasTeamNeedingEntry(
      objectiveCompletions.value?.[need.id],
      taskFaction
    );
    return { taskNeedsAttention, objectiveNeedsAttention };
  };

  // Helper to check team mode visibility
  const checkTeamModeVisibility = (
    need: NeededItemTaskObjective,
    taskFaction: string | undefined
  ): boolean => {
    // Handle team all hidden mode
    if (userStore.itemsTeamAllHidden) {
      return !isSelfCompleted(need) && matchesFactionForTeam(taskFaction, 'self');
    }

    // Get team attention status
    const { taskNeedsAttention, objectiveNeedsAttention } = getTeamAttentionStatus(
      need,
      taskFaction
    );

    // Handle non-FIR hidden mode
    if (userStore.itemsTeamNonFIRHidden) {
      return need.foundInRaid !== false && taskNeedsAttention && objectiveNeedsAttention;
    }

    return taskNeedsAttention && objectiveNeedsAttention;
  };

  const isTaskNeedVisible = (need: NeededItemTaskObjective, task: Task | undefined): boolean => {
    if (!need || !task) return false;
    if (!need.item) return false;

    // Check FIR filtering
    if (shouldFilterItemType(need)) return false;

    // Check task requirements
    if (!passesTaskRequirements(task)) return false;

    const taskFaction = task.factionName;

    return checkTeamModeVisibility(need, taskFaction);
  };
  // Helper to check if any team member needs the module or part
  const checkTeamNeeds = (
    moduleCompletions: Record<string, boolean>,
    modulePartCompletions: Record<string, boolean>
  ) => {
    const moduleNeeded = Object.values(moduleCompletions).some((status) => status === false);
    const partNeeded = Object.values(modulePartCompletions).some((status) => status === false);
    return moduleNeeded || partNeeded;
  };

  // Helper to check self-only view requirements
  const checkSelfView = (
    moduleCompletions: Record<string, boolean>,
    modulePartCompletions: Record<string, boolean>
  ) => {
    // For self-only view: Show item if EITHER the module OR the part is incomplete
    // This is correct because:
    // - moduleCompletions tracks if the hideout module level is built (e.g., Workbench Level 2)
    // - modulePartCompletions tracks if the specific construction part for that level is installed
    // If either is incomplete, the item is still needed for that hideout upgrade
    const selfModuleIncomplete = moduleCompletions.self !== true;
    const selfPartIncomplete = modulePartCompletions.self !== true;
    return selfModuleIncomplete || selfPartIncomplete;
  };

  // Helper to check if completions exist
  const hasAnyCompletions = (
    moduleCompletions: Record<string, boolean>,
    modulePartCompletions: Record<string, boolean>
  ): boolean => {
    return (
      Object.keys(moduleCompletions).length > 0 || Object.keys(modulePartCompletions).length > 0
    );
  };

  // Helper to get completions for a need
  const getNeedCompletions = (need: NeededItemHideoutModule) => {
    const moduleCompletionsForModule = moduleCompletions.value?.[need.hideoutModule.id] ?? {};
    const modulePartCompletionsForModule = modulePartCompletions.value?.[need.id] ?? {};
    return { moduleCompletionsForModule, modulePartCompletionsForModule };
  };

  // Helper to determine visibility based on team settings
  const determineVisibility = (
    moduleCompletionsForModule: Record<string, boolean>,
    modulePartCompletionsForModule: Record<string, boolean>
  ): boolean => {
    // Handle team views
    if (userStore.itemsTeamAllHidden || userStore.itemsTeamHideoutHidden) {
      return checkSelfView(moduleCompletionsForModule, modulePartCompletionsForModule);
    }

    // For team view: Show item if ANY team member needs the module OR part
    return checkTeamNeeds(moduleCompletionsForModule, modulePartCompletionsForModule);
  };

  const isHideoutNeedVisible = (need: NeededItemHideoutModule): boolean => {
    if (!need || !need.hideoutModule?.id) return false;
    if (!need.item) return false;

    const { moduleCompletionsForModule, modulePartCompletionsForModule } = getNeedCompletions(need);

    // If no completions exist, item is needed
    if (!hasAnyCompletions(moduleCompletionsForModule, modulePartCompletionsForModule)) {
      return true;
    }

    return determineVisibility(moduleCompletionsForModule, modulePartCompletionsForModule);
  };
  return {
    isTaskNeedVisible,
    isHideoutNeedVisible,
  } as const;
}
