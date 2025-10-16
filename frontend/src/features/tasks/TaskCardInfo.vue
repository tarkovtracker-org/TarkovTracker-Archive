<template>
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
    :show-next-tasks="showNextTasks"
    :next-tasks="nextTasks"
    :show-previous-tasks="showPreviousTasks"
    :previous-tasks="previousTasks"
    :show-task-ids="showTaskIds"
    :show-eod-status="showEodStatus"
  />
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue';
  import { useDisplay } from 'vuetify';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useUserStore } from '@/stores/user';
  import { useTarkovData } from '@/composables/tarkovdata';
  import type { Task } from '@/types/tarkov';

  const TaskInfo = defineAsyncComponent(() => import('./TaskInfo.vue'));

  const props = defineProps<{
    task: Task;
    neededBy: string[];
    activeUserView: string;
    showNextTasks: boolean;
    showPreviousTasks: boolean;
  }>();

  const tarkovStore = useTarkovStore();
  const userStore = useUserStore();
  const { tasks } = useTarkovData();
  const { xs } = useDisplay();

  const showOptionalRequirementLabels = computed(
    () => userStore.getShowOptionalTaskRequirementLabels
  );
  const showRequiredRequirementLabels = computed(
    () => userStore.getShowRequiredTaskRequirementLabels
  );
  const showTaskIds = computed(() => userStore.getShowTaskIds);

  const resolveTaskId = (value: string | { id?: string } | undefined) =>
    typeof value === 'string' ? value : value?.id;

  const lockedBehind = computed(() => {
    const successors = props.task.successors ?? [];
    return successors
      .map(resolveTaskId)
      .filter((id): id is string => Boolean(id && !tarkovStore.isTaskComplete(id))).length;
  });

  const lockedBefore = computed(() => {
    const predecessors = props.task.predecessors ?? [];
    return predecessors
      .map(resolveTaskId)
      .filter((id): id is string => Boolean(id && !tarkovStore.isTaskComplete(id))).length;
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

  const showEodStatus = computed(() => props.task.eodOnly === true && showRequiredRequirementLabels.value);

  const factionImage = computed(() => `/img/factions/${props.task.factionName}.webp`);

  const showNextTasksComputed = computed(() => props.showNextTasks === true);
  const showPreviousTasksComputed = computed(() => props.showPreviousTasks === true);

  const nextTasks = computed(() => {
    if (!showNextTasksComputed.value) return [];
    const successors = props.task.children || [];
    if (!Array.isArray(successors) || !successors.length) return [];
    return successors
      .map((id) => (tasks.value || []).find((taskItem) => taskItem.id === id))
      .filter((taskItem): taskItem is Task => Boolean(taskItem && taskItem.name))
      .map((taskItem) => ({
        id: taskItem.id,
        name: taskItem.name ?? '',
        wikiLink: taskItem.wikiLink,
      }));
  });

  const previousTasks = computed(() => {
    if (!showPreviousTasksComputed.value) return [];

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
      .map((id) => (tasks.value || []).find((taskItem) => taskItem.id === id))
      .filter((taskItem): taskItem is Task => Boolean(taskItem && taskItem.name))
      .map((taskItem) => ({
        id: taskItem.id,
        name: taskItem.name ?? '',
        wikiLink: taskItem.wikiLink,
      }));
  });
</script>
