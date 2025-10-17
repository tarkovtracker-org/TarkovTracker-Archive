<template>
  <v-sheet :id="`task-${task.id}`" class="pa-2 taskContainer" :rounded="true" :class="taskClasses">
    <div v-if="showBackgroundIcon" class="taskContainerBackground text-h1">
      <v-icon>{{ backgroundIcon }}</v-icon>
    </div>
    <v-container>
      <v-row>
        <!-- Quest Info Section -->
        <v-col cols="12" xs="12" sm="4" md="3" lg="3" :align="xs ? 'center' : 'left'">
          <TaskInfo
            :task="task"
            :xs="xs"
            :locked-before="lockedBefore"
            :locked-behind="lockedBehind"
            :faction-image="factionImage"
            :show-kappa-status="showKappaStatus"
            :kappa-required="kappaRequired"
            :show-lightkeeper-status="showLightkeeperStatus"
            :lightkeeper-required="lightkeeperRequired"
            :needed-by="neededBy"
            :active-user-view="activeUserView"
            :show-next-tasks="showNextTasksSetting"
            :next-tasks="nextTasks"
            :show-previous-tasks="showPreviousTasksSetting"
            :previous-tasks="previousTasks"
            :show-task-ids="showTaskIds"
            :show-eod-status="showEodStatus"
          />
        </v-col>
        <!-- Quest Content Section -->
        <v-col cols="12" xs="12" sm="8" md="7" lg="7" class="d-flex align-center">
          <v-container>
            <QuestKeys v-if="task?.neededKeys?.length" :needed-keys="task.neededKeys" />
            <QuestObjectives
              :objectives="relevantViewObjectives"
              :irrelevant-count="irrelevantObjectives.length"
              :uncompleted-irrelevant="uncompletedIrrelevantObjectives.length"
            />
          </v-container>
        </v-col>
        <!-- Actions Section -->
        <v-col cols="12" xs="12" sm="12" md="2" lg="2" class="d-flex align-center justify-center">
          <TaskActions
            :task="task"
            :tasks="tasks"
            :xs="xs"
            :is-complete="isComplete"
            :is-locked="isLocked"
            :is-our-faction="isOurFaction"
            :show-experience="showExperienceRewards"
            :experience="task.experience || 0"
            @complete="markTaskComplete"
            @uncomplete="markTaskUncomplete"
            @unlock="markTaskAvailable"
          />
        </v-col>
      </v-row>
    </v-container>
    <v-snackbar v-model="taskStatusUpdated" :timeout="4000" color="secondary">
      {{ taskStatus }}
      <template #actions>
        <v-btn v-if="showUndoButton" color="white" variant="text" @click="undoLastAction">
          {{ t('page.tasks.questcard.undo') }}
        </v-btn>
        <v-btn color="white" variant="text" @click="taskStatusUpdated = false">
          {{ t('page.tasks.filters.close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-sheet>
</template>
<script setup>
  import { defineAsyncComponent, computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useDisplay } from 'vuetify';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useProgressQueries } from '@/composables/useProgressQueries';
  import { useUserStore } from '@/stores/user';
  import { useTarkovData } from '@/composables/tarkovdata';
  const TaskInfo = defineAsyncComponent(() => import('./TaskInfo'));
  const QuestKeys = defineAsyncComponent(() => import('./QuestKeys'));
  const QuestObjectives = defineAsyncComponent(() => import('./QuestObjectives'));
  const TaskActions = defineAsyncComponent(() => import('./TaskActions'));
  const props = defineProps({
    task: { type: Object, required: true },
    activeUserView: { type: String, required: true },
    neededBy: { type: Array, default: () => [] },
    showNextTasks: { type: Boolean, default: false },
    showPreviousTasks: { type: Boolean, default: false },
  });
  const { t } = useI18n({ useScope: 'global' });
  const { xs } = useDisplay();
  const tarkovStore = useTarkovStore();
  const { unlockedTasks } = useProgressQueries();
  const userStore = useUserStore();
  const { tasks } = useTarkovData();
  const taskStatusUpdated = ref(false);
  const taskStatus = ref('');
  // { taskId: string, taskName: string, action: 'complete' | 'uncomplete' }
  const undoData = ref(null);
  const showUndoButton = ref(false);
  // Computed properties
  const isComplete = computed(() => tarkovStore.isTaskComplete(props.task.id));
  const isFailed = computed(() => tarkovStore.isTaskFailed(props.task.id));
  const isLocked = computed(
    () => unlockedTasks.value?.[props.task.id]?.self !== true && !isComplete.value
  );
  const isOurFaction = computed(() => {
    const taskFaction = props.task.factionName;
    return taskFaction === 'Any' || taskFaction === tarkovStore.getPMCFaction();
  });
  const taskClasses = computed(() => ({
    'task-complete': isComplete.value && !isFailed.value,
    'task-locked': isLocked.value || isFailed.value,
  }));
  const showBackgroundIcon = computed(() => isLocked.value || isFailed.value || isComplete.value);
  const backgroundIcon = computed(() => {
    if (isComplete.value) return 'mdi-check';
    if (isLocked.value || isFailed.value) return 'mdi-lock';
    return '';
  });
  const resolveTaskId = (value) => (typeof value === 'string' ? value : value?.id);
  const lockedBehind = computed(() => {
    const successors = props.task.successors ?? [];
    return successors
      .map(resolveTaskId)
      .filter((id) => id && !tarkovStore.isTaskComplete(id)).length;
  });
  const lockedBefore = computed(() => {
    const predecessors = props.task.predecessors ?? [];
    return predecessors
      .map(resolveTaskId)
      .filter((id) => id && !tarkovStore.isTaskComplete(id)).length;
  });
  const showOptionalRequirementLabels = computed(
    () => userStore.getShowOptionalTaskRequirementLabels
  );
  const showRequiredRequirementLabels = computed(
    () => userStore.getShowRequiredTaskRequirementLabels
  );
  const showExperienceRewards = computed(() => userStore.getShowExperienceRewards);
  const tasksById = computed(() => {
    const map = new Map();
    (tasks.value || []).forEach((t) => map.set(t.id, t));
    return map;
  });
  const showNextTasksSetting = computed(() => props.showNextTasks === true);
  const nextTasks = computed(() => {
    if (!showNextTasksSetting.value) return [];
    const children = props.task.children || [];
    if (!Array.isArray(children) || !children.length) return [];
    return children
      .map((id) => tasksById.value.get(id))
      .filter((taskItem) => Boolean(taskItem && taskItem.name))
      .map((taskItem) => ({
        id: taskItem.id,
        name: taskItem.name,
        wikiLink: taskItem.wikiLink,
      }));
  });
  const showTaskIds = computed(() => userStore.getShowTaskIds);
  const showPreviousTasksSetting = computed(() => props.showPreviousTasks === true);
  const previousTasks = computed(() => {
    if (!showPreviousTasksSetting.value) return [];
    const requirements = props.task.taskRequirements || [];
    const relevantRequirementIds = requirements
      .filter((requirement) => {
        const reqTaskId = requirement?.task?.id;
        if (!reqTaskId) return false;
        const statuses = requirement.status || [];
        if (!statuses.length) return true;
        return statuses.some((status) => {
          const normalized = status?.toLowerCase();
          if (!normalized) return false;
          if (normalized.includes('accept')) return false;
          return normalized.includes('complete') || normalized.includes('finish');
        });
      })
      .map((requirement) => requirement.task.id);
    if (!relevantRequirementIds.length) return [];
    return relevantRequirementIds
      .map((id) => tasksById.value.get(id))
      .filter((taskItem) => Boolean(taskItem && taskItem.name))
      .map((taskItem) => ({
        id: taskItem.id,
        name: taskItem.name,
        wikiLink: taskItem.wikiLink,
      }));
  });
  const showKappaStatus = computed(() => {
    if (props.task.kappaRequired === true) {
      return showRequiredRequirementLabels.value;
    }
    if (props.task.kappaRequired === false) {
      return showOptionalRequirementLabels.value;
    }
    return false;
  });
  const kappaRequired = computed(() => props.task.kappaRequired === true);
  const showLightkeeperStatus = computed(() => {
    if (props.task.lightkeeperRequired === true) {
      return showRequiredRequirementLabels.value;
    }
    if (props.task.lightkeeperRequired === false) {
      return showOptionalRequirementLabels.value;
    }
    return false;
  });
  const lightkeeperRequired = computed(() => props.task.lightkeeperRequired === true);
  const showEodStatus = computed(() => {
    if (props.task.eodOnly === true) {
      return showRequiredRequirementLabels.value;
    }
    return false;
  });
  const factionImage = computed(() => `/img/factions/${props.task.factionName}.webp`);
  const mapObjectiveTypes = [
    'mark',
    'zone',
    'extract',
    'visit',
    'findItem',
    'findQuestItem',
    'plantItem',
    'plantQuestItem',
    'shoot',
  ];
  const onMapView = computed(() => userStore.getTaskPrimaryView === 'maps');
  const relevantViewObjectives = computed(() => {
    if (!onMapView.value) return props.task.objectives;
    return props.task.objectives.filter((o) => {
      if (!Array.isArray(o.maps) || !o.maps.length) return true;
      return (
        o.maps.some((m) => m.id === userStore.getTaskMapView) && mapObjectiveTypes.includes(o.type)
      );
    });
  });
  const irrelevantObjectives = computed(() => {
    if (!onMapView.value) return [];
    return props.task.objectives.filter((o) => {
      if (!Array.isArray(o.maps) || !o.maps.length) return false;
      const onSelectedMap = o.maps.some((m) => m.id === userStore.getTaskMapView);
      const isMapType = mapObjectiveTypes.includes(o.type);
      return !(onSelectedMap && isMapType);
    });
  });
  const uncompletedIrrelevantObjectives = computed(() =>
    props.task.objectives
      .filter((o) => {
        const onCorrectMap = o?.maps?.some((m) => m.id === userStore.getTaskMapView);
        const isMapObjectiveType = mapObjectiveTypes.includes(o.type);
        return !onCorrectMap || !isMapObjectiveType;
      })
      .filter((o) => !tarkovStore.isTaskObjectiveComplete(o.id))
  );
  // Methods
  const updateTaskStatus = (statusKey, taskName = props.task.name, showUndo = false) => {
    taskStatus.value = t(statusKey, { name: taskName });
    taskStatusUpdated.value = true;
    showUndoButton.value = showUndo;
  };
  const undoLastAction = () => {
    if (!undoData.value) return;
    const { taskId, taskName, action } = undoData.value;
    if (action === 'complete') {
      // Undo completion by setting task as uncompleted
      tarkovStore.setTaskUncompleted(taskId);
      // Find the task to handle objectives and alternatives
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo) {
        handleTaskObjectives(taskToUndo.objectives, 'setTaskObjectiveUncomplete');
        handleAlternatives(
          taskToUndo.alternatives,
          'setTaskUncompleted',
          'setTaskObjectiveUncomplete'
        );
      }
      updateTaskStatus('page.tasks.questcard.undocomplete', taskName);
    } else if (action === 'uncomplete') {
      // Undo uncompleting by setting task as completed
      tarkovStore.setTaskComplete(taskId);
      // Find the task to handle objectives and alternatives
      const taskToUndo = tasks.value.find((task) => task.id === taskId);
      if (taskToUndo) {
        handleTaskObjectives(taskToUndo.objectives, 'setTaskObjectiveComplete');
        handleAlternatives(taskToUndo.alternatives, 'setTaskFailed', 'setTaskObjectiveComplete');
        // Ensure min level for completion
        if (tarkovStore.playerLevel < taskToUndo.minPlayerLevel) {
          tarkovStore.setLevel(taskToUndo.minPlayerLevel);
        }
      }
      updateTaskStatus('page.tasks.questcard.undouncomplete', taskName);
    }
    showUndoButton.value = false;
    undoData.value = null;
  };
  const handleTaskObjectives = (objectives, action) => {
    objectives.forEach((objective) => {
      if (action === 'setTaskObjectiveComplete') {
        if (objective?.type === 'shoot' && objective?.shotType === 'kill' && objective?.count) {
          tarkovStore.setObjectiveCount(objective.id, objective.count);
        }
        tarkovStore.setTaskObjectiveComplete(objective.id);
      } else if (action === 'setTaskObjectiveUncomplete') {
        if (objective?.type === 'shoot' && objective?.shotType === 'kill' && objective?.count) {
          tarkovStore.setObjectiveCount(objective.id, 0);
        }
        tarkovStore.setTaskObjectiveUncomplete(objective.id);
      } else if (typeof tarkovStore[action] === 'function') {
        tarkovStore[action](objective.id);
      }
    });
  };
  const handleAlternatives = (alternatives, taskAction, objectiveAction) => {
    if (!Array.isArray(alternatives)) return;
    alternatives.forEach((a) => {
      tarkovStore[taskAction](a);
      const alternativeTask = tasks.value.find((task) => task.id === a);
      if (alternativeTask?.objectives) {
        handleTaskObjectives(alternativeTask.objectives, objectiveAction);
      }
    });
  };
  const ensureMinLevel = () => {
    if (tarkovStore.playerLevel < props.task.minPlayerLevel) {
      tarkovStore.setLevel(props.task.minPlayerLevel);
    }
  };
  const markTaskComplete = (isUndo = false) => {
    if (!isUndo) {
      // Store undo data before performing the action
      undoData.value = {
        taskId: props.task.id,
        taskName: props.task.name,
        action: 'complete',
      };
    }
    tarkovStore.setTaskComplete(props.task.id);
    handleTaskObjectives(props.task.objectives, 'setTaskObjectiveComplete');
    handleAlternatives(props.task.alternatives, 'setTaskFailed', 'setTaskObjectiveComplete');
    ensureMinLevel();
    if (isUndo) {
      updateTaskStatus('page.tasks.questcard.undocomplete');
    } else {
      updateTaskStatus('page.tasks.questcard.statuscomplete', props.task.name, true);
    }
  };
  const markTaskUncomplete = (isUndo = false) => {
    if (!isUndo) {
      // Store undo data before performing the action
      undoData.value = {
        taskId: props.task.id,
        taskName: props.task.name,
        action: 'uncomplete',
      };
    }
    tarkovStore.setTaskUncompleted(props.task.id);
    handleTaskObjectives(props.task.objectives, 'setTaskObjectiveUncomplete');
    handleAlternatives(props.task.alternatives, 'setTaskUncompleted', 'setTaskObjectiveUncomplete');
    if (isUndo) {
      updateTaskStatus('page.tasks.questcard.undouncomplete');
    } else {
      updateTaskStatus('page.tasks.questcard.statusuncomplete', props.task.name, true);
    }
  };
  const markTaskAvailable = () => {
    props.task.predecessors?.forEach((p) => {
      tarkovStore.setTaskComplete(p);
      const predecessorTask = tasks.value.find((task) => task.id === p);
      if (predecessorTask?.objectives) {
        handleTaskObjectives(predecessorTask.objectives, 'setTaskObjectiveComplete');
      }
    });
    ensureMinLevel();
    updateTaskStatus('page.tasks.questcard.statusavailable');
  };
</script>

<style lang="scss" scoped>
  .taskContainer {
    position: relative;
    overflow: hidden;
  }

  .taskContainerBackground {
    margin: 3rem;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: -1;
    transform: rotate(15deg);
    color: #c6afaf;
    opacity: 0.2;
  }

  .task-complete {
    background: linear-gradient(
      135deg,
      rgba(var(--v-theme-complete), 1) 0%,
      rgba(var(--v-theme-complete), 0) 75%
    );
  }

  .task-locked {
    background: linear-gradient(
      135deg,
      rgba(var(--v-theme-failure), 1) 0%,
      rgba(var(--v-theme-failure), 0) 75%
    );
  }
</style>
