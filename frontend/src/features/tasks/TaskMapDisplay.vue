<template>
  <v-col v-if="props.show" cols="12" class="my-1">
    <v-expansion-panels v-model="expandMap">
      <v-expansion-panel>
        <v-expansion-panel-title>
          Objective Locations
          <span v-show="props.activeMapView !== '55f2d3fd4bdc2d5f408b4567'">
            &nbsp;-&nbsp;{{ tarkovTime }}
          </span>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <tarkov-map v-if="selectedMap" :map="selectedMap" :marks="markers" />
          <v-alert v-else type="error">No map data available for this selection.</v-alert>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-col>
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent, ref } from 'vue';
  import type { TarkovMap as TarkovMapData } from '@/types/tarkov';
  import type { ObjectiveMarker } from '@/types/maps';
  import { useTarkovTime } from '@/composables/useTarkovTime';

  const TarkovMap = defineAsyncComponent(() => import('@/features/maps/TarkovMap.vue'));

  interface Props {
    show: boolean;
    selectedMap: TarkovMapData | null;
    visibleMarkers: ObjectiveMarker[];
    activeMapView: string;
  }

  const props = defineProps<Props>();

  const expandMap = ref([0]);
  const { tarkovTime } = useTarkovTime();

  const markers = computed(() => props.visibleMarkers);
  const selectedMap = computed(() => props.selectedMap);
</script>
