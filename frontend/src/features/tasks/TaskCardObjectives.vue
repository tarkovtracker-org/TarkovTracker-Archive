<template>
  <div class="task-objectives">
    <QuestKeys v-if="task?.neededKeys?.length" :needed-keys="task.neededKeys" />
    <QuestObjectives
      :objectives="relevantObjectives"
      :irrelevant-count="irrelevantObjectives.length"
      :uncompleted-irrelevant="uncompletedIrrelevantObjectives.length"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue';
  import { useUserStore } from '@/stores/user';
  import { useTarkovStore } from '@/stores/tarkov';
  import { MAP_OBJECTIVE_TYPES } from '@/config/gameConstants';
  import type { Task, TaskObjective } from '@/types/tarkov';

  const QuestKeys = defineAsyncComponent(() => import('./QuestKeys.vue'));
  const QuestObjectives = defineAsyncComponent(() => import('./QuestObjectives.vue'));

  const props = defineProps<{
    task: Task;
  }>();

  const userStore = useUserStore();
  const tarkovStore = useTarkovStore();

  const mapObjectiveTypes = MAP_OBJECTIVE_TYPES;
  const onMapView = computed(() => userStore.getTaskPrimaryView === 'maps');

  const relevantObjectives = computed(() => {
    if (!onMapView.value) return props.task.objectives || [];

    return (props.task.objectives || []).filter((objective) => {
      if (!Array.isArray(objective?.maps) || objective.maps.length === 0) return true;
      return (
        objective.maps.some((map) => map.id === userStore.getTaskMapView) &&
        isMapObjectiveType(objective)
      );
    });
  });

  const irrelevantObjectives = computed(() => {
    if (!onMapView.value) return [];

    return (props.task.objectives || []).filter((objective) => {
      if (!Array.isArray(objective?.maps) || objective.maps.length === 0) return false;
      const onSelectedMap = objective.maps.some((map) => map.id === userStore.getTaskMapView);
      return !(onSelectedMap && isMapObjectiveType(objective));
    });
  });

  const uncompletedIrrelevantObjectives = computed(() =>
    (props.task.objectives || [])
      .filter((objective) => !objectiveIsOnSelectedMap(objective) || !isMapObjectiveType(objective))
      .filter((objective) => !tarkovStore.isTaskObjectiveComplete(objective.id))
  );

  const objectiveIsOnSelectedMap = (objective: TaskObjective) =>
    objective?.maps?.some((map) => map.id === userStore.getTaskMapView) ?? false;

  const isMapObjectiveType = (objective: TaskObjective) =>
    mapObjectiveTypes.includes((objective.type as typeof mapObjectiveTypes[number]) ?? '');
</script>

<style scoped>
  .task-objectives {
    width: 100%;
  }
</style>
