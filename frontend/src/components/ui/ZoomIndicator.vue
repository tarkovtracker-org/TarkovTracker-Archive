<template>
  <div v-if="showIndicator" class="zoom-indicator">{{ Math.round(currentZoom * 100) }}%</div>
</template>

<script setup lang="ts">
  interface Props {
    currentZoom: number;
    showIndicator: boolean;
  }

  defineProps<Props>();
</script>

<style scoped>
  .zoom-indicator {
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 10;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
  }
</style>
