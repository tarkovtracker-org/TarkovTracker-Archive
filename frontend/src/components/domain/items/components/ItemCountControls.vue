<template>
  <div class="d-flex align-center">
    <v-btn variant="tonal" class="pa-0 ma-0" size="small" @click="$emit('decrease')">
      <v-icon size="x-small">mdi-minus-thick</v-icon>
    </v-btn>
    <v-btn variant="tonal" class="pa-0 px-1 ma-0 mx-1" @click="$emit('toggle')">
      {{ currentCount.toLocaleString() }}/{{ neededCount.toLocaleString() }}
    </v-btn>
    <v-btn variant="tonal" class="pa-0 ma-0" size="small" @click="$emit('increase')">
      <v-icon size="x-small">mdi-plus-thick</v-icon>
    </v-btn>
  </div>
</template>
<script setup lang="ts">
  defineProps<{
    currentCount: number;
    neededCount: number;
  }>();
  defineEmits<{
    decrease: [];
    increase: [];
    toggle: [];
  }>();
</script>
