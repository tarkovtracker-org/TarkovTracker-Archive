<template>
  <tracker-tip :tip="{ id: 'tasks' }" />
  <div class="task-page">
    <v-container fluid class="task-page__container">
      <TaskViewSelector
        v-model:primary="activePrimaryView"
        v-model:secondary="activeSecondaryView"
        v-model:user="activeUserView"
        v-model:map="activeMapView"
        v-model:trader="activeTraderView"
        :primary-views="primaryViews"
        :secondary-views="secondaryViews"
        :user-views="userViews"
        :maps="maps"
        :map-task-totals="mapTaskTotals"
        :secondary-task-counts="secondaryTaskCounts"
        :ordered-traders="orderedTraders"
        :trader-avatar="traderAvatar"
        :filters-active="filtersDialog"
        @open-filters="filtersDialog = true"
      />

      <!--
        Performance optimization: Removed v-progress-circular spinner
        - Was causing 0.1980 CLS (major layout shift) due to non-composited stroke-dasharray animation
        - Skeleton loaders in TaskCardList provide better visual feedback without layout shifts
        - Reserved min-height prevents content jump when loading completes
      -->
      <v-row v-if="loadingTasks || reloadingTasks" justify="center" class="loading-row">
        <v-col cols="12" align="center">
          <div class="text-body-1 text-secondary">{{ $t('page.tasks.loading') }}</div>
          <RefreshButton :disabled="loadingTasks || reloadingTasks" />
        </v-col>
      </v-row>

      <v-row
        v-if="!loadingTasks && !reloadingTasks && (renderedTasks?.length || 0) === 0"
        class="compact-row"
      >
        <v-col cols="12">
          <v-alert icon="mdi-clipboard-search">{{ $t('page.tasks.notasksfound') }}</v-alert>
        </v-col>
      </v-row>

      <v-row
        v-show="!loadingTasks && !reloadingTasks"
        justify="center"
        class="task-list__content-row"
      >
        <TaskMapDisplay
          :show="activePrimaryView === 'maps'"
          :selected-map="selectedMap"
          :visible-markers="visibleGPS"
          :active-map-view="activeMapView"
        />
        <TaskCardList
          :tasks="renderedTasks"
          :active-user-view="activeUserView"
          :show-next-tasks="showNextTasks"
          :show-previous-tasks="showPreviousTasks"
          :has-more="hasMoreTasks"
          :loading="loadingTasks || reloadingTasks"
          @load-more="loadMoreTasks"
        />
      </v-row>
    </v-container>

    <TaskFilterDialog
      v-model="filtersDialog"
      :filter-controls="filterControls"
      :appearance-controls="appearanceControls"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { defineAsyncComponent } from 'vue';
  import TaskViewSelector from '@/features/tasks/TaskViewSelector.vue';
  import TaskMapDisplay from '@/features/tasks/TaskMapDisplay.vue';
  import TaskCardList from '@/features/tasks/TaskCardList.vue';
  import TaskFilterDialog from '@/features/tasks/TaskFilterDialog.vue';
  import { useTaskList } from '@/composables/tasks/useTaskList';

  const TrackerTip = defineAsyncComponent(() => import('@/features/ui/TrackerTip.vue'));
  const RefreshButton = defineAsyncComponent(() => import('@/features/ui/RefreshButton.vue'));

  const {
    primaryViews,
    secondaryViews,
    userViews,
    orderedTraders,
    traderAvatar,
    maps,
    activePrimaryView,
    activeSecondaryView,
    activeUserView,
    activeMapView,
    activeTraderView,
    loadingTasks,
    reloadingTasks,
    renderedTasks,
    hasMoreTasks,
    loadMoreTasks,
    mapTaskTotals,
    visibleGPS,
    selectedMap,
    filterControls,
    appearanceControls,
    showNextTasks,
    showPreviousTasks,
    secondaryTaskCounts,
  } = useTaskList();

  const filtersDialog = ref(false);
</script>

<style scoped lang="scss">
  .task-page {
    position: relative;
    --task-horizontal-padding: clamp(12px, (100vw - 1200px) / 2, 28px);
  }

  .task-page__container {
    padding: 0;
    max-width: 1800px;
    margin: 0 auto 40px;
  }

  .task-list__content-row {
    margin: 0 -12px;
  }

  .compact-row {
    --v-layout-column-gap: 12px;
    --v-layout-row-gap: 12px;
  }

  .loading-row {
    min-height: 60px;
  }
</style>
