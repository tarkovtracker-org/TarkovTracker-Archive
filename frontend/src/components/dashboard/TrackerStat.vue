<template>
  <v-sheet rounded class="elevation-4 stat-card">
    <div class="d-flex align-center pa-3">
      <v-avatar color="accent" size="60" class="mr-3 elevation-4">
        <v-icon size="40px" color="secondary">{{ props.icon }}</v-icon>
      </v-avatar>
      <div class="flex-grow-1 text-right">
        <div class="text-subtitle mb-1" style="font-size: 0.9em">
          <slot name="stat"></slot>
        </div>
        <div class="text-h5 mb-1">
          <slot name="value"></slot>
          <div class="stat-percentage" style="font-size: 0.6em; line-height: 1.2">
            <slot name="percentage"></slot>
          </div>
        </div>
      </div>
    </div>
    <div v-if="$slots.details" class="text-left px-3 pb-2 text-grey" style="font-size: 0.75em">
      <v-divider class="mb-2" />
      <v-icon class="mr-1" color="secondary" size="small">mdi-help-circle</v-icon
      ><slot name="details"></slot>
    </div>
  </v-sheet>
</template>
<script setup>
  const props = defineProps({
    icon: {
      type: String,
      default: 'mdi-check-all',
      required: false,
    },
  });
</script>
<style lang="scss" scoped>
  .stat-card {
    // Remove height constraints to prevent text cutoff
    height: auto;
  }

  // Ensure compact layout on mobile
  @media (max-width: 600px) {
    .stat-card {
      // Remove max-height constraint on mobile too
      height: auto;
    }

    :deep(.v-avatar) {
      width: 50px !important;
      height: 50px !important;

      .v-icon {
        font-size: 32px !important;
      }
    }

    .text-h5 {
      font-size: 1.1rem !important;
    }
  }
</style>
