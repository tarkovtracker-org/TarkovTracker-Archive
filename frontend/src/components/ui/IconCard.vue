<template>
  <v-sheet rounded class="elevation-2 mt-2">
    <v-avatar
      class="ml-2 mb-2 mt-n4 mr-2 elevation-2 float-left"
      :color="props.iconBackground"
      size="64"
    >
      <v-icon size="48px" :color="props.iconColor">{{ props.icon }}</v-icon>
    </v-avatar>
    <div class="text-h5 text-left pa-2 pb-0">
      <slot name="stat"></slot>
    </div>
    <div class="text-center pa-2 pt-6">
      <slot name="content"></slot>
    </div>
  </v-sheet>
</template>
<script setup lang="ts">
  interface Props {
    icon?: string;
    iconBackground?: string;
    iconColor?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    icon: 'mdi-check-all',
    iconBackground: 'accent',
    iconColor: 'secondary',
  });
</script>
<style lang="scss" scoped></style>
