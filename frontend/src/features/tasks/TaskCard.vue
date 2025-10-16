<template>
  <v-sheet :id="`task-${task.id}`" class="pa-2 taskContainer" :rounded="true" :class="taskClasses">
    <div v-if="showBackgroundIcon" class="taskContainerBackground text-h1">
      <v-icon>{{ backgroundIcon }}</v-icon>
    </div>
    <v-container fluid class="pa-0">
      <v-row class="task-card-row">
        <v-col
          cols="12"
          :align="xs ? 'center' : 'left'"
          class="task-card-column task-card-column--left"
        >
          <TaskCardInfo
            :task="task"
            :needed-by="neededBy"
            :active-user-view="activeUserView"
            :show-next-tasks="showNextTasks"
            :show-previous-tasks="showPreviousTasks"
          />
        </v-col>
        <v-col cols="12" class="d-flex align-start task-card-column task-card-column--center">
          <TaskCardObjectives :task="task" />
        </v-col>
        <v-col
          cols="12"
          class="task-actions-column task-card-column task-card-column--right d-flex"
        >
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
        <v-btn color="white" variant="text" @click="taskStatusUpdated = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-sheet>
</template>
<script setup lang="ts">
  import { computed, toRef, defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useDisplay } from 'vuetify';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useProgressQueries } from '@/composables/useProgressQueries';
  import { useUserStore } from '@/stores/user';
  import { useTarkovData } from '@/composables/tarkovdata';
  import TaskCardInfo from './TaskCardInfo.vue';
  import TaskCardObjectives from './TaskCardObjectives.vue';
  import { useTaskCardActions } from './composables/useTaskCardActions';
  import type { Task } from '@/types/tarkov';
  const TaskActions = defineAsyncComponent(() => import('./TaskActions.vue'));
  interface TaskCardProps {
    task: Task;
    activeUserView: string;
    neededBy: string[];
    showNextTasks: boolean;
    showPreviousTasks: boolean;
  }
  const props = defineProps<TaskCardProps>();
  const { t } = useI18n({ useScope: 'global' });
  const { xs } = useDisplay();
  const tarkovStore = useTarkovStore();
  const { isTaskUnlockedFor } = useProgressQueries();
  const userStore = useUserStore();
  const { tasks } = useTarkovData();
  const taskRef = toRef(props, 'task');
  const {
    taskStatus,
    taskStatusUpdated,
    showUndoButton,
    markTaskComplete,
    markTaskUncomplete,
    markTaskAvailable,
    undoLastAction,
  } = useTaskCardActions(taskRef, tasks);
  const isComplete = computed(() => tarkovStore.isTaskComplete(props.task.id));
  const isFailed = computed(() => tarkovStore.isTaskFailed(props.task.id));
  const isLocked = computed(() => !isTaskUnlockedFor(props.task.id, 'self') && !isComplete.value);
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
  const showExperienceRewards = computed(() => userStore.getShowExperienceRewards);
</script>
<style lang="scss" scoped>
  .taskContainer {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    background:
      linear-gradient(
        180deg,
        rgba(40, 40, 40, 0.98) 0%,
        rgba(33, 33, 33, 0.98) 70%,
        rgba(30, 30, 30, 0.98) 100%
      ),
      #262626;
    margin: 0;
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
  .task-card-row {
    --divider-color: rgba(255, 255, 255, 0.06);
  }
  .task-card-column {
    position: relative;
    padding-top: 16px !important;
    padding-bottom: 16px !important;
  }
  .task-card-column--left {
    border-right: 1px solid var(--divider-color);
  }
  .task-card-column--center {
    border-right: 1px solid var(--divider-color);
    padding-left: 24px !important;
    padding-right: 24px !important;
  }
  .task-card-column--right {
    padding-left: 24px !important;
  }
  .task-actions-column {
    justify-content: flex-end;
    align-items: flex-start;
  }
  @media (min-width: 960px) {
    .task-card-row {
      flex-wrap: nowrap;
    }
    .task-card-column {
      max-width: none;
    }
    .task-card-column--left {
      flex: 0 0 clamp(320px, 34%, 440px);
      max-width: clamp(320px, 34%, 440px);
    }
    .task-card-column--center {
      flex: 1 1 0;
      min-width: clamp(360px, 44%, 760px);
    }
    .task-card-column--right {
      flex: 0 0 clamp(300px, 22%, 340px);
      max-width: clamp(300px, 22%, 340px);
    }
  }
  @media (min-width: 960px) and (max-width: 1600px) {
    .task-card-row {
      flex-wrap: wrap;
    }
    .task-card-column--center {
      border-right: none;
    }
    .task-card-column--right {
      flex: 1 1 100%;
      max-width: 100%;
      margin-top: 12px;
      padding-top: 16px;
      position: relative;
    }
    .task-actions-column {
      width: 100%;
      justify-content: flex-end;
    }
    .task-card-column--right::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background-color: var(--divider-color);
    }
  }
  @media (max-width: 959px) {
    .task-actions-column {
      justify-content: center;
      align-items: center;
    }
    .task-card-column--left,
    .task-card-column--center {
      border-right: none;
      border-bottom: 1px solid var(--divider-color);
    }
  }
  @media (max-width: 1264px) {
    .task-card-column--center,
    .task-card-column--right {
      padding-left: 16px !important;
      padding-right: 16px !important;
    }
  }
</style>
