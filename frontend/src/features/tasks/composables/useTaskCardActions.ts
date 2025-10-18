import { computed, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTarkovStore } from '@/stores/tarkov';
import type { Task, TaskObjective } from '@/types/tarkov';
type UndoAction = 'complete' | 'uncomplete';
interface UndoData {
  taskId: string;
  taskName?: string;
  action: UndoAction;
}
type ObjectiveAction =
  | 'setTaskObjectiveComplete'
  | 'setTaskObjectiveUncomplete'
  | 'setTaskObjectiveFailed'
  | string;
export function useTaskCardActions(task: Ref<Task>, tasks: Ref<Task[]>) {
  const tarkovStore = useTarkovStore();
  const { t } = useI18n({ useScope: 'global' });
  const taskStatus = ref('');
  const taskStatusUpdated = ref(false);
  const undoData = ref<UndoData | null>(null);
  const showUndoButton = computed(() => undoData.value !== null);
  const updateTaskStatus = (statusKey: string, taskName = task.value.name, canUndo = false) => {
    taskStatus.value = t(statusKey, { name: taskName });
    taskStatusUpdated.value = true;
    if (!canUndo) {
      undoData.value = null;
    }
  };
  const handleTaskObjectives = (objectives: TaskObjective[] = [], action: ObjectiveAction) => {
    objectives.forEach((objective) => {
      if (!objective?.id) {
        return;
      }
      adjustKillObjectiveCount(objective, action);
      const targetFn = (tarkovStore as unknown as Record<string, (id: string) => void>)[action];
      if (typeof targetFn === 'function') {
        targetFn(objective.id);
      }
    });
  };
  const adjustKillObjectiveCount = (objective: TaskObjective, action: ObjectiveAction) => {
    const isKillObjective =
      objective.type === 'shoot' && (objective as { shotType?: string }).shotType === 'kill';
    if (!isKillObjective) return;
    if (action === 'setTaskObjectiveComplete' && objective?.count) {
      tarkovStore.setObjectiveCount(objective.id, objective.count);
    } else if (action === 'setTaskObjectiveUncomplete') {
      tarkovStore.setObjectiveCount(objective.id, 0);
    }
  };
  const handleAlternatives = (
    alternatives: string[] | undefined,
    taskAction: 'setTaskFailed' | 'setTaskUncompleted',
    objectiveAction: ObjectiveAction
  ) => {
    if (!Array.isArray(alternatives) || !alternatives.length) return;
    alternatives.forEach((altTaskId) => {
      const fn = (tarkovStore as unknown as Record<string, (id: string) => void>)[taskAction];
      if (typeof fn === 'function') {
        fn(altTaskId);
      }
      const alternativeTask = tasks.value.find((taskItem) => taskItem.id === altTaskId);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };
  const getPlayerLevel = () =>
    typeof tarkovStore.playerLevel === 'function' ? tarkovStore.playerLevel() : 0;
  const ensureMinLevel = (minLevel: number | undefined) => {
    if (typeof minLevel !== 'number') return;
    if (getPlayerLevel() < minLevel) {
      tarkovStore.setLevel(minLevel);
    }
  };
  const markTaskComplete = (isUndo = false) => {
    if (!isUndo) {
      undoData.value = {
        taskId: task.value.id,
        taskName: task.value.name,
        action: 'complete',
      };
    }
    tarkovStore.setTaskComplete(task.value.id);
    handleTaskObjectives(task.value.objectives, 'setTaskObjectiveComplete');
    handleAlternatives(task.value.alternatives, 'setTaskFailed', 'setTaskObjectiveFailed');
    ensureMinLevel(task.value.minPlayerLevel);
    const statusKey = isUndo
      ? 'page.tasks.questcard.undocomplete'
      : 'page.tasks.questcard.statuscomplete';
    updateTaskStatus(statusKey, task.value.name, !isUndo);
  };
  const markTaskUncomplete = (isUndo = false) => {
    if (!isUndo) {
      undoData.value = {
        taskId: task.value.id,
        taskName: task.value.name,
        action: 'uncomplete',
      };
    }
    tarkovStore.setTaskUncompleted(task.value.id);
    handleTaskObjectives(task.value.objectives, 'setTaskObjectiveUncomplete');
    handleAlternatives(task.value.alternatives, 'setTaskUncompleted', 'setTaskObjectiveUncomplete');
    const statusKey = isUndo
      ? 'page.tasks.questcard.undouncomplete'
      : 'page.tasks.questcard.statusuncomplete';
    updateTaskStatus(statusKey, task.value.name, !isUndo);
  };
  const undoLastAction = () => {
    if (!undoData.value) return;
    const { taskId, taskName, action } = undoData.value;
    const targetTask = tasks.value.find((taskItem) => taskItem.id === taskId);
    if (action === 'complete') {
      tarkovStore.setTaskUncompleted(taskId);
      if (targetTask) {
        handleTaskObjectives(targetTask.objectives, 'setTaskObjectiveUncomplete');
        handleAlternatives(
          targetTask.alternatives,
          'setTaskUncompleted',
          'setTaskObjectiveUncomplete'
        );
      }
      updateTaskStatus('page.tasks.questcard.undocomplete', taskName);
    } else if (action === 'uncomplete') {
      tarkovStore.setTaskComplete(taskId);
      if (targetTask) {
        handleTaskObjectives(targetTask.objectives, 'setTaskObjectiveComplete');
        handleAlternatives(targetTask.alternatives, 'setTaskFailed', 'setTaskObjectiveFailed');
        ensureMinLevel(targetTask.minPlayerLevel);
      }
      updateTaskStatus('page.tasks.questcard.undouncomplete', taskName);
    }
    undoData.value = null;
  };
  const markTaskAvailable = () => {
    task.value.predecessors?.forEach((predecessorId) => {
      tarkovStore.setTaskComplete(predecessorId);
      const predecessorTask = tasks.value.find((taskItem) => taskItem.id === predecessorId);
      if (predecessorTask?.objectives) {
        handleTaskObjectives(predecessorTask.objectives, 'setTaskObjectiveComplete');
      }
    });
    ensureMinLevel(task.value.minPlayerLevel);
    updateTaskStatus('page.tasks.questcard.statusavailable', task.value.name);
  };
  return {
    taskStatus,
    taskStatusUpdated,
    showUndoButton,
    markTaskComplete,
    markTaskUncomplete,
    markTaskAvailable,
    undoLastAction,
  };
}
