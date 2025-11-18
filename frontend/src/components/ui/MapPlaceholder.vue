<template>
  <div class="map-placeholder">
    <v-alert
      type="warning"
      color="warning"
      variant="outlined"
      density="comfortable"
      icon="mdi-alert"
      class="map-placeholder-alert"
    >
      {{ message }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
  interface Props {
    message: string;
  }

  defineProps<Props>();
</script>

<style scoped>
  .map-placeholder {
    width: 100%;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .map-placeholder-alert {
    max-width: 400px;
  }
</style>
