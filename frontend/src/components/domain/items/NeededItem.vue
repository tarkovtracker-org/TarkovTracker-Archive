<template>
  <template v-if="props.itemStyle === 'mediumCard'">
    <v-col v-if="showItemFilter" cols="12" sm="6" md="4" lg="3" xl="2" v-bind="attrs">
      <NeededItemMediumCard
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
      />
    </v-col>
  </template>
  <template v-else-if="props.itemStyle === 'smallCard'">
    <v-col v-if="showItemFilter" cols="auto" v-bind="attrs">
      <NeededItemSmallCard
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
      />
    </v-col>
  </template>
  <template v-else-if="props.itemStyle === 'row'">
    <v-col v-if="showItemFilter" cols="12" class="pt-1" v-bind="attrs">
      <NeededItemRow
        :need="props.need"
        @decrease-count="decreaseCount()"
        @toggle-count="toggleCount()"
        @increase-count="increaseCount()"
      />
    </v-col>
  </template>
</template>
<script setup lang="ts">
  import { defineAsyncComponent, useAttrs, defineOptions } from 'vue';
  import { useNeededItemLogic, type Need } from '@/composables/neededItems/useNeededItemLogic';

  // Prevent Vue from auto-applying attrs to the outer fragment; we'll forward them manually
  defineOptions({ inheritAttrs: false });

  const NeededItemMediumCard = defineAsyncComponent(
    () => import('@/components/domain/items/NeededItemMediumCard.vue')
  );
  const NeededItemSmallCard = defineAsyncComponent(
    () => import('@/components/domain/items/NeededItemSmallCard.vue')
  );
  const NeededItemRow = defineAsyncComponent(
    () => import('@/components/domain/items/NeededItemRow.vue')
  );

  const props = defineProps<{
    need: Need;
    itemStyle?: string;
  }>();
  const attrs = useAttrs();

  const { showItemFilter, decreaseCount, increaseCount, toggleCount } = useNeededItemLogic(
    props.need
  );
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
