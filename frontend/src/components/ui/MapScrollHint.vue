<template>
  <transition name="fade">
    <div v-if="showHint" class="scroll-hint">Use Alt+Scroll to zoom</div>
  </transition>
</template>

<script setup lang="ts">
  interface Props {
    showHint: boolean;
  }

  defineProps<Props>();
</script>

<style scoped>
  .scroll-hint {
    position: absolute;
    bottom: 50px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    z-index: 10;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
