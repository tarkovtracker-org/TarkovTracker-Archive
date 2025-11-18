<template>
  <div v-if="floors.length > 1" class="floor-controls">
    <v-btn-group direction="vertical" density="compact">
      <v-btn
        v-for="(floor, floorIndex) in floors"
        :key="floorIndex"
        size="small"
        :color="floor === selectedFloor ? 'primary' : ''"
        :variant="floor === selectedFloor ? 'flat' : 'tonal'"
        class="floor-button"
        @click="$emit('floor-change', floor)"
      >
        {{ formatFloorLabel(floor) }}
      </v-btn>
    </v-btn-group>
  </div>
</template>

<script setup lang="ts">
  interface Props {
    floors: string[];
    selectedFloor: string;
  }

  defineProps<Props>();

  defineEmits<{
    'floor-change': [floor: string];
  }>();

  // Import the utility function
  import { formatFloorLabel } from '@/utils/mapUtils';
</script>

<style scoped>
  .floor-controls {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 10;
  }

  .floor-button {
    min-width: 40px;
  }
</style>
