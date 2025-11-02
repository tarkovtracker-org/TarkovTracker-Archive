<template>
  <tracker-tip :tip="{ id: 'neededitems' }"></tracker-tip>
  <v-container>
    <v-row align="center" class="compact-row">
      <v-col cols="9" sm="8" md="9" lg="8">
        <!-- Primary views (all, maps, traders) -->
        <v-card>
          <v-tabs
            v-model="activeNeededView"
            bg-color="accent"
            slider-color="secondary"
            align-tabs="center"
            show-arrows
          >
            <v-tab
              v-for="(view, index) in neededViews"
              :key="index"
              :value="view.view"
              :prepend-icon="view.icon"
            >
              {{ view.title }}
            </v-tab>
          </v-tabs>
        </v-card>
      </v-col>
      <v-col cols="3" sm="4" md="3" lg="3">
        <v-text-field
          v-model="itemFilterNameText"
          label="Search by item name"
          variant="solo"
          hide-details
          density="comfortable"
          :append-inner-icon="itemFilterNameText ? 'mdi-close-circle' : ''"
          @click:append-inner="clearItemFilterNameText"
        ></v-text-field>
      </v-col>
      <v-col cols="3" sm="2" md="1" lg="1">
        <v-dialog v-model="settingsDialog" scrim="#9A8866">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="tonal" style="width: 100%; height: 48px" class="px-0">
              <v-icon>mdi-cog</v-icon>
            </v-btn>
          </template>
          <v-row class="justify-center">
            <v-col cols="auto">
              <v-card :title="$t('page.neededitems.options.title')" style="width: fit-content">
                <v-card-text>
                  <v-container class="ma-0 pa-0">
                    <v-row class="compact-row">
                      <!-- Choose needed items layout style -->
                      <v-col cols="12">
                        <v-btn-toggle
                          v-model="neededItemsStyle"
                          rounded="0"
                          group
                          variant="outlined"
                        >
                          <v-btn value="mediumCard" icon="mdi-view-grid"> </v-btn>
                          <v-btn value="smallCard" icon="mdi-view-comfy"> </v-btn>
                          <v-btn value="row" icon="mdi-view-sequential"> </v-btn>
                        </v-btn-toggle>
                      </v-col>
                      <!-- Hide Task Items that aren't needed found in raid option-->
                      <v-col cols="12">
                        <v-switch
                          v-model="hideFIR"
                          :label="$t(hideFIRLabel)"
                          inset
                          true-icon="mdi-eye-off"
                          false-icon="mdi-eye"
                          :color="hideFIRColor"
                          hide-details
                          density="compact"
                        ></v-switch>
                        <v-switch
                          v-model="itemsHideAll"
                          :label="$t(itemsHideAllLabel)"
                          inset
                          true-icon="mdi-eye-off"
                          false-icon="mdi-eye"
                          :color="itemsHideAllColor"
                          hide-details
                          density="compact"
                        ></v-switch>
                        <v-switch
                          v-model="itemsHideNonFIR"
                          :disabled="itemsHideAll"
                          :label="$t(itemsHideNonFIRLabel)"
                          inset
                          true-icon="mdi-eye-off"
                          false-icon="mdi-eye"
                          :color="itemsHideNonFIRColor"
                          hide-details
                          density="compact"
                        ></v-switch>
                        <v-switch
                          v-model="itemsHideHideout"
                          :disabled="itemsHideAll"
                          :label="$t(itemsHideHideoutLabel)"
                          inset
                          true-icon="mdi-eye-off"
                          false-icon="mdi-eye"
                          :color="itemsHideHideoutColor"
                          hide-details
                          density="compact"
                        ></v-switch>
                      </v-col>
                    </v-row>
                    <v-row justify="end">
                      <v-col cols="12" md="6">
                        <v-btn color="primary" block @click="settingsDialog = false">{{
                          $t('page.neededitems.options.close')
                        }}</v-btn>
                      </v-col>
                    </v-row>
                  </v-container>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-dialog>
      </v-col>
    </v-row>
    <v-row v-if="loading || hideoutLoading" justify="center">
      <v-col cols="12" align="center">
        <v-progress-circular indeterminate color="secondary" class="mx-2"></v-progress-circular>
        <span>{{ $t('page.neededitems.loading') }}</span>
        <refresh-button />
      </v-col>
    </v-row>
    <v-row
      v-show="activeNeededView == 'all' || activeNeededView == 'tasks'"
      justify="space-between"
    >
      <needed-item
        v-for="(neededItem, itemIndex) in neededTaskItems"
        :key="itemIndex"
        :need="neededItem"
        :item-style="neededItemsStyle"
      />
    </v-row>
    <v-row
      v-show="activeNeededView == 'all' || activeNeededView == 'hideout'"
      justify="space-between"
    >
      <needed-item
        v-for="(neededItem, itemIndex) in neededHideoutItems"
        :key="itemIndex"
        :need="neededItem"
        :item-style="neededItemsStyle"
      />
    </v-row>

    <!-- Load more indicator -->
    <v-row v-if="hasMoreItems && !loading && !hideoutLoading" justify="center" class="mt-4">
      <v-col cols="12" align="center">
        <v-btn variant="outlined" color="secondary" :loading="false" @click="loadMoreItems">
          {{ $t('page.neededitems.load_more') }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Bottom loading indicator for auto-scroll -->
    <v-row v-if="hasMoreItems && (loading || hideoutLoading)" justify="center" class="mt-4">
      <v-col cols="12" align="center">
        <v-progress-circular indeterminate color="secondary" class="mx-2"></v-progress-circular>
        {{ $t('page.neededitems.loading_more') }}
      </v-col>
    </v-row>
  </v-container>
</template>
<script setup>
  import { computed, provide, ref, watch, onMounted, onUnmounted } from 'vue';
  import { useTarkovData } from '@/composables/tarkovdata';
  import { STASH_STATION_ID } from '@/stores/progress';
  import { useProgressQueries } from '@/composables/useProgressQueries';
  import { defineAsyncComponent } from 'vue';
  import { debounce } from '@/utils/debounce';
  import { useI18n } from 'vue-i18n';
  import { useUserStore } from '@/stores/user';
  import { useNeedVisibility } from '@/features/neededitems/useNeedVisibility';
  const TrackerTip = defineAsyncComponent(() => import('@/features/ui/TrackerTip'));
  const RefreshButton = defineAsyncComponent(() => import('@/features/ui/RefreshButton'));
  const NeededItem = defineAsyncComponent(() => import('@/features/neededitems/NeededItem'));
  const { t } = useI18n({ useScope: 'global' });
  const {
    tasks,
    hideoutModules,
    hideoutLoading,
    loading,
    neededItemTaskObjectives,
    neededItemHideoutModules,
  } = useTarkovData();
  const { tasksCompletions, moduleCompletions, getHideoutLevelFor, getModuleCompletionMap } =
    useProgressQueries();
  const userStore = useUserStore();
  const { isTaskNeedVisible, isHideoutNeedVisible } = useNeedVisibility();
  const itemFilterNameText = ref('');
  function clearItemFilterNameText() {
    if (itemFilterNameText.value) itemFilterNameText.value = '';
  }
  const itemFilterName = ref('');
  provide('itemFilterName', itemFilterName);
  watch(
    itemFilterNameText,
    debounce((newVal) => {
      itemFilterName.value = newVal;
    }, 50)
  );
  const neededItemsStyle = computed({
    get: () => userStore.getNeededItemsStyle,
    set: (value) => userStore.setNeededItemsStyle(value),
  });
  const settingsDialog = ref(false);

  const itemsPerPage = 50;
  const currentPage = ref(0);
  const neededViews = [
    {
      title: t('page.neededitems.neededviews.all'),
      icon: 'mdi-all-inclusive',
      view: 'all',
    },
    {
      title: t('page.neededitems.neededviews.tasks'),
      icon: 'mdi-clipboard-text',
      view: 'tasks',
    },
    {
      title: t('page.neededitems.neededviews.hideout'),
      icon: 'mdi-home',
      view: 'hideout',
    },
  ];
  const activeNeededView = computed({
    get: () => userStore.getNeededTypeView,
    set: (value) => userStore.setNeededTypeView(value),
  });
  const normalizedFilter = computed(() => itemFilterName.value.trim().toLowerCase());

  const taskMap = computed(() => {
    const taskList = tasks?.value;
    if (!Array.isArray(taskList) || taskList.length === 0) {
      return new Map();
    }
    const map = new Map();
    taskList.forEach((task) => {
      if (task?.id) {
        map.set(task.id, task);
      }
    });
    return map;
  });

  const taskPrerequisiteCounts = computed(() => {
    const counts = new Map();
    const completions = tasksCompletions.value || {};
    taskMap.value.forEach((task, taskId) => {
      const predecessors = Array.isArray(task?.predecessors) ? task.predecessors : [];
      let unfinished = 0;
      predecessors.forEach((predecessorId) => {
        if (completions?.[predecessorId]?.self === false) {
          unfinished += 1;
        }
      });
      counts.set(taskId, unfinished);
    });
    return counts;
  });

  const matchesItemFilter = (need) => {
    if (!normalizedFilter.value) {
      return true;
    }
    const query = normalizedFilter.value;
    const candidates = [];
    if (need?.item) {
      if (need.item.shortName) candidates.push(String(need.item.shortName));
      if (need.item.name) candidates.push(String(need.item.name));
    }
    if (need?.markerItem) {
      if (need.markerItem.shortName) candidates.push(String(need.markerItem.shortName));
      if (need.markerItem.name) candidates.push(String(need.markerItem.name));
    }
    return candidates.some((value) => value.toLowerCase().includes(query));
  };

  const allNeededTaskItems = computed(() => {
    const objectives = neededItemTaskObjectives?.value;
    if (!Array.isArray(objectives) || objectives.length === 0) {
      return [];
    }
    const sorted = objectives
      .filter((objective) => objective && matchesItemFilter(objective))
      .slice()
      .sort((a, b) => {
        const aScore = taskPrerequisiteCounts.value.get(a.taskId) || 0;
        const bScore = taskPrerequisiteCounts.value.get(b.taskId) || 0;
        if (aScore === bScore) {
          return 0;
        }
        return aScore - bScore;
      });
    return sorted;
  });

  const visibleTaskItems = computed(() => {
    return allNeededTaskItems.value.filter((need) => {
      if (!need || need.needType !== 'taskObjective') {
        return false;
      }
      const relatedTask = need?.taskId ? taskMap.value.get(need.taskId) : undefined;
      return isTaskNeedVisible(need, relatedTask);
    });
  });

  const neededTaskItems = computed(() => {
    const endIndex = (currentPage.value + 1) * itemsPerPage;
    return visibleTaskItems.value.slice(0, endIndex);
  });

  const hideoutModuleMap = computed(() => {
    const moduleList = hideoutModules?.value;
    if (!Array.isArray(moduleList) || moduleList.length === 0) {
      return new Map();
    }
    const map = new Map();
    moduleList.forEach((module) => {
      if (module?.id) {
        map.set(module.id, module);
      }
    });
    return map;
  });

  const hideoutPrerequisiteCounts = computed(() => {
    const counts = new Map();
    const completions = moduleCompletions.value || {};
    hideoutModuleMap.value.forEach((module, moduleId) => {
      const predecessors = Array.isArray(module?.predecessors) ? module.predecessors : [];
      let unfinished = 0;
      predecessors.forEach((predecessorId) => {
        if (completions?.[predecessorId]?.self === false) {
          unfinished += 1;
        }
      });
      counts.set(moduleId, unfinished);
    });
    return counts;
  });

  const shouldIncludeHideoutNeed = (need) => {
    const moduleInstanceId = need?.hideoutModule?.id;
    const moduleStationId = need?.hideoutModule?.stationId;
    const moduleTargetLevel = need?.hideoutModule?.level;
    if (!moduleInstanceId || !moduleStationId || typeof moduleTargetLevel !== 'number') {
      return true;
    }

    if (moduleStationId === STASH_STATION_ID) {
      const currentEffectiveStashLevel = getHideoutLevelFor(STASH_STATION_ID, 'self');
      if (typeof currentEffectiveStashLevel === 'number') {
        return currentEffectiveStashLevel < moduleTargetLevel;
      }
      const moduleCompletion = getModuleCompletionMap(moduleInstanceId);
      return moduleCompletion?.self !== true;
    }

    const moduleCompletion = getModuleCompletionMap(moduleInstanceId);
    return moduleCompletion?.self !== true;
  };

  const allNeededHideoutItems = computed(() => {
    const modules = neededItemHideoutModules?.value;
    if (!Array.isArray(modules) || modules.length === 0) {
      return [];
    }
    const filtered = modules
      .filter((module) => module && shouldIncludeHideoutNeed(module) && matchesItemFilter(module))
      .slice()
      .sort((a, b) => {
        const moduleAId = a?.hideoutModule?.id;
        const moduleBId = b?.hideoutModule?.id;
        const aScore = moduleAId ? hideoutPrerequisiteCounts.value.get(moduleAId) || 0 : 0;
        const bScore = moduleBId ? hideoutPrerequisiteCounts.value.get(moduleBId) || 0 : 0;
        if (aScore === bScore) {
          return 0;
        }
        return aScore - bScore;
      });
    return filtered;
  });

  const visibleHideoutItems = computed(() => {
    return allNeededHideoutItems.value.filter((need) => {
      if (!need || need.needType !== 'hideoutModule') {
        return false;
      }
      return isHideoutNeedVisible(need);
    });
  });

  const neededHideoutItems = computed(() => {
    const endIndex = (currentPage.value + 1) * itemsPerPage;
    return visibleHideoutItems.value.slice(0, endIndex);
  });
  const hideFIR = computed({
    get: () => userStore.itemsNeededHideNonFIR,
    set: (value) => userStore.setItemsNeededHideNonFIR(value),
  });
  const hideFIRLabel = computed(() =>
    userStore.itemsNeededHideNonFIR
      ? 'page.neededitems.options.items_hide_non_fir'
      : 'page.neededitems.options.items_show_non_fir'
  );
  const hideFIRColor = computed(() => (userStore.itemsNeededHideNonFIR ? 'error' : 'success'));
  const itemsHideAll = computed({
    get: () => userStore.itemsTeamAllHidden,
    set: (value) => userStore.setItemsTeamHideAll(value),
  });
  const itemsHideAllLabel = computed(() =>
    userStore.itemsTeamAllHidden
      ? 'page.team.card.teamoptions.items_hide_all'
      : 'page.team.card.teamoptions.items_show_all'
  );
  const itemsHideAllColor = computed(() => (userStore.itemsTeamAllHidden ? 'error' : 'success'));
  const itemsHideNonFIR = computed({
    get: () => userStore.itemsTeamNonFIRHidden,
    set: (value) => userStore.setItemsTeamHideNonFIR(value),
  });
  const itemsHideNonFIRLabel = computed(() =>
    userStore.itemsTeamNonFIRHidden
      ? 'page.team.card.teamoptions.items_hide_non_fir'
      : 'page.team.card.teamoptions.items_show_non_fir'
  );
  const itemsHideNonFIRColor = computed(() =>
    userStore.itemsTeamNonFIRHidden ? 'error' : 'success'
  );
  const itemsHideHideout = computed({
    get: () => userStore.itemsTeamHideoutHidden,
    set: (value) => userStore.setItemsTeamHideHideout(value),
  });
  const itemsHideHideoutLabel = computed(() =>
    userStore.itemsTeamHideoutHidden
      ? 'page.team.card.teamoptions.items_hide_hideout'
      : 'page.team.card.teamoptions.items_show_hideout'
  );
  const itemsHideHideoutColor = computed(() =>
    userStore.itemsTeamHideoutHidden ? 'error' : 'success'
  );

  // Infinite scroll logic
  const hasMoreItems = computed(() => {
    if (activeNeededView.value === 'tasks') {
      return neededTaskItems.value.length < visibleTaskItems.value.length;
    }
    if (activeNeededView.value === 'hideout') {
      return neededHideoutItems.value.length < visibleHideoutItems.value.length;
    }
    return (
      neededTaskItems.value.length < visibleTaskItems.value.length ||
      neededHideoutItems.value.length < visibleHideoutItems.value.length
    );
  });

  const loadMoreItems = () => {
    if (hasMoreItems.value) {
      currentPage.value++;
    }
  };

  // Reset pagination on view change or filter update
  watch([activeNeededView, itemFilterName], () => {
    currentPage.value = 0;
  });

  // Reset pagination when source collections change substantially
  watch([visibleTaskItems, visibleHideoutItems], () => {
    currentPage.value = 0;
  });

  // Scroll handler for infinite scroll
  const handleScroll = debounce(() => {
    const { scrollY } = window;
    const { scrollHeight, clientHeight } = document.documentElement;
    if (scrollY + clientHeight >= scrollHeight - 100) {
      // Load more when 100px from bottom
      loadMoreItems();
    }
  }, 100);

  // Add and remove scroll listener
  onMounted(() => {
    window.addEventListener('scroll', handleScroll);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
  });

  /*
   * Legacy components rely on the provide/inject filter. Even though we now
   * pre-filter for performance, continue providing the live value for
   * downstream consumers that expect it.
   */
</script>
<style lang="scss" scoped>
  .compact-row {
    --v-layout-column-gap: 12px;
    --v-layout-row-gap: 12px;
  }
</style>
