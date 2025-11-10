<template>
  <div>
    <v-row>
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="mb-4 pa-1">
          <v-card-title class="text-subtitle-1 px-4 py-2">PMC Information</v-card-title>
          <v-list density="compact" class="px-2">
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-account" class="mr-3"></v-icon>
              </template>
              <v-list-item-title>Level: {{ data?.level || 'N/A' }}</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-shield" class="mr-3"></v-icon>
              </template>
              <v-list-item-title>Faction: {{ data?.pmcFaction || 'N/A' }}</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-package-variant" class="mr-3"></v-icon>
              </template>
              <v-list-item-title style="white-space: normal; overflow: visible">
                Edition: {{ editionName }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card variant="outlined" class="mb-4 pa-1">
          <v-card-title class="text-subtitle-1 px-4 py-2">Task Progress</v-card-title>
          <v-list density="compact" class="px-2">
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-check-circle" class="mr-3"></v-icon>
              </template>
              <v-list-item-title class="d-flex align-center">
                Completed Tasks: {{ completedTasks }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-format-list-checks" class="mr-3"></v-icon>
              </template>
              <v-list-item-title class="d-flex align-center">
                Task Objectives: {{ taskObjectives }}
                <v-btn
                  size="small"
                  icon
                  variant="text"
                  class="ml-2"
                  @click="$emit('show-objectives-details')"
                >
                  <v-icon>mdi-information-outline</v-icon>
                </v-btn>
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-if="failedTasks > 0">
              <template #prepend>
                <v-icon icon="mdi-close-circle" class="mr-3"></v-icon>
              </template>
              <v-list-item-title class="d-flex align-center">
                Failed Tasks: {{ failedTasks }}
                <v-btn
                  size="small"
                  icon
                  variant="text"
                  class="ml-2"
                  @click="$emit('show-failed-tasks-details')"
                >
                  <v-icon>mdi-information-outline</v-icon>
                </v-btn>
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-card variant="outlined" class="pa-1">
          <v-card-title class="text-subtitle-1 px-4 py-2">Hideout Progress</v-card-title>
          <v-list density="compact" class="px-2">
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-home" class="mr-3"></v-icon>
              </template>
              <v-list-item-title>Completed Modules: {{ hideoutModules }}</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon icon="mdi-tools" class="mr-3"></v-icon>
              </template>
              <v-list-item-title>Tracked Materials: {{ hideoutParts }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
<script setup>
  import { computed } from 'vue';
  import { getEditionName } from '@/utils/gameEditions';
  const props = defineProps({
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
  });
  defineEmits(['show-objectives-details', 'show-failed-tasks-details']);
  const editionName = computed(() => getEditionName(props.data?.gameEdition));
</script>
