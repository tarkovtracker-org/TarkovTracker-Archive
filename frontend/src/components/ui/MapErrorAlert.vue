<template>
  <v-alert
    v-if="error"
    type="error"
    color="error"
    variant="outlined"
    density="comfortable"
    icon="mdi-alert-circle"
    class="map-error-alert"
    closable
    @click:close="$emit('close')"
  >
    {{ error }}
  </v-alert>
</template>

<script setup lang="ts">
  interface Props {
    error: string | null;
  }

  defineProps<Props>();

  defineEmits<{
    close: [];
  }>();
</script>

<style scoped>
  .map-error-alert {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    max-width: 80%;
  }
</style>
