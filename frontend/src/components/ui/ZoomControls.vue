<template>
  <div class="zoom-controls">
    <v-btn-group direction="vertical" density="compact">
      <v-btn
        icon="mdi-plus"
        size="small"
        :disabled="currentZoom >= maxZoom"
        title="Zoom In"
        @click="$emit('zoom-in')"
      />
      <v-btn
        icon="mdi-minus"
        size="small"
        :disabled="currentZoom <= minZoom"
        title="Zoom Out"
        @click="$emit('zoom-out')"
      />
      <v-btn icon="mdi-restore" size="small" title="Reset View" @click="$emit('reset-zoom')" />
    </v-btn-group>
  </div>
</template>

<script setup lang="ts">
  interface Props {
    currentZoom: number;
    minZoom: number;
    maxZoom: number;
  }

  defineProps<Props>();

  defineEmits<{
    'zoom-in': [];
    'zoom-out': [];
    'reset-zoom': [];
  }>();
</script>

<style scoped>
  .zoom-controls {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10;
  }
</style>
