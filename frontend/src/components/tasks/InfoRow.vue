<template>
  <v-row no-gutters class="mb-1">
    <v-col v-if="icon || $slots.icon" cols="auto" class="mr-1">
      <slot name="icon">
        <v-icon :icon="icon" />
      </slot>
    </v-col>
    <v-col>
      <slot />
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '' }
})
</script>