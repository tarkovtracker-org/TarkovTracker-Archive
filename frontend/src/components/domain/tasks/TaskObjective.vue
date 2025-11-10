<template>
  <span>
    <div
      class="d-flex align-center pa-1 rounded clickable"
      :class="{ 'objective-complete': isComplete }"
      @click="toggleObjectiveCompletion()"
      @mouseenter="objectiveMouseEnter()"
      @mouseleave="objectiveMouseLeave()"
    >
      <v-icon size="x-small" class="mr-1">{{ objectiveIcon }}</v-icon
      >{{ props.objective?.description }}
    </div>
    <task-objective-kill-tracker
      v-if="showKillTracker"
      :count="killCount"
      :required-count="killRequiredCount"
      style="font-size: smaller; margin-top: 1px; margin-bottom: 1px"
      @increment="incrementKillCount"
      @decrement="decrementKillCount"
      @reset="resetKillCount"
    />
    <v-row
      v-if="
        fullObjective &&
        ((systemStore.userTeam && userNeeds.length > 0) ||
          itemObjectiveTypes.includes(fullObjective?.type ?? ''))
      "
      align="center"
      class="pa-0 ml-0"
      style="font-size: smaller; margin-top: 1px; margin-bottom: 1px"
    >
      <v-col
        v-if="fullObjective && itemObjectiveTypes.includes(fullObjective?.type ?? '') && relatedItem"
        cols="auto"
        class="pa-0 d-flex align-center"
      >
        <v-sheet
          class="rounded-lg pr-0 d-flex align-start mb-2"
          color="accent"
          style="width: fit-content"
        >
          <tarkov-item
            :item-id="relatedItem.id"
            :item-name="relatedItem.shortName ?? null"
            :dev-link="relatedItem.link ?? null"
            :wiki-link="relatedItem.wikiLink ?? null"
            :count="fullObjective.count ?? 1"
            class="mr-2"
          />
        </v-sheet>
      </v-col>
      <v-col v-if="systemStore.userTeam && userNeeds.length > 0" cols="auto" class="pa-0">
        <span v-for="(user, userIndex) in userNeeds" :key="userIndex">
          <v-icon size="x-small" class="ml-1">mdi-account-child-circle</v-icon
          >{{ progressStore.getDisplayName(user) }}
        </span>
      </v-col>
      <v-col v-if="objective.type === 'mark'" cols="auto">
        <!-- Mark specific content -->
      </v-col>
      <v-col v-if="objective.type === 'zone'" cols="auto">
        <!-- Zone specific content -->
      </v-col>
    </v-row>
  </span>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { useProgressQueries } from '@/composables/useProgressQueries';
  import { useLiveData } from '@/composables/livedata';
  import TaskObjectiveKillTracker from './TaskObjectiveKillTracker.vue';
  import TarkovItem from '@/features/game/TarkovItem.vue';
  import type { TaskObjective as TaskObjectiveModel, TarkovItem as TarkovItemModel } from '@/types/models/tarkov';

  const { useSystemStore } = useLiveData();
  const { systemStore } = useSystemStore();

  // Define the props for the component
  const props = defineProps<{
    objective: TaskObjectiveModel;
  }>();

  const { objectives } = useTarkovData();
  const tarkovStore = useTarkovStore();
  const { progressStore, unlockedTasks, objectiveCompletions } = useProgressQueries();

  const isComplete = computed(() => {
    return tarkovStore.isTaskObjectiveComplete(props.objective.id);
  });

  const fullObjective = computed<TaskObjectiveModel | undefined>(() => {
    return objectives.value.find((o) => o.id === props.objective.id);
  });

  // Kill tracker functionality
  const killRequiredCount = computed(() => {
    const required = fullObjective.value?.count;
    return required && required > 0 ? required : 0;
  });

  const showKillTracker = computed(() => {
    const objective = fullObjective.value;
    if (!objective) {
      return false;
    }
    return (
      objective.type === 'shoot' && objective.shotType === 'kill' && killRequiredCount.value > 0
    );
  });

  const rawKillCount = computed(() =>
    showKillTracker.value ? tarkovStore.getObjectiveCount(props.objective.id) : 0
  );

  const killCount = computed(() =>
    showKillTracker.value ? Math.min(rawKillCount.value, killRequiredCount.value) : 0
  );

  const setKillCount = (count: number) => {
    if (!showKillTracker.value) return;
    const normalized = Math.max(0, Math.min(count, killRequiredCount.value));
    if (normalized !== rawKillCount.value) {
      tarkovStore.setObjectiveCount(props.objective.id, normalized);
    }
  };

  const incrementKillCount = () => setKillCount(rawKillCount.value + 1);
  const decrementKillCount = () => setKillCount(rawKillCount.value - 1);
  const resetKillCount = () => setKillCount(0);

  const itemObjectiveTypes = ['giveItem', 'mark', 'buildWeapon', 'plantItem'];

  const relatedItem = computed<TarkovItemModel | null>(() => {
    const objective = fullObjective.value;
    if (!objective) {
      return null;
    }
    switch (objective.type) {
      case 'giveItem':
        return objective.item ?? null;
      case 'mark':
        return objective.markerItem ?? null;
      case 'buildWeapon': {
        // Prefer the defaultPreset (full build) if available
        const item = objective.item;
        if (item?.properties?.defaultPreset) {
          return item.properties.defaultPreset;
        }
        return item ?? null;
      }
      case 'plantItem':
        return objective.item ?? null;
      default:
        return null;
    }
  });

  const userNeeds = computed(() => {
    const needingUsers: string[] = [];
    const currentObjective = fullObjective.value;
    if (!currentObjective?.taskId) {
      return needingUsers;
    }
    const unlockedTasksForObjective = unlockedTasks.value?.[currentObjective.taskId] || {};
    Object.entries(unlockedTasksForObjective).forEach(([teamId, unlocked]) => {
      if (unlocked && objectiveCompletions.value?.[props.objective.id]?.[teamId] === false) {
        needingUsers.push(teamId);
      }
    });
    return needingUsers;
  });

  const isHovered = ref(false);
  const objectiveMouseEnter = () => {
    isHovered.value = true;
  };
  const objectiveMouseLeave = () => {
    isHovered.value = false;
  };

  const objectiveIcon = computed(() => {
    if (isHovered.value) {
      if (isComplete.value) {
        return 'mdi-close-circle';
      } else {
        return 'mdi-check-circle';
      }
    }
    const iconMap: Record<string, string> = {
      key: 'mdi-key',
      shoot: 'mdi-target-account',
      giveItem: 'mdi-close-circle-outline',
      findItem: 'mdi-checkbox-marked-circle-outline',
      findQuestItem: 'mdi-alert-circle-outline',
      giveQuestItem: 'mdi-alert-circle-check-outline',
      plantQuestItem: 'mdi-arrow-down-thin-circle-outline',
      plantItem: 'mdi-arrow-down-thin-circle-outline',
      taskStatus: 'mdi-account-child-circle',
      extract: 'mdi-heart-circle-outline',
      mark: 'mdi-remote',
      place: 'mdi-arrow-down-drop-circle-outline',
      traderLevel: 'mdi-thumb-up',
      traderStanding: 'mdi-thumb-up',
      skill: 'mdi-dumbbell',
      visit: 'mdi-crosshairs-gps',
      buildWeapon: 'mdi-progress-wrench',
      playerLevel: 'mdi-crown-circle-outline',
      experience: 'mdi-eye-circle-outline',
      warning: 'mdi-alert-circle',
    };
    const objectiveType = props.objective.type ?? '';
    return iconMap[objectiveType] || 'mdi-help-circle';
  });

  const toggleObjectiveCompletion = () => {
    if (showKillTracker.value) {
      // For kill tracker objectives, toggle between complete/incomplete
      if (isComplete.value) {
        tarkovStore.setTaskObjectiveUncomplete(props.objective.id);
      } else {
        setKillCount(killRequiredCount.value);
        tarkovStore.setTaskObjectiveComplete(props.objective.id);
      }
      return;
    }
    tarkovStore.toggleTaskObjectiveComplete(props.objective.id);
  };

  // Watch for kill count changes to auto-complete/uncomplete objectives
  watch(
    () => rawKillCount.value,
    (newValue) => {
      if (!showKillTracker.value || killRequiredCount.value <= 0) return;
      if (newValue >= killRequiredCount.value && !isComplete.value) {
        tarkovStore.setTaskObjectiveComplete(props.objective.id);
      } else if (newValue < killRequiredCount.value && isComplete.value) {
        tarkovStore.setTaskObjectiveUncomplete(props.objective.id);
      }
    }
  );

  // Watch for completion status changes to sync kill count
  watch(
    () => isComplete.value,
    (complete) => {
      if (!showKillTracker.value || killRequiredCount.value <= 0) return;
      if (complete && rawKillCount.value < killRequiredCount.value) {
        setKillCount(killRequiredCount.value);
      } else if (!complete && rawKillCount.value >= killRequiredCount.value) {
        setKillCount(Math.max(0, killRequiredCount.value - 1));
      }
    }
  );
</script>
<style lang="scss" scoped>
  .objective-complete {
    //background: rgb(var(--v-theme-complete));
    background: linear-gradient(
      175deg,
      rgba(var(--v-theme-complete), 1) 0%,
      rgba(var(--v-theme-complete), 0) 75%
    );
  }
  .clickable {
    cursor: pointer;
  }
</style>
