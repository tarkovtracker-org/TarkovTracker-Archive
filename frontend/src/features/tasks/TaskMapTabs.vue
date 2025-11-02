<template>
  <v-row v-if="show" class="compact-row">
    <v-col cols="12">
      <v-card>
        <v-tabs
          v-model="activeMapViewModel"
          bg-color="accent"
          slider-color="secondary"
          align-tabs="center"
          show-arrows
        >
          <v-tab
            v-for="(map, index) in maps"
            :key="index"
            :value="map.id"
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
  const emit = defineEmits<Emits>();

  const getTaskTotal = (map: MapData): number => {
    return props.taskTotals[map.id] || 0;
  };

  const activeMapViewModel = computed({
    get: () => props.activeMapView,
    set: (value: string) => emit('update:activeMapView', value),
  });
</script>

<style scoped>
  .compact-row {
    --v-layout-column-gap: 12px;
    --v-layout-row-gap: 12px;
  }
</style>
