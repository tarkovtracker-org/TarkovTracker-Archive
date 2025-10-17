<template>
  <div>
    <v-row class="compact-row">
      <v-col cols="12">
        <v-card>
          <v-tabs
            v-model="primaryModel"
            bg-color="accent"
            slider-color="secondary"
            centered
            show-arrows
            class="tabs-centered"
          >
            <v-tab
              v-for="(view, index) in primaryViews"
              :key="`primary-${index}`"
              :value="view.view"
              :prepend-icon="view.icon"
            >
              {{ view.title }}
            </v-tab>
          </v-tabs>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="primaryModel === 'maps'" class="compact-row">
      <v-col cols="12">
        <v-card>
          <v-tabs
            v-model="mapModel"
            bg-color="accent"
            slider-color="secondary"
            centered
            show-arrows
            class="tabs-centered"
          >
            <v-tab
              v-for="(mapItem, index) in maps"
              :key="`map-${index}`"
              :value="mapItem.id"
              prepend-icon="mdi-compass"
            >
              <v-badge
                :color="(mapTaskTotals[mapItem.id] || 0) > 0 ? 'secondary' : 'grey'"
                :content="mapTaskTotals[mapItem.id] || 0"
                :label="String(mapTaskTotals[mapItem.id] || 0)"
                offset-y="-5"
                offset-x="-10"
              >
                {{ mapItem.name }}
              </v-badge>
            </v-tab>
          </v-tabs>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="compact-row">
      <v-col lg="5" md="5">
        <v-card>
          <v-tabs
            v-model="secondaryModel"
            bg-color="accent"
            slider-color="secondary"
            centered
            show-arrows
            density="comfortable"
            class="tabs-centered"
          >
            <v-tab
              v-for="(view, index) in secondaryViews"
              :key="`secondary-${index}`"
              :value="view.view"
              :prepend-icon="view.icon"
            >
              <v-badge
                :color="(secondaryTaskCounts[view.view] || 0) > 0 ? 'secondary' : 'grey'"
                :content="secondaryTaskCounts[view.view] || 0"
                :label="String(secondaryTaskCounts[view.view] || 0)"
                offset-y="-5"
                offset-x="-10"
              >
                {{ view.title }}
              </v-badge>
            </v-tab>
          </v-tabs>
        </v-card>
      </v-col>
      <v-col lg="5" md="5" class="d-flex align-center">
        <v-card width="100%">
          <v-tabs
            v-model="userModel"
            bg-color="accent"
            slider-color="secondary"
            centered
            density="comfortable"
            class="tabs-centered"
          >
            <v-tab
              v-for="view in userViews"
              :key="`user-${view.view}`"
              :value="view.view"
              :disabled="view.view === 'all' && secondaryModel !== 'available'"
            >
              {{ view.title }}
            </v-tab>
          </v-tabs>
        </v-card>
      </v-col>
      <v-col lg="2" md="2" class="d-flex align-center justify-end">
        <v-btn
          variant="tonal"
          class="task-settings-trigger"
          style="width: 100%; height: 48px"
          :color="filtersActive ? 'secondary' : undefined"
          @click="emit('open-filters')"
        >
          <v-icon class="mr-1">mdi-filter-cog</v-icon>
          {{ $t('page.tasks.filters.title') }}
        </v-btn>
      </v-col>
    </v-row>
    <v-row v-if="orderedTraders.length" class="task-trader-filter-row compact-row">
      <v-col cols="12">
        <v-card class="task-trader-filter">
          <v-tabs
            v-model="traderModel"
            bg-color="accent"
            slider-color="secondary"
            centered
            show-arrows
            density="comfortable"
            class="tabs-centered"
          >
            <v-tab value="all">
              <v-avatar color="primary" size="2em" class="mr-2">
                <v-icon size="small">mdi-account-group</v-icon>
              </v-avatar>
              {{ $t('page.tasks.primaryviews.all') }}
            </v-tab>
            <v-tab
              v-for="(traderEntry, index) in orderedTraders"
              :key="`trader-${index}`"
              :value="traderEntry.id"
            >
              <v-avatar color="primary" size="2em" class="mr-2">
                <v-img :src="traderAvatar(traderEntry.id)" />
              </v-avatar>
              {{ traderEntry.name }}
            </v-tab>
          </v-tabs>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import type { Trader } from '@/types/tarkov';
  interface ViewOption {
    title: string;
    icon?: string;
    view: string;
  }
  interface SecondaryTaskCounts {
    available: number;
    locked: number;
    completed: number;
    [key: string]: number;
  }
  interface MapSummary {
    id: string;
    name: string;
  }
  interface Props {
    primaryViews?: ViewOption[];
    secondaryViews?: ViewOption[];
    userViews?: ViewOption[];
    maps?: MapSummary[];
    mapTaskTotals?: Record<string, number>;
    secondaryTaskCounts?: SecondaryTaskCounts;
    orderedTraders?: Trader[];
    traderAvatar?: (id: string) => string | undefined;
    filtersActive?: boolean;
    primary: string;
    secondary: string;
    user: string;
    map: string;
    trader: string;
  }
  const props = defineProps<Props>();
  const emit = defineEmits<{
    (event: 'open-filters'): void;
    (event: 'update:primary', value: string): void;
    (event: 'update:secondary', value: string): void;
    (event: 'update:user', value: string): void;
    (event: 'update:map', value: string): void;
    (event: 'update:trader', value: string): void;
  }>();
  const primaryModel = computed({
    get: () => props.primary,
    set: (value: string) => emit('update:primary', value),
  });
  const secondaryModel = computed({
    get: () => props.secondary,
    set: (value: string) => emit('update:secondary', value),
  });
  const userModel = computed({
    get: () => props.user,
    set: (value: string) => emit('update:user', value),
  });
  const mapModel = computed({
    get: () => props.map,
    set: (value: string) => emit('update:map', value),
  });
  const traderModel = computed({
    get: () => props.trader,
    set: (value: string) => emit('update:trader', value),
  });
  // Provide default to avoid runtime warnings when models not yet synced
  const filtersActive = computed<boolean>(() => props.filtersActive === true);
  // Ensure all view collections default to empty arrays if undefined
  const primaryViews = computed<ViewOption[]>(() => props.primaryViews ?? []);
  const secondaryViews = computed<ViewOption[]>(() => props.secondaryViews ?? []);
  const userViews = computed<ViewOption[]>(() => props.userViews ?? []);
  const orderedTraders = computed<Trader[]>(() => props.orderedTraders ?? []);
  const maps = computed<MapSummary[]>(() => props.maps ?? []);
  const mapTaskTotals = computed<Record<string, number>>(() => props.mapTaskTotals ?? {});
  const secondaryTaskCounts = computed<SecondaryTaskCounts>(
    () =>
      props.secondaryTaskCounts ?? {
        available: 0,
        locked: 0,
        completed: 0,
      }
  );
  const traderAvatar = (id: string) => props.traderAvatar?.(id);
</script>
<style scoped lang="scss">
  .task-trader-filter-row {
    margin-top: 8px;
  }
  .compact-row {
    --v-layout-column-gap: 12px;
    --v-layout-row-gap: 12px;
  }
  .task-trader-filter {
    margin-bottom: 16px;
  }
  .tabs-centered :deep(.v-slide-group__content) {
    justify-content: center;
  }
  .task-settings-trigger {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease;
  }
  .task-settings-trigger:focus-visible {
    outline: 2px solid rgba(var(--v-theme-secondary), 0.8);
    outline-offset: 3px;
  }
</style>
