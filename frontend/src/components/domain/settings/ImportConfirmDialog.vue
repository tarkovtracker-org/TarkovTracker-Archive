<template>
  <v-dialog
    :model-value="props.show"
    max-width="700"
    @update:model-value="$emit('update:show', $event)"
  >
    <v-card>
      <v-card-title class="text-h5 px-4 py-3">Confirm Data Import</v-card-title>
      <v-card-text class="px-4 pb-4">
        <p class="mb-3">This will import your progress data into your PvP profile:</p>
        <!-- Game Mode Selection - Fixed to PvP Only -->
        <v-card variant="flat" class="mb-4 pa-3" color="surface-variant">
          <div class="d-flex align-center">
            <v-icon icon="mdi-sword-cross" class="mr-2" size="small" />
            <span class="font-weight-medium">Target Game Mode: PvP</span>
          </div>
          <v-alert type="info" variant="tonal" density="compact" class="mt-3 mb-0">
            Data will be imported to your PvP (standard multiplayer) progress
          </v-alert>
        </v-card>
        <p class="mb-4">Data to be imported:</p>
        <DataPreviewCard
          :data="data"
          :completed-tasks="completedTasks"
          :failed-tasks="failedTasks"
          :task-objectives="taskObjectives"
          :hideout-modules="hideoutModules"
          :hideout-parts="hideoutParts"
          @show-objectives-details="$emit('show-objectives-details')"
          @show-failed-tasks-details="$emit('show-failed-tasks-details')"
        />
        <p class="mt-5 text-red font-weight-bold">Warning: This action cannot be undone!</p>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="flat" class="px-4" @click="$emit('cancel')"> Cancel </v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="importing"
          class="ml-3 px-4"
          @click="$emit('confirm')"
        >
          Confirm Import
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
  import DataPreviewCard from './DataPreviewCard.vue';
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Object,
      default: null,
    },
    completedTasks: {
      type: Number,
      default: 0,
    },
    failedTasks: {
      type: Number,
      default: 0,
    },
    taskObjectives: {
      type: Number,
      default: 0,
    },
    hideoutModules: {
      type: Number,
      default: 0,
    },
    hideoutParts: {
      type: Number,
      default: 0,
    },
    importing: {
      type: Boolean,
      default: false,
    },
  });
  defineEmits([
    'cancel',
    'confirm',
    'show-objectives-details',
    'show-failed-tasks-details',
    'update:show',
  ]);
</script>
