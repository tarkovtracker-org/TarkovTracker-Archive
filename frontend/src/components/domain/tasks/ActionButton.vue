<template>
  <div v-if="xs" class="d-flex justify-center">
    <v-btn :color="color" :size="size" class="mx-1 my-1" @click="$emit('click')">
      <v-icon class="mr-2">{{ icon }}</v-icon>
      {{ text }}
    </v-btn>
  </div>
  <v-btn v-else :size="size" :color="color" class="mx-1 my-1" @click="$emit('click')">
    <v-icon class="mr-2">{{ icon }}</v-icon>
    {{ text }}
  </v-btn>
</template>

<script setup>
  defineProps({
    xs: { type: Boolean, required: true },
    color: { type: String, default: 'primary' },
    icon: { type: String, required: true },
    text: { type: String, required: true },
    size: { type: String, default: 'x-large' },
  });

  defineEmits(['click']);
</script>
