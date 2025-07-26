<template>
  <v-row v-if="show" dense>
    <v-col cols="12">
      <v-card>
        <v-tabs
          :model-value="activeMapView"
          @update:model-value="(value: unknown) => $emit('update:activeMapView', value as string)"
          bg-color="accent"
          slider-color="secondary"
          align-tabs="center"
          show-arrows
        >
          <v-tab
            v-for="(map, index) in maps"
            :key="index"
            :value="map.mergedIds ? map.mergedIds[0] : map.id"
            prepend-icon="mdi-compass"
          >
            <v-badge
              :color="getTaskTotal(map) > 0 ? 'secondary' : 'grey'"
              :content="getTaskTotal(map)"
              :label="String(getTaskTotal(map))"
              offset-y="-5"
              offset-x="-10"
            >
              {{ map.name }}
            </v-badge>
          </v-tab>
        </v-tabs>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
  import { computed } from 'vue';

  interface MapData {
    id: string;
    name: string;
    mergedIds?: string[];
  }

  interface Props {
    show: boolean;
    maps: MapData[];
    taskTotals: Record<string, number>;
    activeMapView: string;
  }

  interface Emits {
    (e: 'update:activeMapView', value: string): void;
  }

  const props = defineProps<Props>();
  defineEmits<Emits>();

  const getTaskTotal = (map: MapData): number => {
    const mapId = map.mergedIds ? map.mergedIds[0] : map.id;
    return props.taskTotals[mapId] || 0;
  };
</script>
