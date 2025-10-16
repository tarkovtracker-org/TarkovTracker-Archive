<template>
  <v-row v-if="show" dense>
    <v-col cols="12">
      <v-card>
        <v-tabs
          :model-value="activeMapView"
          bg-color="accent"
          slider-color="secondary"
          align-tabs="center"
          show-arrows
          @update:model-value="(value: unknown) => $emit('update:activeMapView', value as string)"
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
  defineEmits<Emits>();

  const getTaskTotal = (map: MapData): number => {
    return props.taskTotals[map.id] || 0;
  };
</script>
