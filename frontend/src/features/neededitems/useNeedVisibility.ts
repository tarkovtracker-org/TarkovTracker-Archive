import { useUserStore } from '@/stores/user';
import { useTarkovStore } from '@/stores/tarkov';
import { taskMatchesRequirementFilters } from '@/utils/taskFilters';
import { useProgressQueries } from '@/composables/useProgressQueries';
import type { NeededItemTaskObjective, NeededItemHideoutModule, Task } from '@/types/tarkov';
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
  const isTaskNeedVisible = (need: NeededItemTaskObjective, task: Task | undefined): boolean => {
    if (!need || !task) return false;
    if (!need.item) return false;
    if (userStore.itemsNeededHideNonFIR) {
      if (need.type === 'mark' || need.type === 'buildWeapon' || need.type === 'plantItem') {
        return false;
      }
      if (need.type === 'giveItem' && need.foundInRaid === false) {
        return false;
      }
    }
    const requirementOptions = {
      showKappa: !userStore.hideKappaRequiredTasks,
      showLightkeeper: !userStore.hideLightkeeperRequiredTasks,
      showEod: !userStore.hideEodOnlyTasks,
      hideNonEndgame: userStore.hideNonKappaTasks,
      treatEodAsEndgame: false,
    } as const;
    if (!taskMatchesRequirementFilters(task, requirementOptions)) {
      return false;
    }
    const taskFaction = task.factionName;
    const selfTaskComplete = tasksCompletions.value?.[need.taskId]?.self === true;
    const selfObjectiveComplete = objectiveCompletions.value?.[need.id]?.self === true;
    if (userStore.itemsTeamAllHidden) {
      return (
        !selfTaskComplete && !selfObjectiveComplete && matchesFactionForTeam(taskFaction, 'self')
      );
    }
    const taskNeedsAttention = hasTeamNeedingEntry(
      tasksCompletions.value?.[need.taskId],
      taskFaction
    );
    const objectiveNeedsAttention = hasTeamNeedingEntry(
      objectiveCompletions.value?.[need.id],
      taskFaction
    );
    if (userStore.itemsTeamNonFIRHidden) {
      return need.foundInRaid !== false && taskNeedsAttention && objectiveNeedsAttention;
    }
    return taskNeedsAttention && objectiveNeedsAttention;
  };
  const isHideoutNeedVisible = (need: NeededItemHideoutModule): boolean => {
    if (!need || !need.hideoutModule?.id) return false;
    if (!need.item) return false;
    const moduleCompletionsForModule = moduleCompletions.value?.[need.hideoutModule.id] ?? {};
    const modulePartCompletionsForModule = modulePartCompletions.value?.[need.id] ?? {};
    if (
      Object.keys(moduleCompletionsForModule).length === 0 &&
      Object.keys(modulePartCompletionsForModule).length === 0
    ) {
      return true;
    }
    if (userStore.itemsTeamAllHidden || userStore.itemsTeamHideoutHidden) {
      // For self-only view: Show item if EITHER the module OR the part is incomplete
      // This is correct because:
      // - moduleCompletions tracks if the hideout module level is built (e.g., Workbench Level 2)
      // - modulePartCompletions tracks if the specific construction part for that level is installed
      // If either is incomplete, the item is still needed for that hideout upgrade
      const selfModuleIncomplete = moduleCompletionsForModule.self !== true;
      const selfPartIncomplete = modulePartCompletionsForModule.self !== true;
      return selfModuleIncomplete || selfPartIncomplete;
    }
    // For team view: Show item if ANY team member needs the module OR part
    const moduleNeeded = Object.values(moduleCompletionsForModule).some(
      (status) => status === false
    );
    const partNeeded = Object.values(modulePartCompletionsForModule).some(
      (status) => status === false
    );
    return moduleNeeded || partNeeded;
  };
  return {
    isTaskNeedVisible,
    isHideoutNeedVisible,
  } as const;
}
