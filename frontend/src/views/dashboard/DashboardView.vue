<template>
  <v-container class="mt-2 d-flex flex-column" style="min-height: calc(100vh - 250px)">
    <v-alert
      v-model="showProjectStatusAlert"
      density="compact"
      color="green-darken-4"
      title="Project Status"
      class="mb-3 project-status-alert"
      style="flex: 0 0 auto"
      closable
    >
      <div class="text-body-2">
        <div class="mb-1">
          Community-maintained fork of TarkovTracker.io with automatic data updates from
          <a href="http://tarkov.dev/" target="_blank" class="text-green-lighten-2">tarkov.dev</a>
        </div>
        <div class="d-flex flex-wrap gap-1 align-center" style="font-size: 0.875rem">
          <div class="d-flex align-center">
            <v-icon icon="mdi-source-branch" size="x-small" class="mr-1"></v-icon>
            <a :href="commitUrl" target="_blank" class="text-green-lighten-2">
              {{ commitId.slice(0, 7) }}
            </a>
          </div>
          <div class="d-flex align-center ml-3">
            <v-icon icon="mdi-clock-outline" size="x-small" class="mr-1"></v-icon>
            <span class="text-caption">{{ lastUpdated }}</span>
          </div>
          <div class="d-flex align-center ml-3">
            <v-icon icon="mdi-github" size="x-small" class="mr-1"></v-icon>
            <a
              href="https://github.com/tarkovtracker-org/TarkovTracker"
              target="_blank"
              class="text-green-lighten-2"
            >
              Contribute
            </a>
          </div>
        </div>
      </div>
    </v-alert>
    <v-row v-if="!statsReady" justify="center" class="stats-row">
      <!-- Skeleton loaders for instant render without blocking computations -->
      <v-col
        v-for="i in 4"
        :key="`skeleton-${i}`"
        cols="12"
        sm="6"
        md="6"
        lg="3"
        xl="3"
        class="stats-col"
      >
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>
    <v-row v-else justify="center" class="stats-row">
      <v-col cols="12" sm="6" md="6" lg="3" xl="3" class="stats-col">
        <tracker-stat icon="mdi-progress-check">
          <template #stat>
            {{ t('page.dashboard.stats.allTasks.stat') }}
          </template>
          <template #value> {{ completedTasks }}/{{ totalTasks }} </template>
          <template #percentage>
            {{ totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : '0.0' }}%
          </template>
          <template #details>
            {{ t('page.dashboard.stats.allTasks.details') }}
          </template>
        </tracker-stat>
      </v-col>
      <v-col cols="12" sm="6" md="6" lg="3" xl="3" class="stats-col">
        <tracker-stat icon="mdi-briefcase-search">
          <template #stat>
            {{ t('page.dashboard.stats.allObjectives.stat') }}
          </template>
          <template #value> {{ completedObjectives }}/{{ totalObjectives }} </template>
          <template #percentage>
            {{
              totalObjectives > 0
                ? ((completedObjectives / totalObjectives) * 100).toFixed(1)
                : '0.0'
            }}%
          </template>
          <template #details>
            {{ t('page.dashboard.stats.allObjectives.details') }}
          </template>
        </tracker-stat>
      </v-col>
      <v-col cols="12" sm="6" md="6" lg="3" xl="3" class="stats-col">
        <tracker-stat icon="mdi-briefcase-search">
          <template #stat>
            {{ t('page.dashboard.stats.taskItems.stat') }}
          </template>
          <template #value> {{ completedTaskItems }}/{{ totalTaskItems }} </template>
          <template #percentage>
            {{
              totalTaskItems > 0 ? ((completedTaskItems / totalTaskItems) * 100).toFixed(1) : '0.0'
            }}%
          </template>
          <template #details>
            {{ t('page.dashboard.stats.taskItems.details') }}
          </template>
        </tracker-stat>
      </v-col>
      <v-col cols="12" sm="6" md="6" lg="3" xl="3" class="stats-col">
        <tracker-stat icon="mdi-trophy">
          <template #stat>
            {{ t('page.dashboard.stats.kappaTasks.stat') }}
          </template>
          <template #value> {{ completedKappaTasks }}/{{ totalKappaTasks }} </template>
          <template #percentage>
            {{
              totalKappaTasks > 0
                ? ((completedKappaTasks / totalKappaTasks) * 100).toFixed(1)
                : '0.0'
            }}%
          </template>
          <template #details>
            {{ t('page.dashboard.stats.kappaTasks.details') }}
          </template>
        </tracker-stat>
      </v-col>
    </v-row>
  </v-container>
</template>
<script setup>
  import { useTarkovData } from '@/composables/tarkovdata';
  import { useProgressQueries } from '@/composables/useProgressQueries';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useUserStore } from '@/stores/user';
  import { computed, onMounted, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import TrackerStat from '@/components/domain/tasks/TrackerStat.vue';
  const { t } = useI18n({ useScope: 'global' });
  // Defer heavy computations until after initial render for better LCP
  const statsReady = ref(false);
  onMounted(() => {
    // Use requestIdleCallback to defer calculations until browser is idle
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => {
          statsReady.value = true;
        },
        { timeout: 200 }
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        statsReady.value = true;
      }, 200);
    }
  });
  const { tasks, objectives } = useTarkovData();
  const { tasksCompletions, objectiveCompletions } = useProgressQueries();
  const tarkovStore = useTarkovStore();
  const userStore = useUserStore();


  const showProjectStatusAlert = computed({
    get: () => userStore.showTip('dashboard-project-status'),
    set: (value) => {
      if (!value) {
        userStore.hideTip('dashboard-project-status');
      }
    },
  });
  const neededItemTaskObjectives = computed(() => {
    if (!objectives?.value) {
      return [];
    }
    // Filter objectives to include only those that involve items relevant for counting
    const itemObjectiveTypes = [
      'giveItem',
      'findItem',
      'findQuestItem',
      'giveQuestItem',
      'plantQuestItem',
      'plantItem',
      'buildWeapon',
    ];
    return objectives.value.filter((obj) => obj && itemObjectiveTypes.includes(obj.type));
  });
  const totalTasks = computed(() => {
    if (!tasks.value) {
      return 0;
    }

    const relevantTasks = tasks.value.filter(
      (task) =>
        task && (task.factionName === 'Any' || task.factionName === tarkovStore.getPMCFaction())
    );

    // Find all tasks with alternatives and subtract n-1 from the total
    // This accounts for the fact that alternatives are mutually exclusive
    const alternativeTaskIds = new Set();
    let alternativeCount = 0;

    relevantTasks.forEach((task) => {
      if (task.alternatives && task.alternatives.length > 0) {
        // Only count this task's alternatives if we haven't already counted it as an alternative
        if (!alternativeTaskIds.has(task.id)) {
          alternativeCount += task.alternatives.length;
          // Mark all alternatives so we don't double-count
          task.alternatives.forEach((altId) => alternativeTaskIds.add(altId));
        }
      }
    });

    return relevantTasks.length - alternativeCount;
  });
  const totalObjectives = computed(() => {
    if (!tasks.value) {
      return 0;
    }
    let total = 0;
    tasks.value
      .filter(
        (task) =>
          // Ensure task exists before filtering
          task && (task.factionName === 'Any' || task.factionName === tarkovStore.getPMCFaction())
      )
      .forEach((task) => {
        // Check if task and task.objectives exist before accessing length
        if (task?.objectives) {
          total += task.objectives.length;
        }
      });
    return total;
  });
  const completedObjectives = computed(() => {
    if (!objectives?.value || !tarkovStore) {
      return 0;
    }
    return objectives.value.filter(
      (objective) =>
        // Ensure objective and its id exist before checking completion
        objective && objective.id && tarkovStore.isTaskObjectiveComplete(objective.id)
    ).length;
  });
  const completedTasks = computed(() => {
    if (!tasksCompletions.value) {
      return 0;
    }
    return Object.values(tasksCompletions.value).filter(
      (task) => task?.self === true // Ensure task exists before checking self property
    ).length;
  });
  const completedTaskItems = computed(() => {
    if (
      !neededItemTaskObjectives.value ||
      !tasks.value ||
      !tasksCompletions.value ||
      !objectiveCompletions.value ||
      !tarkovStore
    ) {
      return 0;
    }
    let total = 0;
    neededItemTaskObjectives.value.forEach((objective) => {
      // Iterate over neededItemTaskObjectives
      // Ensure objective exists before proceeding
      if (!objective) return;
      // Check for items (new) or item (legacy) and their IDs
      const objectiveItems = objective.items || (objective.item ? [objective.item] : []);
      if (
        objectiveItems.length > 0 &&
        objectiveItems.some((item) =>
          [
            '5696686a4bdc2da3298b456a',
            '5449016a4bdc2d6f028b456f',
            '569668774bdc2da2298b4568',
          ].includes(item.id)
        )
      ) {
        return;
      }
      const relatedTask = tasks.value.find(
        (task) => task && objective.taskId && task.id === objective.taskId
      );
      const currentPMCFaction = tarkovStore.getPMCFaction();
      if (
        !relatedTask?.factionName ||
        currentPMCFaction === undefined ||
        (relatedTask.factionName !== 'Any' && relatedTask.factionName !== currentPMCFaction)
      ) {
        return;
      }
      if (!objective.id || !objective.taskId) return;
      const taskCompletion = tasksCompletions.value?.[objective.taskId];
      const objectiveCompletion = objectiveCompletions.value?.[objective.id];
      if (
        (taskCompletion && taskCompletion.self) ||
        (objectiveCompletion && objectiveCompletion.self) ||
        (objective.count &&
          objective.id &&
          objective.count <= tarkovStore.getObjectiveCount(objective.id))
      ) {
        total += objective.count || 1;
      } else {
        if (objective.id) {
          total += tarkovStore.getObjectiveCount(objective.id);
        }
      }
    });
    return total;
  });
  const totalTaskItems = computed(() => {
    if (!objectives?.value || !tasks.value || !tarkovStore) {
      return 0;
    }
    let total = 0;
    neededItemTaskObjectives.value.forEach((objective) => {
      // Iterate over neededItemTaskObjectives
      // Ensure objective exists before proceeding
      if (!objective) return;
      // Check for items (new) or item (legacy) and their IDs
      const objectiveItems = objective.items || (objective.item ? [objective.item] : []);
      if (
        objectiveItems.length > 0 &&
        objectiveItems.some((item) =>
          [
            '5696686a4bdc2da3298b456a',
            '5449016a4bdc2d6f028b456f',
            '569668774bdc2da2298b4568',
          ].includes(item.id)
        )
      ) {
        return;
      }
      const relatedTask = tasks.value.find(
        (task) => task && objective.taskId && task.id === objective.taskId
      );
      const currentPMCFaction = tarkovStore.getPMCFaction();
      if (
        !relatedTask?.factionName ||
        currentPMCFaction === undefined ||
        (relatedTask.factionName !== 'Any' && relatedTask.factionName !== currentPMCFaction)
      ) {
        return;
      }
      if (objective.count) {
        total += objective.count;
      } else {
        total += 1;
      }
    });
    return total;
  });
  const totalKappaTasks = computed(() => {
    if (!tasks.value) {
      return 0;
    }
    return tasks.value.filter(
      (task) =>
        task?.kappaRequired === true &&
        (task.factionName === 'Any' || task.factionName === tarkovStore.getPMCFaction())
    ).length;
  });
  const completedKappaTasks = computed(() => {
    if (!tasks.value || !tasksCompletions.value) {
      return 0;
    }
    return tasks.value.filter(
      (task) =>
        task?.kappaRequired === true &&
        (task.factionName === 'Any' || task.factionName === tarkovStore.getPMCFaction()) &&
        tasksCompletions.value?.[task.id]?.self === true
    ).length;
  });
  const commitId = computed(() => {
    return import.meta.env.VITE_COMMIT_HASH || 'unknown';
  });
  const commitUrl = computed(() => {
    return `https://github.com/tarkovtracker-org/TarkovTracker/commit/${commitId.value}`;
  });
  const lastUpdated = computed(() => {
    const buildTime = import.meta.env.VITE_BUILD_TIME;
    if (!buildTime) return 'Unknown';
    const date = new Date(buildTime);
    return date.toLocaleString();
  });
</script>
<style lang="scss" scoped>
  .stats-row {
    margin: 0 -8px; // Offset the column padding
  }
  .stats-col {
    padding: 8px;
    // Remove the flex and height constraints that are making cards too tall
    :deep(.v-sheet) {
      height: auto;
      min-height: auto;
    }
  }
  // Better responsive behavior
  @media (max-width: 600px) {
    .stats-col {
      padding: 4px;
      margin-bottom: 8px;
    }
  }
  @media (min-width: 600px) and (max-width: 960px) {
    .stats-col {
      &:nth-child(odd) {
        padding-right: 4px;
      }
      &:nth-child(even) {
        padding-left: 4px;
      }
    }
  }
  @media (min-width: 1280px) {
    .stats-row {
      max-width: 1200px;
      margin: 0 auto;
    }
  }
  .project-status-alert {
    :deep(.v-alert__content) {
      padding: 8px 0;
    }
    :deep(.v-alert-title) {
      font-size: 1rem;
      margin-bottom: 4px;
    }
  }
  // Make it even more compact on mobile
  @media (max-width: 600px) {
    .project-status-alert {
      :deep(.v-alert__content) {
        padding: 6px 0;
      }
      .text-body-2 {
        font-size: 0.8rem;
      }
      .d-flex {
        font-size: 0.75rem !important;
      }
    }
  }
</style>
