import { computed } from 'vue';
import { taskMatchesRequirementFilters } from '@/utils/taskFilters';
import type { Task } from '@/types/models/tarkov';
import type { RequirementFilterOptions } from '@/utils/taskFilters';

export function useTaskFiltering(
  tasks: Task[],
  unlockedTasks: Set<string>,
  tasksCompletions: Record<string, boolean>,
  objectiveCompletions: Record<string, boolean>,
  playerFaction: string,
  isTaskUnlockedFor: (taskId: string, userId: string) => boolean,
  showCompleted: boolean = true,
  showAvailable: boolean = true,
  showLocked: boolean = false,
  factionFilter: string = 'all',
  requirementFilters: RequirementFilterOptions | null = null
) {
  const filteredTasks = computed(() => {
    return tasks.filter((task) => {
      // Filter by completion status
      const isCompleted = tasksCompletions[task.id] ?? false;
      if (isCompleted && !showCompleted) return false;
      if (!isCompleted && !showCompleted && !showAvailable && !showLocked) {
        return false;
      }

      // Filter by faction
      if (factionFilter !== 'all' && task.factionName !== factionFilter) {
        return false;
      }

      // Filter by requirements
      if (!taskMatchesRequirementFilters(task, requirementFilters)) {
        return false;
      }

      // Filter by unlock status
      const isUnlocked = unlockedTasks.has(task.id);
      if (isUnlocked && !showAvailable) return false;
      if (!isUnlocked && !showLocked) return false;

      return true;
    });
  });

  return {
    filteredTasks,
  };
}
