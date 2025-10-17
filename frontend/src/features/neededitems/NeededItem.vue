<template>
  <template v-if="props.itemStyle == 'mediumCard'">
    <v-col v-if="showItemFilter" cols="12" sm="6" md="4" lg="3" xl="2">
      <NeededItemMediumCard
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
      />
    </v-col>
  </template>
  <template v-else-if="props.itemStyle == 'smallCard'">
    <v-col v-if="showItemFilter" cols="auto">
      <NeededItemSmallCard
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
      />
    </v-col>
  </template>
  <template v-else-if="props.itemStyle == 'row'">
    <v-col v-if="showItemFilter" cols="12" class="pt-1">
      <NeededItemRow
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
      />
    </v-col>
  </template>
</template>
<script setup>
  import { defineAsyncComponent, computed, inject, provide } from 'vue';
  import { useUserStore } from '@/stores/user';
  import { useProgressQueries } from '@/composables/useProgressQueries';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { useTarkovStore } from '@/stores/tarkov';
  const NeededItemMediumCard = defineAsyncComponent(
    () => import('@/features/neededitems/NeededItemMediumCard')
  );
  const NeededItemSmallCard = defineAsyncComponent(
    () => import('@/features/neededitems/NeededItemSmallCard')
  );
  const NeededItemRow = defineAsyncComponent(() => import('@/features/neededitems/NeededItemRow'));
  const props = defineProps({
    need: {
      type: Object,
      required: true,
    },
    itemStyle: {
      type: String,
      default: 'mediumCard',
    },
  });
  const userStore = useUserStore();
  const {
    progressStore,
    tasksCompletions,
    objectiveCompletions,
    moduleCompletions,
    modulePartCompletions,
    playerFaction,
  } = useProgressQueries();
  const tarkovStore = useTarkovStore();
  const { tasks, hideoutStations, alternativeTasks } = useTarkovData();
  // Helper functions and data to calculate if the item should be shown based
  // on the user's/team's progress and the user's filters
  const filterString = inject('itemFilterName');
  const showItemFilter = computed(() => {
    if (filterString.value == '') {
      return showItem.value;
    } else {
      return (
        item.value &&
        (item.value.shortName.toLowerCase().includes(filterString.value.toLowerCase()) ||
          item.value.name.toLowerCase().includes(filterString.value.toLowerCase())) &&
        showItem.value
      );
    }
  });
  const showItem = computed(() => {
    if (props.need.needType == 'taskObjective') {
      // ONLY allow 'giveItem' objectives, and ensure an item exists
      if (props.need.type !== 'giveItem') {
        return false;
      }
      // Check if a valid item exists and other filters pass
      return item.value && isTaskObjectiveNeeded(props.need);
    } else if (props.need.needType == 'hideoutModule') {
      // Check if a valid item exists and other filters pass
      return item.value && isHideoutModuleNeeded(props.need);
    } else {
      return false;
    }
  });
  function isTaskObjectiveNeeded(need) {
    const rt = relatedTask.value;
    if (!rt) return false;

    if (userStore.itemsNeededHideNonFIR) {
      if (need.type == 'mark' || need.type == 'buildWeapon' || need.type == 'plantItem') {
        return false;
      } else if (need.type == 'giveItem') {
        if (need.foundInRaid == false) {
          return false;
        }
      }
    }
    if (userStore.hideKappaRequiredTasks && rt.kappaRequired === true) {
      return false;
    }
    if (userStore.hideLightkeeperRequiredTasks && rt.lightkeeperRequired === true) {
      return false;
    }
    if (
      userStore.hideNonKappaTasks &&
      rt.kappaRequired !== true &&
      rt.lightkeeperRequired !== true
    ) {
      return false;
    }
    if (userStore.itemsTeamAllHidden) {
      // Only show if the objective is needed by ourself
      return (
        !tasksCompletions.value?.[need.taskId]?.self &&
        !objectiveCompletions.value?.[need.id]?.self &&
        ['Any', tarkovStore.getPMCFaction].some(
          (faction) => faction == rt.factionName
        )
      );
    } else if (userStore.itemsTeamNonFIRHidden) {
      // Only show if a someone needs the objective
      const taskNeeded = Object.entries(tasksCompletions.value?.[need.taskId] || {}).some(
        ([userTeamId, userStatus]) => {
          const relevantFactions = ['Any', playerFaction.value?.[userTeamId]];
          return (
            relevantFactions.some((faction) => faction == rt.factionName) &&
            userStatus === false
          );
        }
      );
      const objectiveNeeded = Object.entries(objectiveCompletions.value?.[need.id] || {}).some(
        ([userTeamId, userStatus]) => {
          const relevantFactions = ['Any', playerFaction.value?.[userTeamId]];
          return (
            relevantFactions.some((faction) => faction == rt.factionName) &&
            userStatus === false
          );
        }
      );
      return need.foundInRaid && taskNeeded && objectiveNeeded;
    } else {
      return (
        Object.entries(tasksCompletions.value?.[need.taskId] || {}).some(
          ([userTeamId, userStatus]) => {
            const relevantFactions = ['Any', playerFaction.value?.[userTeamId]];
            return (
              relevantFactions.some((faction) => faction == rt.factionName) &&
              userStatus === false
            );
          }
        ) &&
        Object.entries(objectiveCompletions.value?.[need.id] || {}).some(
          ([userTeamId, userStatus]) => {
            const relevantFactions = ['Any', playerFaction.value?.[userTeamId]];
            return (
              relevantFactions.some((faction) => faction == rt.factionName) &&
              userStatus === false
            );
          }
        )
      );
    }
  }
  function isHideoutModuleNeeded(need) {
    // If hideoutModule or its id is missing, this need cannot be for a hideout module
    if (!need.hideoutModule || !need.hideoutModule.id) {
      return false;
    }
    const moduleCompletionsForModule = moduleCompletions.value?.[need.hideoutModule?.id] || {};
    const modulePartCompletionsForPart = modulePartCompletions.value?.[need.id] || {};
    // If there is no progress data at all, show the item by default
    if (
      Object.keys(moduleCompletionsForModule).length === 0 &&
      Object.keys(modulePartCompletionsForPart).length === 0
    ) {
      return true;
    }
    if (userStore.itemsTeamAllHidden || userStore.itemsTeamHideoutHidden) {
      // Only show if the objective is needed by ourself
      return (
        (moduleCompletionsForModule.self === undefined || moduleCompletionsForModule.self === false) ||
        (modulePartCompletionsForPart.self === undefined || modulePartCompletionsForPart.self === false)
      );
    } else {
      return (
        Object.values(moduleCompletionsForModule).some((userStatus) => userStatus === false) ||
        Object.values(modulePartCompletionsForPart).some((userStatus) => userStatus === false)
      );
    }
  }
  // Emit functions to update the user's progress towards the need
  // the child functions emit these functions and we watch for them here
  const decreaseCount = () => {
    if (props.need.needType == 'taskObjective') {
      if (currentCount.value > 0) {
        tarkovStore.setObjectiveCount(props.need.id, currentCount.value - 1);
      }
    } else if (props.need.needType == 'hideoutModule') {
      if (currentCount.value > 0) {
        tarkovStore.setHideoutPartCount(props.need.id, currentCount.value - 1);
      }
    }
  };
  const increaseCount = () => {
    if (props.need.needType == 'taskObjective') {
      if (currentCount.value < neededCount.value) {
        tarkovStore.setObjectiveCount(props.need.id, currentCount.value + 1);
      }
    } else if (props.need.needType == 'hideoutModule') {
      if (currentCount.value < neededCount.value) {
        tarkovStore.setHideoutPartCount(props.need.id, currentCount.value + 1);
      }
    }
  };
  const toggleCount = () => {
    if (props.need.needType == 'taskObjective') {
      if (currentCount.value === 0) {
        tarkovStore.setObjectiveCount(props.need.id, neededCount.value);
      } else if (currentCount.value === neededCount.value) {
        tarkovStore.setObjectiveCount(props.need.id, 0);
      } else {
        tarkovStore.setObjectiveCount(props.need.id, neededCount.value);
      }
    } else if (props.need.needType == 'hideoutModule') {
      if (currentCount.value === 0) {
        tarkovStore.setHideoutPartCount(props.need.id, neededCount.value);
      } else if (currentCount.value === neededCount.value) {
        tarkovStore.setHideoutPartCount(props.need.id, 0);
      } else {
        tarkovStore.setHideoutPartCount(props.need.id, neededCount.value);
      }
    }
  };
  const imageItem = computed(() => {
    if (!item.value) {
      return null;
    }
    if (item.value.properties?.defaultPreset) {
      return item.value.properties.defaultPreset;
    } else {
      return item.value;
    }
  });
  // Helper functions and data to calculate the item's progress
  // These are passed to the child components via provide/inject
  const currentCount = computed(() => {
    if (selfCompletedNeed.value) {
      return neededCount.value;
    }
    if (props.need.needType == 'taskObjective') {
      return tarkovStore.getObjectiveCount(props.need.id);
    } else if (props.need.needType == 'hideoutModule') {
      return tarkovStore.getHideoutPartCount(props.need.id);
    } else {
      return 0;
    }
  });
  const neededCount = computed(() => {
    if (props.need.needType == 'taskObjective' && props.need.count) {
      return props.need.count;
    } else if (props.need.needType == 'hideoutModule' && props.need.count) {
      return props.need.count;
    } else {
      return 1;
    }
  });
  const relatedTask = computed(() => {
    if (props.need.needType == 'taskObjective') {
      return tasks.value.find((t) => t.id == props.need.taskId);
    } else {
      return null;
    }
  });
  const item = computed(() => {
    if (props.need.needType == 'taskObjective') {
      // Only return an item if the objective type is 'giveItem'
      if (props.need.type == 'giveItem') {
        return props.need.item;
      } else {
        // For other task objective types (mark, plant, find, build), return null in this context
        return null;
      }
    } else if (props.need.needType == 'hideoutModule') {
      // For hideout modules, return the associated item
      return props.need.item;
    } else {
      return null;
    }
  });
  const lockedBefore = computed(() => {
    if (props.need.needType == 'taskObjective') {
      return (
        relatedTask.value?.predecessors?.filter((s) => !tarkovStore.isTaskComplete(s)).length ?? 0
      );
    } else if (props.need.needType == 'hideoutModule') {
      return props.need.hideoutModule.predecessors.filter(
        (s) => !tarkovStore.isHideoutModuleComplete(s)
      ).length;
    } else {
      return 0;
    }
  });
  const selfCompletedNeed = computed(() => {
    if (props.need.needType == 'taskObjective') {
      const alternativeTaskCompleted = alternativeTasks.value[props.need.taskId]?.some(
        (altTaskId) => tasksCompletions.value?.[altTaskId]?.['self']
      );
      return (
        tasksCompletions.value?.[props.need.taskId]?.['self'] ||
        alternativeTaskCompleted ||
        objectiveCompletions.value?.[props.need.id]?.['self']
      );
    } else if (props.need.needType == 'hideoutModule') {
      return (
        moduleCompletions.value?.[props.need.hideoutModule.id]?.['self'] ||
        modulePartCompletions.value?.[props.need.id]?.['self']
      );
    } else {
      return false;
    }
  });
  const relatedStation = computed(() => {
    if (props.need.needType == 'hideoutModule') {
      return Object.values(hideoutStations.value).find(
        (s) => s.id == props.need.hideoutModule.stationId
      );
    } else {
      return null;
    }
  });
  const levelRequired = computed(() => {
    if (props.need.needType == 'taskObjective') {
      return relatedTask.value?.minPlayerLevel ?? 0;
    } else if (props.need.needType == 'hideoutModule') {
      return 0;
    } else {
      return 0;
    }
  });
  const teamNeeds = computed(() => {
    let needingUsers = [];
    if (props.need.needType == 'taskObjective') {
      // Find all of the users that need this objective
      Object.entries(objectiveCompletions.value?.[props.need.id] || {}).forEach(
        ([user, completed]) => {
          if (!completed && !tasksCompletions.value?.[props.need.taskId]?.[user]) {
            needingUsers.push({
              user: user,
              count: progressStore.teamStores[user]?.getObjectiveCount(props.need.id) ?? 0,
            });
          }
        }
      );
    } else if (props.need.needType == 'hideoutModule') {
      // Find all of the users that need this module
      Object.entries(modulePartCompletions.value?.[props.need.id] || {}).forEach(
        ([user, completed]) => {
          if (!completed) {
            needingUsers.push({
              user: user,
              count: progressStore.teamStores[user]?.getHideoutPartCount(props.need.id) ?? 0,
            });
          }
        }
      );
    }
    return needingUsers;
  });
  provide('neededitem', {
    item,
    relatedTask,
    relatedStation,
    selfCompletedNeed,
    lockedBefore,
    currentCount,
    neededCount,
    levelRequired,
    teamNeeds,
    imageItem,
  });
</script>
<style lang="scss">
  .item-panel {
    aspect-ratio: 16/9;
    min-height: 100px;
  }
  .item-image {
    min-height: 90px;
  }
  .item-bg-violet {
    background-color: #2c232f;
  }
  .item-bg-grey {
    background-color: #1e1e1e;
  }
  .item-bg-yellow {
    background-color: #343421;
  }
  .item-bg-orange {
    background-color: #261d14;
  }
  .item-bg-green {
    background-color: #1a2314;
  }
  .item-bg-red {
    background-color: #38221f;
  }
  .item-bg-default {
    background-color: #3a3c3b;
  }
  .item-bg-black {
    background-color: #141614;
  }
  .item-bg-blue {
    background-color: #202d32;
  }
</style>
