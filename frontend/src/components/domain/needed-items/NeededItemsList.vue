<template>
  <div>
    <!-- Loading indicator -->
    <v-row v-if="loading || hideoutLoading" justify="center" data-test="loading-indicator">
      <v-col cols="12" align="center">
        <v-progress-circular indeterminate color="secondary" class="mx-2"></v-progress-circular>
        <span>{{ $t('page.neededitems.loading') }}</span>
        <refresh-button data-test="refresh-button" />
      </v-col>
    </v-row>

    <!-- Task items -->
    <v-row v-show="activeView === 'all' || activeView === 'tasks'" justify="space-between">
      <needed-item
        v-for="(neededItem, itemIndex) in taskItems"
        :key="itemIndex"
        :need="neededItem"
        :item-style="itemStyle"
        data-test="needed-item"
      />
    </v-row>

    <!-- Hideout items -->
    <v-row v-show="activeView === 'all' || activeView === 'hideout'" justify="space-between">
      <needed-item
        v-for="(neededItem, itemIndex) in hideoutItems"
        :key="itemIndex"
        :need="neededItem"
        :item-style="itemStyle"
        data-test="needed-item"
      />
    </v-row>

    <!-- Load more button -->
    <v-row v-if="hasMoreItems && !loading && !hideoutLoading" justify="center" class="mt-4">
      <v-col cols="12" align="center">
        <v-btn
          variant="outlined"
          color="secondary"
          :loading="false"
          data-test="load-more-button"
          @click="loadMoreItems"
        >
          {{ $t('page.neededitems.load_more') }}
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading more indicator -->
    <v-row
      v-if="hasMoreItems && (loading || hideoutLoading)"
      justify="center"
      class="mt-4"
      data-test="loading-more-indicator"
    >
      <v-col cols="12" align="center">
        <v-progress-circular indeterminate color="secondary" class="mx-2"></v-progress-circular>
        {{ $t('page.neededitems.loading_more') }}
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue';

  const NeededItem = defineAsyncComponent(() => import('@/components/domain/items/NeededItem.vue'));
  const RefreshButton = defineAsyncComponent(() => import('@/components/ui/RefreshButton.vue'));

  const props = defineProps<{
    activeView: string;
    taskItems: any[];
    hideoutItems: any[];
    itemStyle: string;
    loading: boolean;
    hideoutLoading: boolean;
    hasMoreItems: boolean;
  }>();

  const emit = defineEmits<{
    'load-more': [];
  }>();

  const loadMoreItems = () => {
    emit('load-more');
  };
</script>
