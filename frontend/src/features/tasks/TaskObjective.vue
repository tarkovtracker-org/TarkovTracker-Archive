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
        ((systemStore.userTeam && userNeeds.length > 0) || isItemObjective)
      "
      align="center"
      class="pa-0 ml-0"
      style="font-size: smaller; margin-top: 1px; margin-bottom: 1px"
    >
      <v-col v-if="fullObjective && isItemObjective && relatedItem" cols="auto" class="pa-0 d-flex align-center">
        <v-sheet
          class="rounded-lg pr-0 d-flex align-start mb-2"
          color="accent"
          style="width: fit-content"
        >
          <TarkovItemCard
            :item-id="relatedItem?.id ?? null"
            :item-name="relatedItem?.shortName ?? null"
            :dev-link="relatedItem?.link ?? null"
            :wiki-link="relatedItem?.wikiLink ?? null"
            :count="fullObjective.count ?? 1"
            class="mr-2"
          />
        </v-sheet>
      </v-col>
      <v-col v-if="shouldShowTeamNeeds" cols="auto" class="pa-0">
        <task-objective-team-needs
          :user-ids="userNeeds"
          :teammate-names="teammateDisplayNames"
        />
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
import { computed, ref, defineAsyncComponent, watch } from 'vue';
import { useTarkovStore } from '@/stores/tarkov';
import { useTarkovData } from '@/composables/tarkovdata';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { useLiveData } from '@/composables/livedata';
import type { TaskObjective as TaskObjectiveType, TarkovItem } from '@/types/tarkov';
import TaskObjectiveKillTracker from './TaskObjectiveKillTracker.vue';
import TaskObjectiveTeamNeeds from './TaskObjectiveTeamNeeds.vue';

const ITEM_OBJECTIVE_TYPES = new Set(['giveItem', 'mark', 'buildWeapon', 'plantItem']);

const { useSystemStore } = useLiveData();
const { systemStore } = useSystemStore();

const props = defineProps<{
  objective: TaskObjectiveType;
}>();

const TarkovItemCard = defineAsyncComponent(() => import('@/features/game/TarkovItem.vue'));
const { objectives } = useTarkovData();
const tarkovStore = useTarkovStore();
const { getUnlockedMap, isObjectiveIncompleteFor, getDisplayName } = useProgressQueries();

const isComplete = computed(() => tarkovStore.isTaskObjectiveComplete(props.objective.id));

const fullObjective = computed(() =>
  objectives.value.find((o) => o.id === props.objective.id)
);

const killRequiredCount = computed(() => {
  const required = fullObjective.value?.count;
  return required && required > 0 ? required : 0;
});

const showKillTracker = computed(() => {
  const objective = fullObjective.value as (TaskObjectiveType & { shotType?: string }) | null;
  if (!objective) {
    return false;
  }
  return (
    objective.type === 'shoot' &&
    objective.shotType === 'kill' &&
    killRequiredCount.value > 0
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

const extractPrimaryObjectiveItem = (objective: TaskObjectiveType | null): TarkovItem | null => {
  if (!objective) {
    return null;
  }
  if (Array.isArray(objective.items) && objective.items.length > 0) {
    return objective.items[0];
  }
  return objective.item ?? null;
};

const resolveBuildWeaponItem = (item: TarkovItem | null): TarkovItem | null => {
  if (!item) {
    return null;
  }
  const defaultPreset =
    (item as unknown as { properties?: { defaultPreset?: TarkovItem } })?.properties
      ?.defaultPreset;
  return defaultPreset ?? item;
};

const pickRelatedItem = (objective: TaskObjectiveType | null): TarkovItem | null => {
  if (!objective) {
    return null;
  }
  const primaryItem = extractPrimaryObjectiveItem(objective);
  switch (objective.type) {
    case 'giveItem':
    case 'plantItem':
      return primaryItem;
    case 'mark':
      return objective.markerItem ?? primaryItem;
    case 'buildWeapon':
      return resolveBuildWeaponItem(primaryItem);
    default:
      return null;
  }
};

const relatedItem = computed<TarkovItem | null>(() => pickRelatedItem(fullObjective.value ?? null));

const userNeeds = computed<string[]>(() => {
  const needingUsers: string[] = [];
  const objective = fullObjective.value;
  if (!objective?.taskId) {
    return needingUsers;
  }

  const unlockedEntries = Object.entries(getUnlockedMap(objective.taskId));
  for (const [teamId, unlocked] of unlockedEntries) {
    if (unlocked && isObjectiveIncompleteFor(props.objective.id, teamId)) {
      needingUsers.push(teamId);
    }
  }
  return needingUsers;
});

const shouldShowTeamNeeds = computed(
  () => Boolean(systemStore.userTeam) && userNeeds.value.length > 0
);

const isItemObjective = computed(
  () => Boolean(fullObjective.value?.type && ITEM_OBJECTIVE_TYPES.has(fullObjective.value.type))
);

const teammateDisplayNames = computed<Record<string, string>>(() =>
  Object.fromEntries(userNeeds.value.map((teamId) => [teamId, getDisplayName(teamId)]))
);

const isHovered = ref(false);
const objectiveMouseEnter = () => {
  isHovered.value = true;
};
const objectiveMouseLeave = () => {
  isHovered.value = false;
};

const objectiveIcon = computed(() => {
  if (isHovered.value) {
    return isComplete.value ? 'mdi-close-circle' : 'mdi-check-circle';
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
  return iconMap[props.objective.type ?? ''] || 'mdi-help-circle';
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
  .clickable {
    cursor: pointer;
  }
</style>
