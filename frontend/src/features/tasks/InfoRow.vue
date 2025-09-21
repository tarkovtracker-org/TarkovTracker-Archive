<template>
  <div class="info-row" :class="{ 'info-row--inline': inline }">
    <div v-if="icon || $slots.icon" class="info-row__icon">
      <slot name="icon">
        <v-icon :icon="icon" />
      </slot>
    </div>
    <div class="info-row__content" :class="{ 'info-row__content--inline': inline }">
      <slot />
    </div>
  </div>
</template>

<script setup>
  defineProps({
    icon: { type: String, default: '' },
    inline: { type: Boolean, default: false },
  });
</script>

<style scoped>
  .info-row {
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: 4px;
  }

  .info-row--inline {
    display: inline-flex;
    width: auto;
  }

  .info-row__icon {
    display: inline-flex;
    margin-right: 6px;
  }

  .info-row__content {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
  }

  .info-row__content--inline {
    flex: 0 1 auto;
  }
</style>
