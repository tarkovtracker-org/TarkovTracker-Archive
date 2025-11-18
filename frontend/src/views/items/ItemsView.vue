<template>
  <tracker-tip :tip="{ id: 'neededitems' }"></tracker-tip>
  <v-container>
    <!-- Filter controls -->
    <needed-items-filter
      :views="localizedNeededViews"
      :search-text="itemFilterNameText"
      :active-view="activeNeededView"
      @update:search-text="itemFilterNameText = $event"
      @update:active-view="activeNeededView = $event"
    />

    <!-- Items list -->
    <needed-items-list
      :active-view="activeNeededView"
      :task-items="neededTaskItems"
      :hideout-items="neededHideoutItems"
      :item-style="neededItemsStyle"
      :loading="loading"
      :hideout-loading="hideoutLoading"
      :has-more-items="hasMoreItems"
      @load-more="loadMoreItems"
    />
  </v-container>
</template>
<script setup>
  import { defineAsyncComponent, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useNeededItems } from '@/composables/useNeededItems';
  import { useNeededItemsSettings } from '@/composables/useNeededItemsSettings';

  const TrackerTip = defineAsyncComponent(() => import('@/components/ui/TrackerTip.vue'));
  import { NeededItemsFilter, NeededItemsList } from '@/components/domain/needed-items';

  const { t } = useI18n({ useScope: 'global' });

  // Main composable for needed items state
  const {
    itemFilterNameText,
    activeNeededView,
    neededTaskItems,
    neededHideoutItems,
    loading,
    hideoutLoading,
    hasMoreItems,
    loadMoreItems,
    neededViews,
  } = useNeededItems();

  // Settings composable for display options
  const { neededItemsStyle } = useNeededItemsSettings();

  // Localize view titles
  const localizedNeededViews = computed(() =>
    neededViews.map((view) => ({
      ...view,
      title: t(`page.neededitems.neededviews.${view.view}`),
    }))
  );
</script>
<style lang="scss" scoped>
  .compact-row {
    --v-layout-column-gap: 12px;
    --v-layout-row-gap: 12px;
  }
</style>
