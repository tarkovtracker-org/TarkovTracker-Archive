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
    <div
      v-if="showKillTracker"
      class="kill-tracker"
      style="font-size: smaller; margin-top: 1px; margin-bottom: 1px"
      @click.stop
    >
      <span class="kill-tracker__label">Kills</span>
      <button
        type="button"
        class="kill-tracker__control kill-tracker__control--adjust"
        :disabled="killCount === 0"
        aria-label="Decrease objective progress"
        @click.stop="decrementKillCount"
      >
        <span class="kill-tracker__control-symbol">−</span>
      </button>
      <div
        class="kill-tracker__counter"
        :class="{ 'kill-tracker__counter--complete': killCount >= killRequiredCount }"
      >
        <span class="kill-tracker__count">{{ killCount }}</span>
        <span class="kill-tracker__separator">/</span>
        <span class="kill-tracker__required">{{ killRequiredCount }}</span>
      </div>
      <button
        type="button"
        class="kill-tracker__control kill-tracker__control--adjust"
        :disabled="killCount >= killRequiredCount"
        aria-label="Increase objective progress"
        @click.stop="incrementKillCount"
      >
        <span class="kill-tracker__control-symbol">+</span>
      </button>
      <button
        type="button"
        class="kill-tracker__control kill-tracker__control--reset"
        :disabled="killCount === 0"
        aria-label="Reset objective progress"
        @click.stop="resetKillCount"
      >
        <v-icon size="x-small">mdi-refresh</v-icon>
      </button>
    </div>
    <v-row
      v-if="
        fullObjective &&
        ((systemStore.userTeam && userNeeds.length > 0) ||
          itemObjectiveTypes.includes(fullObjective.type))
      "
      align="center"
      class="pa-0 ml-0"
      style="font-size: smaller; margin-top: 1px; margin-bottom: 1px"
    >
      <v-col
        v-if="fullObjective && itemObjectiveTypes.includes(fullObjective.type)"
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
            :item-name="relatedItem.shortName"
            :dev-link="relatedItem.link"
            :wiki-link="relatedItem.wikiLink"
            :count="fullObjective.count ?? 1"
            class="mr-2"
          />
        </v-sheet>
      </v-col>
      <v-col v-if="systemStore.userTeam && userNeeds.length > 0" cols="auto" class="pa-0">
        <span v-for="(user, userIndex) in userNeeds" :key="userIndex">
          <v-icon size="x-small" class="ml-1">mdi-account-child-circle</v-icon
          >{{ progressStore.teammemberNames[user] }}
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
<script setup>
  import { computed, ref, defineAsyncComponent, watch } from 'vue';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { useProgressStore } from '@/stores/progress';
  import { useLiveData } from '@/composables/livedata';
  const { useSystemStore } = useLiveData();
  const systemStore = useSystemStore();
  // Define the props for the component
  const props = defineProps({
    objective: {
      type: Object,
      required: true,
    },
  });
  const TarkovItem = defineAsyncComponent(() => import('@/features/game/TarkovItem'));
  const { objectives } = useTarkovData();
  const tarkovStore = useTarkovStore();
  const progressStore = useProgressStore();
  const isComplete = computed(() => tarkovStore.isTaskObjectiveComplete(props.objective.id));
  const fullObjective = computed(() => {
    return objectives.value.find((o) => o.id == props.objective.id);
  });
  const killRequiredCount = computed(() => {
    if (!fullObjective.value?.count || fullObjective.value.count <= 0) {
      return 0;
    }
    return fullObjective.value.count;
  });
  const showKillTracker = computed(() => {
    if (!fullObjective.value) return false;
    return (
      fullObjective.value.type === 'shoot' &&
      fullObjective.value.shotType === 'kill' &&
      killRequiredCount.value > 0
    );
  });
  const rawKillCount = computed(() => {
    if (!showKillTracker.value) return 0;
    return tarkovStore.getObjectiveCount(props.objective.id);
  });
  const killCount = computed(() => {
    if (!showKillTracker.value) return 0;
    return Math.min(rawKillCount.value, killRequiredCount.value);
  });
  const setKillCount = (count) => {
    if (!showKillTracker.value) return;
    const normalized = Math.max(0, Math.min(count, killRequiredCount.value));
    if (normalized === rawKillCount.value) return;
    tarkovStore.setObjectiveCount(props.objective.id, normalized);
  };
  const incrementKillCount = () => {
    if (!showKillTracker.value) return;
    setKillCount(rawKillCount.value + 1);
  };
  const decrementKillCount = () => {
    if (!showKillTracker.value) return;
    setKillCount(rawKillCount.value - 1);
  };
  const resetKillCount = () => {
    if (!showKillTracker.value) return;
    setKillCount(0);
  };
  const itemObjectiveTypes = ['giveItem', 'mark', 'buildWeapon', 'plantItem'];
  const relatedItem = computed(() => {
    if (!fullObjective.value) {
      return null;
    }
    switch (fullObjective.value.type) {
      case 'giveItem':
        return fullObjective.value.item;
      case 'mark':
        return fullObjective.value.markerItem;
      case 'buildWeapon': {
        // Prefer the defaultPreset (full build) if available
        const item = fullObjective.value.item;
        if (item?.properties?.defaultPreset) {
          return item.properties.defaultPreset;
        }
        return item;
      }
      case 'plantItem':
        return fullObjective.value.item;
      default:
        return null;
    }
  });
  const userNeeds = computed(() => {
    let needingUsers = [];
    if (fullObjective.value == undefined) {
      return needingUsers;
    }
    Object.entries(progressStore.unlockedTasks[fullObjective.value.taskId]).forEach(
      ([teamId, unlocked]) => {
        if (
          unlocked &&
          progressStore.objectiveCompletions?.[props.objective.id]?.[teamId] == false
        ) {
          needingUsers.push(teamId);
        }
      }
    );
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
    let iconMap = {
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
    return iconMap[props.objective.type] || 'mdi-help-circle';
  });
  const toggleObjectiveCompletion = () => {
    if (showKillTracker.value) {
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
  .kill-tracker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(var(--v-theme-warning), 0.6);
    background: linear-gradient(
      145deg,
      rgba(var(--v-theme-surface), 0.92),
      rgba(var(--v-theme-warning), 0.25)
    );
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  }
  .kill-tracker__label {
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.12em;
    font-size: 0.65rem;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(var(--v-theme-warning), 0.35);
    color: rgb(var(--v-theme-on-warning));
  }
  .kill-tracker__control {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    width: 28px;
    border-radius: 50%;
    border: 1px solid rgba(var(--v-theme-warning), 0.55);
    background: radial-gradient(circle at 30% 30%, rgba(var(--v-theme-warning), 0.35), rgba(var(--v-theme-warning), 0.15));
    color: rgb(var(--v-theme-on-surface));
    transition: all 0.15s ease;
    cursor: pointer;
    padding: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  }
  .kill-tracker__control--reset {
    border-color: rgba(var(--v-theme-error), 0.55);
    background: radial-gradient(circle at 30% 30%, rgba(var(--v-theme-error), 0.35), rgba(var(--v-theme-error), 0.15));
    color: rgb(var(--v-theme-on-surface));
  }
  .kill-tracker__control:focus-visible {
    outline: 2px solid rgba(var(--v-theme-warning), 0.75);
    outline-offset: 2px;
  }
  .kill-tracker__control:hover:not(:disabled) {
    background: rgba(var(--v-theme-warning), 0.55);
    color: rgb(var(--v-theme-on-warning));
    transform: translateY(-1px);
  }
  .kill-tracker__control--reset:hover:not(:disabled) {
    background: rgba(var(--v-theme-error), 0.55);
    color: rgb(var(--v-theme-on-error));
  }
  .kill-tracker__control:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    color: rgba(var(--v-theme-on-surface), 0.4);
  }
  .kill-tracker__control-symbol {
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: inherit;
    transform: translateY(-1px);
  }
  .kill-tracker__counter {
    min-width: 60px;
    text-align: center;
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.08em;
    background: rgba(var(--v-theme-warning), 0.35);
    color: rgb(var(--v-theme-on-warning));
    transition: background 0.15s ease, color 0.15s ease;
  }
  .kill-tracker__counter--complete {
    background: rgba(var(--v-theme-success), 0.35);
    color: rgb(var(--v-theme-on-success));
  }
  .kill-tracker__separator {
    margin: 0 4px;
    opacity: 0.6;
  }
  .kill-tracker__count,
  .kill-tracker__required {
    font-variant-numeric: tabular-nums;
  }
  .clickable {
    cursor: pointer;
  }
</style>
