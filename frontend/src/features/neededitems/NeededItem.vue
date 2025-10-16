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
  import { useTarkovData } from '@/composables/tarkovdata';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useNeedVisibility } from '@/features/neededitems/useNeedVisibility';
  import { useProgressQueries } from '@/composables/useProgressQueries';
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
  const {
    visibleTeamStores,
    getModulePartCompletionMap,
    getObjectiveCompletionMap,
    isTaskCompletedFor,
    tasksCompletions,
    moduleCompletions,
    modulePartCompletions,
  } = useProgressQueries();
  const tarkovStore = useTarkovStore();
  const { tasks, hideoutStations, alternativeTasks } = useTarkovData();
  const { isTaskNeedVisible, isHideoutNeedVisible } = useNeedVisibility();
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
      return item.value && isTaskNeedVisible(props.need, relatedTask.value);
    } else if (props.need.needType == 'hideoutModule') {
      return item.value && isHideoutNeedVisible(props.need);
    } else {
      return false;
    }
  });
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
      return relatedTask.value.predecessors.filter((s) => !tarkovStore.isTaskComplete(s)).length;
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
        (altTaskId) => tasksCompletions.value?.[altTaskId]?.self
      );
      return (
        tasksCompletions.value?.[props.need.taskId]?.self ||
        alternativeTaskCompleted ||
        getObjectiveCompletionMap(props.need.id)?.self === true
      );
    } else if (props.need.needType == 'hideoutModule') {
      return (
        moduleCompletions.value?.[props.need.hideoutModule.id]?.self === true ||
        modulePartCompletions.value?.[props.need.id]?.self === true
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
      return relatedTask.value.minPlayerLevel;
    } else if (props.need.needType == 'hideoutModule') {
      return 0;
    } else {
      return 0;
    }
  });
  const teamNeeds = computed(() => {
    const needingUsers = [];
    if (props.need.needType == 'taskObjective') {
      const completionMap = getObjectiveCompletionMap(props.need.id);
      Object.entries(completionMap).forEach(([user, completed]) => {
        if (!completed && !isTaskCompletedFor(props.need.taskId, user)) {
          const teamStore = visibleTeamStores.value?.[user];
          const count = teamStore?.getObjectiveCount
            ? teamStore.getObjectiveCount(props.need.id)
            : 0;
          needingUsers.push({
            user,
            count,
          });
        }
      });
    } else if (props.need.needType == 'hideoutModule') {
      const partCompletionMap = getModulePartCompletionMap(props.need.id);
      Object.entries(partCompletionMap).forEach(([user, completed]) => {
        if (!completed) {
          const teamStore = visibleTeamStores.value?.[user];
          const count = teamStore?.getHideoutPartCount
            ? teamStore.getHideoutPartCount(props.need.id)
            : 0;
          needingUsers.push({
            user,
            count,
          });
        }
      });
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
