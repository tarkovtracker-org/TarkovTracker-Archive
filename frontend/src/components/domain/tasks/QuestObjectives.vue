<template>
  <v-row no-gutters>
    <v-col
      v-for="(objective, objectiveIndex) in objectives"
      :key="objectiveIndex"
      cols="12"
      class="py-1"
    >
      <task-objective :objective="objective" />
    </v-col>
    <v-col v-if="irrelevantCount > 0" cols="12" class="pa-1 hidden-objectives">
      <v-icon size="x-small" class="mr-1">mdi-eye-off</v-icon>
      <i18n-t
        keypath="page.tasks.questcard.objectiveshidden"
        :plural="irrelevantCount"
        scope="global"
      >
        <template #count>{{ irrelevantCount }}</template>
        <template #uncompleted>{{ uncompletedIrrelevant }}</template>
      </i18n-t>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue';
  import type { TaskObjective as TaskObjectiveModel } from '@/types/models/tarkov';

  const TaskObjective = defineAsyncComponent(() => import('./TaskObjective.vue'));

  defineProps<{
    objectives: TaskObjectiveModel[];
    irrelevantCount: number;
    uncompletedIrrelevant: number;
  }>();
</script>

<style lang="scss" scoped>
  .hidden-objectives {
    opacity: 0.5;
  }
</style>
