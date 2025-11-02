<template>
  <div class="d-flex align-center">
    <!-- Level Requirement -->
    <div v-if="showLevelRequirement" class="d-flex align-center mr-2">
      <v-icon icon="mdi-menu-right" />
      <i18n-t keypath="page.tasks.questcard.level" scope="global">
        <template #count>{{ levelRequired }}</template>
      </i18n-t>
    </div>
    <!-- Locked Before -->
    <div v-if="lockedBefore > 0" class="d-flex align-center mr-2">
      <v-icon icon="mdi-lock-open-outline" />
      <i18n-t keypath="page.tasks.questcard.lockedbefore" scope="global">
        <template #count>{{ lockedBefore }}</template>
      </i18n-t>
    </div>
    <!-- Station Info for Hideout -->
    <div v-if="needType === 'hideoutModule'" class="d-flex align-center mr-2">
      <station-link :station="relatedStation" />
      <span class="ml-1">{{ hideoutLevel }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue';
  const StationLink = defineAsyncComponent(() => import('@/features/hideout/StationLink.vue'));
  const props = defineProps<{
    needType: string;
    levelRequired: number;
    lockedBefore: number;
    playerLevel: number;
    relatedStation?: { id: string; name: string; [key: string]: unknown };
    hideoutLevel?: number;
  }>();
  const showLevelRequirement = computed(
    () => props.levelRequired > 0 && props.levelRequired > props.playerLevel
  );
</script>
