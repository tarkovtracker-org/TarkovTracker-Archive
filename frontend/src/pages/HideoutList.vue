<template>
  <v-container class="d-flex flex-column" style="min-height: calc(100vh - 250px)">
    <tracker-tip :tip="{ id: 'hideout' }" style="flex: 0 0 auto" class="mb-4"></tracker-tip>
    <div class="flex-grow-0" style="margin-bottom: 16px">
      <v-row justify="center">
        <v-col lg="8" md="12">
          <v-card>
            <v-tabs
              v-model="activePrimaryView"
              bg-color="accent"
              slider-color="secondary"
              align-tabs="center"
              show-arrows
            >
              <v-tab
                v-for="(view, index) in primaryViews"
                :key="index"
                :value="view.view"
                :prepend-icon="view.icon"
              >
                {{ view.title }}
              </v-tab>
            </v-tabs>
          </v-card>
        </v-col>
      </v-row>
    </div>
    <div class="flex-grow-1">
      <v-row v-if="hideoutLoading || isStoreLoading" justify="center">
        <v-col cols="12" align="center">
          <v-progress-circular indeterminate color="secondary" class="mx-2"></v-progress-circular>
          {{ $t('page.hideout.loading') }} <refresh-button />
        </v-col>
      </v-row>
      <v-row justify="center" class="mt-2">
        <v-col
          v-for="hStation in visibleStations"
          :key="hStation.id"
          cols="12"
          sm="12"
          md="6"
          lg="6"
          xl="4"
        >
          <hideout-card :station="hStation" class="ma-2" />
        </v-col>
      </v-row>
      <v-row v-if="!hideoutLoading && !isStoreLoading && visibleStations.length == 0">
        <v-col cols="12">
          <v-alert icon="mdi-clipboard-search"> {{ $t('page.hideout.nostationsfound') }}</v-alert>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>
<script setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useHideoutData } from '@/composables/data/useHideoutData';
  import { useProgressQueries } from '@/composables/useProgressQueries';
  import { useUserStore } from '@/stores/user';
  import { defineAsyncComponent } from 'vue';
  import { logger } from '@/utils/logger';
  const TrackerTip = defineAsyncComponent(() => import('@/features/ui/TrackerTip'));
  const HideoutCard = defineAsyncComponent(() => import('@/features/hideout/HideoutCard'));
  const RefreshButton = defineAsyncComponent(() => import('@/features/ui/RefreshButton'));
  const { t } = useI18n({ useScope: 'global' });
  const { hideoutStations, loading: hideoutLoading } = useHideoutData();
  const { visibleTeamStores, getHideoutLevelFor } = useProgressQueries();
  const userStore = useUserStore();
  const primaryViews = [
    {
      title: t('page.hideout.primaryviews.available'),
      icon: 'mdi-tag-arrow-up-outline',
      view: 'available',
    },
    {
      title: t('page.hideout.primaryviews.maxed'),
      icon: 'mdi-arrow-collapse-up',
      view: 'maxed',
    },
    {
      title: t('page.hideout.primaryviews.locked'),
      icon: 'mdi-lock',
      view: 'locked',
    },
    {
      title: t('page.hideout.primaryviews.all'),
      icon: 'mdi-clipboard-check',
      view: 'all',
    },
  ];
  const activePrimaryView = computed({
    get: () => userStore.getTaskPrimaryView,
    set: (value) => userStore.setTaskPrimaryView(value),
  });

  const isStoreLoading = computed(() => {
    try {
      // Check if hideout data is still loading
      if (hideoutLoading.value) return true;

      // Check if we have hideout stations data
      if (!hideoutStations.value || hideoutStations.value.length === 0) {
        return true;
      }

      // Check if progress store team data is ready
      if (!visibleTeamStores.value || Object.keys(visibleTeamStores.value).length === 0) {
        return true;
      }

      // Remove the hideoutLevels check as it creates a circular dependency
      // The hideoutLevels computed property needs both hideout stations AND team stores
      // Since we've already verified both are available above, we can proceed
      return false;
    } catch (error) {
      logger.error('Error in hideout loading check:', error);
      // Return false to prevent stuck loading state on error
      return false;
    }
  });
  const hideoutStationList = computed(() => hideoutStations.value || []);
  const getStationLevel = (stationId) => getHideoutLevelFor(stationId, 'self');
  const canUpgradeStation = (station) => {
    const currentLevel = getStationLevel(station.id);
    const nextLevelData = station.levels.find((level) => level.level === currentLevel + 1);
    if (!nextLevelData) return false;
    return nextLevelData.stationLevelRequirements.every((requirement) => {
      const requiredStationId = requirement?.station?.id;
      if (!requiredStationId) return false;
      return getStationLevel(requiredStationId) >= requirement.level;
    });
  };

  const hasNextLevel = (station) => {
    const currentLevel = getStationLevel(station.id);
    return Boolean(station.levels.find((level) => level.level === currentLevel + 1));
  };

  const visibleStations = computed(() => {
    try {
      if (isStoreLoading.value) {
        return [];
      }

      const stations = hideoutStationList.value;
      if (!Array.isArray(stations) || stations.length === 0) {
        return [];
      }

      switch (activePrimaryView.value) {
        case 'available':
          return stations.filter(canUpgradeStation);
        case 'maxed':
          return stations.filter((station) => getStationLevel(station.id) === station.levels.length);
        case 'locked':
          return stations.filter((station) => !canUpgradeStation(station) && hasNextLevel(station));
        case 'all':
        default:
          return stations;
      }
    } catch (error) {
      logger.error('Error computing visible stations:', error);
      return [];
    }
  });
</script>
<style lang="scss" scoped></style>
